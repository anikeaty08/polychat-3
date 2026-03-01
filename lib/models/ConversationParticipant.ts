import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'member', enum: ['admin', 'member'] },
    muted: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    last_read_at: Date,
  },
  { timestamps: true }
);

participantSchema.index({ conversation_id: 1, user_id: 1 }, { unique: true });
participantSchema.index({ user_id: 1 });

export default mongoose.models.ConversationParticipant || mongoose.model('ConversationParticipant', participantSchema);
