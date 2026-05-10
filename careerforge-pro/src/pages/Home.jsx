import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Award,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Download,
  FileCheck2,
  FileText,
  Layers3,
  PenLine,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  Upload,
  Wand2,
} from 'lucide-react';
import { loadResume, setLoading } from '../redux/resumeSlice';
import { uploadResume } from '../utils/api';
import { extractPdfPageText, hasResumeSections, parseResumeText } from '../utils/resumeTextParser';
import './Home.css';

function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}

function useCounter(end, duration = 1600, start = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return undefined;
    let frame;
    let startTime;

    const tick = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, end, start]);

  return count;
}

const templateCards = [
  { name: 'Editorial', tone: 'Founder / PM', mark: 'E', color: '#2f4a34' },
  { name: 'Ledger', tone: 'Finance', mark: 'L', color: '#8b5e34' },
  { name: 'Studio', tone: 'Designer', mark: 'S', color: '#9b4f38' },
  { name: 'Brief', tone: 'Consulting', mark: 'B', color: '#3f3a32' },
];

const features = [
  {
    icon: <PenLine size={21} />,
    title: 'Narrative-first writing',
    description: 'Turn scattered responsibilities into sharp career stories with measurable outcomes.',
  },
  {
    icon: <Target size={21} />,
    title: 'Role-fit scoring',
    description: 'Compare your resume against the job description and see what hiring systems are likely to miss.',
  },
  {
    icon: <Layers3 size={21} />,
    title: 'Distinct templates',
    description: 'Choose layouts that feel crafted for real professionals, not copied from generic AI portfolios.',
  },
  {
    icon: <SlidersHorizontal size={21} />,
    title: 'Fine control',
    description: 'Tune spacing, sections, keywords, and tone without breaking the structure recruiters expect.',
  },
];

const stats = [
  { value: 2, suffix: 'M+', label: 'resume sections refined', icon: <FileCheck2 size={19} /> },
  { value: 51, suffix: 'k', label: 'interviews unlocked', icon: <BriefcaseBusiness size={19} /> },
  { value: 94, suffix: '%', label: 'average ATS lift', icon: <BarChart3 size={19} /> },
  { value: 4, suffix: '.9', label: 'user rating', icon: <Star size={19} /> },
];

const workflow = [
  'Import your resume or start with a role-ready structure.',
  'Shape the story with ATS notes, keyword gaps, and rewrite suggestions.',
  'Choose a template, tune the finish, and download a polished resume.',
];

function UploadCard() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('resumeFile', file);
    setIsUploading(true);
    dispatch(setLoading(true));

    try {
      const res = await uploadResume(formData);
      if (!hasResumeSections(res.data?.resumeData)) {
        throw new Error('Server parser returned only contact details');
      }
      dispatch(loadResume(res.data.resumeData));
      toast.success('Resume parsed successfully.');
      navigate('/builder');
    } catch (err) {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          fullText += `${extractPdfPageText(textContent)}\n`;
        }

        const parsed = parseResumeText(fullText);
        dispatch(loadResume(parsed));
        toast.success('Resume imported. Review each section for accuracy.');
        navigate('/builder');
      } catch (clientErr) {
        toast.error('Failed to parse resume.');
        console.error(err, clientErr);
      }
    } finally {
      setIsUploading(false);
      dispatch(setLoading(false));
      event.target.value = null;
    }
  };

  return (
    <div
      className={`upload-card ${dragOver ? 'upload-card--drag' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
      }}
    >
      <div className="upload-card__icon">
        <Upload size={24} />
      </div>
      <div>
        <h3 className="upload-card__title">Import an existing resume</h3>
        <p className="upload-card__copy">PDF upload below 5MB. We keep the structure, then help you sharpen the story.</p>
      </div>
      <button className="upload-card__button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
        <FileText size={16} />
        {isUploading ? 'Reading resume...' : 'Choose PDF'}
      </button>
      <input ref={fileInputRef} type="file" accept=".pdf" hidden onChange={handleFileUpload} />
      <span className="upload-card__privacy">
        <Shield size={13} />
        Private parsing, no public training data.
      </span>
    </div>
  );
}

function ResumeStudioMock() {
  return (
    <div className="studio-card" aria-label="Resume builder preview">
      <div className="studio-card__topbar">
        <span className="studio-card__back">My Resume</span>
        <span className="studio-card__saved"><CheckCircle2 size={13} /> Saved</span>
        <button type="button">Preview</button>
        <button type="button" className="studio-card__download">Download <Download size={14} /></button>
      </div>
      <div className="studio-card__body">
        <aside className="studio-card__rail">
          {[
            ['Content', FileText],
            ['Style', SlidersHorizontal],
            ['Templates', Layers3],
            ['Rewrite', Wand2],
          ].map(([label, Icon]) => (
            <span key={label}>
              <Icon size={16} />
              {label}
            </span>
          ))}
        </aside>
        <div className="resume-sheet">
          <div className="resume-sheet__header">
            <div>
              <h2>Neha Sharma</h2>
              <p>Product Designer</p>
            </div>
            <div className="resume-sheet__portrait">NS</div>
          </div>
          <div className="resume-sheet__summary">
            Designer with 5 years of experience turning complex hiring, fintech, and B2B workflows into simple products.
          </div>
          <div className="resume-sheet__section">
            <span>Experience</span>
            <div className="resume-sheet__line resume-sheet__line--long" />
            <div className="resume-sheet__line" />
            <div className="resume-sheet__line resume-sheet__line--medium" />
          </div>
          <div className="resume-sheet__section resume-sheet__section--columns">
            <div>
              <span>Impact</span>
              <div className="resume-sheet__metric">+36%</div>
            </div>
            <div>
              <span>Keywords</span>
              <div className="resume-sheet__chips">
                <i>UX</i>
                <i>SaaS</i>
                <i>Research</i>
              </div>
            </div>
          </div>
        </div>
        <aside className="studio-card__panel">
          <h3>Customize</h3>
          <label>Template mood</label>
          <div className="studio-card__select">Editorial Glass</div>
          <label>Palette</label>
          <div className="studio-card__swatches">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="studio-card__score">
            <span>ATS fit</span>
            <strong>92%</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ stat, visible }) {
  const count = useCounter(stat.value, 1400, visible);
  return (
    <div className="stat-card">
      <span className="stat-card__icon">{stat.icon}</span>
      <strong>{count}{stat.suffix}</strong>
      <p>{stat.label}</p>
    </div>
  );
}

export default function Home() {
  const [statsRef, statsVisible] = useScrollReveal(0.2);
  const [featuresRef, featuresVisible] = useScrollReveal(0.1);
  const [workflowRef, workflowVisible] = useScrollReveal(0.1);

  return (
    <main className="home">
      <section className="hero" id="hero">
        <div className="hero__liquid hero__liquid--one" aria-hidden="true" />
        <div className="hero__liquid hero__liquid--two" aria-hidden="true" />
        <div className="hero__container">
          <div className="hero__copy anim-rise">
            <span className="hero__badge"><Sparkles size={15} /> Liquid glass resume studio</span>
            <h1 className="hero__headline">
              Build a resume that feels authored, not generated.
            </h1>
            <p className="hero__sub">
              CareerForge Pro helps you design a polished, ATS-aware resume with crafted templates, guided rewrites, and a warm workspace built for focused career work.
            </p>
            <div className="hero__actions">
              <Link to="/builder" className="button button--primary">
                Create Resume <ArrowRight size={17} />
              </Link>
              <a href="#templates" className="button button--secondary">
                Explore Templates
              </a>
            </div>
            <div className="hero__proof">
              <span><CheckCircle2 size={15} /> ATS-ready layouts</span>
              <span><CheckCircle2 size={15} /> No generic neon gloss</span>
              <span><CheckCircle2 size={15} /> Export-ready PDF</span>
            </div>
          </div>
          <div className="hero__studio anim-rise">
            <ResumeStudioMock />
          </div>
        </div>
      </section>

      <section className="brand-strip" aria-label="Trusted by professionals">
        <div className="brand-strip__inner">
          <span>Trusted by career switchers, founders, analysts, designers, and engineers</span>
          <div>
            <strong>Google</strong>
            <strong>Microsoft</strong>
            <strong>Amazon</strong>
            <strong>Airbnb</strong>
            <strong>PayPal</strong>
          </div>
        </div>
      </section>

      <section className="quick-start">
        <div className="quick-start__inner">
          <UploadCard />
          <div className="quick-start__note">
            <FileCheck2 size={24} />
            <div>
              <h2>Start with what you already have.</h2>
              <p>Upload a resume or open the builder and write section by section with structured prompts.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section" id="features" ref={featuresRef}>
        <div className="section-heading">
          <span>Resume Builder Toolkit</span>
          <h2>Designed around the work of getting hired</h2>
        </div>
        <div className={`feature-grid ${featuresVisible ? 'is-visible' : ''}`}>
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-card__icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <ChevronRight size={17} />
            </article>
          ))}
        </div>
      </section>

      <section className="templates-section" id="templates">
        <div className="templates-section__top">
          <div className="section-heading section-heading--left">
            <span>Template Gallery</span>
            <h2>Professional, calm, and unmistakably resume-first</h2>
          </div>
          <Link to="/builder" className="button button--secondary">Use a Template</Link>
        </div>
        <div className="template-row">
          {templateCards.map((template) => (
            <article className="template-card" key={template.name} style={{ '--template-color': template.color }}>
              <div className="template-card__mark">{template.mark}</div>
              <div className="template-card__paper">
                <span />
                <span />
                <span />
                <span />
              </div>
              <h3>{template.name}</h3>
              <p>{template.tone}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section" id="how-it-works" ref={workflowRef}>
        <div className={`workflow-panel ${workflowVisible ? 'is-visible' : ''}`}>
          <div>
            <span className="workflow-panel__eyebrow"><Award size={15} /> How it works</span>
            <h2>From rough draft to recruiter-ready in one focused flow.</h2>
          </div>
          <ol>
            {workflow.map((item, index) => (
              <li key={item}>
                <strong>0{index + 1}</strong>
                <p>{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="stats-section" ref={statsRef}>
        <div className="stats-section__copy">
          <span>Measured Impact</span>
          <h2>Small edits, serious momentum.</h2>
        </div>
        <div className="stats-grid">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} visible={statsVisible} />
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-section__panel">
          <div>
            <span><Search size={15} /> Ready to tune your resume?</span>
            <h2>Open the builder and make the next version feel intentional.</h2>
          </div>
          <Link to="/builder" className="button button--primary">
            Build My Resume <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
