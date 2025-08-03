// models/GhostCustomer.js
import mongoose, { Schema } from 'mongoose';

const ghostCustomerSchema = new Schema({
  stripeCustomerId: { type: String, required: true, unique: true },
  eventType: String,
  receivedAt: { type: Date, default: Date.now },
  rawEvent: Schema.Types.Mixed, // puoi salvarci l'intero event.data.object
});

export default mongoose.models.GhostCustomer || mongoose.model('GhostCustomer', ghostCustomerSchema);
