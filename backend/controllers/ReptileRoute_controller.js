import Reptile from "../models/Reptile.js";
import mongoose from 'mongoose';
import Feeding from "../models/Feeding.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { getUserPlan } from '../utils/getUserPlans.js'

import { parseDateOrNull } from '../utils/parseReptileHelpers.js';
import { deleteFileIfExists } from "../utils/deleteFileIfExists.js";
import { logAction } from "../utils/logAction.js";

export const GetAllReptile = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 20;

        const reptile = await Reptile.find({})
            .sort({ species: 1 })
            .skip((page - 1) * perPage)
            .limit(perPage);

        const totalResults = await Reptile.countDocuments();
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
        else res.send(reptile);
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: 'Not Found' });
    }
};

export const GetAllReptileByUser = async (req, res) => {
    try {
        const userId = req.params.userId;

        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;

        const reptile = await Reptile.find({ user: userId })
            .sort({ species: 1 })
            .skip((page - 1) * perPage)
            .limit(perPage);

        const totalResults = await Reptile.countDocuments({ user: userId });
        const totalPages = Math.ceil(totalResults / perPage);

        if (!reptile || reptile.length === 0) {
            return res.status(404).send({ message: `No reptiles found for this person ${userId}` });
        }

        res.send({
            dati: reptile,
            totalPages,
            totalResults,
            page,
        });
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: 'Server error' });
    }
};


export const PostReptile = async (req, res) => {
    try {
        const { name, species, morph, birthDate, sex, isBreeder, notes, parents, documents } = req.body;
        const userId = req.user.userid;
        const parsedParents = typeof parents === 'string' ? JSON.parse(parents) : parents;
        const parsedDocuments = typeof documents === 'string' ? JSON.parse(documents) : documents;

        // Controllo limite massimo
        const user = await User.findById(userId);
const { plan: userPlan, limits } = getUserPlan(user);
        const reptileCount = await Reptile.countDocuments({ user: userId });


        if (reptileCount >= limits.reptiles) {
            return res.status(400).json({
                message: `Hai raggiunto il limite massimo (${limits.reptiles}) di rettili per il piano "${userPlan}".`
            });

        }

        let imageUrls = [];

        if (req.files && req.files.length > 0) {
            if (req.files?.length > limits.imagesPerReptile) {
                return res.status(400).json({
                    message: `Il tuo piano (${userPlan}) permette al massimo ${limits.imagesPerReptile} immagini per rettile.`
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
            parents: parsedParents,
            documents: parsedDocuments,
        });

        const createdReptile = await newReptile.save();
        await logAction(req.user.userid, "Create reptile");

        res.status(201).send(createdReptile);
    } catch (error) {
        console.error(error);
        res.status(400).send({ message: 'Error creating reptile' });
    }
};

export const PutReptile = async (req, res) => {
    try {

        const id = req.params.reptileId;
        const user = await User.findById(userId);
const { plan: userPlan, limits } = getUserPlan(user);
        const { name, species, morph, sex, notes, birthDate, isBreeder, label, parents, documents } = req.body;
        let parsedParents, parsedDocuments;
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


        let reptile = await Reptile.findById(id);

        if (!reptile) {
            return res.status(404).send({ message: 'Reptile not found' });
        }

        let imageUrls = reptile.image || []; // immagini esistenti

        if (req.files && req.files.length > 0) {
            if (req.files?.length > limits.imagesPerReptile) {
                return res.status(400).json({
                    message: `Puoi avere al massimo ${limits.imagesPerReptile} immagini per rettile con il piano "${userPlan}".`
                });
            }

            const newImages = req.files.map(file => `/uploads/${file.filename}`);
            imageUrls = [...imageUrls, ...newImages];
        }


        const parseDateOrNull = (value) => {
            if (!value || value === 'null') return null;
            return new Date(value);
        };

        const parseNumberOrNull = (value) => {
            if (!value || value === 'null') return null;
            return Number(value);
        };

        const birthDateObject = birthDate ? new Date(birthDate) : reptile.birthDate;
        await logAction(req.user.userid, "Modify reptile");

        if ('name' in req.body) reptile.name = name;
        reptile.species = species || reptile.species;
        reptile.morph = morph || reptile.morph;
        reptile.birthDate = birthDateObject;
        reptile.image = imageUrls;
        reptile.sex = sex || reptile.sex;
        if ('label' in req.body) {
            try {
                reptile.label = typeof req.body.label === 'string'
                    ? JSON.parse(req.body.label)
                    : req.body.label;
            } catch (err) {
                console.warn('Label non parsabile:', req.body.label);
            }
        }

        reptile.isBreeder = isBreeder === 'true' || isBreeder === true;
        if ('notes' in req.body) reptile.notes = notes;
        if ('parents' in req.body) reptile.parents = parsedParents;
        if ('documents' in req.body) reptile.documents = parsedDocuments;
        const updatedReptile = await reptile.save();

        res.send(updatedReptile);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Error updating reptile' });
    }
};

export const DeleteReptileImage = async (req, res) => {
    try {
        const { reptileId, imageIndex } = req.params;

        const reptile = await Reptile.findById(reptileId);
        if (!reptile) return res.status(404).json({ message: 'Reptile not found' });

        const index = parseInt(imageIndex);
        if (isNaN(index) || index < 0 || index >= reptile.image.length) {
            return res.status(400).json({ message: 'Indice immagine non valido' });
        }

        const imageToRemove = reptile.image[index];

        // Rimuovi file dal filesystem
        await deleteFileIfExists(imageToRemove); // Assicurati che gestisca il path corretto

        // Rimuovi dal DB
        reptile.image.splice(index, 1);
        await reptile.save();

        await logAction(req.user.userid, `Delete reptile image at index ${index}`);

        res.status(200).json({
            message: `Immagine rimossa con successo`,
            remainingImages: reptile.image
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Errore nella rimozione dell\'immagine' });
    }
};


export const DeleteReptile = async (req, res) => {
    try {
        const reptileId = req.params.reptileId;
        const reptile = await Reptile.findById(reptileId);
        if (!reptile) return res.status(404).send({ message: 'Reptile not found' });
        if (reptile.image) {
            await deleteFileIfExists(reptile.image);
        }
        await Feeding.deleteMany({ reptile: reptileId });

        await Notification.deleteMany({ reptile: reptileId });

        await Reptile.findByIdAndDelete(reptileId);
        await logAction(req.user.userid, "Delete reptile");

        res.send({ message: 'Reptile and associated data successfully deleted' });
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: 'Server error' });
    }
};
