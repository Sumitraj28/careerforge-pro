import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSelector } from 'react-redux';
import { generateCoverLetter, generateCoverLetterPDF } from '../utils/api';
import toast from 'react-hot-toast';
import {
  FileText,
  Sparkles,
  Layout,
  PenLine,
  Download,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  BookOpen,
  Lightbulb,
  Copy,
  ArrowRight,
} from 'lucide-react';
import './CoverLetter.css';

/* ── Cover Letter Templates ── */
const TEMPLATES = [
  {
    id: 'professional',
    name: 'Professional',
    desc: 'Clean, corporate layout perfect for traditional industries.',
    color: '#4a9ff5',
    icon: <Briefcase size={22} />,
  },
  {
    id: 'modern',
    name: 'Modern',
    desc: 'Contemporary design with a creative edge for startups and tech.',
    color: '#5b6cf7',
    icon: <Sparkles size={22} />,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Simple and elegant — lets your words do the talking.',
    color: '#22c55e',
    icon: <FileText size={22} />,
  },
  {
    id: 'creative',
    name: 'Creative',
    desc: 'Bold layout for designers, marketers, and creatives.',
    color: '#f59e0b',
    icon: <PenLine size={22} />,
  },
];

/* ── Cover Letter Examples by Role ── */
const EXAMPLES = [
  'Software Engineer',
  'Data Analyst',
  'UX Designer',
  'Product Manager',
  'Marketing Manager',
  'Civil Engineer',
  'QA Engineer',
  'Architect',
  'Business Analyst',
  'Frontend Developer',
  'DevOps Engineer',
  'Project Manager',
];

/* ── Writing Guide Topics ── */
const GUIDES = [
  {
    title: 'Writing a Cover Letter',
    desc: 'The most comprehensive cover letter writing guide on the internet.',
    icon: <BookOpen size={20} />,
  },
  {
    title: 'Cover Letter Formats',
    desc: 'Understand the different cover letter formats and which one to use.',
    icon: <Layout size={20} />,
  },
  {
    title: 'Ending a Cover Letter',
    desc: 'Professional cover letter endings vetted by career counselors.',
    icon: <PenLine size={20} />,
  },
  {
    title: 'Cover Letter Design',
    desc: 'Learn about what makes a good cover letter design and how to choose.',
    icon: <Lightbulb size={20} />,
  },
];

/* ── Steps for How it Works ── */
const STEPS = [
  {
    num: '01',
    title: 'Paste the Job Description',
    desc: 'Drop in the job listing URL or paste the description. Our AI extracts all key requirements instantly.',
  },
  {
    num: '02',
    title: 'Choose a Template',
    desc: 'Pick from our professionally designed cover letter templates suited for any industry.',
  },
  {
    num: '03',
    title: 'AI Generates Your Letter',
    desc: 'Our AI writes a tailored cover letter highlighting your skills that match the job requirements.',
  },
  {
    num: '04',
    title: 'Download & Apply',
    desc: 'Review, edit if needed, and download your ATS-friendly cover letter as a polished PDF.',
  },
];

export default function CoverLetter() {
  const { user } = useAuth();
  const reduxPlan = useSelector((state) => state.user?.plan);
  const plan = reduxPlan || user?.plan || 'free';
  const navigate = useNavigate();
  const resumeData = useSelector((state) => state.resume);
  const [activeTemplate, setActiveTemplate] = useState('professional');
  const [jobDesc, setJobDesc] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState('');

  const generateLetter = async (jdToUse) => {
    if (!user) {
      toast.error('Please log in to generate a cover letter!');
      navigate('/login');
      return;
    }
    if (!jdToUse.trim()) {
      toast.error('Please paste a job description first.');
      return;
    }

    setGenerating(true);
    toast.loading('Gemini AI is writing your cover letter...', { id: 'cl-gen' });

    try {
      const { saveCoverLetter } = await import('../utils/api');
      const res = await generateCoverLetter(resumeData, jdToUse);
      if (res.data.success) {
        setGeneratedLetter(res.data.coverLetter);
        setGenerated(true);
        
        // Auto-save the cover letter
        try {
          await saveCoverLetter({
            companyName: 'New Application', // Could extract from JD in a future iteration
            coverLetterText: res.data.coverLetter,
            jobDescription: jdToUse
          });
        } catch (saveErr) {
          console.error('Failed to auto-save cover letter:', saveErr);
        }

        toast.dismiss('cl-gen');
        toast.success('Cover letter generated successfully!');
      } else {
        throw new Error(res.data.error || 'Failed to generate cover letter');
      }
    } catch (error) {
      console.error(error);
      toast.dismiss('cl-gen');
      toast.error('Failed to generate cover letter. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    generateLetter(jobDesc);
  };

  const handleDownloadPDF = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'cl-pdf' });
      const res = await generateCoverLetterPDF(generatedLetter, resumeData.personalInfo);
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'cover_letter.pdf');
      document.body.appendChild(link);
      link.click();
      
      toast.dismiss('cl-pdf');
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error(error);
      toast.dismiss('cl-pdf');
      toast.error('Failed to generate PDF.');
    }
  };

  const handleExampleClick = (role) => {
    scrollToSection('cl-builder');
    const exampleJd = `Job Description for ${role}:\n\nWe are looking for a highly skilled ${role} to join our growing team. You will be responsible for leading projects, collaborating with cross-functional teams, and driving impactful results in a fast-paced environment. The ideal candidate has 3+ years of experience and a strong passion for innovation.`;
    setJobDesc(exampleJd);
    generateLetter(exampleJd);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="cl-page" id="cover-letter-page">
      {/* ══════ HERO ══════ */}
      <section className="cl-hero">
        <div className="cl-hero__glow" />
        <div className="cl-hero__content">
          <span className="cl-hero__badge">
            <Sparkles size={14} /> AI-Powered
          </span>
          <h1 className="cl-hero__title">
            ATS-Friendly Cover Letter Builder
          </h1>
          <p className="cl-hero__subtitle">
            Create a tailored, professional cover letter in seconds. Our AI matches your
            skills to the job description and writes a compelling letter that gets you noticed.
          </p>
          <div className="cl-hero__actions">
            <button
              className="cl-hero__btn cl-hero__btn--primary"
              onClick={() => scrollToSection('cl-builder')}
            >
              Build Your Cover Letter <ArrowRight size={16} />
            </button>
            <button
              className="cl-hero__btn cl-hero__btn--ghost"
              onClick={() => scrollToSection('cl-templates')}
            >
              View Templates
            </button>
          </div>

          {/* Stats */}
          <div className="cl-hero__stats">
            <div className="cl-hero__stat">
              <span className="cl-hero__stat-num">50K+</span>
              <span className="cl-hero__stat-label">Letters Generated</span>
            </div>
            <div className="cl-hero__stat-divider" />
            <div className="cl-hero__stat">
              <span className="cl-hero__stat-num">92%</span>
              <span className="cl-hero__stat-label">ATS Pass Rate</span>
            </div>
            <div className="cl-hero__stat-divider" />
            <div className="cl-hero__stat">
              <span className="cl-hero__stat-num">4.9★</span>
              <span className="cl-hero__stat-label">User Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ BUILDER ══════ */}
      <section className="cl-builder" id="cl-builder">
        <div className="cl-builder__inner">
          <h2 className="cl-section-title">
            <PenLine size={22} /> Cover Letter Builder
          </h2>
          <p className="cl-section-subtitle">
            Paste a job description and let our AI craft the perfect cover letter for you.
          </p>

          <div className="cl-builder__grid">
            {/* Input Side */}
            <div className="cl-builder__input-card">
              <label className="cl-builder__label">Job Description</label>
              <textarea
                className="cl-builder__textarea"
                rows={10}
                placeholder="Paste the job description here... Our AI will extract key requirements and tailor your cover letter accordingly."
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
              />
              <div className="cl-builder__input-footer">
                <span className="cl-builder__char-count">
                  {jobDesc.length} characters
                </span>
                <button
                  className="cl-builder__generate-btn"
                  onClick={handleGenerate}
                  disabled={generating || plan === 'free'}
                >
                  {generating ? (
                    <>Gemini AI is writing your cover letter...</>
                  ) : (
                    <>
                      <Sparkles size={16} /> Generate Cover Letter
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Output Side */}
            <div className="cl-builder__output-card">
              <div className="cl-builder__output-header">
                <span>Preview</span>
                {generated && (
                  <div className="cl-builder__output-actions">
                    <span className="cl-builder__word-count">
                      {generatedLetter.trim().split(/\s+/).length} words
                    </span>
                    <button className="cl-builder__icon-btn" title="Copy" onClick={() => { navigator.clipboard.writeText(generatedLetter); toast.success('Copied to clipboard!'); }}>
                      <Copy size={15} />
                    </button>
                    <button className="cl-builder__icon-btn" title="Regenerate" onClick={handleGenerate}>
                      <Sparkles size={15} />
                    </button>
                    <button className="cl-builder__icon-btn" title="Download PDF" onClick={handleDownloadPDF}>
                      <Download size={15} />
                    </button>
                  </div>
                )}
              </div>
              <div className="cl-builder__output-body">
                {plan === 'free' ? (
                   <div className="cl-builder__pro-gate">
                     <Layout size={48} />
                     <h3>Upgrade to Pro to generate cover letters</h3>
                     <p>Pro users get unlimited AI-powered cover letter generations tailored to any job description.</p>
                     <button className="cl-hero__btn cl-hero__btn--primary" onClick={() => navigate('/pricing')}>
                       Upgrade to Pro
                     </button>
                   </div>
                ) : generated ? (
                  <div className="cl-builder__letter-preview">
                    <textarea 
                       className="cl-letter__textarea"
                       value={generatedLetter}
                       onChange={(e) => setGeneratedLetter(e.target.value)}
                       style={{ width: '100%', minHeight: '300px', border: 'none', resize: 'vertical', fontSize: '14px', lineHeight: '1.6', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                ) : (
                  <div className="cl-builder__empty">
                    <FileText size={48} strokeWidth={1} />
                    <p>Your AI-generated cover letter will appear here</p>
                    <span>Paste a job description and click Generate</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ TEMPLATES ══════ */}
      <section className="cl-templates" id="cl-templates">
        <div className="cl-templates__inner">
          <h2 className="cl-section-title">
            <Layout size={22} /> Cover Letter Templates
          </h2>
          <p className="cl-section-subtitle">
            Professionally designed cover letter templates for every industry and role.
          </p>

          <div className="cl-templates__grid">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                className={`cl-template-card ${activeTemplate === tpl.id ? 'cl-template-card--active' : ''}`}
                onClick={() => setActiveTemplate(tpl.id)}
                style={{ '--tpl-color': tpl.color }}
              >
                <div className="cl-template-card__icon">{tpl.icon}</div>
                <h3 className="cl-template-card__name">{tpl.name}</h3>
                <p className="cl-template-card__desc">{tpl.desc}</p>
                {activeTemplate === tpl.id && (
                  <span className="cl-template-card__check">
                    <CheckCircle2 size={18} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section className="cl-how" id="cl-how-it-works">
        <div className="cl-how__inner">
          <h2 className="cl-section-title">How It Works</h2>
          <p className="cl-section-subtitle">
            Four simple steps to your perfect cover letter.
          </p>

          <div className="cl-how__steps">
            {STEPS.map((step, i) => (
              <div className="cl-step" key={i}>
                <span className="cl-step__num">{step.num}</span>
                <h3 className="cl-step__title">{step.title}</h3>
                <p className="cl-step__desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ WRITING GUIDES ══════ */}
      <section className="cl-guides" id="cl-guides">
        <div className="cl-guides__inner">
          <h2 className="cl-section-title">
            <BookOpen size={22} /> Cover Letter Writing Guides
          </h2>
          <p className="cl-section-subtitle">
            Expert advice to help you write the perfect cover letter every time.
          </p>

          <div className="cl-guides__grid">
            {GUIDES.map((guide, i) => (
              <div className="cl-guide-card" key={i}>
                <div className="cl-guide-card__icon">{guide.icon}</div>
                <div className="cl-guide-card__text">
                  <h3>{guide.title}</h3>
                  <p>{guide.desc}</p>
                </div>
                <ChevronRight size={18} className="cl-guide-card__arrow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ EXAMPLES ══════ */}
      <section className="cl-examples" id="cl-examples">
        <div className="cl-examples__inner">
          <h2 className="cl-section-title">Cover Letter Examples</h2>
          <p className="cl-section-subtitle">
            Browse cover letter samples for popular job titles.
          </p>

          <div className="cl-examples__grid">
            {EXAMPLES.map((role, i) => (
              <button 
                className="cl-example-chip" 
                key={i}
                onClick={() => handleExampleClick(role)}
              >
                <Briefcase size={14} />
                {role}
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="cl-cta">
        <div className="cl-cta__inner">
          <h2>Ready to write your best cover letter?</h2>
          <p>Join thousands of job seekers who landed interviews with our AI-powered builder.</p>
          <button
            className="cl-hero__btn cl-hero__btn--primary"
            onClick={() => scrollToSection('cl-builder')}
          >
            Start Building Now <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
