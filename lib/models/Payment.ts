import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    transaction_hash: { type: String, unique: true },
    amount: String,
    status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'failed'] },
    verified_at: Date,
    recipient_address: String,
    payment_platform: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
