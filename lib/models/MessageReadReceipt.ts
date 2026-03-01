import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema(
  {
    message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    read_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

receiptSchema.index({ message_id: 1, user_id: 1 }, { unique: true });

export default mongoose.models.MessageReadReceipt || mongoose.model('MessageReadReceipt', receiptSchema);
