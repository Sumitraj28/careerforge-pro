const express = require('express')
const router = express.Router()
const { createCheckoutSession, handleWebhook, PLANS } = require('../services/stripeService')
const User = require('../models/User')

/**
 * POST /api/payment/create-session
 * Body: { userId, userEmail, plan, billingCycle }
 */
router.post('/create-session', async (req, res) => {
  try {
    const { userId, userEmail, plan, billingCycle } = req.body

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'userId and userEmail are required' })
    }

    const validPlans = Object.keys(PLANS)
    const selectedPlan = validPlans.includes(plan) ? plan : 'pro'
    const selectedCycle = billingCycle === 'yearly' ? 'yearly' : 'monthly'

    const session = await createCheckoutSession(userId, userEmail, selectedPlan, selectedCycle)
    res.json({ url: session.url })
  } catch (error) {
    console.error('Create checkout session error:', error)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

/**
 * GET /api/payment/plans
 * Returns the available plans and their pricing for the frontend.
 */
router.get('/plans', (req, res) => {
  const plans = Object.entries(PLANS).map(([key, config]) => ({
    id: key,
    name: config.name,
    description: config.description,
    monthlyPrice: config.monthly / 100,
    yearlyPrice: config.yearly / 100,
    yearlyMonthly: Math.round(config.yearly / 12) / 100,
  }))
  res.json({ plans })
})

/**
 * GET /api/payment/status/:userId
 * Returns the user's current plan status (for polling after payment).
 */
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const user = await User.findById(userId).select('plan resumeCount')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ plan: user.plan, resumeCount: user.resumeCount })
  } catch (error) {
    console.error('Payment status error:', error)
    res.status(500).json({ error: 'Failed to get payment status' })
  }
})

/**
 * POST /api/payment/webhook
 * Stripe webhook — must receive raw body (not parsed by express.json).
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature']
    const payload = req.body

    const result = await handleWebhook(payload, signature)
    res.json(result)
  } catch (error) {
    console.error('Stripe webhook error:', error.message)
    res.status(400).send(`Webhook error: ${error.message}`)
  }
})

module.exports = router
