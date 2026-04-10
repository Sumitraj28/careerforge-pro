const mongoose = require('mongoose');

const coverLetterSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, default: 'Untitled Company' },
  coverLetterText: { type: String, required: true },
  jobDescription: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CoverLetter', coverLetterSchema);
