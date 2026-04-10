import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { rewriteResumeSuccess, setLoading } from '../redux/resumeSlice';
import { uploadResume } from '../utils/api';
import toast from 'react-hot-toast';
import {
  Upload,
  FileText,
  Search,
  LayoutDashboard,
  Target,
  ArrowRight,
  CheckCircle2,
  Shield,
  Clock,
  Cpu,
  Sparkles,
  TrendingUp,
  BarChart3,
  Zap,
  Star,
  Users,
  Award,
  MousePointerClick,
} from 'lucide-react';
import './Home.css';

/* ─────────────────────────────────────────────
   HOOKS
   ───────────────────────────────────────────── */

/** Intersection-observer-based "appear on scroll" */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible];
}

/** Animated counter */
function useCounter(end, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
}

/* ─────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────── */
const trustedLogos = [
  { name: 'Google', icon: <Search size={22} /> },
  { name: 'Microsoft', icon: <LayoutDashboard size={22} /> },
  { name: 'Apple', icon: <Cpu size={22} /> },
  { name: 'Amazon', icon: <Target size={22} /> },
  { name: 'Meta', icon: <Sparkles size={22} /> },
];

const features = [
  {
    icon: <Search size={24} />,
    title: 'Keyword Optimization',
    description: 'Identify the exact terms and keywords that ATS systems scan for in your industry and role level.',
    color: '#5b6cf7',
  },
  {
    icon: <LayoutDashboard size={24} />,
    title: 'Smart Formatting',
    description: 'Ensure your layout is machine-readable while looking gorgeous to human recruiters and hiring managers.',
    color: '#22c55e',
  },
  {
    icon: <BarChart3 size={24} />,
    title: 'Recruiter Insights',
    description: 'Get a human-like summary of how recruiters interpret your career trajectory and key achievements.',
    color: '#f59e0b',
  },
];

const steps = [
  { number: 1, title: 'Upload Your Resume', description: 'Securely upload your current resume. We process instantly with high-grade encryption.' },
  { number: 2, title: 'AI Analyzes Everything', description: 'Our engine cross-references against thousands of job descriptions and ATS rules in seconds.' },
  { number: 3, title: 'Get Targeted Fixes', description: 'Receive a detailed score with a checklist of high-impact changes to land more interviews.' },
];

const stats = [
  { value: 50000, suffix: '+', label: 'Resumes Optimized', icon: <FileText size={20} /> },
  { value: 93, suffix: '%', label: 'Interview Rate Increase', icon: <TrendingUp size={20} /> },
  { value: 4.9, suffix: '/5', label: 'User Satisfaction', icon: <Star size={20} />, decimal: true },
  { value: 120, suffix: '+', label: 'Countries Served', icon: <Users size={20} /> },
];

const testimonials = [
  { name: 'Sarah K.', role: 'Software Engineer @ Google', text: 'CareerForge boosted my ATS score from 45% to 92%. Got 3 interviews in the first week!', avatar: 'SK' },
  { name: 'James L.', role: 'Product Manager @ Meta', text: 'The AI rewrite feature is incredible. It completely transformed how I present my experience.', avatar: 'JL' },
  { name: 'Priya M.', role: 'Data Scientist @ Amazon', text: 'Finally understood why my applications were being rejected. The keyword analysis is next level.', avatar: 'PM' },
];

/* ─────────────────────────────────────────────
   COMPONENTS
   ───────────────────────────────────────────── */

/** Floating particles background */
function FloatingParticles() {
  return (
    <div className="particles" aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            '--x': `${Math.random() * 100}%`,
            '--y': `${Math.random() * 100}%`,
            '--size': `${3 + Math.random() * 5}px`,
            '--dur': `${15 + Math.random() * 25}s`,
            '--delay': `${Math.random() * 10}s`,
            '--opacity': `${0.15 + Math.random() * 0.25}`,
          }}
        />
      ))}
    </div>
  );
}

/** Typing text animation */
function TypingText({ words, className }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[index];
    const timeout = deleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!deleting) {
        setText(word.substring(0, text.length + 1));
        if (text.length + 1 === word.length) {
          setTimeout(() => setDeleting(true), 2000);
        }
      } else {
        setText(word.substring(0, text.length - 1));
        if (text.length === 0) {
          setDeleting(false);
          setIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [text, deleting, index, words]);

  return (
    <span className={className}>
      {text}
      <span className="typing-cursor">|</span>
    </span>
  );
}

/** ATS Score Ring */
function ATSScoreRing({ score, animate }) {
  const radius = 68;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 400);
    return () => clearTimeout(timer);
  }, [score, circumference, animate]);

  return (
    <div className="ats-ring">
      <svg height={radius * 2} width={radius * 2}>
        <circle className="ats-ring__bg" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          className="ats-ring__progress"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeDasharray={circumference + ' ' + circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="ats-ring__center">
        <span className="ats-ring__score">{animate ? score : 0}</span>
        <span className="ats-ring__label">ATS SCORE</span>
      </div>
    </div>
  );
}

/** Upload Card */
function UploadCard() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('resumeFile', file);
    setIsUploading(true);
    dispatch(setLoading(true));
    try {
      const res = await uploadResume(formData);
      dispatch(rewriteResumeSuccess(res.data.resumeData));
      toast.success('Resume parsed successfully!');
      navigate('/builder');
    } catch (err) {
      toast.error('Failed to parse resume');
      console.error(err);
    } finally {
      setIsUploading(false);
      dispatch(setLoading(false));
      if (e.target) e.target.value = null;
    }
  };

  return (
    <div
      className={`upload-card ${dragOver ? 'upload-card--drag' : ''}`}
      id="upload-card"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
    >
      <div className="upload-card__glow" />
      <div className="upload-card__icon-wrap">
        <Upload size={28} strokeWidth={2} />
      </div>
      <h3 className="upload-card__title">Drop your resume here</h3>
      <p className="upload-card__formats">PDF or DOCX (below 5MB)</p>
      <button
        className="upload-card__btn"
        onClick={() => fileInputRef.current?.click()}
        id="upload-resume-btn"
        disabled={isUploading}
      >
        <FileText size={16} />
        {isUploading ? 'Parsing PDF...' : 'Search from Device'}
        <ArrowRight size={14} className="upload-card__btn-arrow" />
      </button>
      <input ref={fileInputRef} type="file" accept=".pdf" hidden onChange={handleFileUpload} />
      <p className="upload-card__privacy">
        <Shield size={12} />
        Your data is encrypted and 100% private.
      </p>
    </div>
  );
}

/** Stat counter card */
function StatCard({ stat, visible }) {
  const count = useCounter(
    stat.decimal ? stat.value * 10 : stat.value,
    2000,
    visible
  );
  const display = stat.decimal ? (count / 10).toFixed(1) : count;

  return (
    <div className="stat-card">
      <div className="stat-card__icon">{stat.icon}</div>
      <div className="stat-card__value">
        {display}{stat.suffix}
      </div>
      <div className="stat-card__label">{stat.label}</div>
    </div>
  );
}

/** Testimonial card */
function TestimonialCard({ t, index }) {
  return (
    <div className="testimonial-card" style={{ '--delay': `${index * 0.15}s` }}>
      <div className="testimonial-card__stars">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill="#fbbf24" color="#fbbf24" />
        ))}
      </div>
      <p className="testimonial-card__text">"{t.text}"</p>
      <div className="testimonial-card__author">
        <div className="testimonial-card__avatar">{t.avatar}</div>
        <div>
          <div className="testimonial-card__name">{t.name}</div>
          <div className="testimonial-card__role">{t.role}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────── */
export default function Home() {
  const [statsRef, statsVisible] = useScrollReveal(0.2);
  const [featRef, featVisible] = useScrollReveal(0.1);
  const [howRef, howVisible] = useScrollReveal(0.1);
  const [testRef, testVisible] = useScrollReveal(0.1);
  const [ctaRef, ctaVisible] = useScrollReveal(0.2);

  return (
    <div className="home">
      {/* ═══ 1 · HERO ═══ */}
      <section className="hero" id="hero">
        <FloatingParticles />
        <div className="hero__gradient-orb hero__gradient-orb--1" />
        <div className="hero__gradient-orb hero__gradient-orb--2" />
        <div className="hero__gradient-orb hero__gradient-orb--3" />

        <div className="hero__container">
          <div className="hero__content anim-slide-up">
            <div className="hero__trust-badge" id="hero-trust-badge">
              <div className="hero__trust-badge-dot" />
              <span>Trusted by 50,000+ Professionals</span>
            </div>

            <h1 className="hero__headline" id="hero-headline">
              Build Your Perfect
              <br />
              <TypingText
                words={['ATS Resume', 'Career Path', 'Dream Job', 'Future']}
                className="hero__headline-accent"
              />
            </h1>

            <p className="hero__sub">
              Stop guessing why your applications get ghosted. Our AI engine
              analyzes your resume against 50+ ATS algorithms and rewrites it
              for maximum impact.
            </p>

            <div className="hero__cta-row">
              <Link to="/builder" className="hero__cta-primary">
                <Zap size={18} />
                Start Building Free
                <ArrowRight size={16} className="hero__cta-arrow" />
              </Link>
              <a href="#how-it-works" className="hero__cta-secondary">
                <MousePointerClick size={16} />
                See How It Works
              </a>
            </div>

            <div className="hero__checks">
              <span className="hero__check"><CheckCircle2 size={15} /> Instant Score</span>
              <span className="hero__check"><CheckCircle2 size={15} /> AI Rewriting</span>
              <span className="hero__check"><CheckCircle2 size={15} /> No Credit Card</span>
            </div>
          </div>

          <div className="hero__upload anim-slide-up" style={{ animationDelay: '0.2s' }}>
            <UploadCard />
          </div>
        </div>
      </section>

      {/* ═══ 2 · TRUSTED BY (marquee) ═══ */}
      <section className="trusted" id="trusted-section">
        <div className="trusted__container">
          <p className="trusted__label">CANDIDATES SUCCESSFULLY HIRED AT</p>
          <div className="trusted__marquee">
            <div className="trusted__marquee-track">
              {[...trustedLogos, ...trustedLogos].map((logo, i) => (
                <div className="trusted__logo" key={i}>
                  {logo.icon}
                  <span>{logo.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 3 · STATS ═══ */}
      <section className="stats-section" ref={statsRef}>
        <div className="stats-section__container">
          <div className={`stats-grid ${statsVisible ? 'anim-visible' : ''}`}>
            {stats.map((s, i) => (
              <StatCard key={i} stat={s} visible={statsVisible} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4 · FEATURES ═══ */}
      <section className="features-section" id="features" ref={featRef}>
        <div className="features-section__container">
          <div className={`features-section__header ${featVisible ? 'anim-visible' : ''}`}>
            <span className="features-section__eyebrow">
              <Sparkles size={14} /> Features
            </span>
            <h2 className="features-section__title">Engineered for Precision</h2>
            <p className="features-section__subtitle">
              Our analysis engine goes beyond simple keyword counts — evaluating your resume
              through the lens of modern hiring systems.
            </p>
          </div>

          <div className="features-grid">
            {features.map((f, i) => (
              <div
                className={`feature-card ${featVisible ? 'anim-visible' : ''}`}
                key={i}
                id={`feature-card-${i}`}
                style={{ '--delay': `${i * 0.15}s`, '--accent': f.color }}
              >
                <div className="feature-card__icon">{f.icon}</div>
                <h3 className="feature-card__title">{f.title}</h3>
                <p className="feature-card__desc">{f.description}</p>
                <Link to="/builder" className="feature-card__link">
                  Learn More <ArrowRight size={14} />
                </Link>
                <div className="feature-card__shine" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5 · HOW IT WORKS ═══ */}
      <section className="how-it-works" id="how-it-works" ref={howRef}>
        <div className="how-it-works__container">
          <div className={`how-it-works__left ${howVisible ? 'anim-visible' : ''}`}>
            <span className="how-it-works__eyebrow">
              <Award size={14} /> How It Works
            </span>
            <h2 className="how-it-works__title">Your Path to More Interviews</h2>

            <div className="how-it-works__steps">
              {steps.map((step, i) => (
                <div
                  className={`step-row ${howVisible ? 'anim-visible' : ''}`}
                  key={step.number}
                  id={`step-${step.number}`}
                  style={{ '--delay': `${i * 0.2}s` }}
                >
                  <div className="step-row__number">
                    <span>{step.number}</span>
                    {i < steps.length - 1 && <div className="step-row__line" />}
                  </div>
                  <div className="step-row__content">
                    <h3 className="step-row__title">{step.title}</h3>
                    <p className="step-row__desc">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`how-it-works__right ${howVisible ? 'anim-visible' : ''}`}>
            <div className="score-preview" id="score-preview">
              <div className="score-preview__dots">
                <span className="dot dot--red" />
                <span className="dot dot--yellow" />
                <span className="dot dot--green" />
              </div>
              <p className="score-preview__filename">ats_score_analysis.pdf</p>
              <ATSScoreRing score={92} animate={howVisible} />
              <div className="score-preview__badge">
                <TrendingUp size={14} />
                <span>+27% Score Increase</span>
              </div>
              <p className="score-preview__tip">
                <Zap size={12} />
                Added 12 missing keywords from job description
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 6 · TESTIMONIALS ═══ */}
      <section className="testimonials-section" ref={testRef}>
        <div className="testimonials-section__container">
          <div className={`testimonials-section__header ${testVisible ? 'anim-visible' : ''}`}>
            <span className="testimonials-section__eyebrow">
              <Star size={14} /> Testimonials
            </span>
            <h2 className="testimonials-section__title">Loved by Job Seekers Worldwide</h2>
          </div>
          <div className={`testimonials-grid ${testVisible ? 'anim-visible' : ''}`}>
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} t={t} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7 · CTA BANNER ═══ */}
      <section className="cta-banner" id="cta-section" ref={ctaRef}>
        <div className="cta-banner__bg-shapes" aria-hidden="true">
          <div className="cta-shape cta-shape--1" />
          <div className="cta-shape cta-shape--2" />
          <div className="cta-shape cta-shape--3" />
        </div>
        <div className={`cta-banner__container ${ctaVisible ? 'anim-visible' : ''}`}>
          <h2 className="cta-banner__title">
            Ready to Land Your Dream Interview?
          </h2>
          <p className="cta-banner__sub">
            Join thousands of job seekers who've engineered their way to the front of the line.
          </p>
          <Link to="/builder" className="cta-banner__btn" id="cta-optimize-btn">
            <Zap size={18} />
            Optimize Your Resume Now
            <ArrowRight size={16} />
          </Link>
          <p className="cta-banner__note">
            <Clock size={12} />
            No credit card required. Get your first scan free.
          </p>
        </div>
      </section>

      {/* ═══ 8 · FOOTER ═══ */}
      <footer className="footer" id="footer">
        <div className="footer__container">
          <div className="footer__top">
            <div className="footer__brand">
              <h4 className="footer__logo">
                <div className="footer__logo-mark">CF</div>
                CareerForge
              </h4>
              <p className="footer__tagline">
                Precision Career Guidance for the modern professional. Everything you need, powered by AI.
              </p>
              <p className="footer__copyright-text">
                © {new Date().getFullYear()} CareerForge. Precision Career Guidance.
              </p>
            </div>
            <nav className="footer__nav">
              <a href="#terms">Terms of Service</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#cookies">Cookie Settings</a>
              <a href="#contact">Contact Support</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
