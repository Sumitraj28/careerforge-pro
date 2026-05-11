const { createCheckoutSession, handleWebhook, PLANS } = require('../services/stripeService');
const User = require('../models/User');

const createSession = async (req, res) => {
  try {
    const { userId, userEmail, plan, billingCycle } = req.body;

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'userId and userEmail are required' });
    }

    // Validate Stripe key is present and correct type
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY is not set in environment variables');
      return res.status(500).json({ error: 'Stripe is not configured. Contact support.' });
    }
    if (stripeKey.startsWith('rk_')) {
      console.error('STRIPE_SECRET_KEY is a restricted key (rk_). Use a secret key (sk_test_ or sk_live_) instead.');
      return res.status(500).json({ error: 'Stripe key misconfigured. Use sk_test_ key, not rk_test_.' });
    }

    const validPlans = Object.keys(PLANS);
    const selectedPlan = validPlans.includes(plan) ? plan : 'pro';
    const selectedCycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';

    const session = await createCheckoutSession(userId, userEmail, selectedPlan, selectedCycle);
    res.json({ url: session.url });
  } catch (error) {
    console.error('Create checkout session error:', error.message || error);
    const msg = error.type === 'StripeAuthenticationError'
      ? 'Invalid Stripe API key. Check STRIPE_SECRET_KEY on Render.'
      : error.message || 'Failed to create checkout session';
    res.status(500).json({ error: msg });
  }
};

const getPlans = (req, res) => {
  const plans = Object.entries(PLANS).map(([key, config]) => ({
    id: key,
    name: config.name,
    description: config.description,
    monthlyPrice: config.monthly / 100,
    yearlyPrice: config.yearly / 100,
    yearlyMonthly: Math.round(config.yearly / 12) / 100,
  }));
  res.json({ plans });
};

const getStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('plan resumeCount');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ plan: user.plan, resumeCount: user.resumeCount });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
};

const webhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;

    const result = await handleWebhook(payload, signature);
    res.json(result);
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    res.status(400).send(`Webhook error: ${error.message}`);
  }
};

module.exports = {
  createSession,
  getPlans,
  getStatus,
  webhook
};
