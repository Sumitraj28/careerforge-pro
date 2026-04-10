import { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  updatePersonalInfo,
  addExperience,
  updateExperience,
  removeExperience,
  addEducation,
  updateEducation,
  removeEducation,
  updateSkills,
  addProject,
  updateProject,
  removeProject,
  setJDText,
  setKeywords,
  setATSScore,
  setATSSuggestions,
  setLoading,
  rewriteResumeSuccess,
} from '../../redux/resumeSlice';
import ATSScoreBar from '../Shared/ATSScoreBar';
import KeywordChip from '../Shared/KeywordChip';
import Loader from '../Shared/Loader';
import {
  ChevronDown,
  Plus,
  Trash2,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderOpen,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { extractKeywords, rewriteResume, getATSScore, uploadResume } from '../../utils/api';
import './ResumeForm.css';

/* ── Accordion wrapper ── */
function Accordion({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rf-accordion ${open ? 'rf-accordion--open' : ''}`}>
      <button
        type="button"
        className="rf-accordion__trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="rf-accordion__label">
          {icon}
          {title}
        </span>
        <ChevronDown size={18} className="rf-accordion__arrow" />
      </button>
      {open && <div className="rf-accordion__body">{children}</div>}
    </div>
  );
}

/* ── Skill tag input helper ── */
function SkillTagInput({ label, skills, onChange }) {
  const [inputVal, setInputVal] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = inputVal.trim();
      if (val && !skills.includes(val)) {
        onChange([...skills, val]);
      }
      setInputVal('');
    }
  };

  const removeSkill = (idx) => {
    onChange(skills.filter((_, i) => i !== idx));
  };

  return (
    <div className="rf-skill-group">
      <label className="rf-label">{label}</label>
      <div className="rf-skill-tags">
        {skills.map((s, i) => (
          <span key={i} className="rf-skill-tag">
            {s}
            <button type="button" onClick={() => removeSkill(i)} aria-label="Remove">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        className="rf-input"
        placeholder="Type and press Enter or comma"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   RESUME FORM
   ═══════════════════════════════════════════════ */
export default function ResumeForm() {
  const dispatch = useDispatch();
  const resume = useSelector((state) => state.resume);
  const {
    personalInfo,
    experience,
    education,
    skills,
    projects,
    jdText,
    keywords,
    atsScore,
    atsSuggestions,
    isLoading,
  } = resume;

  const [analyzingJD, setAnalyzingJD] = useState(false);
  const [rewriteLatency, setRewriteLatency] = useState(null);
  const [qualityResult, setQualityResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resumeFile', file);

    dispatch(setLoading(true));
    try {
      const res = await uploadResume(formData);
      dispatch(rewriteResumeSuccess(res.data.resumeData));
      toast.success('Resume parsed successfully!');
    } catch (err) {
      toast.error('Failed to parse resume');
      console.error(err);
    } finally {
      dispatch(setLoading(false));
      e.target.value = null;
    }
  };

  /* ── Handlers ── */
  const onPersonal = (field, value) => {
    dispatch(updatePersonalInfo({ [field]: value }));
  };

  const onExp = (id, field, value) => {
    dispatch(updateExperience({ id, field, value }));
  };

  const onEdu = (id, field, value) => {
    dispatch(updateEducation({ id, field, value }));
  };

  const onProj = (id, field, value) => {
    dispatch(updateProject({ id, field, value }));
  };

  /* ── AI: Analyze JD ── */
  const handleAnalyzeJD = async () => {
    if (analyzingJD) return; // prevent duplicate calls
    if (!jdText.trim()) {
      toast.error('Please paste a job description first');
      return;
    }
    setAnalyzingJD(true);
    toast.loading('Extracting keywords…', { id: 'analyze-jd' });
    try {
      // 1. Extract Keywords
      const res = await extractKeywords(jdText);
      const extractedKeywords = res.data.keywords;
      dispatch(setKeywords(extractedKeywords));

      // 2. Calculate ATS Score
      const resumeData = { personalInfo, experience, education, skills, projects };
      const scoreRes = await getATSScore(resumeData, extractedKeywords);
      dispatch(setATSScore(scoreRes.data.score || 0));
      if (scoreRes.data.suggestions) {
        dispatch(setATSSuggestions(scoreRes.data.suggestions));
      }

      toast.dismiss('analyze-jd');
      toast.success('Keywords extracted & ATS Score calculated!');
    } catch (err) {
      console.error(err);
      toast.dismiss('analyze-jd');
      toast.error(err.response?.data?.error || 'Failed to analyze JD. Check backend connection.');
    } finally {
      setAnalyzingJD(false);
    }
  };

  /* ── AI: Rewrite Resume ── */
  const handleRewrite = async () => {
    if (!jdText.trim()) {
      toast.error('Analyze a JD first before rewriting');
      return;
    }
    dispatch(setLoading(true));
    setRewriteLatency(null);
    setQualityResult(null);
    toast.loading('AI is rewriting your resume… (~5-10s)', { id: 'rewrite' });

    try {
      const resumeData = { personalInfo, experience, education, skills, projects };
      const startTime = Date.now();
      const res = await rewriteResume(resumeData, keywords, jdText);
      const latencyMs = Date.now() - startTime;
      const latencySec = (latencyMs / 1000).toFixed(1);

      dispatch(rewriteResumeSuccess(res.data.resume));
      dispatch(setLoading(false));
      setRewriteLatency(latencyMs);

      if (res.data.quality) setQualityResult(res.data.quality);

      toast.dismiss('rewrite');
      toast.success(`Resume rewritten in ${latencySec}s! ✨`);

      // ── ATS re-score runs NON-BLOCKING in background ──
      // Don't await — let it update silently after rewrite is shown
      getATSScore({ ...resumeData, ...res.data.resume }, keywords)
        .then((scoreRes) => {
          if (scoreRes.data.score !== undefined) {
            dispatch(setATSScore(scoreRes.data.score));
          }
          if (scoreRes.data.suggestions) {
            dispatch(setATSSuggestions(scoreRes.data.suggestions));
          }
        })
        .catch(() => { /* ATS score update is non-critical */ });

    } catch (err) {
      dispatch(setLoading(false));
      toast.dismiss('rewrite');
      const errorMsg = err.response?.data?.error || 'Backend not connected. Check your AI API.';
      toast.error(errorMsg);
    }
  };

  /* ── ATS badge color ── */
  const atsBadgeClass =
    atsScore >= 75 ? 'rf-badge--green' : atsScore >= 50 ? 'rf-badge--yellow' : 'rf-badge--red';

  return (
    <div className="rf" id="resume-form">
      {isLoading && <Loader text="AI is rewriting your resume..." />}

      {/* Header */}
      <div className="rf-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="rf-header__left">
          <h2 className="rf-header__title">Resume Builder</h2>
          {atsScore > 0 && (
            <span className={`rf-badge ${atsBadgeClass}`}>{atsScore}% ATS</span>
          )}
        </div>
        <div className="rf-header__right">
          <input type="file" accept=".pdf" ref={fileInputRef} hidden onChange={handleFileUpload} />
          <button 
            type="button" 
            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#eef1fb', color: '#4f6ef7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload PDF
          </button>
        </div>
      </div>

      {/* ── SECTION 1: Personal Info ── */}
      <Accordion title="Personal Information" icon={<User size={16} />} defaultOpen>
        <div className="rf-grid rf-grid--2">
          <div className="rf-field">
            <label className="rf-label">First Name</label>
            <input
              className="rf-input"
              placeholder="John"
              value={personalInfo.firstName}
              onChange={(e) => onPersonal('firstName', e.target.value)}
            />
          </div>
          <div className="rf-field">
            <label className="rf-label">Last Name</label>
            <input
              className="rf-input"
              placeholder="Doe"
              value={personalInfo.lastName}
              onChange={(e) => onPersonal('lastName', e.target.value)}
            />
          </div>
        </div>
        <div className="rf-field">
          <label className="rf-label">Job Title</label>
          <input
            className="rf-input"
            placeholder="Full Stack Developer"
            value={personalInfo.jobTitle}
            onChange={(e) => onPersonal('jobTitle', e.target.value)}
          />
        </div>
        <div className="rf-grid rf-grid--2">
          <div className="rf-field">
            <label className="rf-label">Email</label>
            <input
              className="rf-input"
              type="email"
              placeholder="john@example.com"
              value={personalInfo.email}
              onChange={(e) => onPersonal('email', e.target.value)}
            />
          </div>
          <div className="rf-field">
            <label className="rf-label">Phone</label>
            <input
              className="rf-input"
              placeholder="+1 234 567 8900"
              value={personalInfo.phone}
              onChange={(e) => onPersonal('phone', e.target.value)}
            />
          </div>
        </div>
        <div className="rf-field">
          <label className="rf-label">Location</label>
          <input
            className="rf-input"
            placeholder="San Francisco, CA"
            value={personalInfo.location}
            onChange={(e) => onPersonal('location', e.target.value)}
          />
        </div>
        <div className="rf-grid rf-grid--2">
          <div className="rf-field">
            <label className="rf-label">LinkedIn</label>
            <input
              className="rf-input"
              placeholder="linkedin.com/in/johndoe"
              value={personalInfo.linkedin}
              onChange={(e) => onPersonal('linkedin', e.target.value)}
            />
          </div>
          <div className="rf-field">
            <label className="rf-label">GitHub</label>
            <input
              className="rf-input"
              placeholder="github.com/johndoe"
              value={personalInfo.github}
              onChange={(e) => onPersonal('github', e.target.value)}
            />
          </div>
        </div>
        <div className="rf-field">
          <label className="rf-label">Professional Summary</label>
          <textarea
            className="rf-textarea"
            rows={4}
            placeholder="Briefly describe your professional background and career goals..."
            value={personalInfo.summary}
            onChange={(e) => onPersonal('summary', e.target.value)}
          />
        </div>
      </Accordion>

      {/* ── SECTION 2: Experience ── */}
      <Accordion title="Experience" icon={<Briefcase size={16} />}>
        {experience.map((exp, idx) => (
          <div className="rf-entry" key={exp.id}>
            <div className="rf-entry__header">
              <span className="rf-entry__num">#{idx + 1}</span>
              <button
                type="button"
                className="rf-entry__delete"
                onClick={() => dispatch(removeExperience(exp.id))}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
            <div className="rf-grid rf-grid--2">
              <div className="rf-field">
                <label className="rf-label">Company</label>
                <input
                  className="rf-input"
                  placeholder="Google"
                  value={exp.company}
                  onChange={(e) => onExp(exp.id, 'company', e.target.value)}
                />
              </div>
              <div className="rf-field">
                <label className="rf-label">Role / Position</label>
                <input
                  className="rf-input"
                  placeholder="Software Engineer"
                  value={exp.position}
                  onChange={(e) => onExp(exp.id, 'position', e.target.value)}
                />
              </div>
            </div>
            <div className="rf-grid rf-grid--2">
              <div className="rf-field">
                <label className="rf-label">Start Date</label>
                <input
                  className="rf-input"
                  type="month"
                  value={exp.startDate}
                  onChange={(e) => onExp(exp.id, 'startDate', e.target.value)}
                />
              </div>
              <div className="rf-field">
                <label className="rf-label">End Date</label>
                <input
                  className="rf-input"
                  type="month"
                  value={exp.endDate}
                  disabled={exp.current}
                  onChange={(e) => onExp(exp.id, 'endDate', e.target.value)}
                />
                <label className="rf-checkbox">
                  <input
                    type="checkbox"
                    checked={exp.current}
                    onChange={(e) => onExp(exp.id, 'current', e.target.checked)}
                  />
                  Currently working here
                </label>
              </div>
            </div>
            <div className="rf-field">
              <label className="rf-label">Location</label>
              <input
                className="rf-input"
                placeholder="Mountain View, CA"
                value={exp.location || ''}
                onChange={(e) => onExp(exp.id, 'location', e.target.value)}
              />
            </div>
            <div className="rf-field">
              <label className="rf-label">Bullet Points (one per line)</label>
              <textarea
                className="rf-textarea"
                rows={4}
                placeholder={"Led migration of monolith to microservices\nReduced API latency by 40%\nMentored 3 junior developers"}
                value={exp.description}
                onChange={(e) => onExp(exp.id, 'description', e.target.value)}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          className="rf-add-btn"
          onClick={() => dispatch(addExperience())}
        >
          <Plus size={16} /> Add Experience
        </button>
      </Accordion>

      {/* ── SECTION 3: Education ── */}
      <Accordion title="Education" icon={<GraduationCap size={16} />}>
        {education.map((edu, idx) => (
          <div className="rf-entry" key={edu.id}>
            <div className="rf-entry__header">
              <span className="rf-entry__num">#{idx + 1}</span>
              <button
                type="button"
                className="rf-entry__delete"
                onClick={() => dispatch(removeEducation(edu.id))}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
            <div className="rf-grid rf-grid--2">
              <div className="rf-field">
                <label className="rf-label">Institution</label>
                <input
                  className="rf-input"
                  placeholder="MIT"
                  value={edu.institution}
                  onChange={(e) => onEdu(edu.id, 'institution', e.target.value)}
                />
              </div>
              <div className="rf-field">
                <label className="rf-label">Degree</label>
                <input
                  className="rf-input"
                  placeholder="B.S. in Computer Science"
                  value={edu.degree}
                  onChange={(e) => onEdu(edu.id, 'degree', e.target.value)}
                />
              </div>
            </div>
            <div className="rf-grid rf-grid--2">
              <div className="rf-field">
                <label className="rf-label">Field of Study</label>
                <input
                  className="rf-input"
                  placeholder="Computer Science"
                  value={edu.fieldOfStudy}
                  onChange={(e) => onEdu(edu.id, 'fieldOfStudy', e.target.value)}
                />
              </div>
              <div className="rf-field">
                <label className="rf-label">GPA</label>
                <input
                  className="rf-input"
                  placeholder="3.8 / 4.0"
                  value={edu.gpa}
                  onChange={(e) => onEdu(edu.id, 'gpa', e.target.value)}
                />
              </div>
            </div>
            <div className="rf-grid rf-grid--2">
              <div className="rf-field">
                <label className="rf-label">Start Year</label>
                <input
                  className="rf-input"
                  placeholder="2018"
                  value={edu.startDate}
                  onChange={(e) => onEdu(edu.id, 'startDate', e.target.value)}
                />
              </div>
              <div className="rf-field">
                <label className="rf-label">End Year</label>
                <input
                  className="rf-input"
                  placeholder="2022"
                  value={edu.endDate}
                  onChange={(e) => onEdu(edu.id, 'endDate', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="rf-add-btn"
          onClick={() => dispatch(addEducation())}
        >
          <Plus size={16} /> Add Education
        </button>
      </Accordion>

      {/* ── SECTION 4: Skills ── */}
      <Accordion title="Skills" icon={<Wrench size={16} />}>
        <SkillTagInput
          label="Technical Skills"
          skills={skills.technical}
          onChange={(val) => dispatch(updateSkills({ technical: val }))}
        />
        <SkillTagInput
          label="Soft Skills"
          skills={skills.soft}
          onChange={(val) => dispatch(updateSkills({ soft: val }))}
        />
        <SkillTagInput
          label="Tools & Technologies"
          skills={skills.tools}
          onChange={(val) => dispatch(updateSkills({ tools: val }))}
        />
      </Accordion>

      {/* ── SECTION 5: Projects ── */}
      <Accordion title="Projects" icon={<FolderOpen size={16} />}>
        {projects.map((proj, idx) => (
          <div className="rf-entry" key={proj.id}>
            <div className="rf-entry__header">
              <span className="rf-entry__num">#{idx + 1}</span>
              <button
                type="button"
                className="rf-entry__delete"
                onClick={() => dispatch(removeProject(proj.id))}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
            <div className="rf-field">
              <label className="rf-label">Project Name</label>
              <input
                className="rf-input"
                placeholder="E-Commerce Platform"
                value={proj.name}
                onChange={(e) => onProj(proj.id, 'name', e.target.value)}
              />
            </div>
            <div className="rf-field">
              <label className="rf-label">Description</label>
              <textarea
                className="rf-textarea"
                rows={3}
                placeholder="Built a full-stack e-commerce platform with..."
                value={proj.description}
                onChange={(e) => onProj(proj.id, 'description', e.target.value)}
              />
            </div>
            <div className="rf-grid rf-grid--2">
              <div className="rf-field">
                <label className="rf-label">Tech Stack</label>
                <input
                  className="rf-input"
                  placeholder="React, Node.js, MongoDB"
                  value={proj.techStack}
                  onChange={(e) => onProj(proj.id, 'techStack', e.target.value)}
                />
              </div>
              <div className="rf-field">
                <label className="rf-label">Link</label>
                <input
                  className="rf-input"
                  placeholder="https://github.com/..."
                  value={proj.link}
                  onChange={(e) => onProj(proj.id, 'link', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="rf-add-btn"
          onClick={() => dispatch(addProject())}
        >
          <Plus size={16} /> Add Project
        </button>
      </Accordion>

      {/* ── SECTION 6: AI Optimizer (Always Visible) ── */}
      <div className="rf-ai" id="ai-optimizer">
        <div className="rf-ai__header">
          <Sparkles size={18} />
          <h3>AI Optimizer</h3>
        </div>

        <div className="rf-field">
          <label className="rf-label">Paste Job Description</label>
          <textarea
            className="rf-textarea rf-textarea--jd"
            rows={5}
            placeholder="Paste the full job description here..."
            value={jdText}
            onChange={(e) => dispatch(setJDText(e.target.value))}
          />
        </div>

        <button
          type="button"
          className="rf-ai__analyze-btn"
          onClick={handleAnalyzeJD}
          disabled={analyzingJD}
        >
          {analyzingJD ? (
            <>
              <span className="rf-spinner" /> Analyzing...
            </>
          ) : (
            <>
              <Search size={16} /> Analyze JD
            </>
          )}
        </button>

        {/* Keywords display */}
        {(keywords.hard_skills.length > 0 ||
          keywords.soft_skills.length > 0 ||
          keywords.tools.length > 0 ||
          keywords.top_keywords.length > 0) && (
          <div className="rf-ai__keywords">
            {keywords.top_keywords.length > 0 && (
              <div className="rf-ai__kw-group">
                <span className="rf-ai__kw-label">Top Keywords</span>
                <div className="rf-ai__kw-chips">
                  {keywords.top_keywords.map((k, i) => (
                    <KeywordChip key={i} label={k} category="top_keywords" />
                  ))}
                </div>
              </div>
            )}
            {keywords.hard_skills.length > 0 && (
              <div className="rf-ai__kw-group">
                <span className="rf-ai__kw-label">Hard Skills</span>
                <div className="rf-ai__kw-chips">
                  {keywords.hard_skills.map((k, i) => (
                    <KeywordChip key={i} label={k} category="hard_skills" />
                  ))}
                </div>
              </div>
            )}
            {keywords.soft_skills.length > 0 && (
              <div className="rf-ai__kw-group">
                <span className="rf-ai__kw-label">Soft Skills</span>
                <div className="rf-ai__kw-chips">
                  {keywords.soft_skills.map((k, i) => (
                    <KeywordChip key={i} label={k} category="soft_skills" />
                  ))}
                </div>
              </div>
            )}
            {keywords.tools.length > 0 && (
              <div className="rf-ai__kw-group">
                <span className="rf-ai__kw-label">Tools</span>
                <div className="rf-ai__kw-chips">
                  {keywords.tools.map((k, i) => (
                    <KeywordChip key={i} label={k} category="tools" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ATS Score */}
        {atsScore > 0 && (
          <div className="rf-ai__score">
            <ATSScoreBar score={atsScore} />
            {atsSuggestions && atsSuggestions.length > 0 && (
              <div className="rf-ai__suggestions" style={{ marginTop: '12px', fontSize: '0.85rem', color: '#6b7194' }}>
                <h4 style={{ color: '#0a0f2c', marginBottom: '4px' }}>Suggestions to improve:</h4>
                <ul style={{ paddingLeft: '20px', listStyleType: 'disc' }}>
                  {atsSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Rewrite button */}
        <button
          type="button"
          className="rf-ai__rewrite-btn"
          onClick={handleRewrite}
          disabled={isLoading}
        >
          <Sparkles size={16} /> Rewrite with AI Magic
        </button>

        {/* Latency display (Task 7) */}
        {rewriteLatency && (
          <div className="rf-ai__latency" style={{ marginTop: '8px', fontSize: '0.82rem', color: rewriteLatency > 5000 ? '#ef4444' : '#6b7194', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {rewriteLatency > 5000 ? '⚠️' : '⚡'}
            Rewritten in {(rewriteLatency / 1000).toFixed(1)} seconds
          </div>
        )}

        {/* Quality badge (Task 8) */}
        {qualityResult && (
          <div className="rf-ai__quality" style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: qualityResult.grade === 'green' ? '#dcfce7' : qualityResult.grade === 'yellow' ? '#fef9c3' : '#fee2e2', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: qualityResult.grade === 'green' ? '#16a34a' : qualityResult.grade === 'yellow' ? '#ca8a04' : '#dc2626'
            }} />
            <div>
              <strong style={{ fontSize: '0.85rem', color: qualityResult.grade === 'green' ? '#16a34a' : qualityResult.grade === 'yellow' ? '#ca8a04' : '#dc2626' }}>
                {qualityResult.label} ({qualityResult.score}%)
              </strong>
              {qualityResult.suggestions && qualityResult.suggestions.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: '18px', fontSize: '0.78rem', color: '#6b7194' }}>
                  {qualityResult.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
