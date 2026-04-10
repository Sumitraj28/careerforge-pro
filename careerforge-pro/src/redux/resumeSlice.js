import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

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
      const p = action.payload || {};

      // Deep-merge personalInfo so firstName, lastName, etc. are never wiped
      if (p.personalInfo) {
        state.personalInfo = { ...state.personalInfo, ...p.personalInfo };
      }

      // Merge experience by id — only update description/position, keep everything else
      if (Array.isArray(p.experience)) {
        state.experience = state.experience.map((orig) => {
          const updated = p.experience.find((e) => e.id === orig.id);
          return updated ? { ...orig, ...updated } : orig;
        });
      }

      // Merge projects by id
      if (Array.isArray(p.projects)) {
        state.projects = state.projects.map((orig) => {
          const updated = p.projects.find((pr) => pr.id === orig.id);
          return updated ? { ...orig, ...updated } : orig;
        });
      }

      // Skills — merge, don't replace
      if (p.skills) {
        state.skills = { ...state.skills, ...p.skills };
      }

      // Education — keep original (AI doesn't rewrite education)
      // Don't overwrite: education, jdText, keywords, atsScore, selectedTemplate

      state.isLoading = false;
    },
    resetResume: () => {
      return initialState;
    },
    loadResume: (state, action) => {
      return { ...initialState, ...action.payload };
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
