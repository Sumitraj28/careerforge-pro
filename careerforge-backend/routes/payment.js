const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/create-session', paymentController.createSession);
router.get('/plans', paymentController.getPlans);
router.get('/status/:userId', paymentController.getStatus);
router.post('/webhook', paymentController.webhook);

module.exports = router;
