import mongoose, { Schema } from 'mongoose';

const orderSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        name: { type: String }
      }
    ],

    totalAmount: { type: Number, required: true },

    stripeSessionId: { type: String },

    shippingDetails: { type: Object }, // Indirizzo da Stripe

    status: {
      type: String,
      enum: ['In lavorazione', 'Spedito', 'Completato', 'Annullato'],
      default: 'In lavorazione'
    },

    trackingNumber: { type: String },

    receiptUrl: { type: String } // URL fattura Stripe
  },
  {
    timestamps: true,
    collection: "Order"
  }
);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;
