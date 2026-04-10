const { GoogleGenerativeAI } = require('@google/generative-ai');

// Lazy-init so dotenv is guaranteed to have loaded the API key before use
let _model = null;
let _rewriteModel = null;

function getModel() {
  if (!_model) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    _model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
    });
  }
  return _model;
}

function getRewriteModel() {
  if (!_rewriteModel) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    _rewriteModel = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.6, maxOutputTokens: 6144 },
    });
  }
  return _rewriteModel;
}


/**
 * Strip markdown formatting from text:
 * **bold**, *italic*, __bold__, _italic_, ~~strikethrough~~, `code`, ### headings, - bullets
 */
function stripMarkdown(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')   // ***bold italic***
    .replace(/\*\*(.*?)\*\*/g, '$1')         // **bold**
    .replace(/\*(.*?)\*/g, '$1')             // *italic*
    .replace(/___(.*?)___/g, '$1')           // ___bold italic___
    .replace(/__(.*?)__/g, '$1')             // __bold__
    .replace(/_(.*?)_/g, '$1')              // _italic_
    .replace(/~~(.*?)~~/g, '$1')             // ~~strikethrough~~
    .replace(/`(.*?)`/g, '$1')               // `code`
    .replace(/^#{1,6}\s+/gm, '')             // ### headings
    .replace(/^\s*[-*+]\s+/gm, '')           // - bullet points (only at line start)
    .replace(/^\s*\d+\.\s+/gm, '')           // 1. numbered lists
    .trim();
}

/**
 * Recursively strip markdown from all string values in an object/array
 */
function cleanMarkdownFromObject(obj) {
  if (typeof obj === 'string') return stripMarkdown(obj);
  if (Array.isArray(obj)) return obj.map(item => cleanMarkdownFromObject(item));
  if (typeof obj === 'object' && obj !== null) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanMarkdownFromObject(value);
    }
    return cleaned;
  }
  return obj;
}

async function extractKeywords(jobDescription) {
  try {
    const prompt = `You are an expert ATS analyst with 10 years experience.
Analyze this Job Description and extract the most important keywords that an ATS system would scan for.

Return ONLY a valid JSON object in this exact format, 
no extra text, no markdown backticks:
{
  "hard_skills": [],
  "soft_skills": [],
  "tools": [],
  "qualifications": [],
  "action_verbs": [],
  "top_keywords": []
}

Job Description:
${jobDescription}`;

    const result = await getModel().generateContent(prompt);
    const text = result.response.text();
    let jsonStr = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON');
    }
    jsonStr = jsonMatch[0];
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini failed to extract keywords, using fallback. Error:", error.message);
    // Provide a safe, intelligent fallback so the UI never crashes
    return {
      hard_skills: ["JavaScript", "React", "Node.js", "Python"],
      soft_skills: ["Communication", "Problem Solving", "Teamwork"],
      tools: ["Git", "Docker", "AWS"],
      qualifications: ["Bachelor's Degree", "3+ years experience"],
      action_verbs: ["Developed", "Led", "Optimized", "Designed"],
      top_keywords: ["Software Engineer", "Full Stack", "Developer", "Agile"]
    };
  }
}

async function rewriteResume(resumeData, keywords, jobDescription) {
  const mergedKeywords = [
    ...(keywords.top_keywords || []),
    ...(keywords.hard_skills  || []),
    ...(keywords.soft_skills  || []),
  ].slice(0, 20);

  const prompt = `You are an expert resume writer.

Rewrite the description/bullet points and summary in this resume to:
1. Start each bullet with a strong past-tense action verb
2. Naturally include these keywords: ${mergedKeywords.join(', ')}
3. Add quantifiable achievements (%, numbers, impact)
4. Keep it truthful — only enhance, never fabricate
5. Maximum 2 lines per bullet point

Rules:
- Return ONLY valid JSON, no markdown, no extra text
- Keep the exact same JSON structure as input
- Only rewrite description and summary fields
- Do not change personal info, education, dates, or ids
- Do NOT use any markdown formatting. No **, no *, no __, no #. Plain text only.

Current Resume:
${JSON.stringify(resumeData)}

Job Description:
${jobDescription.slice(0, 1200)}

Return the complete updated resume JSON:`;

  const result = await getRewriteModel().generateContent(prompt);
  const text = result.response.text();

  // Robust JSON extraction — handle markdown fences, thinking blocks, extra text
  let jsonStr = text;

  // Remove markdown code fences
  jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

  // If there's a thinking block or extra text before JSON, extract the JSON object
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('AI response did not contain JSON object:', text.substring(0, 500));
    throw new Error('AI did not return valid JSON');
  }
  jsonStr = jsonMatch[0];

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.error('JSON parse failed:', parseErr.message);
    console.error('Raw AI response (first 500 chars):', text.substring(0, 500));
    throw new Error('Failed to parse AI response as JSON');
  }

  const cleaned = cleanMarkdownFromObject(parsed);
  return cleaned;
}

async function generateCoverLetter(resumeData, jobDescription, keywords) {
  const mergedKeywords = [...(keywords.top_keywords || []), ...(keywords.hard_skills || []), ...(keywords.soft_skills || [])];

  const experienceBullets = (resumeData.experience || []).map(exp => 
    `${exp.position} at ${exp.company}:\n${exp.description}`
  ).join('\n\n');

  const skillsList = [
    ...(resumeData.skills?.technical || []),
    ...(resumeData.skills?.soft || []),
    ...(resumeData.skills?.tools || [])
  ].join(', ');

  const prompt = `You are an expert cover letter writer with 10+ years
of experience helping candidates land their dream jobs.

Write a professional, personalized cover letter.

STRICT RULES:
- Exactly 3 paragraphs only
- Paragraph 1 (2-3 sentences):
  Who you are + why this specific role excites you
  + one key achievement to hook the reader
- Paragraph 2 (3-4 sentences):
  Top 2-3 quantifiable achievements with numbers
  Show impact and results not just responsibilities
- Paragraph 3 (2-3 sentences):
  Why this specific company + cultural fit
  + strong call to action with contact info
- Naturally include these keywords: ${mergedKeywords.join(', ')}
- Do NOT start with 'I am writing to apply for'
- Do NOT use 'team player' 'hard worker' 'passionate'
- Do NOT use generic phrases
- Tone: Confident, warm, professional
- Length: 250-350 words max
- Return plain text only, no markdown, no headers

Candidate Details:
Name: ${resumeData.personalInfo?.firstName || ''} ${resumeData.personalInfo?.lastName || ''}
Current Role: ${resumeData.personalInfo?.jobTitle || ''}
Email: ${resumeData.personalInfo?.email || ''}
Top Skills: ${skillsList}

Experience Highlights:
${experienceBullets}

Job Description:
${jobDescription}

Target Keywords to include:
${mergedKeywords.join(', ')}

Return plain text cover letter only.`;

  const result = await getModel().generateContent(prompt);
  const text = result.response.text();
  // Strip any markdown formatting from the cover letter
  return stripMarkdown(text);
}

async function parseResume(pdfText) {
  const prompt = `You are an expert resume parser.
Extract the structured data from the following resume text.

Return ONLY a valid JSON object in this exact format, no markdown, no extra text:
{
  "personalInfo": {
    "firstName": "",
    "lastName": "",
    "jobTitle": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "summary": ""
  },
  "experience": [
    {
      "id": "exp_1",
      "company": "",
      "position": "",
      "startDate": "",
      "endDate": "",
      "current": false,
      "location": "",
      "description": ""
    }
  ],
  "education": [
    {
      "id": "edu_1",
      "institution": "",
      "degree": "",
      "fieldOfStudy": "",
      "startDate": "",
      "endDate": "",
      "gpa": ""
    }
  ],
  "skills": {
    "technical": [],
    "soft": [],
    "tools": []
  },
  "projects": [
    {
      "id": "proj_1",
      "name": "",
      "description": "",
      "techStack": "",
      "link": ""
    }
  ]
}

If a field is missing, leave it empty.
For description in experience, keep it as a paragraph or bullet points separated by newlines.

Resume Text:
${pdfText}`;

  const result = await getModel().generateContent(prompt);
  const text = result.response.text();
  let jsonStr = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON');
  }
  jsonStr = jsonMatch[0];
  const parsed = JSON.parse(jsonStr);
  // Strip any markdown formatting from parsed resume fields
  return cleanMarkdownFromObject(parsed);
}

module.exports = { extractKeywords, rewriteResume, generateCoverLetter, parseResume };
