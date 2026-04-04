import User from "../models/User.js";
import Reptile from "../models/Reptile.js";
import Feeding from "../models/Feeding.js"; // Usato per misurare l'attività

export const getLeaderboards = async (req, res) => {
    try {
        // 1. Top 5 Allevatori con più rettili
        const topKeepers = await Reptile.aggregate([
            { $group: { _id: "$owner", count: { $sum: 1 } } }, // Raggruppa per proprietario
            { $sort: { count: -1 } },
            { $limit: 5 },
            { 
                $lookup: { // Join con la collezione User per i nomi
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },
            { $project: { name: "$userDetails.name", count: 1 } }
        ]);

        // 2. Top 5 Allevatori più attivi (basato sul numero di pasti registrati)
        // Poiché Log.js è vuoto, usiamo i pasti (Feeding) come proxy dell'attività
        const topActive = await Feeding.aggregate([
            { $group: { _id: "$userId", activityCount: { $sum: 1 } } },
            { $sort: { activityCount: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },
            { $project: { name: "$userDetails.name", activityCount: 1 } }
        ]);

        // 3. Top 5 Allevatori che hanno invitato più persone
        // Assumendo che il modello User abbia un campo 'referralCount' o simile
        const topReferrers = await User.find()
            .sort({ referralCount: -1 }) // Ordina per numero di inviti
            .limit(5)
            .select("name referralCount");

        res.status(200).json({ topKeepers, topActive, topReferrers });
    } catch (error) {
        res.status(500).json({ message: "Errore nel caricamento delle classifiche", error });
    }
};