import express from "express";
import Newsletter from "../models/Newsletter.js";

const newsletterRoute = express.Router();

// Iscrizione
newsletterRoute.post("/subscribe", async (req, res) => {
  try {
    const { email, language } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const existing = await Newsletter.findOne({ email });
    if (existing) {
      return res.status(200).json({ message: "Already subscribed" });
    }

    const subscriber = new Newsletter({ email, language });
    await subscriber.save();

    return res.status(201).json({ message: "Subscribed successfully" });
  } catch (err) {
    console.error("Newsletter error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Verifica se email è iscritta
newsletterRoute.get("/check", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email required" });

  const existing = await Newsletter.findOne({ email });
  return res.json({ subscribed: !!existing });
});

export default newsletterRoute;
