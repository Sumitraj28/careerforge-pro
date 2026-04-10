import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setTemplate } from '../../redux/resumeSlice';
import { generatePDF } from '../../utils/api';
import toast from 'react-hot-toast';
import {
  Mail, Phone, MapPin, Link2, Globe,
  Lock, Download, ExternalLink, Crown, X,
} from 'lucide-react';
import './ResumePreview.css';

const TEMPLATES = [
  { id: 'classic',   label: 'Classic',   free: true },
  { id: 'modern',    label: 'Modern',    free: true },
  { id: 'minimal',   label: 'Minimal',   free: true },
  { id: 'executive', label: 'Executive', free: false },
  { id: 'creative',  label: 'Creative',  free: false },
];

export default function ResumePreview() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();

  const {
    personalInfo, experience, education,
    skills, projects, certifications,
    selectedTemplate, keywords,
  } = useSelector((s) => s.resume);

  const userPlan = useSelector((s) => s.user?.plan || 'free');
  const isPro    = ['pro', 'base', 'enterprise'].includes(userPlan);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [downloading,      setDownloading]      = useState(false);

  /* ── Keyword highlight ── */
  const allKeywords = [
    ...(keywords.hard_skills  || []),
    ...(keywords.soft_skills  || []),
    ...(keywords.tools        || []),
    ...(keywords.top_keywords || []),
  ].map((k) => k.toLowerCase());

  const highlightText = (text) => {
    if (!text || allKeywords.length === 0) return text;
    const esc   = allKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`\\b(${esc.join('|')})\\b`, 'gi');
    return String(text).split(regex).map((part, i) =>
      allKeywords.includes(part.toLowerCase())
        ? <mark key={i} className="rp-highlight">{part}</mark>
        : part
    );
  };

  /* ── Template select ── */
  const handleTemplateClick = (t) => {
    if (!t.free && !isPro) { setShowUpgradeModal(true); return; }
    dispatch(setTemplate(t.id));
  };

  /* ── PDF download ── */
  const handleDownload = async () => {
    setDownloading(true);
    toast.loading('Generating PDF…', { id: 'pdf' });
    try {
      const paper = document.getElementById('resume-paper');
      if (!paper) throw new Error('Preview not found');

      const clone = paper.cloneNode(true);
      clone.querySelectorAll('mark.rp-highlight').forEach((el) => el.replaceWith(el.textContent));

      const resumeHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Inter',sans-serif;color:#1a1e36;font-size:11px;line-height:1.55}
          h1{font-size:22px;font-weight:800;letter-spacing:-0.3px;margin-bottom:2px}
          h2{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;
             color:#0a1628;border-bottom:2px solid #5b6cf7;padding-bottom:3px;margin:14px 0 8px}
          .rp-name-block{margin-bottom:12px}
          .rp-jobtitle{font-size:12px;color:#5b6cf7;font-weight:600;margin-top:2px}
          .rp-contact{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px}
          .rp-contact__item{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#6b7194}
          .rp-item__row{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
          .rp-item__primary{font-size:11px;font-weight:700;color:#1a1e36}
          .rp-item__secondary{font-size:10px;color:#6b7194;font-weight:500}
          .rp-item__dates{font-size:10px;color:#6b7194;white-space:nowrap}
          .rp-item{margin-bottom:10px;page-break-inside:avoid}
          .rp-bullets{margin:4px 0 0 16px;padding:0;list-style:disc}
          .rp-bullets li{font-size:10px;color:#3a4f6e;line-height:1.6;margin-bottom:2px}
          .rp-skills__group{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
          .rp-chip{display:inline-block;padding:2px 8px;background:rgba(91,108,247,0.08);
                   border-radius:50px;font-size:10px;font-weight:600;color:#5b6cf7}
          .rp-section{margin-bottom:14px;page-break-inside:avoid}
        </style></head><body>${clone.innerHTML}</body></html>`;

      const res  = await generatePDF(resumeHTML, isPro);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${personalInfo.firstName || 'Resume'}_${personalInfo.lastName || ''}_resume.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.dismiss('pdf');
      toast.success('Resume downloaded!');
    } catch (err) {
      console.error(err);
      toast.dismiss('pdf');
      toast.error('PDF generation failed. Try again.');
    } finally {
      setDownloading(false);
    }
  };

  /* ── isEmpty guard ── */
  const hasName = personalInfo.firstName || personalInfo.lastName;
  const hasExp  = experience.some((e) => e.company || e.position);
  const hasEdu  = education.some((e)  => e.institution || e.degree);
  const isEmpty = !hasName && !hasExp && !hasEdu;

  /* ── Bullet helper (handles string OR array) ── */
  const toBullets = (desc) => {
    if (!desc) return [];
    if (Array.isArray(desc)) return desc.filter(Boolean);
    return String(desc).split('\n').filter((b) => b.trim());
  };

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  return (
    <div className="rp" id="resume-preview">

      {/* Toolbar */}
      <div className="rp-toolbar">
        <div className="rp-templates">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              className={[
                'rp-template-btn',
                selectedTemplate === t.id ? 'rp-template-btn--active' : '',
                !t.free && !isPro ? 'rp-template-btn--locked' : '',
              ].join(' ')}
              onClick={() => handleTemplateClick(t)}
              title={t.free || isPro ? t.label : `${t.label} — Pro Only`}
            >
              {t.label}
              {!t.free && !isPro && <Lock size={10} />}
              {!t.free && isPro  && <Crown size={10} style={{ color: '#f59e0b' }} />}
            </button>
          ))}
        </div>
        <button
          className="rp-download-btn"
          onClick={handleDownload}
          disabled={downloading}
        >
          <Download size={14} />
          {downloading ? 'Generating…' : 'PDF'}
        </button>
      </div>

      {/* Resume Paper — uses existing CSS class names */}
      <div className={`rp-paper rp-paper--${selectedTemplate}`} id="resume-paper">
        <div className="rp-page-boundary" />

        {isEmpty ? (
          <div className="rp-empty">
            <p className="rp-empty__title">Your resume will appear here</p>
            <p className="rp-empty__sub">Fill in the form on the left to see a live preview.</p>
          </div>
        ) : (
          <>
            {/* 1 — Name / Job Title / Contact */}
            <div className="rp-name-block">
              {hasName && (
                <h1 className="rp-name">
                  {personalInfo.firstName} {personalInfo.lastName}
                </h1>
              )}
              {personalInfo.jobTitle && (
                <p className="rp-jobtitle">{personalInfo.jobTitle}</p>
              )}
              <div className="rp-contact">
                {personalInfo.email    && <span className="rp-contact__item"><Mail    size={11} /> {personalInfo.email}</span>}
                {personalInfo.phone    && <span className="rp-contact__item"><Phone   size={11} /> {personalInfo.phone}</span>}
                {personalInfo.location && <span className="rp-contact__item"><MapPin  size={11} /> {personalInfo.location}</span>}
                {personalInfo.linkedin && <span className="rp-contact__item"><Link2   size={11} /> {personalInfo.linkedin}</span>}
                {personalInfo.github   && <span className="rp-contact__item"><Globe   size={11} /> {personalInfo.github}</span>}
              </div>
            </div>

            <hr className="rp-divider" />

            {/* 2 — Summary */}
            {personalInfo.summary && (
              <div className="rp-section">
                <h2 className="rp-section__title">Professional Summary</h2>
                <p className="rp-section__body rp-summary">{highlightText(personalInfo.summary)}</p>
              </div>
            )}

            {/* 3 — Experience */}
            {hasExp && (
              <div className="rp-section">
                <h2 className="rp-section__title">Experience</h2>
                {experience.map((exp) =>
                  exp.company || exp.position ? (
                    <div className="rp-item" key={exp.id}>
                      <div className="rp-item__row">
                        <div>
                          <span className="rp-item__primary">{exp.company}</span>
                          {exp.location && (
                            <span className="rp-item__location"> — {exp.location}</span>
                          )}
                        </div>
                        <span className="rp-item__dates">
                          {exp.startDate}
                          {exp.startDate && (exp.endDate || exp.current) && ' – '}
                          {exp.current ? 'Present' : exp.endDate}
                        </span>
                      </div>
                      {exp.position && (
                        <p className="rp-item__secondary">{exp.position}</p>
                      )}
                      {exp.description && (
                        <ul className="rp-bullets">
                          {toBullets(exp.description).map((b, i) => (
                            <li key={i}>{highlightText(b.trim())}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null
                )}
              </div>
            )}

            {/* 4 — Education */}
            {hasEdu && (
              <div className="rp-section">
                <h2 className="rp-section__title">Education</h2>
                {education.map((edu) =>
                  edu.institution || edu.degree ? (
                    <div className="rp-item" key={edu.id}>
                      <div className="rp-item__row">
                        <span className="rp-item__primary">{edu.institution}</span>
                        <span className="rp-item__dates">
                          {edu.startDate}
                          {edu.startDate && edu.endDate && ' – '}
                          {edu.endDate}
                        </span>
                      </div>
                      <p className="rp-item__secondary">
                        {edu.degree}
                        {edu.fieldOfStudy && ` in ${edu.fieldOfStudy}`}
                        {edu.gpa && ` — GPA: ${edu.gpa}`}
                      </p>
                    </div>
                  ) : null
                )}
              </div>
            )}

            {/* 5 — Skills */}
            {(skills.technical?.length > 0 || skills.soft?.length > 0 || skills.tools?.length > 0) && (
              <div className="rp-section">
                <h2 className="rp-section__title">Skills</h2>
                <div className="rp-skills__group">
                  {[...(skills.technical || []), ...(skills.soft || []), ...(skills.tools || [])].map((skill, i) => (
                    <span key={i} className="rp-chip">{highlightText(skill)}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 6 — Projects */}
            {projects.some((p) => p.name) && (
              <div className="rp-section">
                <h2 className="rp-section__title">Projects</h2>
                {projects.map((proj) =>
                  proj.name ? (
                    <div className="rp-item" key={proj.id}>
                      <div className="rp-item__row">
                        <span className="rp-item__primary">{proj.name}</span>
                        {proj.link && (
                          <a href={proj.link} target="_blank" rel="noreferrer" className="rp-item__link">
                            <ExternalLink size={11} /> Link
                          </a>
                        )}
                      </div>
                      {proj.techStack  && <p className="rp-item__tech">{proj.techStack}</p>}
                      {proj.description && (
                        <p className="rp-item__desc">{highlightText(proj.description)}</p>
                      )}
                    </div>
                  ) : null
                )}
              </div>
            )}

            {/* 7 — Certifications */}
            {certifications?.some((c) => c.name) && (
              <div className="rp-section">
                <h2 className="rp-section__title">Certifications</h2>
                {certifications.map((cert) =>
                  cert.name ? (
                    <div className="rp-item rp-item--inline" key={cert.id}>
                      <div className="rp-item__row">
                        <span className="rp-item__primary">{cert.name}</span>
                        <span className="rp-item__dates">{cert.date}</span>
                      </div>
                      {cert.issuer && <p className="rp-item__secondary">{cert.issuer}</p>}
                    </div>
                  ) : null
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="rp-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <button className="rp-modal__close" onClick={() => setShowUpgradeModal(false)}>
              <X size={18} />
            </button>
            <div className="rp-modal__icon"><Crown size={28} /></div>
            <h3 className="rp-modal__title">Unlock Premium Templates</h3>
            <p className="rp-modal__desc">
              Executive and Creative templates are available on the Pro plan.
              Upgrade now for unlimited resumes, all premium templates, and AI rewriting.
            </p>
            <button className="rp-modal__btn" onClick={() => { setShowUpgradeModal(false); navigate('/pricing'); }}>
              <Crown size={15} /> Upgrade to Pro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
