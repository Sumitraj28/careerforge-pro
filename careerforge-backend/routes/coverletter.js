const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const coverletterController = require('../controllers/coverletterController');

router.get('/all', authMiddleware, coverletterController.getAllCoverLetters);
router.post('/save', authMiddleware, coverletterController.saveCoverLetter);
router.delete('/delete/:id', authMiddleware, coverletterController.deleteCoverLetter);

module.exports = router;
