const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const resumeController = require('../controllers/resumeController');

router.get('/test-pdf', resumeController.testPdf);
router.get('/all', authMiddleware, resumeController.getAllResumes);
router.post('/save', authMiddleware, resumeController.saveResume);
router.put('/update/:id', authMiddleware, resumeController.updateResume);
router.delete('/delete/:id', authMiddleware, resumeController.deleteResume);
router.get('/:id', authMiddleware, resumeController.getResumeById);
router.post('/generate-pdf', resumeController.generateResumePdf);
router.post('/generate-cover-letter-pdf', resumeController.generateCoverLetterPdf);

module.exports = router;
