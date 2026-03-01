import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reported_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: String,
    description: String,
  },
  { timestamps: true }
);

reportSchema.index({ reporter_id: 1, reported_id: 1 }, { unique: true });

export default mongoose.models.Report || mongoose.model('Report', reportSchema);
