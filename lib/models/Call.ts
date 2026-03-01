import mongoose from 'mongoose';

const callSchema = new mongoose.Schema(
  {
    conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    caller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    call_type: { type: String, enum: ['audio', 'video'] },
    status: {
      type: String,
      default: 'initiated',
      enum: ['initiated', 'ringing', 'answered', 'completed', 'missed', 'declined', 'cancelled'],
    },
    started_at: Date,
    ended_at: Date,
    duration: Number,
    recording_ipfs_hash: String,
    transaction_hash: String,
    on_chain: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

callSchema.index({ caller_id: 1, receiver_id: 1 });

export default mongoose.models.Call || mongoose.model('Call', callSchema);
