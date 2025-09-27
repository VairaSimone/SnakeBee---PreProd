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

export default routerTelegram; 
