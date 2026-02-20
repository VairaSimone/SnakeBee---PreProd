import mongoose, { Schema } from 'mongoose';

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },

    price: { type: Number, required: true },

    category: { 
      type: String, 
      enum: ['kit', 'lampada', 'substrato', 'accessori'] 
    },

    // Per i suggerimenti smart
    targetSpecies: [{ type: String }],

    stock: { type: Number, default: 0 },

    imageUrl: { type: String },

    stripePriceId: { type: String }
  },
  {
    timestamps: true,
    collection: "Product"
  }
);

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;
