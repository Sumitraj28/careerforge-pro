const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const CoverLetter = require('../models/CoverLetter');

// ROUTE 1 — GET /api/coverletter/all
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const coverLetters = await CoverLetter.find({ user_id: userId }).sort({ updatedAt: -1 });
    res.json(coverLetters);
  } catch (error) {
    console.error('Fetch cover letters error:', error);
    res.status(500).json({ error: 'Failed to fetch cover letters' });
  }
});

// ROUTE 2 — POST /api/coverletter/save
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { companyName, coverLetterText, jobDescription } = req.body;
    
    if (!coverLetterText) {
      return res.status(400).json({ error: 'coverLetterText is required' });
    }

    const newCoverLetter = await CoverLetter.create({
      user_id: req.user._id,
      companyName: companyName || 'Untitled Company',
      coverLetterText,
      jobDescription: jobDescription || ''
    });

    res.json(newCoverLetter);
  } catch (error) {
    console.error('Save cover letter error:', error);
    res.status(500).json({ error: 'Failed to save cover letter' });
  }
});

// ROUTE 3 — DELETE /api/coverletter/delete/:id
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCoverLetter = await CoverLetter.findOneAndDelete({ _id: id, user_id: req.user._id });

    if (!deletedCoverLetter) {
      return res.status(404).json({ error: 'Cover letter not found or unauthorized' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete cover letter error:', error);
    res.status(500).json({ error: 'Failed to delete cover letter' });
  }
});

module.exports = router;
