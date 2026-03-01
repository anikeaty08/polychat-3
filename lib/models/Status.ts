import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: String,
    image_url: String,
    views_count: { type: Number, default: 0 },
    transaction_hash: String,
    on_chain: { type: Boolean, default: false },
    expires_at: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

statusSchema.index({ user_id: 1 });
statusSchema.index({ expires_at: 1 });

export default mongoose.models.Status || mongoose.model('Status', statusSchema);
