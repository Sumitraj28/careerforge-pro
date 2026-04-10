import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001'
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const extractKeywords = (jd) =>
  API.post('/api/ai/extract-keywords', { jobDescription: jd })

export const rewriteResume = (resumeData, keywords, jd) =>
  API.post('/api/ai/rewrite-resume', { resumeData, keywords, jobDescription: jd })

export const getATSScore = (resumeData, keywords) =>
  API.post('/api/ai/ats-score', { resumeData, keywords })

export const generateCoverLetter = (resumeData, jobDescription, keywords = {}) =>
  API.post('/api/ai/cover-letter', { resumeData, jobDescription, keywords })

export const generatePDF = (resumeHTML, isPro = false) =>
  API.post('/api/resume/generate-pdf', { resumeHTML, isPro }, { responseType: 'arraybuffer' })

export const generateCoverLetterPDF = (coverLetterText, personalInfo) =>
  API.post('/api/resume/generate-cover-letter-pdf', { coverLetterText, personalInfo }, { responseType: 'arraybuffer' })

export const saveResume = (data) =>
  API.post('/api/resume/save', data)

export const getAllResumes = () =>
  API.get('/api/resume/all')

export const getResumeById = (id) =>
  API.get(`/api/resume/${id}`)

export const deleteResume = (id) =>
  API.delete(`/api/resume/delete/${id}`)

export const getAllCoverLetters = () =>
  API.get('/api/coverletter/all')

export const saveCoverLetter = (data) =>
  API.post('/api/coverletter/save', data)

export const deleteCoverLetter = (id) =>
  API.delete(`/api/coverletter/delete/${id}`)

export const createPaymentSession = (userId, userEmail, plan, billingCycle) =>
  API.post('/api/payment/create-session', { userId, userEmail, plan, billingCycle })

export const getPlans = () =>
  API.get('/api/payment/plans')

export const uploadResume = (formData) =>
  API.post('/api/upload/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

export const getPaymentStatus = (userId) =>
  API.get(`/api/payment/status/${userId}`)
