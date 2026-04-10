const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Untitled Resume' },
  resume_data: { type: Object, required: true },
  ats_score: { type: Number, default: 0 },
  job_description: { type: String, default: '' },
  keywords: { type: Array, default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);
