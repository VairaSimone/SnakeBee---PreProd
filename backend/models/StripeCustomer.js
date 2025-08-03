import mongoose, { Schema } from 'mongoose';

const stripeCustomerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  customerId: { type: String, required: true },
  email: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.StripeCustomer || mongoose.model('StripeCustomer', stripeCustomerSchema);
