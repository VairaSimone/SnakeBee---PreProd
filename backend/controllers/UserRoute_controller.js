import User from "../models/User.js";
import Reptile from "../models/Reptile.js";
import Feeding from "../models/Feeding.js";
import Notification from "../models/Notification.js";
import Event from '../models/Event.js';
import Breeding from '../models/Breeding.js';

import RevokedToken from "../models/RevokedToken.js";
import jwt from "jsonwebtoken";
import cloudinary from '../config/CloudinaryConfig.js'; 
import { deleteFileIfExists } from "../utils/deleteFileIfExists.js";
import { logAction } from "../utils/logAction.js";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-08-01', // o la versione che usi tu
});
export const GetAllUser = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;

    const user = await User.find({})
      .sort({ name: 1 })
      .skip((page - 1) * perPage)
      .limit(perPage).select('-password -verificationCode -resetPasswordCode -refreshTokens -lastPasswordResetEmailSentAt -resetPasswordExpires -accountLockedUntil -loginAttempts'); if (!user) return res.status(404).json({ message: 'User not found' });
    ;

    const totalResults = await User.countDocuments();
    const totalPages = Math.ceil(totalResults / perPage);

    res.send({
      dati: user,
      totalPages,
      totalResults,
      page,
    });
  } catch (err) {
    res.status(500).send();
  }
};


export const GetIDUser = async (req, res) => {
  try {
    const id = req.params.userId;

    const user = await User.findById(id).select('-password -verificationCode -resetPasswordCode -refreshTokens -lastPasswordResetEmailSentAt -resetPasswordExpires -accountLockedUntil -loginAttempts'); if (!user) return res.status(404).json({ message: 'User not found' });
    ;
    if (!user) res.status(404).send();
    else res.send(user);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: 'Not Found' });
  }
};

export const PutUser = async (req, res) => {
  try {
    const id = req.params.userId;
    const userData = req.body;

    if (userData.role && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You cannot change your role.' });
    }

    if (req.file) {
      // Qui prendi il file salvato da multer
      // Costruisci l'URL o path locale (dipende da come servi i file)
         if (user.avatar) {
        await deleteFileIfExists(user.avatar);
      }
      userData.avatar = `/uploads/${req.file.filename}`;
    }
     await logAction(req.user.userid, "Moodify User");

    const fieldsAllowed = ['name', 'avatar'];
    const updates = {};
    fieldsAllowed.forEach(field => {
      if (userData[field] !== undefined) {
        updates[field] = userData[field];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true });
    res.send(updatedUser);
  } catch (err) {
    console.error('Errore aggiornamento utente:', err);
    res.status(500).send();
  }
};


export const updateEmailPreferences = async (req, res) => {
  try {
    const { receiveFeedingEmails } = req.body;
    if (typeof receiveFeedingEmails !== 'boolean') {
      return res.status(400).json({ message: 'Valore non valido per receiveFeedingEmails' });
    }
    const id = req.params.userId;

    const user = await User.findByIdAndUpdate(
      id,
      { receiveFeedingEmails },
      { new: true }
    );

    res.json({
      message: 'Preferenze aggiornate con successo',
      receiveFeedingEmails: user.receiveFeedingEmails
    });
  } catch (err) {
    console.error('Errore aggiornamento preferenze email:', err);
    res.status(500).json({ message: 'Errore del server' });
  }
};

export const DeleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utente non trovato' });


    const subId = user.subscription?.stripeSubscriptionId;
    const subStatus = user.subscription?.status;

    if (subId && ['active', 'incomplete', 'past_due', 'pending_cancellation'].includes(subStatus)) {
      try {
        await stripe.subscriptions.del(subId);
        await logAction(user._id, 'stripe_subscription_cancelled_on_user_deletion', `Sub ID: ${subId}`);
      } catch (stripeErr) {
        console.error('Errore Stripe durante cancellazione abbonamento:', stripeErr);
        return res.status(500).json({ message: 'Errore nella cancellazione dell’abbonamento Stripe' });
      }
    }

    // Trova tutti i rettili dell'utente
    const reptiles = await Reptile.find({ user: userId });

    // Per ogni rettile elimina feedings, eventi, notifiche
    for (const reptile of reptiles) {
      await Feeding.deleteMany({ reptile: reptile._id });
      await Event.deleteMany({ reptile: reptile._id });
      await Notification.deleteMany({ reptile: reptile._id });

      if (reptile.image) {
        await deleteFileIfExists(reptile.image);
      }
    
    }

    // Elimina i rettili
    await Reptile.deleteMany({ user: userId });

    // Elimina riproduzioni legate all'utente
    await Breeding.deleteMany({ user: userId });

    // Elimina notifiche dell'utente
    await Notification.deleteMany({ user: userId });
    if (user.avatar) {
      await deleteFileIfExists(user.avatar);
    }
    await logAction(req.user.userid, "user_deleted", `Cancellato utente ${userId}, tipo: self`);

    // Elimina utente
    await User.findByIdAndDelete(userId);

    // Revoca token se presente
    const token = req.header('Authorization')?.split(' ')[1];
    if (token) {
      const decoded = jwt.decode(token);
      if (decoded) {
        const revokedToken = new RevokedToken({
          token,
          expiresAt: new Date(decoded.exp * 1000),
        });
        await revokedToken.save();
      }
    }

    return res.status(200).json({ message: 'Utente e dati collegati eliminati con successo' });
  } catch (error) {
    console.error('Errore durante l\'eliminazione dell\'utente:', error);
    return res.status(500).json({ message: 'Errore del server' });
  }
};


export const UpdateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'banned'].includes(role)) {
      return res.status(400).json({ message: 'Ruolo non valido' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utente non trovato' });

    user.role = role;

    if (role === 'banned') {
      // logout forzato: rimuovi refresh tokens
      user.refreshTokens = [];
    }

    await user.save();
    return res.json({ message: `Ruolo aggiornato in "${role}"`, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore aggiornamento ruolo utente' });
  }
};
