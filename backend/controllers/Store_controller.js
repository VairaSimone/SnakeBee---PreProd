import Product from "../models/Product.js";
import Reptile from "../models/Reptile.js";
import Order from "../models/Order.js";

export const getShopData = async (req, res) => {
  try {
    const products = await Product.find();
    let suggested = [];
    
    // 1. SUGGERIMENTI SMART: Trova i rettili dell'utente
    if (req.user) {
      const userReptiles = await Reptile.find({ user: req.user._id });
      const speciesOwned = userReptiles.map(r => r.species); // array di specie
      
      suggested = products.filter(p => 
        p.targetSpecies.some(species => speciesOwned.includes(species))
      );
    }
    
    res.status(200).json({ products, suggested });
  } catch (error) {
    res.status(500).json({ message: 'Errore nel caricamento dello shop', error });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};