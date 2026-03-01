import mongoose from 'mongoose';

const privacySchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    profile_visibility: { type: String, default: 'everyone', enum: ['everyone', 'contacts', 'nobody'] },
    photo_visibility: { type: String, default: 'everyone', enum: ['everyone', 'contacts', 'nobody'] },
    status_visibility: { type: String, default: 'everyone', enum: ['everyone', 'contacts', 'nobody'] },
    last_seen_visibility: { type: String, default: 'everyone', enum: ['everyone', 'contacts', 'nobody'] },
    online_status_visibility: { type: String, default: 'everyone', enum: ['everyone', 'contacts', 'nobody'] },
    message_permissions: { type: String, default: 'everyone', enum: ['everyone', 'contacts', 'nobody'] },
    read_receipts_enabled: { type: Boolean, default: true },
    typing_indicators_enabled: { type: Boolean, default: true },
    incognito_mode: { type: Boolean, default: false },
    block_screenshots: { type: Boolean, default: false },
    two_factor_enabled: { type: Boolean, default: false },
    screen_lock_enabled: { type: Boolean, default: false },
    auto_delete_messages: { type: Boolean, default: false },
    auto_delete_duration: { type: String, default: 'never', enum: ['24h', '7d', '30d', 'never'] },
    hide_ip_address: { type: Boolean, default: true },
    encrypted_backup: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.PrivacySettings || mongoose.model('PrivacySettings', privacySchema);
