import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    wallet_address: { type: String, required: true, unique: true },
    username: { type: String, unique: true, sparse: true },
    display_name: String,
    profile_picture: String,
    status: { type: String, default: '' },
    last_seen: { type: Date, default: Date.now },
    is_online: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ wallet_address: 1 });
userSchema.index({ username: 1 });

export default mongoose.models.User || mongoose.model('User', userSchema);
