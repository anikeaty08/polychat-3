import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
  },
  { timestamps: true }
);

reactionSchema.index({ message_id: 1, user_id: 1, emoji: 1 }, { unique: true });

export default mongoose.models.MessageReaction || mongoose.model('MessageReaction', reactionSchema);
