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
  { id: 'classic', label: 'Classic', free: true },
  { id: 'modern', label: 'Modern', free: true },
  { id: 'minimal', label: 'Minimal', free: true },
  { id: 'executive', label: 'Executive', free: false },
  { id: 'creative', label: 'Creative', free: false },
];

/* ── Safe text normaliser ── */
const safeText = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(' ');
  return String(val);
};

/* ── Bullet helper: handles string OR array ── */
const toBullets = (desc) => {
  if (!desc) return [];
  if (Array.isArray(desc)) return desc.filter(Boolean).map(b => String(b).trim()).filter(Boolean);
  return String(desc).split('\n').map(b => b.trim()).filter(Boolean);
};

/* ── Format date strings cleanly ── */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  dateStr = safeText(dateStr);
  // Handle YYYY-MM format from <input type="month">
  const monthMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[parseInt(monthMatch[2], 10) - 1] || '';
    return `${month} ${monthMatch[1]}`;
  }
  return dateStr;
};

export default function ResumePreview() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    personalInfo, experience, education,
    skills, projects, certifications,
    selectedTemplate, keywords,
  } = useSelector((s) => s.resume);

  const userPlan = useSelector((s) => s.user?.plan || 'free');
  const isPro = ['pro', 'base', 'enterprise'].includes(userPlan);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  /* ── Keyword highlight ── */
  const allKeywords = [
    ...(keywords?.hard_skills || []),
    ...(keywords?.soft_skills || []),
    ...(keywords?.tools || []),
    ...(keywords?.top_keywords || []),
  ].map((k) => k.toLowerCase());

  const highlightText = (text) => {
    const str = safeText(text);
    if (!str || allKeywords.length === 0) return str;
    const esc = allKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`\\b(${esc.join('|')})\\b`, 'gi');
    return str.split(regex).map((part, i) =>
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
      clone.querySelectorAll('mark.rp-highlight').forEach((el) => {
        el.replaceWith(document.createTextNode(el.textContent));
      });

      const name = `${personalInfo.firstName || 'Resume'}_${personalInfo.lastName || ''}`.trim();

      const resumeHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Inter',sans-serif;color:#23211d;font-size:11px;line-height:1.55;padding:32px}
          h1{font-size:22px;font-weight:800;letter-spacing:-0.3px;margin-bottom:2px}
          h2.rp-section__title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;
             color:#23211d;border-bottom:2px solid #2f4a34;padding-bottom:3px;margin:14px 0 8px}
          .rp-name-block{margin-bottom:12px}
          .rp-jobtitle{font-size:13px;color:#9b4f38;font-weight:600;margin-top:2px}
          .rp-contact{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px}
          .rp-contact__item{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#625c50}
          .rp-item__row{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
          .rp-item__primary{font-size:11px;font-weight:700;color:#23211d}
          .rp-item__secondary{font-size:10.5px;color:#625c50;font-weight:500;margin-top:2px}
          .rp-item__dates{font-size:10px;color:#625c50;white-space:nowrap;flex-shrink:0}
          .rp-item__location{font-size:10px;color:#888}
          .rp-item{margin-bottom:10px;page-break-inside:avoid}
          .rp-bullets{margin:5px 0 0 16px;padding:0;list-style:disc}
          .rp-bullets li{font-size:10px;color:#4f493f;line-height:1.65;margin-bottom:2px}
          .rp-skills__group{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
          .rp-chip{display:inline-block;padding:2px 8px;background:rgba(47,74,52,0.09);
                   border-radius:50px;font-size:10px;font-weight:600;color:#2f4a34}
          .rp-section{margin-bottom:14px;page-break-inside:avoid}
          .rp-divider{border:none;border-top:1px solid #e5e1d8;margin:8px 0 12px}
          .rp-summary{font-size:10.5px;color:#4f493f;line-height:1.65}
          .rp-item__tech{font-size:10px;color:#888;margin-top:2px}
          .rp-item__desc{font-size:10px;color:#4f493f;line-height:1.6;margin-top:3px}
          .rp-item__link{font-size:10px;color:#2f4a34;text-decoration:none}
        </style></head><body>${clone.innerHTML}</body></html>`;

      const res = await generatePDF(resumeHTML, isPro);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_resume.pdf`;
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
  const hasName = personalInfo?.firstName?.trim() || personalInfo?.lastName?.trim();
  const hasContact = personalInfo?.email || personalInfo?.phone || personalInfo?.location || personalInfo?.linkedin || personalInfo?.github;
  const hasSummary = personalInfo?.summary?.trim();
  const hasExp = experience?.some((e) => safeText(e.company) || safeText(e.position) || safeText(e.description));
  const hasEdu = education?.some((e) => safeText(e.institution) || safeText(e.degree) || safeText(e.fieldOfStudy));
  const hasSkills = (skills?.technical?.length > 0) || (skills?.soft?.length > 0) || (skills?.tools?.length > 0);
  const hasProj = projects?.some((p) => safeText(p.name) || safeText(p.description));
  const hasCerts = certifications?.some((c) => safeText(c.name) || safeText(c.issuer));
  
  // A resume is empty only if it literally has NO content in any primary section
  const isEmpty = !hasName && !hasContact && !hasSummary && !hasExp && !hasEdu && !hasSkills && !hasProj && !hasCerts;

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
              {!t.free && isPro && <Crown size={10} style={{ color: '#f59e0b' }} />}
            </button>
          ))}
        </div>
        <button
          className="rp-download-btn"
          onClick={handleDownload}
          disabled={downloading || isEmpty}
        >
          <Download size={14} />
          {downloading ? 'Generating…' : 'Download PDF'}
        </button>
      </div>

      {/* Resume Paper */}
      <div className={`rp-paper rp-paper--${selectedTemplate || 'classic'}`} id="resume-paper">
        <div className="rp-page-boundary" />

        {isEmpty ? (
          <div className="rp-empty">
            <div className="rp-empty__icon">📄</div>
            <p className="rp-empty__title">Your resume preview will appear here</p>
            <p className="rp-empty__sub">Fill in the form on the left, or import your existing PDF resume to get started instantly.</p>
          </div>
        ) : (
          <>
            {/* 1 — Name / Job Title / Contact */}
            <div className="rp-name-block">
              {hasName && (
                <h1 className="rp-name">
                  {safeText(personalInfo.firstName)}{personalInfo.firstName && personalInfo.lastName ? ' ' : ''}{safeText(personalInfo.lastName)}
                </h1>
              )}
              {personalInfo.jobTitle && (
                <p className="rp-jobtitle">{safeText(personalInfo.jobTitle)}</p>
              )}
              <div className="rp-contact">
                {personalInfo.email && (
                  <span className="rp-contact__item"><Mail size={11} /> {safeText(personalInfo.email)}</span>
                )}
                {personalInfo.phone && (
                  <span className="rp-contact__item"><Phone size={11} /> {safeText(personalInfo.phone)}</span>
                )}
                {personalInfo.location && (
                  <span className="rp-contact__item"><MapPin size={11} /> {safeText(personalInfo.location)}</span>
                )}
                {personalInfo.linkedin && (
                  <span className="rp-contact__item"><Link2 size={11} /> {safeText(personalInfo.linkedin)}</span>
                )}
                {personalInfo.github && (
                  <span className="rp-contact__item"><Globe size={11} /> {safeText(personalInfo.github)}</span>
                )}
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
                {experience.map((exp) => {
                  if (!safeText(exp.company) && !safeText(exp.position) && !safeText(exp.description)) return null;
                  const bullets = toBullets(exp.description);
                  return (
                    <div className="rp-item" key={exp.id}>
                      <div className="rp-item__row">
                        <div>
                          <span className="rp-item__primary">{safeText(exp.company || exp.position)}</span>
                          {exp.location && (
                            <span className="rp-item__location"> · {safeText(exp.location)}</span>
                          )}
                        </div>
                        <span className="rp-item__dates">
                          {formatDate(exp.startDate)}
                          {(exp.startDate && (exp.endDate || exp.current)) && ' – '}
                          {exp.current ? 'Present' : formatDate(exp.endDate)}
                        </span>
                      </div>
                      {exp.position && exp.company && (
                        <p className="rp-item__secondary">{safeText(exp.position)}</p>
                      )}
                      {bullets.length > 0 && (
                        <ul className="rp-bullets">
                          {bullets.map((b, i) => (
                            <li key={i}>{highlightText(b)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4 — Education */}
            {hasEdu && (
              <div className="rp-section">
                <h2 className="rp-section__title">Education</h2>
                {education.map((edu) => {
                  if (!safeText(edu.institution) && !safeText(edu.degree) && !safeText(edu.fieldOfStudy)) return null;
                  return (
                    <div className="rp-item" key={edu.id}>
                      <div className="rp-item__row">
                        <span className="rp-item__primary">{safeText(edu.institution || edu.degree)}</span>
                        <span className="rp-item__dates">
                          {edu.startDate}
                          {edu.startDate && edu.endDate && ' – '}
                          {edu.endDate}
                        </span>
                      </div>
                      <p className="rp-item__secondary">
                        {safeText(edu.degree)}
                        {edu.fieldOfStudy && ` in ${safeText(edu.fieldOfStudy)}`}
                        {edu.gpa && ` · GPA: ${safeText(edu.gpa)}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5 — Skills */}
            {hasSkills && (
              <div className="rp-section">
                <h2 className="rp-section__title">Skills</h2>
                {skills.technical?.length > 0 && (
                  <div className="rp-skills__row">
                    <span className="rp-skills__category">Technical</span>
                    <div className="rp-skills__group">
                      {skills.technical.map((skill, i) => (
                        <span key={i} className="rp-chip">{highlightText(safeText(skill))}</span>
                      ))}
                    </div>
                  </div>
                )}
                {skills.soft?.length > 0 && (
                  <div className="rp-skills__row">
                    <span className="rp-skills__category">Soft Skills</span>
                    <div className="rp-skills__group">
                      {skills.soft.map((skill, i) => (
                        <span key={i} className="rp-chip rp-chip--soft">{highlightText(safeText(skill))}</span>
                      ))}
                    </div>
                  </div>
                )}
                {skills.tools?.length > 0 && (
                  <div className="rp-skills__row">
                    <span className="rp-skills__category">Tools</span>
                    <div className="rp-skills__group">
                      {skills.tools.map((skill, i) => (
                        <span key={i} className="rp-chip rp-chip--tools">{highlightText(safeText(skill))}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6 — Projects */}
            {hasProj && (
              <div className="rp-section">
                <h2 className="rp-section__title">Projects</h2>
                {projects.map((proj) => {
                  if (!safeText(proj.name) && !safeText(proj.description)) return null;
                  return (
                    <div className="rp-item" key={proj.id}>
                      <div className="rp-item__row">
                        <span className="rp-item__primary">{safeText(proj.name || 'Project')}</span>
                        {proj.link && (
                          <a href={proj.link} target="_blank" rel="noreferrer" className="rp-item__link">
                            <ExternalLink size={11} /> Link
                          </a>
                        )}
                      </div>
                      {proj.techStack && (
                        <p className="rp-item__tech">{safeText(proj.techStack)}</p>
                      )}
                      {proj.description && (
                        toBullets(proj.description).length > 1 ? (
                          <ul className="rp-bullets">
                            {toBullets(proj.description).map((b, i) => (
                              <li key={i}>{highlightText(b)}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="rp-item__desc">{highlightText(proj.description)}</p>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 7 — Certifications */}
            {hasCerts && (
              <div className="rp-section">
                <h2 className="rp-section__title">Certifications</h2>
                {certifications.map((cert) => {
                  if (!safeText(cert.name) && !safeText(cert.issuer)) return null;
                  return (
                    <div className="rp-item rp-item--inline" key={cert.id}>
                      <div className="rp-item__row">
                        <span className="rp-item__primary">{safeText(cert.name)}</span>
                        <span className="rp-item__dates">{safeText(cert.date)}</span>
                      </div>
                      {cert.issuer && (
                        <p className="rp-item__secondary">{safeText(cert.issuer)}</p>
                      )}
                    </div>
                  );
                })}
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
              Upgrade for unlimited resumes, all premium templates, and AI rewriting.
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
