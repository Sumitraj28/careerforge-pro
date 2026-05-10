import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

const asText = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const joined = value.filter(Boolean).join('\n').trim();
      if (joined) return joined;
      continue;
    }
    if (typeof value === 'object') {
      const text = asText(
        value.text,
        value.description,
        value.summary,
        value.title,
        value.name,
        value.value,
        value.label
      );
      if (text) return text;
      continue;
    }
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const asList = (value) => {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[,;\n|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const asArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
  }
  return [];
};

const hasText = (value) => asText(value).length > 0;

const hasEntryData = (entry = {}, fields = []) => fields.some((field) => hasText(entry[field]));

const toMonthValue = (value) => {
  const text = asText(value);
  if (!text) return '';
  const normalized = text.replace(/[–—]/g, '-').trim();
  const isoMonth = normalized.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMonth) return `${isoMonth[1]}-${isoMonth[2].padStart(2, '0')}`;
  const monthYear = normalized.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{4})\b/i);
  if (monthYear) {
    const months = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
    };
    return `${monthYear[2]}-${months[monthYear[1].toLowerCase()]}`;
  }
  const yearMonth = normalized.match(/\b(\d{4})[\/\s.](\d{1,2})\b/);
  if (yearMonth) return `${yearMonth[1]}-${yearMonth[2].padStart(2, '0')}`;
  return normalized;
};

const blankExperience = () => ({
  id: uuidv4(),
  company: '',
  position: '',
  startDate: '',
  endDate: '',
  current: false,
  location: '',
  description: '',
});

const blankEducation = () => ({
  id: uuidv4(),
  institution: '',
  degree: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: '',
  current: false,
  gpa: '',
});

const blankProject = () => ({
  id: uuidv4(),
  name: '',
  description: '',
  techStack: '',
  link: '',
});

const normalizeResumeData = (payload = {}) => {
  const data = payload.resumeData || payload.resume_data || payload;
  const pi = data.personalInfo || data.personal_info || data.personal || data.contact || {};

  let firstName = asText(pi.firstName, pi.first_name, data.firstName, data.first_name);
  let lastName = asText(pi.lastName, pi.last_name, data.lastName, data.last_name);
  const fullName = asText(pi.name, pi.fullName, pi.full_name, data.name, data.fullName, data.full_name);

  if (!firstName && !lastName && fullName) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ');
  }

  const rawExp = asArray(data.experience, data.work_experience, data.workExperience, data.employment, data.history);
  const experience = rawExp.length
    ? rawExp.map((exp = {}) => ({
      id: asText(exp.id, exp._id) || uuidv4(),
      company: asText(exp.company, exp.organization, exp.employer, exp.companyName, exp.company_name),
      position: asText(exp.position, exp.jobTitle, exp.job_title, exp.role, exp.title, exp.designation),
      startDate: toMonthValue(exp.startDate || exp.start_date || exp.from || exp.start),
      endDate: toMonthValue(exp.endDate || exp.end_date || exp.to || exp.end),
      current: Boolean(exp.current || exp.is_current || exp.present || /present|current/i.test(asText(exp.endDate, exp.end_date, exp.to, exp.end))),
      location: asText(exp.location, exp.city),
      description: asText(exp.description, exp.responsibilities, exp.achievements, exp.bullets, exp.highlights, exp.tasks),
    })).filter((exp) => hasEntryData(exp, ['company', 'position', 'startDate', 'endDate', 'location', 'description']))
    : [];

  const rawEdu = asArray(data.education, data.academic_background, data.academicBackground);
  const education = rawEdu.length
    ? rawEdu.map((edu = {}) => ({
      id: asText(edu.id, edu._id) || uuidv4(),
      institution: asText(edu.institution, edu.school, edu.university, edu.college),
      degree: asText(edu.degree, edu.qualification, edu.program),
      fieldOfStudy: asText(edu.fieldOfStudy, edu.field_of_study, edu.major, edu.field, edu.specialization),
      startDate: asText(edu.startDate, edu.start_date, edu.startYear, edu.start_year, edu.from),
      endDate: asText(edu.endDate, edu.end_date, edu.endYear, edu.end_year, edu.to),
      current: Boolean(edu.current || edu.is_current),
      gpa: asText(edu.gpa, edu.grade, edu.score),
    })).filter((edu) => hasEntryData(edu, ['institution', 'degree', 'fieldOfStudy', 'startDate', 'endDate', 'gpa']))
    : [];

  const rawProjects = asArray(data.projects, data.personal_projects, data.personalProjects);
  const projects = rawProjects.length
    ? rawProjects.map((project = {}) => ({
      id: asText(project.id, project._id) || uuidv4(),
      name: asText(project.name, project.title, project.projectName, project.project_name),
      description: asText(project.description, project.summary, project.details, project.bullets),
      techStack: asText(project.techStack, project.tech_stack, project.technologies, project.tools),
      link: asText(project.link, project.url, project.github, project.github_url),
    })).filter((project) => hasEntryData(project, ['name', 'description', 'techStack', 'link']))
    : [];

  const rawCerts = asArray(data.certifications, data.certificates, data.credentials, data.licenses);
  const certifications = rawCerts.length
    ? rawCerts.map((cert = {}) => {
      if (typeof cert === 'string') {
        return { id: uuidv4(), name: cert, issuer: '', date: '' };
      }
      return {
        id: asText(cert.id, cert._id) || uuidv4(),
        name: asText(cert.name, cert.title, cert.certification, cert.certificate),
        issuer: asText(cert.issuer, cert.organization, cert.authority, cert.provider),
        date: asText(cert.date, cert.issueDate, cert.issue_date, cert.year),
      };
    }).filter((cert) => hasEntryData(cert, ['name', 'issuer', 'date']))
    : [];

  const rawLocation = asText(pi.location, pi.address, pi.city, data.location);
  const languageSkills = /^languages?\s*:/i.test(rawLocation)
    ? rawLocation.replace(/^languages?\s*:\s*/i, '')
    : '';
  const location = languageSkills ? '' : rawLocation;
  const rawSkills = data.skills || {};
  const technicalSkills = Array.isArray(rawSkills)
    ? rawSkills
    : rawSkills.technical || rawSkills.hard_skills || rawSkills.hardSkills || rawSkills.skills || data.technicalSkills || languageSkills;
  const softSkills = rawSkills.soft || rawSkills.soft_skills || rawSkills.softSkills || data.softSkills;
  const toolSkills = rawSkills.tools || rawSkills.technologies || rawSkills.tech_stack || rawSkills.techStack || data.tools;

  return {
    personalInfo: {
      firstName,
      lastName,
      jobTitle: asText(pi.jobTitle, pi.job_title, pi.role, pi.position, pi.title, data.jobTitle, data.job_title),
      email: asText(pi.email, pi.email_address, data.email),
      phone: asText(pi.phone, pi.phone_number, data.phone),
      location,
      linkedin: asText(pi.linkedin, pi.linkedin_url, pi.linkedIn, data.linkedin),
      github: asText(pi.github, pi.github_url, data.github),
      summary: asText(pi.summary, pi.professional_summary, pi.professionalSummary, pi.about, pi.objective, data.summary),
    },
    experience: experience.length ? experience : [blankExperience()],
    education: education.length ? education : [blankEducation()],
    skills: {
      technical: asList(technicalSkills),
      soft: asList(softSkills),
      tools: asList(toolSkills),
    },
    projects: projects.length ? projects : [blankProject()],
    certifications,
    keywords: data.keywords && typeof data.keywords === 'object' && !Array.isArray(data.keywords)
      ? data.keywords
      : initialState?.keywords,
    atsScore: data.atsScore || data.ats_score || 0,
    jdText: data.jdText || data.job_description || '',
    selectedTemplate: data.selectedTemplate || data.selected_template || 'classic',
  };
};

const initialState = {
  personalInfo: {
    firstName: '',
    lastName: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    summary: '',
  },
  experience: [
    {
      id: '1',
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      current: false,
      location: '',
      description: '',
    },
  ],
  education: [
    {
      id: '1',
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      current: false,
      gpa: '',
    },
  ],
  skills: {
    technical: [],
    soft: [],
    tools: [],
  },
  projects: [
    {
      id: '1',
      name: '',
      description: '',
      techStack: '',
      link: '',
    },
  ],
  certifications: [],
  jdText: '',
  keywords: {
    hard_skills: [],
    soft_skills: [],
    tools: [],
    qualifications: [],
    action_verbs: [],
    top_keywords: [],
  },
  atsScore: 0,
  atsSuggestions: [],
  isLoading: false,
  selectedTemplate: 'classic',
};

const resumeSlice = createSlice({
  name: 'resume',
  initialState,
  reducers: {
    updatePersonalInfo: (state, action) => {
      state.personalInfo = { ...state.personalInfo, ...action.payload };
    },
    addExperience: (state) => {
      state.experience.push({
        id: uuidv4(),
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        current: false,
        location: '',
        description: '',
      });
    },
    updateExperience: (state, action) => {
      const { id, field, value } = action.payload;
      const index = state.experience.findIndex((exp) => exp.id === id);
      if (index !== -1) {
        state.experience[index][field] = value;
      }
    },
    removeExperience: (state, action) => {
      state.experience = state.experience.filter((exp) => exp.id !== action.payload);
    },
    addEducation: (state) => {
      state.education.push({
        id: uuidv4(),
        institution: '',
        degree: '',
        fieldOfStudy: '',
        startDate: '',
        endDate: '',
        current: false,
        gpa: '',
      });
    },
    updateEducation: (state, action) => {
      const { id, field, value } = action.payload;
      const index = state.education.findIndex((edu) => edu.id === id);
      if (index !== -1) {
        state.education[index][field] = value;
      }
    },
    removeEducation: (state, action) => {
      state.education = state.education.filter((edu) => edu.id !== action.payload);
    },
    updateSkills: (state, action) => {
      state.skills = { ...state.skills, ...action.payload };
    },
    addProject: (state) => {
      state.projects.push({
        id: uuidv4(),
        name: '',
        description: '',
        techStack: '',
        link: '',
      });
    },
    updateProject: (state, action) => {
      const { id, field, value } = action.payload;
      const index = state.projects.findIndex((p) => p.id === id);
      if (index !== -1) {
        state.projects[index][field] = value;
      }
    },
    removeProject: (state, action) => {
      state.projects = state.projects.filter((p) => p.id !== action.payload);
    },
    addCertification: (state) => {
      state.certifications.push({
        id: uuidv4(),
        name: '',
        issuer: '',
        date: '',
      });
    },
    updateCertification: (state, action) => {
      const { id, field, value } = action.payload;
      const index = state.certifications.findIndex((c) => c.id === id);
      if (index !== -1) {
        state.certifications[index][field] = value;
      }
    },
    removeCertification: (state, action) => {
      state.certifications = state.certifications.filter((c) => c.id !== action.payload);
    },
    setJDText: (state, action) => {
      state.jdText = action.payload;
    },
    setKeywords: (state, action) => {
      state.keywords = { ...state.keywords, ...action.payload };
    },
    setATSScore: (state, action) => {
      state.atsScore = action.payload;
    },
    setATSSuggestions: (state, action) => {
      state.atsSuggestions = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setTemplate: (state, action) => {
      state.selectedTemplate = action.payload;
    },
    rewriteResumeSuccess: (state, action) => {
      const data = normalizeResumeData(action.payload);
      state.personalInfo = { ...state.personalInfo, ...data.personalInfo };
      state.experience = data.experience;
      state.education = data.education;
      state.skills = data.skills;
      state.projects = data.projects;
      state.certifications = data.certifications;
      state.isLoading = false;
    },
    resetResume: () => {
      return initialState;
    },
    loadResume: (state, action) => {
      const data = normalizeResumeData(action.payload);
      state.personalInfo = data.personalInfo;
      state.experience = data.experience;
      state.education = data.education;
      state.projects = data.projects;
      state.certifications = data.certifications;
      state.skills = data.skills;
      state.keywords = { ...initialState.keywords, ...(data.keywords || {}) };
      state.atsScore = data.atsScore;
      state.jdText = data.jdText;
      state.selectedTemplate = data.selectedTemplate;
      state.isLoading = false;
    },
  },
});

export const {
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
  addCertification,
  updateCertification,
  removeCertification,
  setJDText,
  setKeywords,
  setATSScore,
  setATSSuggestions,
  setLoading,
  setTemplate,
  rewriteResumeSuccess,
  resetResume,
  loadResume,
} = resumeSlice.actions;

export default resumeSlice.reducer;
