import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    search_term: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.SearchHistory || mongoose.model('SearchHistory', searchHistorySchema);
