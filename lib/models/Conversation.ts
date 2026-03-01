import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, default: 'direct', enum: ['direct', 'group'] },
    name: String,
    group_picture: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_message_at: Date,
  },
  { timestamps: true }
);

conversationSchema.index({ updatedAt: -1 });

export default mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
