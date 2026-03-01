import mongoose from 'mongoose';

const blockedSchema = new mongoose.Schema(
  {
    blocker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    blocked_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

blockedSchema.index({ blocker_id: 1, blocked_id: 1 }, { unique: true });
blockedSchema.index({ blocker_id: 1 });

export default mongoose.models.BlockedUser || mongoose.model('BlockedUser', blockedSchema);
