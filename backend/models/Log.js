import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  note: { type: String }, // opzionale, es: "edit reptile 64f...abc"
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.models.Log || mongoose.model('Log', logSchema);
