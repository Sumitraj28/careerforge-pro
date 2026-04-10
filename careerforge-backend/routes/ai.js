const express = require('express')
const router = express.Router()
const { extractKeywords, rewriteResume, generateCoverLetter } = require('../services/geminiService')
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.get('/models', async (req, res) => {
  try {
    const models = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY).then(r => r.json());
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/extract-keywords', async (req, res) => {
  try {
    const { jobDescription } = req.body
    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description required' })
    }
    const keywords = await extractKeywords(jobDescription)
    res.json({ success: true, keywords })
  } catch (error) {
    console.error('Extract keywords error:', error)
    res.status(500).json({ error: 'Failed to extract keywords' })
  }
})

router.post('/rewrite-resume', async (req, res) => {
  try {
    const { resumeData, keywords, jobDescription } = req.body
    if (!resumeData || !jobDescription) {
      return res.status(400).json({ error: 'Resume data and JD required' })
    }

    // Measure latency (Task 7)
    const startTime = Date.now()
    const rewritten = await rewriteResume(resumeData, keywords, jobDescription)
    const latency = Date.now() - startTime

    console.log('AI Rewrite Latency:', latency + 'ms')

    // Auto quality-check the rewritten experience bullets
    const rewrittenBullets = rewritten.experience?.map(e => e.description || '').join('\n') || '';
    const quality = assessQuality(null, rewrittenBullets, keywords)

    res.json({ success: true, resume: rewritten, latency, quality })
  } catch (error) {
    console.error('Rewrite error:', error.message || error)
    res.status(500).json({ error: error.message || 'Failed to rewrite resume' })
  }
})

router.post('/cover-letter', async (req, res) => {
  try {
    const { resumeData, jobDescription, keywords } = req.body
    if (!resumeData || !jobDescription) {
      return res.status(400).json({ error: 'Resume data and JD required' })
    }
    const letter = await generateCoverLetter(resumeData, jobDescription, keywords)
    res.json({ success: true, coverLetter: letter })
  } catch (error) {
    console.error('Cover letter error:', error)
    res.status(500).json({ error: 'Failed to generate cover letter' })
  }
})

/* ── ATS Score Calculator (Task 4 — 70/30 split) ── */
function calculateATSScore(resumeData, keywords) {
  const summaryText = resumeData.personalInfo?.summary || '';
  const experienceBullets = resumeData.experience?.map(e => e.description || '').join(' ') || '';
  const allText = [
    summaryText,
    experienceBullets,
    resumeData.skills?.technical?.join(' ') || '',
    resumeData.skills?.soft?.join(' ') || '',
    resumeData.skills?.tools?.join(' ') || ''
  ].join(' ').toLowerCase();

  const suggestions = [];
  let score = 0;

  // Step 1 — Keyword Matching (70 points max)
  const topKeywords = keywords.top_keywords || [];
  const hardSkills = keywords.hard_skills || [];
  const allKeywords = [...new Set([...topKeywords, ...hardSkills])];
  
  const matched = allKeywords.filter(k => allText.includes(k.toLowerCase()));
  const missing = allKeywords.filter(k => !allText.includes(k.toLowerCase()));

  const keywordScore = allKeywords.length > 0 ? (matched.length / allKeywords.length) * 70 : 70;
  score += keywordScore;
  if (missing.length > 0) {
    suggestions.push(`Add missing keywords: ${missing.slice(0, 5).join(', ')}`);
  }

  // Step 2 — Bonus Points (30 points max)
  // Summary exists and > 50 words: +10 points
  const summaryWordCount = summaryText.split(/\s+/).filter(Boolean).length;
  if (summaryWordCount > 50) {
    score += 10;
  } else if (summaryWordCount > 0) {
    score += 4;
    suggestions.push('Expand your summary to 80+ words for better ATS scoring.');
  } else {
    suggestions.push('Add a professional summary section.');
  }

  // Experience has 3+ bullet points: +8 points
  const bulletCount = experienceBullets.split('\n').filter(b => b.trim().length > 0).length;
  if (bulletCount >= 3) {
    score += 8;
  } else if (bulletCount > 0) {
    score += 3;
    suggestions.push('Add more bullet points to your experience (aim for 3+ per role).');
  } else {
    suggestions.push('Add bullet points describing your work experience.');
  }

  // Skills section has 5+ skills: +7 points
  const totalSkills = (resumeData.skills?.technical?.length || 0) +
    (resumeData.skills?.soft?.length || 0) +
    (resumeData.skills?.tools?.length || 0);
  if (totalSkills >= 5) {
    score += 7;
  } else if (totalSkills > 0) {
    score += 3;
    suggestions.push('Add more skills (aim for 5+ total).');
  } else {
    suggestions.push('Add a skills section with your key competencies.');
  }

  // Contact info complete: +5 points
  let contactScore = 0;
  if (resumeData.personalInfo?.email) contactScore += 1.5;
  else suggestions.push('Add your email address.');
  if (resumeData.personalInfo?.phone) contactScore += 1.5;
  else suggestions.push('Add your phone number.');
  if (resumeData.personalInfo?.location) contactScore += 1;
  if (resumeData.personalInfo?.linkedin) contactScore += 1;
  score += contactScore;

  score = Math.round(score);
  score = Math.min(100, Math.max(0, score));

  return { score, matched, missing, suggestions };
}

router.post('/ats-score', (req, res) => {
  try {
    const { resumeData, keywords } = req.body
    if (!resumeData || !keywords) {
      return res.status(400).json({ error: 'Resume data and keywords required' })
    }
    const result = calculateATSScore(resumeData, keywords)
    res.json({ success: true, ...result })
  } catch (error) {
    console.error('ATS score error:', error)
    res.status(500).json({ error: 'Failed to calculate ATS score' })
  }
})

/* ── Quality Assessment (Task 8) ── */
function assessQuality(originalBullets, rewrittenBullets, keywords) {
  const actionVerbs = [
    'achieved', 'administered', 'analyzed', 'architected', 'automated',
    'built', 'collaborated', 'consolidated', 'created', 'decreased',
    'delivered', 'deployed', 'designed', 'developed', 'directed',
    'drove', 'engineered', 'established', 'executed', 'expanded',
    'facilitated', 'generated', 'grew', 'implemented', 'improved',
    'increased', 'influenced', 'initiated', 'integrated', 'launched',
    'led', 'managed', 'mentored', 'migrated', 'modernized',
    'negotiated', 'optimized', 'orchestrated', 'oversaw', 'pioneered',
    'planned', 'produced', 'programmed', 'reduced', 'refactored',
    'resolved', 'revamped', 'scaled', 'secured', 'simplified',
    'spearheaded', 'streamlined', 'strengthened', 'supervised', 'transformed'
  ];

  const topKeywords = keywords?.top_keywords || [];
  const hardSkills = keywords?.hard_skills || [];
  const allKeywords = [...new Set([...topKeywords, ...hardSkills])].map(k => k.toLowerCase());

  let totalScore = 0;
  let bulletCount = 0;
  const details = [];

  const bullets = typeof rewrittenBullets === 'string'
    ? rewrittenBullets.split('\n').filter(b => b.trim())
    : Array.isArray(rewrittenBullets) ? rewrittenBullets : [];

  bullets.forEach((bullet, i) => {
    if (!bullet.trim()) return;
    bulletCount++;
    let bulletScore = 0;
    const words = bullet.toLowerCase().split(/\s+/);
    const firstWord = words[0]?.replace(/[^a-z]/g, '');

    // Check 1: Starts with action verb (40 points)
    if (actionVerbs.includes(firstWord)) {
      bulletScore += 40;
    } else {
      details.push(`Bullet ${i + 1}: Start with a stronger action verb.`);
    }

    // Check 2: Contains keywords (35 points)
    const keywordsFound = allKeywords.filter(k => bullet.toLowerCase().includes(k));
    const kwScore = allKeywords.length > 0
      ? (keywordsFound.length / Math.min(allKeywords.length, 3)) * 35
      : 35;
    bulletScore += Math.min(35, kwScore);

    // Check 3: Reasonable length (25 points)
    const wordCount = words.length;
    if (wordCount >= 8 && wordCount <= 30) {
      bulletScore += 25;
    } else if (wordCount < 8) {
      bulletScore += 10;
      details.push(`Bullet ${i + 1}: Too short — expand with more detail.`);
    } else {
      bulletScore += 15;
      details.push(`Bullet ${i + 1}: Too long — keep under 2 lines.`);
    }

    totalScore += bulletScore;
  });

  const avgScore = bulletCount > 0 ? Math.round(totalScore / bulletCount) : 0;

  let grade, label;
  if (avgScore >= 75) { grade = 'green'; label = 'High Quality Rewrite'; }
  else if (avgScore >= 50) { grade = 'yellow'; label = 'Good Rewrite'; }
  else { grade = 'red'; label = 'Review Suggested'; }

  return {
    score: avgScore,
    grade,
    label,
    suggestions: details.slice(0, 5),
    bulletCount
  };
}

router.post('/quality-check', (req, res) => {
  try {
    const { originalBullets, rewrittenBullets, keywords } = req.body
    if (!rewrittenBullets) {
      return res.status(400).json({ error: 'Rewritten bullets required' })
    }
    const result = assessQuality(originalBullets, rewrittenBullets, keywords)
    res.json({ success: true, ...result })
  } catch (error) {
    console.error('Quality check error:', error)
    res.status(500).json({ error: 'Failed to assess quality' })
  }
})

// ROUTE: POST /api/ai/cover-letter
router.post('/cover-letter', async (req, res) => {
  try {
    const { resumeData, jobDescription, keywords } = req.body;

    if (!resumeData || !jobDescription) {
      return res.status(400).json({ error: 'resumeData and jobDescription are required' });
    }

    const coverLetter = await generateCoverLetter(resumeData, jobDescription, keywords || {});

    res.json({ success: true, coverLetter });
  } catch (error) {
    console.error('Cover letter generation error:', error);
    res.status(500).json({ error: 'Failed to generate cover letter' });
  }
});

module.exports = router
