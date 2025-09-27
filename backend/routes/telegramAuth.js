import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "../models/User.js";
import Reptile from "../models/Reptile.js";
import Feeding from "../models/Feeding.js";
import Event from "../models/Event.js"; // da creare se non esiste

import { authenticateJWT } from "../middlewares/Auth.js";

const routerTelegram = express.Router();

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

export default routerTelegram;
