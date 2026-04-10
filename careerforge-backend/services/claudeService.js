const Anthropic = require('@anthropic-ai/sdk')
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function extractKeywords(jobDescription) {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `You are an expert ATS analyst.
Analyze this Job Description and extract important keywords.

Return ONLY a valid JSON object in this exact format, 
no extra text, no markdown:
{
  "hard_skills": [],
  "soft_skills": [],
  "tools": [],
  "qualifications": [],
  "top_keywords": []
}

Job Description:
${jobDescription}`
      }
    ]
  })

  const text = response.content[0].text
  const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim()
  return JSON.parse(clean)
}

async function rewriteResume(resumeData, keywords, jobDescription) {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are an expert resume writer with 10+ years experience.

Rewrite the bullet points in this resume to:
1. Start each bullet with a strong past-tense action verb
2. Naturally include these keywords: ${[...(keywords.top_keywords || []), ...(keywords.hard_skills || []), ...(keywords.soft_skills || [])].join(', ')}
3. Add quantifiable achievements (%, numbers, impact)
4. Match the tone of the job description
5. Keep it truthful — only enhance, never fabricate
6. Maximum 2 lines per bullet point

Rules:
- Return ONLY valid JSON, no markdown, no extra text
- Keep exact same JSON structure as input
- Only rewrite the bullets and summary fields
- Do not change personal info, education, dates

Current Resume:
${JSON.stringify(resumeData)}

Job Description:
${jobDescription}

Return the complete updated resume JSON.`
      }
    ]
  })

  const text = response.content[0].text
  const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim()
  return JSON.parse(clean)
}

async function generateCoverLetter(resumeData, jobDescription, keywords) {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `You are an expert cover letter writer.
Write a professional cover letter for this candidate.

Rules:
- Exactly 3 paragraphs
- Paragraph 1: Who you are + why this role excites you
- Paragraph 2: Top 2-3 achievements with numbers
- Paragraph 3: Why this company + call to action
- Naturally include these keywords: ${[...(keywords.top_keywords || []), ...(keywords.hard_skills || []), ...(keywords.soft_skills || [])].join(', ')}
- Do NOT start with "I am writing to..."
- Do NOT use "team player" or "hard worker"
- Tone: Professional but warm
- Return plain text only, no markdown

Candidate Info:
${JSON.stringify(resumeData.personalInfo)}

Experience:
${JSON.stringify(resumeData.experience)}

Job Description:
${jobDescription}`
      }
    ]
  })

  return response.content[0].text
}

module.exports = { extractKeywords, rewriteResume, generateCoverLetter }
