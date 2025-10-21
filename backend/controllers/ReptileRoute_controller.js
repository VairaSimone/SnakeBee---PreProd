import Reptile from "../models/Reptile.js";
import mongoose from 'mongoose';
import Feeding from "../models/Feeding.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { getUserPlan } from '../utils/getUserPlans.js'
import { parseDateOrNull } from '../utils/parseReptileHelpers.js';
import { deleteFileIfExists } from "../utils/deleteFileIfExists.js";
import { logAction } from "../utils/logAction.js";
import QRCode from 'qrcode';
import Event from "../models/Event.js";

export const GetAllReptile = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 20;

const reptile = await Reptile.find({ status: 'active' })
            .sort({ species: 1 })
            .skip((page - 1) * perPage)
            .limit(perPage);

const totalResults = await Reptile.countDocuments({ status: 'active' });
        const totalPages = Math.ceil(totalResults / perPage);

        res.send({
            dati: reptile,
            totalPages,
            totalResults,
            page,
        });
    } catch (err) {
        res.status(500).send();
    }
};


export const GetIDReptile = async (req, res) => {
    try {
        const id = req.params.reptileId;
        const reptile = await Reptile.findById(id)

        if (!reptile) res.status(404).send();
        if (reptile.status !== 'active' && reptile.user.toString() !== req.user.userid) {
             return res.status(404).send({ message: req.t('reptile_notFound') });
        }
        else res.send(reptile);
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: req.t('reptile_notFound') });
    }
};

export const GetAllReptileByUser = async (req, res) => {
    try {
        const userId = req.user.userid;
const reptile = await Reptile.find({ user: userId, status: 'active' })
            .sort({ species: 1 })
        if (!reptile || reptile.length === 0) {
            return res.status(404).send({ message: req.t('reptile_notFoundID') });
        }

        res.send({
            dati: reptile,
        });
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: req.t('server_error') });
    }
};

export const GetReptileByUser = async (req, res) => {
  try {
    const userId = req.user.userid;
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 24;
    const { filterMorph, filterSpecies, filterSex, filterBreeder } = req.query;
    const sortKey = req.query.sortKey || 'name'; 
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1; 

const matchQuery = { 
        user: new mongoose.Types.ObjectId(userId),
        status: 'active' 
    };    if (filterMorph) {
      matchQuery.morph = { $regex: filterMorph, $options: 'i' }; 
    }
    if (filterSpecies) {
      matchQuery.species = { $regex: filterSpecies, $options: 'i' };
    }
    if (filterSex) {
      matchQuery.sex = filterSex;
    }
    if (filterBreeder) {
      matchQuery.isBreeder = filterBreeder === 'true';
    }
    let sortOptions = {};
    if (sortKey === 'nextFeedingDate') {
      sortOptions['nextFeedingDate'] = sortOrder;
    } else {
      sortOptions[sortKey] = sortOrder;
    }

    const results = await Reptile.aggregate([
      { $match: matchQuery },

      {
        $lookup: {
          from: "Feeding", 
          localField: "_id",
          foreignField: "reptile",
          as: "feedings"
        }
      },

      {
        $addFields: {
          nextFeedingDate: { $max: "$feedings.nextFeedingDate" }
        }
      },
      
      {
        $project: {
          feedings: 0 
        }
      },
      { $sort: sortOptions },
            {
        $facet: {
          metadata: [ { $count: 'totalResults' } ],
          dati: [
            { $skip: (page - 1) * perPage },
            { $limit: perPage }
          ]
        }
      }
    ]).collation({ locale: "en", strength: 2 }); 
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
    console.error(err);
    res.status(500).send({ message: req.t('server_error') });
  }
};

// NUOVO: Controller per animali archiviati (ceduti/deceduti)
export const GetArchivedReptileByUser = async (req, res) => {
  try {
    const userId = req.user.userid;
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 24;
    const { filterSpecies, filterStatus } = req.query; // Filtri: 'ceded' o 'deceased'
    const sortKey = req.query.sortKey || 'species'; // Default sort
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const matchQuery = {
      user: new mongoose.Types.ObjectId(userId),
      status: { $in: ['ceded', 'deceased'] } // Query per 'ceded' o 'deceased'
    };

    if (filterSpecies) {
      matchQuery.species = { $regex: filterSpecies, $options: 'i' };
    }
    if (filterStatus && ['ceded', 'deceased'].includes(filterStatus)) {
      matchQuery.status = filterStatus; // Filtra per 'ceded' O 'deceased'
    }

    // Aggiungiamo un campo dinamico 'statusDate' per l'ordinamento
    const aggregationPipeline = [
      { $match: matchQuery },
      {
        $addFields: {
          statusDate: { // Data di cessione o decesso
            $cond: {
              if: { $eq: ["$status", "ceded"] },
              then: "$cededTo.date",
              else: "$deceasedDetails.date"
            }
          }
        }
      }
    ];

    // Aggiungi ordinamento
    let sortStage = {};
    if (sortKey === 'statusDate') {
      sortStage = { $sort: { statusDate: sortOrder } };
    } else {
      sortStage = { $sort: { [sortKey]: sortOrder } };
    }
    aggregationPipeline.push(sortStage);

    // Aggiungi paginazione
    aggregationPipeline.push(
      {
        $facet: {
          metadata: [{ $count: 'totalResults' }],
          dati: [
            { $skip: (page - 1) * perPage },
            { $limit: perPage }
          ]
        }
      }
    );

    const results = await Reptile.aggregate(aggregationPipeline).collation({ locale: "en", strength: 2 });

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
    console.error(err);
    res.status(500).send({ message: req.t('server_error') });
  }
};

export const PostReptile = async (req, res) => {
    try {
        const { name, species, morph, birthDate, sex, isBreeder, notes, parents, documents, foodType, weightPerUnit, nextMealDay } = req.body;
        const userId = req.user.userid;
        const parsedParents = typeof parents === 'string' ? JSON.parse(parents) : parents;
        const parsedDocuments = typeof documents === 'string' ? JSON.parse(documents) : documents;
         const user = await User.findById(userId);
        const { plan: userPlan, limits } = getUserPlan(user);
const reptileCount = await Reptile.countDocuments({ user: userId, status: 'active' });
const normalizedFoodType = foodType && foodType.trim() !== '' ? foodType : 'Altro';


        if (reptileCount >= limits.reptiles) {
            return res.status(400).json({
                message: req.t('reptile_limit', { reptiles: limits.reptiles, plan: userPlan })
            });

        }

        let imageUrls = [];

        if (req.files && req.files.length > 0) {
            if (req.files?.length > limits.imagesPerReptile) {
                return res.status(400).json({
                    message: req.t('reptile_limit_image', { imagesPerReptile: limits.imagesPerReptile, plan: userPlan })
                });
            }

            imageUrls = req.files.map(file => `/uploads/${file.filename}`);
        }

        const birthDateObject = parseDateOrNull(birthDate);
        const newReptile = new Reptile({
            _id: new mongoose.Types.ObjectId(),
            name,
            species,
            morph,
            user: userId,
            image: imageUrls,
            birthDate: birthDateObject,
            sex,
            isBreeder,
            notes,
            weightPerUnit,
    foodType: normalizedFoodType,
            nextMealDay, 
            parents: parsedParents,
            documents: parsedDocuments,
            status: 'active'
        });

        const createdReptile = await newReptile.save();
        const publicUrl = `${process.env.FRONTEND_URL}/public/reptile/${createdReptile._id}`;

        const qrCodeDataUrl = await QRCode.toDataURL(publicUrl);
        createdReptile.qrCodeUrl = qrCodeDataUrl;
        await createdReptile.save();
        await logAction(req.user.userid, "Create reptile");

        res.status(201).send(createdReptile);
    } catch (error) {
        console.error(error);
        res.status(400).send({ message: req.t('reptileCreation_error') });
    }
};

export const PutReptile = async (req, res) => {
    try {

        const id = req.params.reptileId;
        const user = await User.findById(req.user.userid);
        const { plan: userPlan, limits } = getUserPlan(user);

const { name, species, morph, sex, notes, birthDate, isBreeder, price, label, parents, documents, foodType, weightPerUnit, nextMealDay,
                status, cededTo, deceasedDetails } = req.body;
let parsedParents, parsedDocuments, parsedCededTo, parsedDeceasedDetails;
        if ('parents' in req.body) {
            parsedParents = typeof req.body.parents === 'string'
                ? JSON.parse(req.body.parents)
                : req.body.parents;
        }

        if ('documents' in req.body) {
            parsedDocuments = typeof req.body.documents === 'string'
                ? JSON.parse(req.body.documents)
                : req.body.documents;
        }

if ('cededTo' in req.body) {
            parsedCededTo = typeof req.body.cededTo === 'string'
                ? JSON.parse(req.body.cededTo)
                : req.body.cededTo;
        }
        if ('deceasedDetails' in req.body) {
            parsedDeceasedDetails = typeof req.body.deceasedDetails === 'string'
                ? JSON.parse(req.body.deceasedDetails)
                : req.body.deceasedDetails;
        }

        let reptile = await Reptile.findById(id);

        if (!reptile) {
            return res.status(404).send({ message: req.t('reptile_notFound') });
        }

        let imageUrls = reptile.image || [];
        if ('price' in req.body) {
            let parsedPrice = req.body.price;

            try {
                if (typeof parsedPrice === 'string') {
                    parsedPrice = JSON.parse(parsedPrice);
                }

                if (parsedPrice === null) {
                    reptile.price = undefined;
                } else if (typeof parsedPrice === 'object' && parsedPrice.amount !== undefined) {
                    const amount = Number(parsedPrice.amount);

                    if (!isNaN(amount) && amount >= 0) {
                        reptile.price = {
                            amount,
                            currency: parsedPrice.currency && ['EUR', 'USD', 'GBP', 'JPY', 'CHF'].includes(parsedPrice.currency)
                                ? parsedPrice.currency
                                : reptile.price?.currency || 'EUR'
                        };
                    }
                }
            } catch (err) {
                console.warn('Invalid price format:', req.body.price);
            }
        }
        if (req.files && req.files.length > 0) {
            const currentImageCount = imageUrls.length;
            const newImageCount = req.files.length;
            const totalImages = currentImageCount + newImageCount;

            if (totalImages > limits.imagesPerReptile) {
                return res.status(400).json({
                    message: req.t('reptile_limit_image', { imagesPerReptile: limits.imagesPerReptile, plan: userPlan })
                });
            }

            const newImages = req.files.map(file => `/uploads/${file.filename}`);
            imageUrls = [...imageUrls, ...newImages];
        }

        const birthDateObject = birthDate ? new Date(birthDate) : reptile.birthDate;
        await logAction(req.user.userid, "Modify reptile");

        if ('name' in req.body) reptile.name = name;
        reptile.species = species || reptile.species;
        reptile.morph = morph || reptile.morph;
        reptile.birthDate = birthDateObject;
        reptile.image = imageUrls;
        reptile.sex = sex || reptile.sex;
        reptile.foodType = foodType;
        reptile.weightPerUnit = weightPerUnit;
        reptile.nextMealDay = nextMealDay;

        if ('label' in req.body) {
            try {
                reptile.label = typeof req.body.label === 'string'
                    ? JSON.parse(req.body.label)
                    : req.body.label;
            } catch (err) {
                console.warn('Non-parsable label:', req.body.label);
            }
        }

        reptile.isBreeder = isBreeder === 'true' || isBreeder === true;
        if ('notes' in req.body) reptile.notes = notes;
        if ('parents' in req.body) reptile.parents = parsedParents;
        if ('documents' in req.body) reptile.documents = parsedDocuments;
        if ('status' in req.body && ['active', 'ceded', 'deceased', 'other'].includes(status)) {
            reptile.status = status;

            if (status === 'ceded' && parsedCededTo) {
                reptile.cededTo = {
                    name: parsedCededTo.name,
                    surname: parsedCededTo.surname,
                    notes: parsedCededTo.notes,
                    date: parsedCededTo.date ? new Date(parsedCededTo.date) : new Date() // Data o default a oggi
                };
                reptile.deceasedDetails = undefined; // Pulisce l'altro stato
            } else if (status === 'deceased' && parsedDeceasedDetails) {
                reptile.deceasedDetails = {
                    notes: parsedDeceasedDetails.notes,
                    date: parsedDeceasedDetails.date ? new Date(parsedDeceasedDetails.date) : new Date()
                };
                reptile.cededTo = undefined; // Pulisce l'altro stato
            } else if (status === 'active') {
                // Se l'animale torna attivo, puliamo i dettagli
                reptile.cededTo = undefined;
                reptile.deceasedDetails = undefined;
            }
        }
        const updatedReptile = await reptile.save();

        res.send(updatedReptile);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: req.t('reptileUpdate_error') });
    }
};

export const DeleteReptileImage = async (req, res) => {
    try {
        const { reptileId, imageIndex } = req.params;

        const reptile = await Reptile.findById(reptileId);
        if (!reptile) return res.status(404).json({ message: req.t('reptile_notFound') });

        const index = parseInt(imageIndex);
        if (isNaN(index) || index < 0 || index >= reptile.image.length) {
            return res.status(400).json({ message: req.t('invalid_value') });
        }

        const imageToRemove = reptile.image[index];
        await deleteFileIfExists(imageToRemove);
        reptile.image.splice(index, 1);
        await reptile.save();

        await logAction(req.user.userid, `Delete reptile image at index ${index}`);

        res.status(200).json({
            message: req.t('imageDelete'),
            remainingImages: reptile.image
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: req.t('imageDelete_error') });
    }
};


export const DeleteReptile = async (req, res) => {
    try {
        const reptileId = req.params.reptileId;
        const reptile = await Reptile.findById(reptileId);
        if (!reptile) return res.status(404).send({ message: req.t('reptile_notFound') });
if (reptile.image && reptile.image.length > 0) {
  for (const imgPath of reptile.image) {
    await deleteFileIfExists(imgPath);
  }
}
        await Feeding.deleteMany({ reptile: reptileId });

        await Notification.deleteMany({ reptile: reptileId });

        await Reptile.findByIdAndDelete(reptileId);
        await logAction(req.user.userid, "Delete reptile");

        res.send({ message: req.t('reptile_delete') });
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: req.t('server_error') });
    }
};


export const GetReptilePublic = async (req, res) => {
    try {
        const reptileId = req.params.reptileId;
        const reptile = await Reptile.findById(reptileId)
            .populate("user", "subscription name email address phoneNumber");

        if (!reptile) {
            return res.status(404).send({ message: req.t("reptile_notFound") });
        }
        if (reptile.status !== 'active') {
             return res.status(404).send({ message: req.t("reptile_notFound") });
        }
        if (!reptile.qrCodeUrl) {
            return res.status(404).send({ message: req.t("reptile_notFound") });
        }
        const { plan, status } = reptile.user.subscription;

        const isPremiumActive =
            plan === "BREEDER" &&
            ["active", "processing", "incomplete"].includes(status);

        if (!isPremiumActive) {
            return res.status(404).send({ message: req.t("reptile_notFound") });
        }
        const feedings = await Feeding.find({ reptile: reptileId })
            .sort({ date: -1 })
            .lean();

        const events = await Event.find({ reptile: reptileId })
            .sort({ date: -1 })
            .lean();

        const reptileData = reptile.toObject();

        const owner = {
            name: reptile.user.name,
            email: reptile.user.email,
            phoneNumber: reptile.user.phoneNumber,
            address: reptile.user.address

        };

        delete reptileData.user;

        res.send({
            reptile: reptileData,
            owner,
            feedings,
            events,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: req.t("server_error") });
    }
};