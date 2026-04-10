import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { createPaymentSession } from '../utils/api';
import './Pricing.css';

const PLANS = [
  {
    id: 'base',
    name: 'Base',
    desc: 'For individuals getting started with resume optimization',
    monthlyPrice: 80,
    yearlyPrice: 60,
    features: [
      '3 Resume generations',
      'ATS Score checker',
      'Basic templates (3)',
      'PDF download',
      'Email support',
    ],
    btnStyle: 'pr-card__btn--outline',
    btnLabel: 'Get Started',
  },
  {
    id: 'pro',
    name: 'Pro',
    desc: 'Everything you need to land your dream job',
    monthlyPrice: 120,
    yearlyPrice: 90,
    features: [
      'Unlimited resumes',
      'ATS Score checker',
      'All 5 premium templates',
      'AI resume rewriting',
      'Cover letter generator',
      'Priority support',
    ],
    highlighted: true,
    badge: 'MOST POPULAR',
    btnStyle: 'pr-card__btn--white',
    btnLabel: 'Upgrade to Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    desc: 'For teams and agencies managing multiple candidates',
    monthlyPrice: 260,
    yearlyPrice: 200,
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Custom branding',
      'API access',
      'Dedicated account manager',
    ],
    btnStyle: 'pr-card__btn--outline',
    btnLabel: 'Contact Sales',
  },
];

const FAQS = [
  {
    q: 'Can I try CareerForge for free before upgrading?',
    a: 'Absolutely! The free plan lets you generate 1 resume, check your ATS score, and download a PDF. No credit card required. Upgrade anytime when you need unlimited access.',
  },
  {
    q: 'How does the AI rewrite engine work?',
    a: 'Our AI reads the job description you paste, extracts keywords and requirements, then rewrites your resume bullet points using action verbs, quantified results, and the exact terminology ATS systems scan for.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes, you can cancel your subscription at any time from your dashboard. You will retain access until the end of your current billing cycle. No questions asked.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards (Visa, Mastercard, American Express) via Stripe. More payment methods coming soon.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`pr-faq-item ${open ? 'pr-faq-item--open' : ''}`}>
      <button
        type="button"
        className="pr-faq-item__trigger"
        onClick={() => setOpen(!open)}
      >
        <span>{q}</span>
        <ChevronDown size={18} className="pr-faq-item__arrow" />
      </button>
      {open && <p className="pr-faq-item__answer">{a}</p>}
    </div>
  );
}

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const { user } = useAuth();

  const handleUpgrade = async (planId) => {
    if (!user) {
      toast.error('Please log in to upgrade!');
      return;
    }

    toast.loading('Preparing checkout...', { id: 'checkout-toast' });
    try {
      const billingCycle = yearly ? 'yearly' : 'monthly';
      const userId = user._id || user.id;
      const res = await createPaymentSession(userId, user.email, planId, billingCycle);
      toast.dismiss('checkout-toast');
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.dismiss('checkout-toast');
      toast.error('Failed to start checkout process.');
      console.error(err);
    }
  };

  return (
    <div className="pr-page" id="pricing-page">
      {/* ── Hero header ── */}
      <section className="pr-hero">
        <div className="pr-hero__content">
          <h1 className="pr-title">Simple, transparent pricing</h1>
          <p className="pr-subtitle">No contracts. No surprise fees.</p>

          {/* Toggle */}
          <div className="pr-toggle">
            <button
              type="button"
              className={`pr-toggle__btn ${!yearly ? 'pr-toggle__btn--active' : ''}`}
              onClick={() => setYearly(false)}
            >
              MONTHLY
            </button>
            <button
              type="button"
              className={`pr-toggle__btn ${yearly ? 'pr-toggle__btn--active' : ''}`}
              onClick={() => setYearly(true)}
            >
              YEARLY
            </button>
          </div>
        </div>
      </section>

      {/* ── Plan cards — 3 columns ── */}
      <section className="pr-plans">
        <div className="pr-plans__inner">
          {PLANS.map((plan) => (
            <div
              className={`pr-card ${plan.highlighted ? 'pr-card--pro' : ''}`}
              id={`${plan.id}-plan`}
              key={plan.id}
            >
              {plan.badge && <div className="pr-card__badge">{plan.badge}</div>}

              <div className="pr-card__price-block">
                <span className="pr-card__currency">₹</span>
                <span className="pr-card__amount">
                  {yearly ? plan.yearlyPrice : plan.monthlyPrice}
                </span>
                <span className="pr-card__period">/month</span>
              </div>

              <h2 className="pr-card__name">{plan.name}</h2>
              <p className="pr-card__desc">{plan.desc}</p>

              <ul className="pr-card__features">
                {plan.features.map((feat, i) => (
                  <li key={i}>
                    <CheckCircle2 size={16} className="pr-card__check" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`pr-card__btn ${plan.btnStyle}`}
                onClick={() => handleUpgrade(plan.id)}
              >
                {plan.btnLabel}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pr-faq" id="pricing-faq">
        <div className="pr-faq__inner">
          <h2 className="pr-faq__title">Frequently Asked Questions</h2>
          <div className="pr-faq__list">
            {FAQS.map((f, i) => (
              <FAQItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
