import Breeding from '../models/Breeding.js';
import Reptile from '../models/Reptile.js';
import mongoose from 'mongoose';
import { logAction } from "../utils/logAction.js";
import User from '../models/User.js';

//  Utility function to avoid duplicate pairs in the same year
async function isDuplicatePair(maleId, femaleId, year, userId) {
  return await Breeding.exists({ male: maleId, female: femaleId, year, user: userId });
}

function hasBreedingAccess(subscription) {
  if (!subscription) return false;
  const { plan = 'free', status } = subscription;
  const allowedStatus = ['active', 'pending_cancellation'];
  return allowedStatus.includes(status) && plan !== 'free';
}


// Basic function: Create a new pairing session
export const createBreedingPair = async (req, res) => {
  try {
    const { male, female, year, species, morphCombo, isLiveBirth } = req.body;
    const user = req.user.userid;
    const userPlan = await User.findById(req.user.userid).select('subscription');
    if (!userPlan) return res.status(401).json({ error: 'Utente non trovato' });

    if (!hasBreedingAccess(userPlan.subscription)) {
      return res.status(403).json({ error: 'Accesso negato: funzione riservata agli utenti con abbonamento attivo o in cancellazione' });
    }
    // 🛡️ Validazioni:
    if (!mongoose.Types.ObjectId.isValid(male) || !mongoose.Types.ObjectId.isValid(female)) {
      return res.status(400).json({ error: 'ID rettili non validi' });
    }

    if (male === female) {
      return res.status(400).json({ error: 'Maschio e femmina non possono essere lo stesso rettile' });
    }

    const [maleReptile, femaleReptile] = await Promise.all([
      Reptile.findOne({ _id: male, user }),
      Reptile.findOne({ _id: female, user }),
    ]);

    if (!maleReptile || !femaleReptile) {
      return res.status(404).json({ error: 'Uno o entrambi i rettili non esistono' });
    }

    if (maleReptile.sex !== 'M' || femaleReptile.sex !== 'F') {
      return res.status(400).json({ error: 'Controlla il sesso dei rettili (M/F)' });
    }

    const duplicate = await isDuplicatePair(male, female, year, user);
    if (duplicate) {
      return res.status(409).json({ error: 'Questa coppia esiste già per quest\'anno' });
    }

    const newBreeding = await Breeding.create({
      male, female, year, species, morphCombo, isLiveBirth, user
    });
    await logAction(req.user.userid, "Create Breeding");

    res.status(201).json(newBreeding);
  } catch (err) {
    console.error('Breeding creation error:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};

// Adding events (Ovulation, Incubation, etc.)
export const addBreedingEvent = async (req, res) => {
  try {
    const { breedingId } = req.params;
    const { type, date, notes } = req.body;
    const user = req.user.userid;
    const userPlan = await User.findById(req.user.userid).select('subscription');
    if (!userPlan) return res.status(401).json({ error: 'Utente non trovato' });

    if (!hasBreedingAccess(userPlan.subscription)) {
      return res.status(403).json({ error: 'Accesso negato: funzione riservata agli utenti con abbonamento attivo o in cancellazione' });
    }
    const breeding = await Breeding.findOne({ _id: breedingId, user });
    if (!breeding) {
      return res.status(404).json({ error: 'Riproduzione non trovata' });
    }

    //  Ridiculous double events (e.g., 5 ovulations in 1 week)
    const sameWeekEvents = breeding.events.filter(e =>
      e.type === type && Math.abs(new Date(date) - new Date(e.date)) < 7 * 24 * 60 * 60 * 1000
    );
    if (sameWeekEvents.length > 0) {
      return res.status(409).json({ error: `Evento "${type}" già presente in questa settimana` });
    }
    await logAction(req.user.userid, "Add event Breeding");

    breeding.events.push({ type, date, notes });
    await breeding.save();
    res.status(200).json(breeding);
  } catch (err) {
    console.error('Breeding event error:', err);
    res.status(500).json({ error: 'Errore interno' });
  }
};

// Filter by year
export const getBreedingByYear = async (req, res) => {
  try {
    const user = req.user.userid;
    const { year } = req.query;
    const userPlan = await User.findById(req.user.userid).select('subscription');
    if (!userPlan) return res.status(401).json({ error: 'Utente non trovato' });

    if (!hasBreedingAccess(userPlan.subscription)) {
      return res.status(403).json({ error: 'Accesso negato: funzione riservata agli utenti con abbonamento attivo o in cancellazione' });
    }
    const filter = { user };
    if (year) {
      filter.year = parseInt(year);
    }

    const breedings = await Breeding.find(filter)
      .populate('male', 'name species morph')
      .populate('female', 'name species morph')
      .sort({ year: -1 });

    res.status(200).json(breedings);
  } catch (err) {
    console.error('Errore fetch breeding:', err);
    res.status(500).json({ error: 'Errore interno' });
  }
};

// Update on results and outcomes (eggs or puppies)
export const updateBreedingOutcome = async (req, res) => {
  try {
    const { breedingId } = req.params;
    const { clutchSize, outcome } = req.body;
    const user = req.user.userid;
    const userPlan = await User.findById(req.user.userid).select('subscription');
    if (!userPlan) return res.status(401).json({ error: 'Utente non trovato' });

    if (!hasBreedingAccess(userPlan.subscription)) {
      return res.status(403).json({ error: 'Accesso negato: funzione riservata agli utenti con abbonamento attivo o in cancellazione' });
    }
    const breeding = await Breeding.findOne({ _id: breedingId, user });
    if (!breeding) {
      return res.status(404).json({ error: 'Riproduzione non trovata' });
    }

    if (!breeding.processedStats) {
      const male = await Reptile.findById(breeding.male);
      const fem = await Reptile.findById(breeding.female);
      male.stats.breedings++;
      fem.stats.breedings++;
      if (outcome === 'Success') {
        male.stats.successCount++;
        fem.stats.successCount++;
        male.stats.offspringCount += (clutchSize?.hatchedOrBorn || 0);
        fem.stats.offspringCount += (clutchSize?.hatchedOrBorn || 0);
      }
      await male.save();
      await fem.save();
      breeding.processedStats = true;
    }
    breeding.outcome = outcome;
    breeding.clutchSize = clutchSize;
    await breeding.save();;
    res.status(200).json(breeding);
  } catch (err) {
    console.error('Outcome update error:', err);
    res.status(500).json({ error: 'Errore interno' });
  }
};


// controllers
function toObjectId(id) {
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  throw new Error('Invalid ObjectId');
}

export const deleteBreedingEvent = async (req, res) => {
  try {
    const { breedingId, eventId } = req.params;
    const userPlan = await User.findById(req.user.userid).select('subscription');
    if (!userPlan) return res.status(401).json({ error: 'Utente non trovato' });

    if (!hasBreedingAccess(userPlan.subscription)) {
      return res.status(403).json({ error: 'Accesso negato: funzione riservata agli utenti con abbonamento attivo o in cancellazione' });
    }

    const userId = toObjectId(req.user.userid);
    const breeding = await Breeding.findOne({ _id: breedingId, user: userId });
    if (!breeding) return res.status(404).json({ error: 'Riproduzione non trovata' });

    const mongooseEventId = new mongoose.Types.ObjectId(eventId);
    const eventToRemove = breeding.events.id(mongooseEventId);
    if (!eventToRemove) return res.status(404).json({ error: 'Evento non trovato' });

    breeding.events.pull(mongooseEventId);
    await logAction(req.user.userid, "Delete Breeding");
    await breeding.save();

    res.status(200).json({ message: 'Evento eliminato con successo', breeding });
  } catch (err) {
    console.error('Errore delete breeding event:', err);
    res.status(500).json({ error: 'Errore interno' });
  }
};

export const updateBreedingEvent = async (req, res) => {
  const { breedingId, eventId } = req.params;
  const { type, date, notes } = req.body;
  const userPlan = await User.findById(req.user.userid).select('subscription');
  if (!userPlan) return res.status(401).json({ error: 'Utente non trovato' });

  if (!hasBreedingAccess(userPlan.subscription)) {
    return res.status(403).json({ error: 'Accesso negato: funzione riservata agli utenti con abbonamento attivo o in cancellazione' });
  }
  const breeding = await Breeding.findOne({ _id: breedingId, user: req.user.userid });
  if (!breeding) return res.status(404).json({ error: 'Accoppiamento non trovato' });
  const ev = breeding.events.id(eventId);
  if (!ev) return res.status(404).json({ error: 'Evento non trovato' });
  ev.type = type; ev.date = date; ev.notes = notes;
  await breeding.save();
  res.json(breeding);
};

export const getSuccessRate = async (req, res) => {
  try {
    const user = req.user.userid;
    const userPlan = await User.findById(req.user.userid).select('subscription');
    if (!userPlan) return res.status(401).json({ error: 'Utente non trovato' });

    if (!hasBreedingAccess(userPlan.subscription)) {
      return res.status(403).json({ error: 'Accesso negato: funzione riservata agli utenti con abbonamento attivo o in cancellazione' });
    }

    const totalBreedings = await Breeding.countDocuments({ user });
    if (totalBreedings === 0) return res.json({ successRate: 0 });

    const successfulBreedings = await Breeding.countDocuments({ user, outcome: 'Success' });

    const successRate = (successfulBreedings / totalBreedings) * 100;

    res.json({ successRate: successRate.toFixed(2) });
  } catch (err) {
    console.error('Reproductive success calculation error:', err);
    res.status(500).json({ error: 'Errore interno' });
  }
};


export const getIncubationStats = async (req, res) => {
  try {
    const user = req.user.userid;
    const userPlan = await User.findById(req.user.userid).select('subscription');
    if (!userPlan) return res.status(401).json({ error: 'Utente non trovato' });

    if (!hasBreedingAccess(userPlan.subscription)) {
      return res.status(403).json({ error: 'Accesso negato: funzione riservata agli utenti con abbonamento attivo o in cancellazione' });
    }

    const breedings = await Breeding.find({ user }).select('species events');

    const incubationMap = {};

    breedings.forEach(b => {
      const eggLaid = b.events.find(e => e.type === 'Egg Laid');
      const hatching = b.events.find(e => e.type === 'Hatching');
      if (eggLaid && hatching) {
        const durationMs = new Date(hatching.date) - new Date(eggLaid.date);
        if (durationMs >= 0) { // sanity check
          const durationDays = durationMs / (1000 * 60 * 60 * 24);
          if (!incubationMap[b.species]) incubationMap[b.species] = [];
          incubationMap[b.species].push(durationDays);
        }
      }
    });

    // Calculate average per species
    const incubationStats = Object.entries(incubationMap).map(([species, durations]) => {
      const sum = durations.reduce((a, b) => a + b, 0);
      const avg = sum / durations.length;
      return { species, averageIncubationDays: avg.toFixed(1), count: durations.length };
    });

    res.json(incubationStats);
  } catch (err) {
    console.error('Incubation calculation error for species:', err);
    res.status(500).json({ error: 'Errore interno' });
  }
};
