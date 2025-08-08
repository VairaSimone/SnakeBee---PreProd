import mongoose from 'mongoose';
import Event from '../models/Event.js';
import { logAction } from '../utils/logAction.js';
import { getUserPlan } from '../utils/getUserPlans.js'
import User from '../models/User.js'; // importa il modello User se non l’hai già

// GET /events/:reptileId
export const GetEvents = async (req, res) => {
  try {
    const events = await Event.find({ reptile: req.params.reptileId }).sort({ date: -1 });
    res.send(events);
  } catch (err) {
    res.status(500).send({ message: 'Error retrieving events' });
  }
};

// POST /events
export const CreateEvent = async (req, res) => {
  try {
    const { reptileId, type, date, notes, weight } = req.body;

    // ⚠️ Carica lo user aggiornato dal DB
    const user = await User.findById(req.user.userid).lean(); // o .select('+subscription') se è escluso
    if (!user) {
      return res.status(404).send({ message: 'Utente non trovato.' });
    }

    const { plan, limits } = getUserPlan(user); // 🔁 ora usi dati affidabili

    // Applicazione limite solo per utenti free
    if (plan === 'free' && limits.eventsPerTypePerReptile) {
      const existingCount = await Event.countDocuments({ reptile: reptileId, type });
      if (existingCount >= limits.eventsPerTypePerReptile) {
        return res.status(403).send({
          message: `Limite massimo di ${limits.eventsPerTypePerReptile} eventi di tipo "${type}" raggiunto per questo rettile. Passa a Premium per eventi illimitati.`
        });
      }
    }

    const newEventData = {
      reptile: reptileId,
      type,
      date: new Date(date),
      notes,
    };

    if (type === 'weight') {
      if (!weight || isNaN(weight)) {
        return res.status(400).send({ message: 'Peso non valido per evento di tipo "weight".' });
      }
      newEventData.weight = weight;
    }
     await logAction(req.user.userid, "Create Event");

    const newEvent = new Event(newEventData);
    const saved = await newEvent.save();
    res.status(201).send(saved);
  } catch (err) {
    res.status(400).send({ message: 'Errore nella creazione dell\'evento', err });
  }
};

// DELETE /events/:eventId
export const DeleteEvent = async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.eventId);
    res.send({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).send({ message: 'Error deleting event' });
  }
};


export const averageShedInterval = async (req, res) => {
  const userId = req.user.userid;

  const reptileSheds = await Event.aggregate([
    { $match: { type: 'shed' } },
    {
      $lookup: {
        from: 'Reptile',
        localField: 'reptile',
        foreignField: '_id',
        as: 'reptileData'
      }
    },
    { $unwind: '$reptileData' },
    { $match: { 'reptileData.user': new mongoose.Types.ObjectId(userId) } },
    {
      $sort: { reptile: 1, date: 1 }
    },
    {
      $group: {
        _id: '$reptile',
        sheds: { $push: '$date' }
      }
    }
  ]);

  let totalInterval = 0;
  let count = 0;

  for (const reptile of reptileSheds) {
    const dates = reptile.sheds.map(d => new Date(d));
    for (let i = 1; i < dates.length; i++) {
      totalInterval += (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24); // giorni
      count++;
    }
  }

  res.json({
    averageIntervalDays: count > 0 ? (totalInterval / count).toFixed(1) : 'N/A'
  });
};
