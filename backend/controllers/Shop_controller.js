// controllers/Shop_controller.js

import User from "../models/User.js";
import Reptile from "../models/Reptile.js";
import mongoose from 'mongoose';

const getActiveSubscriptionMatch = () => {
  // Utenti considerati "attivi" per lo shop
  return {
    'subscription.status': { $in: ['active', 'pending_cancellation', 'processing'] },
    'subscription.plan': { $in: ['APPRENTICE', 'PRACTITIONER', 'BREEDER'] }
  };
};

/**
 * GET /api/v1/shop/reptiles
 * Recupera i rettili pubblici per lo shop, con filtri.
 */
export const getPublicShopReptiles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;
    const { species, morph, zona } = req.query; // zona = indirizzo utente

    // 1. Match iniziale sui rettili
    const reptileMatch = {
      isPublic: true,
      status: 'active'
    };
    if (species) {
      reptileMatch.species = { $regex: species, $options: 'i' };
    }
    if (morph) {
      reptileMatch.morph = { $regex: morph, $options: 'i' };
    }

    // 2. Match sull'utente (allevatore)
    const activeSubscriptionMatch = getActiveSubscriptionMatch();

    // Costruiamo il $match per l'utente, aggiungendo il prefisso "breederInfo."
    // a ogni campo, perché questo filtro viene applicato DOPO il $lookup.
    const userMatch = {
      "breederInfo.isPublic": true, // Profilo pubblico
      "breederInfo.subscription.status": activeSubscriptionMatch['subscription.status'],
      "breederInfo.subscription.plan": activeSubscriptionMatch['subscription.plan']
    };
    
    if (zona) {
      // Aggiungiamo il prefisso anche al filtro 'zona'
      userMatch["breederInfo.address"] = { $regex: zona, $options: 'i' };
    }

    const aggregationPipeline = [
      { $match: reptileMatch },
      // Join con la collezione User
      {
        $lookup: {
          from: "User",
          localField: "user",
          foreignField: "_id",
          as: "breederInfo"
        }
      },
      { $unwind: "$breederInfo" },
      // Applica i filtri sull'utente (breeder)
{ $match: userMatch },      // Proietta i campi desiderati per pulizia
      {
        $project: {
          // Campi del rettile
          name: 1,
          species: 1,
          morph: 1,
          sex: 1,
          birthDate: 1,
          price: 1,
          image: { $slice: ["$image", 1] }, // Solo la prima immagine
          user: 1, // ID dell'utente
          createdAt: 1,
          // Aggiungi info breeder
          "breeder.name": "$breederInfo.name",
          "breeder.avatar": "$breederInfo.avatar",
          "breeder.address": "$breederInfo.address"
        }
      },
      { $sort: { createdAt: -1 } },
      // Paginazione
      {
        $facet: {
          metadata: [{ $count: 'totalResults' }],
          dati: [
            { $skip: (page - 1) * perPage },
            { $limit: perPage }
          ]
        }
      }
    ];

    const results = await Reptile.aggregate(aggregationPipeline);
    const dati = results[0].dati;
    const totalResults = results[0].metadata[0]?.totalResults || 0;
    const totalPages = Math.ceil(totalResults / perPage);

    res.send({
      dati,
      totalPages,
      totalResults,
      page,
    });

  } catch (err) {
    console.error("Error getPublicShopReptiles:", err);
    res.status(500).send({ message: req.t('server_error') });
  }
};

/**
 * GET /api/v1/shop/breeders
 * Recupera la lista di tutti gli allevatori pubblici.
 */
export const getPublicBreeders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;

    const matchQuery = {
      isPublic: true,
      ...getActiveSubscriptionMatch()
    };

    const users = await User.find(matchQuery)
      .select('name avatar address subscription.plan')
      .sort({ name: 1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(); // .lean() per performance, non serve Mongoose doc

    const totalResults = await User.countDocuments(matchQuery);
    const totalPages = Math.ceil(totalResults / perPage);

    res.send({
      dati: users,
      totalPages,
      totalResults,
      page,
    });

  } catch (err) {
    console.error("Error getPublicBreeders:", err);
    res.status(500).send({ message: req.t('server_error') });
  }
};


/**
 * GET /api/v1/shop/breeders/:userId
 * Recupera il profilo di un allevatore e i suoi rettili pubblici.
 */
export const getPublicBreederProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).send({ message: req.t('user_notFound') });
    }

    // 1. Trova l'allevatore
    const breeder = await User.findOne({
      _id: userId,
      isPublic: true,
      ...getActiveSubscriptionMatch()
    }).select('name avatar address subscription.plan createdAt');

    if (!breeder) {
      return res.status(404).send({ message: req.t('user_notFound') });
    }

    // 2. Trova i rettili pubblici di questo allevatore
    const reptiles = await Reptile.find({
      user: userId,
      isPublic: true,
      status: 'active'
    })
    .select('name species morph sex birthDate price image')
    .sort({ createdAt: -1 });

    res.send({
      breeder,
      reptiles
    });

  } catch (err) {
    console.error("Error getPublicBreederProfile:", err);
    res.status(500).send({ message: req.t('server_error') });
  }
};