import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authenticateJWT } from "../middlewares/Auth.js";

const routerTelegram = express.Router();

// 1. Genera il link magico
routerTelegram.get("/link", async (req, res) => {
  try {
    const { telegramId } = req.query;
    if (!telegramId) return res.status(400).json({ message: "Telegram ID required" });

    const token = jwt.sign(
      { telegramId },
      process.env.JWT_SECRET,
      { expiresIn: "10m" } // link valido solo 10 minuti
    );

    const url = `${process.env.FRONTEND_URL}/telegram-auth?token=${token}`;
    return res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

routerTelegram.post("/connect", async (req, res) => {
    try {
        const { token } = req.body; // token del link magico
        if (!token) return res.status(400).json({ message: "Missing token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const telegramId = decoded.telegramId;

        // ❌ Senza req.user, come identifichi l’utente?
        // Se vuoi, potresti passare anche l'userId nel body
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "Missing userId" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.telegramId = telegramId;
        await user.save();

        return res.json({ message: "Telegram account linked successfully" });
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token scaduto, fai login di nuovo" });
        } else {
            return res.status(401).json({ message: "Token non valido" });
        }
    }
});

// routerTelegram.js
import Reptile from "../models/Reptile.js"; 
import mongoose from "mongoose";

routerTelegram.get("/reptiles", async (req, res) => {
  try {
    const telegramId = req.header("x-telegram-id");
    if (!telegramId) return res.status(400).json({ message: "Missing telegramId" });

    // trova utente connesso a quel telegramId
    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // trova rettili dell’utente
    const reptiles = await Reptile.find({ user: new mongoose.Types.ObjectId(user._id) })
      .select("name species sex morph");

    res.json({ reptiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// routerTelegram.js
// routerTelegram.js
routerTelegram.get("/reptile/:id", async (req, res) => {
  try {
    const telegramId = req.header("x-telegram-id");
    if (!telegramId) return res.status(400).json({ message: "Missing telegramId" });

    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const reptileId = req.params.id;

    const reptile = await Reptile.findOne({
      _id: reptileId,
      user: user._id
    }).lean();

    if (!reptile) return res.status(404).json({ message: "Reptile not found" });

    res.json({ reptile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default routerTelegram; 
