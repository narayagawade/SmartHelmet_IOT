const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, default: '' },
  phone: { type: String, default: '' },
  vehicle: { type: String, default: '' },
  role: { type: String, enum: ['rider', 'family'], required: true },
  fcmToken: { type: String, default: '' },

  // Rider-specific fields
  linkedFamily: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  linkingCode: { type: String, default: null },
  linkingCodeExpiry: { type: Date, default: null },

  // Family-specific fields
  linkedRider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Current alert (for false alert handling)
  currentAlert: {
    type: {
      type: String,
      enum: ['fall', 'alcohol', 'drowsiness'],
    },
    location: String,
    timestamp: Date,
    active: { type: Boolean, default: false },
    confirmed: { type: Boolean, default: false },
  },

  // Alert history (all past alerts)
  alertHistory: [{
    type: { type: String, enum: ['fall', 'alcohol', 'drowsiness'] },
    location: String,
    timestamp: Date,
    active: { type: Boolean, default: false },
    dismissed: { type: Boolean, default: false },
  }],

  // Sensor diagnostics (latest from helmet)
  sensorStatus: {
    alcohol: { type: Number, default: 0 },
    drowsy: { type: Boolean, default: false },
    fall: { type: Boolean, default: false },
    helmetOn: { type: Boolean, default: false },
    gpsActive: { type: Boolean, default: false },
    lastUpdate: { type: Date, default: null },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
