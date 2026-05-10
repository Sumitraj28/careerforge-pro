const cleanLine = (line = '') =>
  line
    .replace(/[\u2022\u00b7\u25aa\u25b8\u25ba]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const sectionFromHeader = (line = '') => {
  const cleaned = cleanLine(line).replace(/:$/, '');
  if (cleaned.length > 46) return null;
  if (/^(professional\s+)?summary|profile|objective|about\s+me$/i.test(cleaned)) return 'summary';
  if (/^(work\s+)?experience|employment|internships?|professional\s+experience$/i.test(cleaned)) return 'experience';
  if (/^education|academic|qualifications?$/i.test(cleaned)) return 'education';
  if (/^skills?|technical\s+skills?|core\s+competencies|technologies|languages$/i.test(cleaned)) return 'skills';
  if (/^projects?|portfolio$/i.test(cleaned)) return 'projects';
  if (/^certifications?|certificates?|credentials?|licenses?|achievements$/i.test(cleaned)) return 'certifications';
  return null;
};

const inlineSection = (line = '') => {
  const match = cleanLine(line).match(/^(professional\s+summary|summary|profile|objective|work\s+experience|experience|employment|education|academic|skills|technical\s+skills|projects|certifications|certificates|achievements|languages)\s*[:|-]\s*(.+)$/i);
  if (!match) return null;
  return { section: sectionFromHeader(match[1]) || 'skills', rest: match[2].trim() };
};

const splitSkillItems = (value = '') =>
  cleanLine(value)
    .replace(/^(technical\s+skills?|skills?|tools|technologies|programming\s+languages?|languages|soft\s+skills?)\s*[:|-]?\s*/i, '')
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter((item) => item && item.length > 1 && item.length < 45);

const extractDateRange = (line = '') => {
  const match = cleanLine(line).match(/(((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(19|20)\d{2})\s*(?:-|to|\u2013|\u2014)\s*(((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(19|20)\d{2}|present|current)/i);
  if (!match) return null;
  return {
    range: match[0],
    startDate: match[1].trim(),
    endDate: /present|current/i.test(match[5]) ? '' : match[5].trim(),
    current: /present|current/i.test(match[5]),
  };
};

export function extractPdfPageText(textContent) {
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

export function hasResumeSections(data = {}) {
  const resume = data.resumeData || data.resume_data || data;
  const skills = resume.skills || {};
  return [
    resume.experience,
    resume.work_experience,
    resume.workExperience,
    resume.employment,
    resume.education,
    resume.academic_background,
    resume.academicBackground,
    resume.projects,
    resume.personal_projects,
    resume.personalProjects,
    resume.certifications,
    resume.certificates,
    skills.technical,
    skills.hard_skills,
    skills.hardSkills,
    skills.soft,
    skills.soft_skills,
    skills.softSkills,
    skills.tools,
    skills.technologies,
  ].some((value) => Array.isArray(value) && value.length > 0);
}

export function parseResumeText(text) {
  const lines = text.split('\n').map(cleanLine).filter(Boolean);
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

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) result.personalInfo.email = emailMatch[0];
  const phoneMatch = text.match(/(\+?[\d][\d\s\-().]{7,}[\d])/);
  if (phoneMatch) result.personalInfo.phone = phoneMatch[0].trim();
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) result.personalInfo.linkedin = linkedinMatch[0];
  const githubMatch = text.match(/github\.com\/[\w-]+/i);
  if (githubMatch) result.personalInfo.github = githubMatch[0];

  const nameLine = lines.find((line) =>
    !line.includes('@') &&
    !/^\+?[\d]/.test(line) &&
    !/^(phone|email|linkedin|github|languages?|skills?)\s*:/i.test(line) &&
    !sectionFromHeader(line)
  ) || '';
  if (nameLine) {
    const nameParts = nameLine.split(/\s+/);
    result.personalInfo.firstName = nameParts[0] || '';
    result.personalInfo.lastName = nameParts.slice(1).join(' ');
  }

  const possibleTitle = lines.find((line) =>
    line !== nameLine &&
    !line.includes('@') &&
    !/^\+?[\d]/.test(line) &&
    !/linkedin|github|languages?|skills?/i.test(line) &&
    !sectionFromHeader(line) &&
    line.length < 80
  );
  if (possibleTitle) result.personalInfo.jobTitle = possibleTitle;

  let currentSection = null;
  let summaryLines = [];
  let currentExperience = null;
  let currentEducation = null;

  const pushExperience = () => {
    if (!currentExperience) return;
    if (currentExperience.company || currentExperience.position || currentExperience.description) {
      result.experience.push({ id: Date.now() + Math.random(), ...currentExperience });
    }
    currentExperience = null;
  };

  const pushEducation = () => {
    if (!currentEducation) return;
    if (currentEducation.institution || currentEducation.degree || currentEducation.fieldOfStudy) {
      result.education.push({ id: Date.now() + Math.random(), ...currentEducation });
    }
    currentEducation = null;
  };

  const addSkillLine = (line) => {
    splitSkillItems(line).forEach((skill) => {
      if (!result.skills.technical.includes(skill)) result.skills.technical.push(skill);
    });
  };

  const handleExperienceLine = (line) => {
    const dates = extractDateRange(line);
    const bullet = line.replace(/^[-*]\s*/, '').trim();
    if (dates) {
      pushExperience();
      const rest = line.replace(dates.range, '').replace(/^[-|,:]+|[-|,:]+$/g, '').trim();
      const parts = rest.split('|').map((part) => part.trim()).filter(Boolean);
      currentExperience = {
        company: parts.length > 1 ? parts[1] : rest,
        position: parts.length > 1 ? parts[0] : '',
        location: parts[2] || '',
        startDate: dates.startDate,
        endDate: dates.endDate,
        current: dates.current,
        description: '',
      };
      return;
    }
    if (!currentExperience) {
      currentExperience = { company: '', position: '', location: '', startDate: '', endDate: '', current: false, description: '' };
    }
    if (!currentExperience.company && line.length < 90 && !line.startsWith('-')) currentExperience.company = line;
    else if (!currentExperience.position && line.length < 90 && !line.startsWith('-')) currentExperience.position = line;
    else if (bullet) currentExperience.description = `${currentExperience.description ? `${currentExperience.description}\n` : ''}${bullet}`;
  };

  const handleEducationLine = (line) => {
    const years = [...line.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => match[0]);
    if (!currentEducation || years.length) {
      pushEducation();
      currentEducation = { institution: '', degree: '', fieldOfStudy: '', gpa: '', startDate: years[0] || '', endDate: years[1] || '' };
    }
    const withoutYears = line.replace(/\b(19|20)\d{2}\b/g, '').replace(/[-|,:]+$/g, '').trim();
    const gpaMatch = line.match(/gpa[:\s]+([\d.]+)/i);
    if (gpaMatch) currentEducation.gpa = gpaMatch[1];
    if (!currentEducation.institution && withoutYears) currentEducation.institution = withoutYears;
    else if (!currentEducation.degree && withoutYears) currentEducation.degree = withoutYears;
    else if (!currentEducation.fieldOfStudy && withoutYears) currentEducation.fieldOfStudy = withoutYears;
  };

  lines.forEach((rawLine) => {
    let line = rawLine;
    const inline = inlineSection(line);
    const header = sectionFromHeader(line);
    if (header || inline) {
      if (currentSection === 'experience') pushExperience();
      if (currentSection === 'education') pushEducation();
      currentSection = header || inline.section;
      line = inline?.rest || '';
      if (!line) return;
    }

    if (/^(languages?|skills?)\s*:/i.test(line)) addSkillLine(line);

    switch (currentSection) {
      case 'summary':
        summaryLines.push(line);
        break;
      case 'experience':
        handleExperienceLine(line);
        break;
      case 'education':
        handleEducationLine(line);
        break;
      case 'skills':
        addSkillLine(line);
        break;
      case 'projects': {
        const linkMatch = line.match(/https?:\/\/\S+|github\.com\/\S+/i);
        if (line.startsWith('-') && result.projects.length) {
          const last = result.projects[result.projects.length - 1];
          last.description = `${last.description ? `${last.description}\n` : ''}${line.replace(/^-\s*/, '')}`;
        } else if (line.length < 90) {
          result.projects.push({ id: Date.now() + Math.random(), name: line.replace(linkMatch?.[0] || '', '').trim(), description: '', techStack: '', link: linkMatch?.[0] || '' });
        } else if (result.projects.length) {
          const last = result.projects[result.projects.length - 1];
          last.description = `${last.description ? `${last.description}\n` : ''}${line}`;
        }
        break;
      }
      case 'certifications': {
        const yearMatch = line.match(/\b(20\d{2}|19\d{2})\b/);
        if (line.length < 120) {
          result.certifications.push({ id: Date.now() + Math.random(), name: line.replace(/\b(20\d{2}|19\d{2})\b/, '').replace(/[-|,:]+$/g, '').trim(), issuer: '', date: yearMatch ? yearMatch[0] : '' });
        }
        break;
      }
      default:
        if (!result.personalInfo.location && /,\s*[A-Z]{2}\b/.test(line) && line.length < 70) result.personalInfo.location = line;
        break;
    }
  });

  if (currentSection === 'experience') pushExperience();
  if (currentSection === 'education') pushEducation();
  if (summaryLines.length > 0) result.personalInfo.summary = summaryLines.join(' ');

  return result;
}
