import Breeding from '../models/Breeding.js';
import Reptile from '../models/Reptile.js';
import mongoose from 'mongoose';
import { logAction } from "../utils/logAction.js";
import User from '../models/User.js'; // import User

// 🧠 Funzione utilità per evitare coppie duplicate nello stesso anno
async function isDuplicatePair(maleId, femaleId, year, userId) {
  return await Breeding.exists({ male: maleId, female: femaleId, year, user: userId });
}

// 🔒 Funzione base: crea una nuova sessione di accoppiamento
export const createBreedingPair = async (req, res) => {
  try {
    const { male, female, year, species, morphCombo, isLiveBirth } = req.body;
    const user = req.user.userid ;
    console.log('User autenticato:', user.toString());
    const userPlan = await User.findById(req.user.userid).select('subscription');
    if (!userPlan) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    const { plan = 'free', status } = userPlan.subscription || {};

    if (status !== 'active' || plan === 'free') {
      return res.status(403).json({ error: 'Accesso negato: abbonamento non valido o piano Free' });
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
    console.error('Errore creazione breeding:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};

// 🔁 Aggiunta eventi (Ovulazione, Incubazione, ecc.)
export const addBreedingEvent = async (req, res) => {
  try {
    const { breedingId } = req.params;
    const { type, date, notes } = req.body;
    const user = req.user.userid;
const userPlan = await User.findById(req.user.userid).select('subscription');
    if (!userPlan) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    const { plan = 'free', status } = userPlan.subscription || {};

    if (status !== 'active' || plan === 'free') {
      return res.status(403).json({ error: 'Accesso negato: abbonamento non valido o piano Free' });
    }
    const breeding = await Breeding.findOne({ _id: breedingId, user });
    if (!breeding) {
      return res.status(404).json({ error: 'Riproduzione non trovata' });
    }

    // ⛔ Eventi doppi ridicoli (es: 5 ovulazioni in 1 settimana)
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
    console.error('Errore evento breeding:', err);
    res.status(500).json({ error: 'Errore interno' });
  }
};

// 📅 Filtra per anno
export const getBreedingByYear = async (req, res) => {
  try {
    const user = req.user.userid;
    const { year } = req.query;
const userPlan = await User.findById(req.user.userid).select('subscription');
    if (!userPlan) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    const { plan = 'free', status } = userPlan.subscription || {};

    if (status !== 'active' || plan === 'free') {
      return res.status(403).json({ error: 'Accesso negato: abbonamento non valido o piano Free' });
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

// 🧼 Update esito e risultati (uova o cuccioli)
export const updateBreedingOutcome = async (req, res) => {
  try {
    const { breedingId } = req.params;
    const { clutchSize, outcome } = req.body;
    const user = req.user.userid;
const userPlan = await User.findById(req.user.userid).select('subscription');
    if (!userPlan) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    const { plan = 'free', status } = userPlan.subscription || {};

    if (status !== 'active' || plan === 'free') {
      return res.status(403).json({ error: 'Accesso negato: abbonamento non valido o piano Free' });
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
    console.error('Errore aggiornamento outcome:', err);
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

    const { plan = 'free', status } = userPlan.subscription || {};
    if (status !== 'active' || plan === 'free') return res.status(403).json({ error: 'Accesso negato' });

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
    if (!userPlan) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    const { plan = 'free', status } = userPlan.subscription || {};

    if (status !== 'active' || plan === 'free') {
      return res.status(403).json({ error: 'Accesso negato: abbonamento non valido o piano Free' });
    }
  const breeding = await Breeding.findOne({ _id: breedingId, user: req.user.userid });
  if (!breeding) return res.status(404).json({ error: 'Not found' });
  const ev = breeding.events.id(eventId);
  if (!ev) return res.status(404).json({ error: 'Evento non trovato' });
  ev.type = type; ev.date = date; ev.notes = notes;
  await breeding.save();
  res.json(breeding);
};

export const getSuccessRate = async (req, res) => {
  try {
    const user = req.user.userid;
    const userPlan = await User.findById(user).select('subscription');
    if (!userPlan) return res.status(401).json({ error: 'Utente non trovato' });

    const { plan = 'free', status } = userPlan.subscription || {};
    if (status !== 'active' || plan === 'free') {
      return res.status(403).json({ error: 'Accesso negato: abbonamento non valido o piano Free' });
    }

    const totalBreedings = await Breeding.countDocuments({ user });
    if (totalBreedings === 0) return res.json({ successRate: 0 });

    const successfulBreedings = await Breeding.countDocuments({ user, outcome: 'Success' });

    const successRate = (successfulBreedings / totalBreedings) * 100;

    res.json({ successRate: successRate.toFixed(2) }); // stringa con 2 decimali, puoi modificare
  } catch (err) {
    console.error('Errore calcolo successo riproduttivo:', err);
    res.status(500).json({ error: 'Errore interno' });
  }
};


export const getIncubationStats = async (req, res) => {
  try {
    const user = req.user.userid;
    const userPlan = await User.findById(user).select('subscription');
    if (!userPlan) return res.status(401).json({ error: 'Utente non trovato' });

    const { plan = 'free', status } = userPlan.subscription || {};
    if (status !== 'active' || plan === 'free') {
      return res.status(403).json({ error: 'Accesso negato: abbonamento non valido o piano Free' });
    }

    // Trova tutti i breeding dell'utente con eventi
    const breedings = await Breeding.find({ user }).select('species events');

    // Mappa specie => array di durate incubazione (giorni)
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

    // Calcola media per specie
    const incubationStats = Object.entries(incubationMap).map(([species, durations]) => {
      const sum = durations.reduce((a, b) => a + b, 0);
      const avg = sum / durations.length;
      return { species, averageIncubationDays: avg.toFixed(1), count: durations.length };
    });

    res.json(incubationStats);
  } catch (err) {
    console.error('Errore calcolo incubazione per specie:', err);
    res.status(500).json({ error: 'Errore interno' });
  }
};
