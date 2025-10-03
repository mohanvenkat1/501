const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  sport: { type: mongoose.Schema.Types.ObjectId, ref: 'Sport', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamA: { type: String, default: '' },
  teamB: { type: String, default: '' },
  lookingFor: { type: Number, default: 0, min: 0 },
  startTime: { type: Date, required: true },
  venue: { type: String, required: true },
  status: { type: String, enum: ['scheduled', 'cancelled', 'completed'], default: 'scheduled' },
  cancelReason: { type: String },
  participants: [participantSchema],
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
