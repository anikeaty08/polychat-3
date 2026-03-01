import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

contactSchema.index({ user_id: 1, contact_id: 1 }, { unique: true });

export default mongoose.models.Contact || mongoose.model('Contact', contactSchema);
