const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const incidentSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true, 
    enum: ['fire', 'medical', 'security', 'general', 'crime'] 
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  responders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { 
    type: String, 
    enum: ['pending', 'active', 'resolved'], 
    default: 'pending' 
  },
  chatMessages: [chatMessageSchema],
  description: String,
  aiAnalysis: {
    questions: [{ type: String }],
    answers: [{ type: String }],
    classification: String,
    confidenceScore: Number
  },
  dispatchedService: {
    name: String,
    serviceType: String,
    location: { lat: Number, lng: Number },
    distance: String,
    duration: String,
    status: { type: String, enum: ['pending', 'dispatched', 'arrived'], default: 'pending' }
  },
  aiOverridden: { type: Boolean, default: false }
}, { 
  timestamps: true // This auto-generates createdAt and updatedAt
});

// Virtual for resolvedAt since we rely on timestamps for logic, 
// but we could explicitly set it. Let's use updatedAt for resolved time.
incidentSchema.virtual('resolvedAt').get(function() {
  if (this.status === 'resolved') return this.updatedAt;
  return null;
});

module.exports = mongoose.model('Incident', incidentSchema);
