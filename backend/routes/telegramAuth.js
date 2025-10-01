import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Reptile from "../models/Reptile.js";
import Feeding from "../models/Feeding.js";
import Event from "../models/Event.js"; // da creare se non esiste
import FoodInventory from "../models/FoodInventory.js"; // <-- Aggiungi questa riga
import { getUserPlan } from "../utils/getUserPlans.js"; 
const routerTelegram = express.Router();
async function isInventoryAccessAllowed(userId) {
  const user = await User.findById(userId);
  return user?.subscription?.plan === 'BREEDER';
}

// Middleware: trova user da telegramId
async function telegramAuth(req, res, next) {
  const telegramId = req.header("x-telegram-id");
  if (!telegramId) return res.status(400).json({ message: "Missing telegramId" });

  const user = await User.findOne({ telegramId });
  if (!user) return res.status(404).json({ message: "User not found" });

  req.user = user;
  next();
}

// 1. Genera link magico
routerTelegram.get("/link", async (req, res) => {
  try {
    const { telegramId } = req.query;
    if (!telegramId) return res.status(400).json({ message: "Telegram ID required" });

    const token = jwt.sign({ telegramId }, process.env.JWT_SECRET, { expiresIn: "30m" });
    const url = `${process.env.FRONTEND_URL}/telegram-auth?token=${token}`;
    return res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. Connetti Telegram all'utente loggato
routerTelegram.post("/connect", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const telegramId = decoded.telegramId;

    // utente loggato via JWT
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "Missing userId" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.telegramId = telegramId;
    await user.save();

    return res.json({ message: "Telegram account linked successfully" });
  } catch (err) {
    if (err.name === "TokenExpiredError") return res.status(401).json({ message: "Token scaduto" });
    return res.status(401).json({ message: "Token non valido" });
  }
});

// 3. Lista rettili
routerTelegram.get("/reptiles", telegramAuth, async (req, res) => {
  const reptiles = await Reptile.find({ user: req.user._id }).select("name species sex morph");
  res.json({ reptiles });
});

// 4. Dettagli rettile
routerTelegram.get("/reptile/:id", telegramAuth, async (req, res) => {
  const reptile = await Reptile.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!reptile) return res.status(404).json({ message: "Reptile not found" });
  res.json({ reptile });
});

// 5. Feedings
routerTelegram.get("/reptile/:id/feedings", telegramAuth, async (req, res) => {
  const reptile = await Reptile.findOne({ _id: req.params.id, user: req.user._id });
  if (!reptile) return res.status(404).json({ message: "Reptile not found" });

  const feedings = await Feeding.find({ reptile: reptile._id }).sort({ date: -1 }).limit(5).lean();
  res.json({ feedings });
});

// 6. Eventi
routerTelegram.get("/reptile/:id/events", telegramAuth, async (req, res) => {
  const reptile = await Reptile.findOne({ _id: req.params.id, user: req.user._id });
  if (!reptile) return res.status(404).json({ message: "Reptile not found" });

  const events = await Event.find({ reptile: reptile._id }).sort({ date: -1 }).lean();
  res.json({ events });
});

// 7. Visualizza inventario
routerTelegram.get("/inventory", telegramAuth, async (req, res) => {
    try {
        const { plan } = getUserPlan(req.user);
        if (plan !== 'BREEDER') { // Logica basata su `isInventoryAccessAllowed` [cite: 118]
            return res.status(403).json({ message: "Questa funzionalità è riservata agli utenti BREEDER." });
        }
        const inventory = await FoodInventory.find({ user: req.user._id }).lean();
        res.json({ inventory });
    } catch (err) {
        console.error("Telegram inventory error:", err);
        res.status(500).json({ message: "Errore nel recuperare l'inventario." });
    }
});

// 8. Aggiungi alimentazione (POST)
routerTelegram.post("/reptile/:id/feedings", telegramAuth, async (req, res) => {
    try {
        const reptile = await Reptile.findOne({ _id: req.params.id, user: req.user._id });
        if (!reptile) return res.status(404).json({ message: "Rettile non trovato" });

        const { foodType, quantity, weightPerUnit, wasEaten, notes, date } = req.body;
        
        const feedingDate = new Date(date || Date.now());
        let nextFeedingDate = null;

        // Logica per calcolare nextFeedingDate se il pasto è stato consumato
        if (wasEaten && reptile.nextMealDay) {
            nextFeedingDate = new Date(feedingDate);
            nextFeedingDate.setDate(feedingDate.getDate() + reptile.nextMealDay);
        }
        
        const meatTypes = ['Topo', 'Ratto', 'Coniglio', 'Pulcino'];
        if (wasEaten && meatTypes.includes(foodType)) {
            const invItem = await FoodInventory.findOne({ user: req.user._id, foodType, weightPerUnit });
            if (!invItem || invItem.quantity < quantity) {
                return res.status(400).json({ message: `Scorte insufficienti per ${foodType} da ${weightPerUnit}g.` });
            }
            invItem.quantity -= quantity;
            await invItem.save();
        }

        const newFeeding = new Feeding({
            reptile: req.params.id,
            date: feedingDate,
            foodType,
            quantity,
            weightPerUnit,
            wasEaten,
            notes,
            nextFeedingDate: wasEaten ? nextFeedingDate : undefined,
            retryAfterDays: !wasEaten ? 7 : undefined // Esempio, puoi personalizzarlo
        });

        await newFeeding.save();
        res.status(201).json({ message: "Alimentazione aggiunta con successo!", feeding: newFeeding });

    } catch (err) {
        console.error("Telegram add feeding error:", err);
        res.status(500).json({ message: "Errore durante l'aggiunta dell'alimentazione." });
    }
});

// 9. Aggiungi evento (POST)
routerTelegram.post("/reptile/:id/events", telegramAuth, async (req, res) => {
    try {
        const reptile = await Reptile.findOne({ _id: req.params.id, user: req.user._id });
        if (!reptile) return res.status(404).json({ message: "Rettile non trovato" });

        const { type, date, notes, weight } = req.body;

        const { plan, limits } = getUserPlan(req.user);
        if ((plan === 'NEOPHYTE' || plan === 'APPRENTICE') && limits.eventsPerTypePerReptile) {
            const count = await Event.countDocuments({ reptile: req.params.id, type });
            if (count >= limits.eventsPerTypePerReptile) {
                return res.status(403).json({ message: `Hai raggiunto il limite di eventi di tipo '${type}' per questo rettile.` });
            }
        }
        
        const newEvent = new Event({
            reptile: req.params.id,
            type,
            date: new Date(date || Date.now()),
            notes,
            weight: type === 'weight' ? weight : undefined
        });

        await newEvent.save();
        res.status(201).json({ message: "Evento aggiunto con successo!", event: newEvent });

    } catch (err) {
        console.error("Telegram add event error:", err);
        res.status(500).json({ message: "Errore durante l'aggiunta dell'evento." });
    }
});

export default routerTelegram;
