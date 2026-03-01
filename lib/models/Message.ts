import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    message_type: { type: String, default: 'text', enum: ['text', 'image', 'video', 'audio', 'file', 'system'] },
    ipfs_hash: String,
    encrypted_content: String,
    reply_to_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    is_deleted: { type: Boolean, default: false },
    disappearing_timer: Number,
    transaction_hash: String,
    on_chain: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversation_id: 1 });
messageSchema.index({ created_at: -1 });

export default mongoose.models.Message || mongoose.model('Message', messageSchema);
