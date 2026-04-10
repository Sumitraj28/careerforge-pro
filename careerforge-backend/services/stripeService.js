const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const User = require('../models/User')

/**
 * Plan pricing configuration (amounts in cents — USD)
 * Matches the 3-tier pricing on the website:
 *   Base: $80/mo  |  $60/mo (yearly → $720/yr)
 *   Pro:  $120/mo |  $90/mo (yearly → $1080/yr)
 *   Enterprise: $260/mo | $200/mo (yearly → $2400/yr)
 */
const PLANS = {
  base: {
    name: 'CareerForge Base',
    description: 'All limited links, analytics, chat support, optimize hashtags, unlimited users.',
    monthly: 80,   // $80.00
    yearly: 720,   // $720.00 ($60/mo equivalent)
  },
  pro: {
    name: 'CareerForge Pro',
    description: 'Everything in Base plus unlimited resumes, ATS checker, cover letters, premium templates & priority support.',
    monthly: 120,  // $120.00
    yearly: 1080,  // $1,080.00 ($90/mo equivalent)
  },
  enterprise: {
    name: 'CareerForge Enterprise',
    description: 'Everything in Pro plus dedicated support, team collaboration, custom branding & API access.',
    monthly: 260,  // $260.00
    yearly: 2400,  // $2,400.00 ($200/mo equivalent)
  },
}

/**
 * Create a Stripe Checkout session for the given plan + billing period.
 * @param {string} userId       - MongoDB user ID
 * @param {string} userEmail    - Customer email
 * @param {string} plan         - 'base' | 'pro' | 'enterprise'
 * @param {string} billingCycle - 'monthly' | 'yearly'
 */
async function createCheckoutSession(userId, userEmail, plan = 'pro', billingCycle = 'monthly') {
  const planConfig = PLANS[plan]
  if (!planConfig) {
    throw new Error(`Invalid plan: ${plan}. Must be one of: base, pro, enterprise`)
  }

  const isYearly = billingCycle === 'yearly'
  const unitAmount = isYearly ? planConfig.yearly : planConfig.monthly

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${planConfig.name} ${isYearly ? '(Yearly)' : '(Monthly)'}`,
            description: planConfig.description,
          },
          unit_amount: unitAmount,
          recurring: {
            interval: isYearly ? 'year' : 'month',
          },
        },
        quantity: 1,
      }
    ],
    metadata: { userId, plan },
    success_url: process.env.FRONTEND_URL + '/dashboard?payment=success',
    cancel_url: process.env.FRONTEND_URL + '/pricing',
  })

  return session
}

/**
 * Handle incoming Stripe webhook events.
 */
async function handleWebhook(payload, signature) {
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata.userId
    const plan = session.metadata.plan || 'pro'
    const stripeCustomerId = session.customer
    const stripeSubscriptionId = session.subscription

    await User.findByIdAndUpdate(userId, {
      plan,
      stripeCustomerId,
      stripeSubscriptionId,
    })
    console.log(`User ${userId} upgraded to ${plan}`)
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const customerId = subscription.customer
    await User.findOneAndUpdate(
      { stripeCustomerId: customerId },
      { plan: 'free' }
    )
  }

  if (event.type === 'customer.subscription.updated') {
    // Handle plan changes (upgrades / downgrades)
    const subscription = event.data.object
    const customerId = subscription.customer
    // If the subscription is still active, keep the plan; otherwise downgrade
    if (subscription.status === 'active') {
      // Plan info could be extracted from metadata if needed
    } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      await User.findOneAndUpdate(
        { stripeCustomerId: customerId },
        { plan: 'free' }
      )
    }
  }

  return { received: true }
}

module.exports = { createCheckoutSession, handleWebhook, PLANS }
