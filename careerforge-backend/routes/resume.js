const express = require('express')
const router = express.Router()
const { generatePDF } = require('../services/puppeteerService')
const authMiddleware = require('../middleware/authMiddleware')
const Resume = require('../models/Resume')
const User = require('../models/User')

// ROUTE 1 — GET /api/resume/all
router.get('/test-pdf', async (req, res) => {
  try {
    const buffer = await generatePDF('<html><body><h1>Hello</h1></body></html>', false);
    res.json({ success: true, size: buffer.length });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const resumes = await Resume.find({ user_id: userId }).sort({ updatedAt: -1 });

    res.json(resumes)
  } catch (error) {
    console.error('Fetch resumes error:', error)
    res.status(500).json({ error: 'Failed to fetch resumes' })
  }
})

// ROUTE 2 — POST /api/resume/save
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { title, resumeData, atsScore, jobDescription, keywords } = req.body
    
    if (!resumeData) {
      return res.status(400).json({ error: 'resumeData is required' })
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.plan === 'free' && user.resumeCount >= 1) {
      return res.status(403).json({ error: 'Free limit reached' });
    }

    const newResume = await Resume.create({
      user_id: req.user._id,
      title: title || 'Untitled Resume',
      resume_data: resumeData,
      ats_score: atsScore || 0,
      job_description: jobDescription || '',
      keywords: keywords || []
    });

    user.resumeCount += 1;
    await user.save();

    res.json(newResume)
  } catch (error) {
    console.error('Save resume error:', error)
    res.status(500).json({ error: 'Failed to save resume' })
  }
})

// ROUTE 3 — PUT /api/resume/update/:id
router.put('/update/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { resumeData, atsScore, title, jobDescription } = req.body

    const updateFields = {};
    if (resumeData !== undefined) updateFields.resume_data = resumeData;
    if (atsScore !== undefined) updateFields.ats_score = atsScore;
    if (title !== undefined) updateFields.title = title;
    if (jobDescription !== undefined) updateFields.job_description = jobDescription;

    const updatedResume = await Resume.findOneAndUpdate(
      { _id: id, user_id: req.user._id },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedResume) {
      return res.status(404).json({ error: 'Resume not found or unauthorized' })
    }

    res.json(updatedResume)
  } catch (error) {
    console.error('Update resume error:', error)
    res.status(500).json({ error: 'Failed to update resume' })
  }
})

// ROUTE 4 — DELETE /api/resume/delete/:id
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    const deletedResume = await Resume.findOneAndDelete({ _id: id, user_id: req.user._id });

    if (!deletedResume) {
      return res.status(404).json({ error: 'Resume not found or unauthorized' })
    }

    const user = await User.findById(req.user._id);
    if (user && user.resumeCount > 0) {
      user.resumeCount -= 1;
      await user.save();
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Delete resume error:', error)
    res.status(500).json({ error: 'Failed to delete resume' })
  }
})

// ROUTE: GET /api/resume/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.json(resume);
  } catch (error) {
    console.error('Get resume by id error:', error);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// ROUTE 5 — POST /api/resume/generate-pdf
// No auth required — both free and pro can download
router.post('/generate-pdf', async (req, res) => {
  try {
    const { resumeHTML, isPro } = req.body
    if (!resumeHTML) {
      return res.status(400).json({ error: 'resumeHTML is required' })
    }

    const pdfBuffer = await generatePDF(resumeHTML, isPro === true)

    // DEBUG: Write to disk to ensure it's generated correctly
    require('fs').writeFileSync('debug_resume.pdf', pdfBuffer);

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf')
    res.setHeader('Content-Length', pdfBuffer.length)
    
    // Use res.end for raw buffers instead of res.send to prevent any Express tampering
    res.end(pdfBuffer)
  } catch (error) {
    console.error('Generate PDF error:', error)
    res.status(500).json({ error: 'Failed to generate PDF' })
  }
})

// ROUTE 6 — POST /api/resume/generate-cover-letter-pdf
router.post('/generate-cover-letter-pdf', async (req, res) => {
  try {
    const { coverLetterText, personalInfo } = req.body;
    if (!coverLetterText) {
      return res.status(400).json({ error: 'coverLetterText is required' });
    }

    const { generateCoverLetterPDF } = require('../services/puppeteerService');
    const pdfBuffer = await generateCoverLetterPDF(coverLetterText, personalInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=cover_letter.pdf');
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate Cover Letter PDF error:', error);
    res.status(500).json({ error: 'Failed to generate Cover Letter PDF' });
  }
});

module.exports = router
