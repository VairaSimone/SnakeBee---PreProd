import express from "express";
import Newsletter from "../models/Newsletter.js";
import i18next from "../i18n.js";

const newsletterRoute = express.Router();

// Iscrizione
newsletterRoute.post("/subscribe", async (req, res) => {
  const { email, language } = req.body;
  const t = i18next.getFixedT(language || "it"); // usa lingua richiesta o fallback

  try {
    if (!email) return res.status(400).json({ message: t("email_required") });

    const existing = await Newsletter.findOne({ email });
    if (existing) {
      return res.status(200).json({ message: t("already_subscribed") });
    }

    const subscriber = new Newsletter({ email, language });
    await subscriber.save();

    return res.status(201).json({ message: t("subscribed_successfully") });
  } catch (err) {
    console.error("Newsletter error:", err);
    return res.status(500).json({ message: t("internal_server_error") });
  }
});

// Verifica se email è iscritta
newsletterRoute.get("/check", async (req, res) => {
  const { email } = req.query;
  if (!email) {
    const t = i18next.getFixedT("it");
    return res.status(400).json({ message: t("email_required") });
  }

  const existing = await Newsletter.findOne({ email });
  return res.json({ subscribed: !!existing });
});

export default newsletterRoute;
