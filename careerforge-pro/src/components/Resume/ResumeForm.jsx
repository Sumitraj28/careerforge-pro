import { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
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
  addCertification,
  updateCertification,
  removeCertification,
  loadResume,
} from '../../redux/resumeSlice';
import ATSScoreBar from '../Shared/ATSScoreBar';
import KeywordChip from '../Shared/KeywordChip';
import Loader from '../Shared/Loader';
import {
  Award,
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
  Upload,
  Save,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  extractKeywords, 
  rewriteResume, 
  getATSScore, 
  uploadResume, 
  saveResume,
  updateResume 
} from '../../utils/api';
import './ResumeForm.css';

/* ── Accordion wrapper ── */
function Accordion({ title, icon, children, badge, isOpen, onToggle }) {
  return (
    <div className={`rf-accordion ${isOpen ? 'rf-accordion--open' : ''}`}>
      <button
        type="button"
        className="rf-accordion__trigger"
        onClick={onToggle}
      >
        <span className="rf-accordion__label">
          {icon}
          {title}
          {badge && <span className="rf-accordion__badge">{badge}</span>}
        </span>
        <ChevronDown size={18} className="rf-accordion__arrow" />
      </button>
      {isOpen && <div className="rf-accordion__body">{children}</div>}
    </div>
  );
}

/* ── Skill tag input helper ── */
function SkillTagInput({ label, skills = [], onChange }) {
  const [inputVal, setInputVal] = useState('');

  const addSkill = (val) => {
    const trimmed = val.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
    }
    setInputVal('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(inputVal);
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
        placeholder="Type and press Enter or comma to add"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => inputVal.trim() && addSkill(inputVal)}
      />
    </div>
  );
}

/* ── Parse resume text into structured data ── */
function parseResumeText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const result = {
    personalInfo: {
      firstName: '', lastName: '', jobTitle: '', email: '',
      phone: '', location: '', linkedin: '', github: '', summary: ''
    },
    experience: [],
    education: [],
    skills: { technical: [], soft: [], tools: [] },
    projects: [],
    certifications: [],
  };

  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) result.personalInfo.email = emailMatch[0];

  // Extract phone
  const phoneMatch = text.match(/(\+?[\d][\d\s\-().]{7,}[\d])/);
  if (phoneMatch) result.personalInfo.phone = phoneMatch[0].trim();

  // Extract LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) result.personalInfo.linkedin = linkedinMatch[0];

  // Extract GitHub
  const githubMatch = text.match(/github\.com\/[\w-]+/i);
  if (githubMatch) result.personalInfo.github = githubMatch[0];

  // Extract name from first non-empty line (usually the name)
  const nameLine = lines[0] || '';
  if (nameLine && !nameLine.includes('@') && !nameLine.match(/^\+?[\d]/)) {
    const nameParts = nameLine.split(/\s+/);
    if (nameParts.length >= 2) {
      result.personalInfo.firstName = nameParts[0];
      result.personalInfo.lastName = nameParts.slice(1).join(' ');
    } else {
      result.personalInfo.firstName = nameLine;
    }
  }

  // Try to find job title (second line, often)
  if (lines[1] && !lines[1].includes('@') && !lines[1].match(/^\+?[\d]/)) {
    result.personalInfo.jobTitle = lines[1];
  }

  // Section detection
  const sectionKeywords = {
    experience: /^(work\s+)?experience|employment(\s+history)?|work\s+history/i,
    education: /^education(\s+background)?|academic/i,
    skills: /^skills?(\s+&\s+expertise)?|technical\s+skills?|core\s+competencies/i,
    projects: /^projects?(\s+portfolio)?/i,
    certifications: /^certifications?|credentials?|licenses?/i,
    summary: /^(professional\s+)?summary|profile|objective|about(\s+me)?/i,
  };

  let currentSection = null;
  let summaryLines = [];
  let currentEntry = null;
  let descriptionLines = [];

  const pushExperience = () => {
    if (currentEntry) {
      if (descriptionLines.length > 0) {
        currentEntry.description = descriptionLines.join('\n');
      }
      result.experience.push({
        id: Date.now() + Math.random(),
        company: currentEntry.company || '',
        position: currentEntry.position || '',
        location: currentEntry.location || '',
        startDate: currentEntry.startDate || '',
        endDate: currentEntry.endDate || '',
        current: currentEntry.current || false,
        description: currentEntry.description || '',
      });
      currentEntry = null;
      descriptionLines = [];
    }
  };

  const pushEducation = () => {
    if (currentEntry) {
      result.education.push({
        id: Date.now() + Math.random(),
        institution: currentEntry.institution || '',
        degree: currentEntry.degree || '',
        fieldOfStudy: currentEntry.fieldOfStudy || '',
        gpa: currentEntry.gpa || '',
        startDate: currentEntry.startDate || '',
        endDate: currentEntry.endDate || '',
      });
      currentEntry = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers
    let sectionFound = false;
    for (const [section, regex] of Object.entries(sectionKeywords)) {
      if (regex.test(line) && line.length < 60) {
        // Save any pending entry
        if (currentSection === 'experience') pushExperience();
        if (currentSection === 'education') pushEducation();
        currentSection = section;
        sectionFound = true;
        break;
      }
    }
    if (sectionFound) continue;

    switch (currentSection) {
      case 'summary':
        summaryLines.push(line);
        break;

      case 'experience': {
        // Date pattern detection
        const datePattern = /(\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4})\s*[-–—]\s*(\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4}|present|current)/i;
        const dateMatch = line.match(datePattern);

        if (dateMatch) {
          pushExperience();
          currentEntry = {};
          const dateStr = dateMatch[0];
          const parts = dateStr.split(/[-–—]/);
          currentEntry.startDate = parts[0].trim();
          const endPart = parts[1]?.trim() || '';
          if (/present|current/i.test(endPart)) {
            currentEntry.current = true;
            currentEntry.endDate = '';
          } else {
            currentEntry.endDate = endPart;
          }
          // Rest of line after date might be company
          const rest = line.replace(dateMatch[0], '').trim();
          if (rest) currentEntry.company = rest;
        } else if (currentEntry) {
          if (!currentEntry.company && line.length < 80) {
            currentEntry.company = line;
          } else if (!currentEntry.position && line.length < 80) {
            currentEntry.position = line;
          } else {
            // It's a bullet/description
            const cleaned = line.replace(/^[•·▪▸►\-–—*]\s*/, '');
            if (cleaned) descriptionLines.push(cleaned);
          }
        } else {
          // No current entry, start a new one
          if (line.length < 80) {
            pushExperience();
            currentEntry = { company: line };
          }
        }
        break;
      }

      case 'education': {
        const yearPattern = /\b(19|20)\d{2}\b/g;
        const years = [...line.matchAll(yearPattern)].map(m => m[0]);

        if (years.length >= 1) {
          pushEducation();
          currentEntry = {
            startDate: years[0] || '',
            endDate: years[1] || '',
          };
          const withoutYears = line.replace(yearPattern, '').replace(/[-–—|]/g, ' ').trim();
          if (withoutYears) currentEntry.institution = withoutYears;
        } else if (currentEntry) {
          if (!currentEntry.institution) {
            currentEntry.institution = line;
          } else if (!currentEntry.degree) {
            currentEntry.degree = line;
          } else if (!currentEntry.fieldOfStudy) {
            currentEntry.fieldOfStudy = line;
          }
          // GPA detection
          const gpaMatch = line.match(/gpa[:\s]+(\d+\.\d+)/i);
          if (gpaMatch) currentEntry.gpa = gpaMatch[1];
        } else {
          if (line.length < 100) {
            currentEntry = { institution: line };
          }
        }
        break;
      }

      case 'skills': {
        // Skills can be comma-separated or line-separated
        const cleaned = line.replace(/^[\w\s]+(skills?|technologies|tools|competencies)[:\s]*/i, '');
        const skillItems = cleaned.split(/[,;|]/).map(s => s.trim()).filter(s => s && s.length > 1 && s.length < 40);

        if (skillItems.length > 1) {
          // Categorize simply — all go to technical by default
          skillItems.forEach(skill => {
            if (!result.skills.technical.includes(skill)) {
              result.skills.technical.push(skill);
            }
          });
        } else if (cleaned.length > 1 && cleaned.length < 40) {
          if (!result.skills.technical.includes(cleaned)) {
            result.skills.technical.push(cleaned);
          }
        }
        break;
      }

      case 'projects': {
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('▪')) {
          if (result.projects.length > 0) {
            const last = result.projects[result.projects.length - 1];
            last.description = (last.description ? last.description + '\n' : '') + line.replace(/^[•\-▪]\s*/, '');
          }
        } else if (line.length < 80) {
          result.projects.push({
            id: Date.now() + Math.random(),
            name: line,
            description: '',
            techStack: '',
            link: '',
          });
        }
        break;
      }

      case 'certifications': {
        if (line.length < 100) {
          const yearMatch = line.match(/\b(20\d{2})\b/);
          result.certifications.push({
            id: Date.now() + Math.random(),
            name: line.replace(/\b(20\d{2})\b/, '').replace(/[-|]$/, '').trim(),
            issuer: '',
            date: yearMatch ? yearMatch[0] : '',
          });
        }
        break;
      }

      default:
        // Before any section — might be contact info or location
        if (!result.personalInfo.location && line.match(/,\s*[A-Z]{2}|city|state|country/i) && line.length < 60) {
          result.personalInfo.location = line;
        }
        break;
    }
  }

  // Flush last entries
  if (currentSection === 'experience') pushExperience();
  if (currentSection === 'education') pushEducation();

  // Set summary
  if (summaryLines.length > 0) {
    result.personalInfo.summary = summaryLines.join(' ');
  }

  return result;
}

function extractPdfPageText(textContent) {
  const rows = new Map();

  textContent.items.forEach((item) => {
    const str = item.str?.trim();
    if (!str) return;

    const y = Math.round(item.transform?.[5] || 0);
    const x = item.transform?.[4] || 0;
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push({ x, str });
  });

  return [...rows.entries()]
    .sort(([yA], [yB]) => yB - yA)
    .map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.str).join(' '))
    .join('\n');
}

function hasImportableResumeData(data = {}) {
  const resume = data.resumeData || data.resume_data || data;
  const personal = resume.personalInfo || resume.personal_info || {};
  const skills = resume.skills || {};

  const personalText = [
    personal.firstName,
    personal.first_name,
    personal.lastName,
    personal.last_name,
    personal.name,
    personal.fullName,
    personal.email,
    personal.phone,
    personal.summary,
    personal.professional_summary,
  ].some((value) => String(value || '').trim());

  const hasSectionData = [
    resume.experience,
    resume.education,
    resume.projects,
    resume.certifications,
    resume.certificates,
    skills.technical,
    skills.hard_skills,
    skills.soft,
    skills.soft_skills,
    skills.tools,
    skills.technologies,
  ].some((value) => Array.isArray(value) && value.length > 0);

  return personalText || hasSectionData;
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
    certifications,
    jdText,
    keywords,
    atsScore,
    atsSuggestions,
    isLoading,
    selectedTemplate
  } = resume;

  const [analyzingJD, setAnalyzingJD] = useState(false);
  const [rewriteLatency, setRewriteLatency] = useState(null);
  const [qualityResult, setQualityResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef(null);

  // State to manage open accordions
  const [openSections, setOpenSections] = useState({
    personal: true,
    experience: false,
    education: false,
    skills: false,
    projects: false,
    certifications: false,
    ai: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const expandAllWithData = () => {
    setOpenSections({
      personal: true,
      experience: true,
      education: true,
      skills: true,
      projects: true,
      certifications: true,
      ai: false,
    });
  };

  /* ── File Upload with Client-Side Parse Fallback ── */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      toast.error('Please upload a PDF file.');
      return;
    }

    setUploadProgress(true);
    const toastId = toast.loading('Parsing your resume…');

    try {
      // 1. Try server-side parsing first
      const formData = new FormData();
      formData.append('resumeFile', file);

      const res = await uploadResume(formData);

      if (res.data?.resumeData && hasImportableResumeData(res.data.resumeData)) {
        dispatch(loadResume(res.data.resumeData));
        expandAllWithData(res.data.resumeData);
        toast.dismiss(toastId);
        toast.success('Resume imported successfully! Review and edit as needed.');
      } else {
        throw new Error('Server parser returned empty resume data');
      }
    } catch (serverErr) {
      console.warn('Server parse failed, trying client-side:', serverErr);

      // 2. Client-side fallback using PDF.js
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = extractPdfPageText(textContent);
          fullText += pageText + '\n';
        }

        if (fullText.trim()) {
          const parsed = parseResumeText(fullText);
          if (!hasImportableResumeData(parsed)) {
            throw new Error('Could not detect resume fields from PDF text');
          }
          dispatch(loadResume(parsed));
          expandAllWithData(parsed);
          toast.dismiss(toastId);
          toast.success('Resume parsed! Please review and correct any details.');
        } else {
          throw new Error('Could not extract text from PDF');
        }
      } catch (clientErr) {
        console.error('Client-side parse also failed:', clientErr);
        toast.dismiss(toastId);
        toast.error('Could not parse this PDF. It may be image-based. Try copy-pasting the text instead.');
      }
    } finally {
      setUploadProgress(false);
      e.target.value = null;
    }
  };

  /* ── Handlers ── */
  const onPersonal = (field, value) => dispatch(updatePersonalInfo({ [field]: value }));
  const onExp = (id, field, value) => dispatch(updateExperience({ id, field, value }));
  const onEdu = (id, field, value) => dispatch(updateEducation({ id, field, value }));
  const onProj = (id, field, value) => dispatch(updateProject({ id, field, value }));
  const onCert = (id, field, value) => dispatch(updateCertification({ id, field, value }));

  /* ── Save Resume ── */
  const handleSave = async () => {
    if (!personalInfo.firstName && !personalInfo.lastName) {
      toast.error('Please fill in at least your name before saving.');
      return;
    }

    toast.loading('Saving resume...', { id: 'save-resume' });
    try {
      const payload = {
        title: `${personalInfo.firstName} ${personalInfo.lastName} — ${personalInfo.jobTitle || 'Resume'}`.trim(),
        resumeData: { personalInfo, experience, education, skills, projects, certifications, selectedTemplate },
        atsScore,
        jobDescription: jdText,
        keywords,
      };

      const searchParams = new URLSearchParams(window.location.search);
      const resumeId = searchParams.get('id');
      
      const res = resumeId 
        ? await updateResume(resumeId, payload)
        : await saveResume(payload);
      toast.dismiss('save-resume');
      toast.success('Resume saved!');

      if (!resumeId && res.data?._id) {
        window.history.replaceState(null, '', `?id=${res.data._id}`);
      }
    } catch (err) {
      toast.dismiss('save-resume');
      toast.error('Failed to save. Please try again.');
      console.error(err);
    }
  };

  /* ── AI: Analyze JD ── */
  const handleAnalyzeJD = async () => {
    if (analyzingJD) return;
    if (!jdText.trim()) {
      toast.error('Please paste a job description first.');
      return;
    }
    setAnalyzingJD(true);
    toast.loading('Extracting keywords…', { id: 'analyze-jd' });
    try {
      const res = await extractKeywords(jdText);
      const extractedKeywords = res.data.keywords;
      dispatch(setKeywords(extractedKeywords));

      const resumeData = { personalInfo, experience, education, skills, projects };
      const scoreRes = await getATSScore(resumeData, extractedKeywords);
      dispatch(setATSScore(scoreRes.data.score || 0));
      if (scoreRes.data.suggestions) dispatch(setATSSuggestions(scoreRes.data.suggestions));

      toast.dismiss('analyze-jd');
      toast.success('ATS analysis complete!');
    } catch (err) {
      console.error(err);
      toast.dismiss('analyze-jd');
      toast.error(err.response?.data?.error || 'Failed to analyze JD.');
    } finally {
      setAnalyzingJD(false);
    }
  };

  /* ── AI: Rewrite Resume ── */
  const handleRewrite = async () => {
    if (!jdText.trim()) {
      toast.error('Paste a job description and click Analyze JD first.');
      return;
    }
    dispatch(setLoading(true));
    setRewriteLatency(null);
    setQualityResult(null);
    toast.loading('AI is rewriting your resume…', { id: 'rewrite' });

    try {
      const resumeData = { personalInfo, experience, education, skills, projects };
      const startTime = Date.now();
      const res = await rewriteResume(resumeData, keywords, jdText);
      const latencyMs = Date.now() - startTime;

      dispatch(rewriteResumeSuccess(res.data.resume));
      dispatch(setLoading(false));
      setRewriteLatency(latencyMs);

      if (res.data.quality) setQualityResult(res.data.quality);

      toast.dismiss('rewrite');
      toast.success(`Resume rewritten in ${(latencyMs / 1000).toFixed(1)}s! ✨`);

      // Non-blocking ATS re-score
      getATSScore({ ...resumeData, ...res.data.resume }, keywords)
        .then((scoreRes) => {
          if (scoreRes.data.score !== undefined) dispatch(setATSScore(scoreRes.data.score));
          if (scoreRes.data.suggestions) dispatch(setATSSuggestions(scoreRes.data.suggestions));
        })
        .catch(() => { });

    } catch (err) {
      dispatch(setLoading(false));
      toast.dismiss('rewrite');
      toast.error(err.response?.data?.error || 'Rewrite failed. Check your connection.');
    }
  };

  const atsBadgeClass =
    atsScore >= 75 ? 'rf-badge--green' : atsScore >= 50 ? 'rf-badge--yellow' : 'rf-badge--red';

  const expCount = experience.filter(e => e.company || e.position).length;
  const eduCount = education.filter(e => e.institution || e.degree).length;
  const skillCount = [...(skills.technical || []), ...(skills.soft || []), ...(skills.tools || [])].length;
  const projCount = projects.filter(p => p.name).length;
  const certCount = certifications?.filter(c => c.name).length || 0;

  return (
    <div className="rf" id="resume-form">
      {isLoading && <Loader text="AI is rewriting your resume…" />}

      {/* Header */}
      <div className="rf-header">
        <div className="rf-header__left">
          <h2 className="rf-header__title">Resume Builder</h2>
          {atsScore > 0 && (
            <span className={`rf-badge ${atsBadgeClass}`}>{atsScore}% ATS Match</span>
          )}
        </div>
        <div className="rf-header__right">
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            hidden
            onChange={handleFileUpload}
          />
          <button
            type="button"
            className="rf-header-btn rf-header-btn--upload"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress}
            title="Upload your existing PDF resume to auto-fill the form"
          >
            <Upload size={14} />
            {uploadProgress ? 'Parsing…' : 'Import PDF'}
          </button>
          <button
            type="button"
            className="rf-header-btn rf-header-btn--save"
            onClick={handleSave}
            title="Save your resume to your account"
          >
            <Save size={14} />
            Save
          </button>
          <button
            type="button"
            className="rf-header-btn rf-header-btn--clear"
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all form data? This cannot be undone.')) {
                dispatch(resetResume());
                setOpenSections({ personal: true, experience: false, education: false, skills: false, projects: false, certifications: false, ai: false });
                toast.success('Form cleared');
              }
            }}
            title="Clear all fields"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Upload hint banner */}
      <div className="rf-upload-hint">
        <AlertCircle size={14} />
        <span>Already have a resume? Click <strong>Import PDF</strong> to auto-fill this form from your existing resume.</span>
      </div>

      {/* ── SECTION 1: Personal Info ── */}
      <Accordion 
        title="Personal Information" 
        icon={<User size={16} />} 
        isOpen={openSections.personal}
        onToggle={() => toggleSection('personal')}
      >
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
          <label className="rf-label">Job Title / Desired Role</label>
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
            <label className="rf-label">LinkedIn URL</label>
            <input
              className="rf-input"
              placeholder="linkedin.com/in/johndoe"
              value={personalInfo.linkedin}
              onChange={(e) => onPersonal('linkedin', e.target.value)}
            />
          </div>
          <div className="rf-field">
            <label className="rf-label">GitHub URL</label>
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
            placeholder="Briefly describe your professional background and career goals…"
            value={personalInfo.summary}
            onChange={(e) => onPersonal('summary', e.target.value)}
          />
        </div>
      </Accordion>

      {/* ── SECTION 2: Experience ── */}
      <Accordion 
        title="Experience" 
        icon={<Briefcase size={16} />} 
        badge={expCount || null}
        isOpen={openSections.experience}
        onToggle={() => toggleSection('experience')}
      >
        {experience.map((exp, idx) => (
          <div className="rf-entry" key={exp.id}>
            <div className="rf-entry__header">
              <span className="rf-entry__num">Position #{idx + 1}</span>
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
                <label className="rf-label">Company / Organization</label>
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
            <div className="rf-grid rf-grid--3">
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
              </div>
              <div className="rf-field rf-field--center">
                <label className="rf-checkbox">
                  <input
                    type="checkbox"
                    checked={exp.current}
                    onChange={(e) => onExp(exp.id, 'current', e.target.checked)}
                  />
                  Currently here
                </label>
              </div>
            </div>
            <div className="rf-field">
              <label className="rf-label">Location (optional)</label>
              <input
                className="rf-input"
                placeholder="Mountain View, CA"
                value={exp.location || ''}
                onChange={(e) => onExp(exp.id, 'location', e.target.value)}
              />
            </div>
            <div className="rf-field">
              <label className="rf-label">Key Achievements & Responsibilities <span className="rf-label-hint">(one per line, starts with action verb)</span></label>
              <textarea
                className="rf-textarea"
                rows={5}
                placeholder={"Led migration of monolith to microservices, cutting deploy time 60%\nBuilt real-time dashboard serving 50K+ daily active users\nMentored 3 junior developers through code reviews"}
                value={Array.isArray(exp.description) ? exp.description.join('\n') : exp.description}
                onChange={(e) => onExp(exp.id, 'description', e.target.value)}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          className="rf-add-btn"
          onClick={() => {
            dispatch(addExperience());
            setOpenSections(prev => ({ ...prev, experience: true }));
          }}
        >
          <Plus size={16} /> Add Experience
        </button>
      </Accordion>

      {/* ── SECTION 3: Education ── */}
      <Accordion 
        title="Education" 
        icon={<GraduationCap size={16} />} 
        badge={eduCount || null}
        isOpen={openSections.education}
        onToggle={() => toggleSection('education')}
      >
        {education.map((edu, idx) => (
          <div className="rf-entry" key={edu.id}>
            <div className="rf-entry__header">
              <span className="rf-entry__num">Degree #{idx + 1}</span>
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
                <label className="rf-label">GPA (optional)</label>
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
          onClick={() => {
            dispatch(addEducation());
            setOpenSections(prev => ({ ...prev, education: true }));
          }}
        >
          <Plus size={16} /> Add Education
        </button>
      </Accordion>

      {/* ── SECTION 4: Skills ── */}
      <Accordion 
        title="Skills" 
        icon={<Wrench size={16} />} 
        badge={skillCount || null}
        isOpen={openSections.skills}
        onToggle={() => toggleSection('skills')}
      >
        <p className="rf-section-hint">Type a skill and press <kbd>Enter</kbd> or <kbd>,</kbd> to add it.</p>
        <SkillTagInput
          label="Technical Skills"
          skills={skills.technical || []}
          onChange={(val) => dispatch(updateSkills({ technical: val }))}
        />
        <SkillTagInput
          label="Soft Skills"
          skills={skills.soft || []}
          onChange={(val) => dispatch(updateSkills({ soft: val }))}
        />
        <SkillTagInput
          label="Tools & Technologies"
          skills={skills.tools || []}
          onChange={(val) => dispatch(updateSkills({ tools: val }))}
        />
      </Accordion>

      {/* ── SECTION 5: Projects ── */}
      <Accordion 
        title="Projects" 
        icon={<FolderOpen size={16} />} 
        badge={projCount || null}
        isOpen={openSections.projects}
        onToggle={() => toggleSection('projects')}
      >
        {projects.map((proj, idx) => (
          <div className="rf-entry" key={proj.id}>
            <div className="rf-entry__header">
              <span className="rf-entry__num">Project #{idx + 1}</span>
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
                placeholder="Built a full-stack e-commerce platform with React and Node.js, handling 10K+ monthly transactions…"
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
                <label className="rf-label">Project Link</label>
                <input
                  className="rf-input"
                  placeholder="https://github.com/…"
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
          onClick={() => {
            dispatch(addProject());
            setOpenSections(prev => ({ ...prev, projects: true }));
          }}
        >
          <Plus size={16} /> Add Project
        </button>
      </Accordion>

      {/* ── SECTION 6: Certifications ── */}
      <Accordion 
        title="Certifications" 
        icon={<Award size={16} />} 
        badge={certCount || null}
        isOpen={openSections.certifications}
        onToggle={() => toggleSection('certifications')}
      >
        {certifications?.map((cert, idx) => (
          <div className="rf-entry" key={cert.id}>
            <div className="rf-entry__header">
              <span className="rf-entry__num">Cert #{idx + 1}</span>
              <button
                type="button"
                className="rf-entry__delete"
                onClick={() => dispatch(removeCertification(cert.id))}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
            <div className="rf-field">
              <label className="rf-label">Certification Name</label>
              <input
                className="rf-input"
                placeholder="AWS Certified Solutions Architect"
                value={cert.name}
                onChange={(e) => onCert(cert.id, 'name', e.target.value)}
              />
            </div>
            <div className="rf-grid rf-grid--2">
              <div className="rf-field">
                <label className="rf-label">Issuing Organization</label>
                <input
                  className="rf-input"
                  placeholder="Amazon Web Services"
                  value={cert.issuer}
                  onChange={(e) => onCert(cert.id, 'issuer', e.target.value)}
                />
              </div>
              <div className="rf-field">
                <label className="rf-label">Date Earned</label>
                <input
                  className="rf-input"
                  placeholder="Jan 2023"
                  value={cert.date}
                  onChange={(e) => onCert(cert.id, 'date', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="rf-add-btn"
          onClick={() => {
            dispatch(addCertification());
            setOpenSections(prev => ({ ...prev, certifications: true }));
          }}
        >
          <Plus size={16} /> Add Certification
        </button>
      </Accordion>

      {/* ── AI Optimizer ── */}
      <div className="rf-ai" id="ai-optimizer">
        <div className="rf-ai__header">
          <Sparkles size={18} />
          <h3>AI Optimizer</h3>
          <span className="rf-ai__badge">Powered by AI</span>
        </div>

        <p className="rf-ai__desc">
          Paste the job description below. We'll extract keywords and score your resume against ATS systems,
          then optionally rewrite your resume to maximize your match rate.
        </p>

        <div className="rf-field">
          <label className="rf-label">Job Description</label>
          <textarea
            className="rf-textarea rf-textarea--jd"
            rows={6}
            placeholder="Paste the full job description here — requirements, responsibilities, everything. The more detail you provide, the better the AI match."
            value={jdText}
            onChange={(e) => dispatch(setJDText(e.target.value))}
          />
          <span className="rf-char-count">{jdText.length} characters</span>
        </div>

        <button
          type="button"
          className="rf-ai__analyze-btn"
          onClick={handleAnalyzeJD}
          disabled={analyzingJD}
        >
          {analyzingJD ? (
            <><span className="rf-spinner" /> Analyzing JD…</>
          ) : (
            <><Search size={16} /> Analyze JD & Score Resume</>
          )}
        </button>

        {/* Keywords display */}
        {(keywords?.hard_skills?.length > 0 || keywords?.soft_skills?.length > 0 ||
          keywords?.tools?.length > 0 || keywords?.top_keywords?.length > 0) && (
            <div className="rf-ai__keywords">
              {keywords.top_keywords?.length > 0 && (
                <div className="rf-ai__kw-group">
                  <span className="rf-ai__kw-label">Top Keywords</span>
                  <div className="rf-ai__kw-chips">
                    {keywords.top_keywords.map((k, i) => (
                      <KeywordChip key={i} label={k} category="top_keywords" />
                    ))}
                  </div>
                </div>
              )}
              {keywords.hard_skills?.length > 0 && (
                <div className="rf-ai__kw-group">
                  <span className="rf-ai__kw-label">Hard Skills</span>
                  <div className="rf-ai__kw-chips">
                    {keywords.hard_skills.map((k, i) => (
                      <KeywordChip key={i} label={k} category="hard_skills" />
                    ))}
                  </div>
                </div>
              )}
              {keywords.soft_skills?.length > 0 && (
                <div className="rf-ai__kw-group">
                  <span className="rf-ai__kw-label">Soft Skills</span>
                  <div className="rf-ai__kw-chips">
                    {keywords.soft_skills.map((k, i) => (
                      <KeywordChip key={i} label={k} category="soft_skills" />
                    ))}
                  </div>
                </div>
              )}
              {keywords.tools?.length > 0 && (
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
            {atsSuggestions?.length > 0 && (
              <div className="rf-ai__suggestions">
                <h4>Suggestions to improve your score:</h4>
                <ul>
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
          <Sparkles size={16} /> Rewrite Resume with AI
        </button>

        {/* Latency display */}
        {rewriteLatency && (
          <div className={`rf-ai__latency ${rewriteLatency > 5000 ? 'rf-ai__latency--slow' : ''}`}>
            {rewriteLatency > 5000 ? '⚠️' : '⚡'} Rewritten in {(rewriteLatency / 1000).toFixed(1)}s
          </div>
        )}

        {/* Quality badge */}
        {qualityResult && (
          <div className={`rf-ai__quality rf-ai__quality--${qualityResult.grade}`}>
            <span className="rf-ai__quality-dot" />
            <div>
              <strong>{qualityResult.label} ({qualityResult.score}%)</strong>
              {qualityResult.suggestions?.length > 0 && (
                <ul>
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
