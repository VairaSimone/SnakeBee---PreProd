import FoodInventory from '../models/FoodInventory.js';
import User from '../models/User.js';
import { logAction } from '../utils/logAction.js';
import Reptile from '../models/Reptile.js';
import Feeding from '../models/Feeding.js';
import mongoose from 'mongoose';
async function isInventoryAccessAllowed(userId) {
  const user = await User.findById(userId);
  return user?.subscription?.plan === 'BREEDER';
}


export const getInventory = async (req, res) => {
  try {
    if (!req.user || !req.user.userid) {
      return res.status(401).json({ message:  req.t('user_notFound') });
    }

    if (!await isInventoryAccessAllowed(req.user.userid)) {
      return res.status(403).json({ message: req.t('premium_only_feature') });
    }

    const inventory = await FoodInventory.find({ user: req.user.userid });
    res.json(inventory);
  } catch (err) {
    console.error('Error retrieving inventory:', err);
    res.status(500).json({ message: req.t('error_inventory') });
  }
};

export const updateInventoryItem = async (req, res) => {
  const { id } = req.params;
  const { quantity, weightPerUnit } = req.body;

  if (!isInventoryAccessAllowed(req.user.userid)) {
    return res.status(403).json({ message: req.t('premium_only_feature')  });
  }

  try {
    const item = await FoodInventory.findOneAndUpdate(
      { _id: id, user: req.user.userid },
      { quantity, weightPerUnit },
      { new: true }
    );

    if (!item) return res.status(404).json({ message: req.t('invalid_value') });

    res.json(item);
  } catch (err) {
    res.status(500).json({ message: req.t('error_inventory') });
  }
};

export const addInventoryItem = async (req, res) => {
  const { foodType, quantity, weightPerUnit } = req.body;
  const userId = req.user.userid;

  if (!isInventoryAccessAllowed(req.user.userid)) {
    return res.status(403).json({ message: req.t('premium_only_feature')  });
  }

  try {
    // Check if an item with the same type and weight per unit already exists
    const existing = await FoodInventory.findOne({
      user: userId,
      foodType,
      weightPerUnit,
    });

    if (existing) {
      // If it already exists, add the quantity but do NOT touch the weightPerUnit
      existing.quantity = Number(existing.quantity) + Number(quantity);
      await existing.save();
      return res.json(existing);
    }

    // Otherwise, create a new element
    const newItem = new FoodInventory({
      user: userId,
      foodType,
      quantity,
      weightPerUnit,
    });
    await logAction(req.user.userid, "Create Inventory");

    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: req.t('error_inventory') });
  }
};

export const deleteFeeding = async (req, res) => {
  const { id } = req.params;

  if (!isInventoryAccessAllowed(req.user.userid)) {
    return res.status(403).json({ message: req.t('premium_only_feature')  });
  }

  try {
    const deleted = await FoodInventory.findOneAndDelete({
      _id: id,
      user: req.user.userid,
    });

    if (!deleted) {
      return res.status(404).json({ message: req.t('invalid_value')});
    }

    res.json({ message: req.t('element_delete') });
  } catch (err) {
    console.error('Error while deleting:', err);
    res.status(500).json({ message: req.t('error_inventory') });
  }
};

export const getFeedingSuggestions = async (req, res) => {
  try {
    const userId = req.user.userid;

    if (!await isInventoryAccessAllowed(userId)) {
      return res.status(403).json({ message: req.t('premium_only_feature') });
    }

    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    // Otteniamo gli ultimi 3 feeding per ogni rettile (solo quelli mangiati)
    const recentFeedings = await Feeding.aggregate([
      { $match: { wasEaten: true } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: "$reptile",
          feedings: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          reptile: "$_id",
          feedings: { $slice: ["$feedings", 3] }
        }
      }
    ]);

    // Preleva informazioni rettili + inventario utente
    const reptileIds = recentFeedings.map(f => f.reptile);
    const reptiles = await Reptile.find({ _id: { $in: reptileIds }, user: userId });
    const inventory = await FoodInventory.find({ user: userId });

    const suggestions = [];

    for (const reptileData of recentFeedings) {
      const reptile = reptiles.find(r => r._id.toString() === reptileData.reptile.toString());
      if (!reptile) continue;

      // Calcolo media pesi e tipo più frequente
      const avgWeight = reptileData.feedings.reduce((acc, f) => acc + f.weightPerUnit, 0) / reptileData.feedings.length;
      const foodTypeFreq = reptileData.feedings.reduce((acc, f) => {
        acc[f.foodType] = (acc[f.foodType] || 0) + 1;
        return acc;
      }, {});
      const mostCommonType = Object.entries(foodTypeFreq).sort((a, b) => b[1] - a[1])[0][0];

      const idealType = reptile.foodType || mostCommonType;
      const idealWeight = reptile.weightPerUnit || Math.round(avgWeight);

      // Cerca nell’inventario la preda più vicina per tipo
      const sameTypeFoods = inventory.filter(i => i.foodType === idealType);
      if (sameTypeFoods.length === 0) {
        suggestions.push({
          reptile: reptile.name,
          idealFood: `${idealType} ${idealWeight}g`,
          suggestion: null,
          message: 'Nessuna preda di questo tipo in inventario'
        });
        continue;
      }

      // Ordina per distanza di peso
      const bestMatch = sameTypeFoods.sort(
        (a, b) => Math.abs(a.weightPerUnit - idealWeight) - Math.abs(b.weightPerUnit - idealWeight)
      )[0];

      suggestions.push({
        reptile: reptile.name,
        idealFood: `${idealType} ${idealWeight}g`,
        suggestion: `${bestMatch.foodType} ${bestMatch.weightPerUnit}g`,
        available: bestMatch.quantity,
        message:
          bestMatch.weightPerUnit === idealWeight
            ? 'Perfetta corrispondenza, scongela questa.'
            : `Preda ideale non trovata, suggerita la più vicina (${bestMatch.weightPerUnit}g).`
      });
    }

    if (suggestions.length === 0) {
      return res.json({ message: req.t('no_feeding_today'), suggestions: [] });
    }

    res.json({ suggestions });

  } catch (err) {
    console.error('Error generating feeding suggestions:', err);
    res.status(500).json({ message: req.t('error_inventory') });
  }
};
