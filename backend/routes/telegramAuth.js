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

// 2. Callback che collega l’utente loggato al telegramId
routerTelegram.post("/connect", authenticateJWT, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const telegramId = decoded.telegramId;

    // req.user viene da middleware di autenticazione (già loggato su SnakeBee)
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.telegramId = telegramId;
    await user.save();

    return res.json({ message: "Telegram account linked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default routerTelegram; 
