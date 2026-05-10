const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.get('/models', aiController.getModels);
router.post('/extract-keywords', aiController.extractKeywordsController);
router.post('/rewrite-resume', aiController.rewriteResumeController);
router.post('/cover-letter', aiController.coverLetterController);
router.post('/ats-score', aiController.atsScoreController);
router.post('/quality-check', aiController.qualityCheckController);

module.exports = router;
