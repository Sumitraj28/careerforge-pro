/**
 * atsScorer.js — Client-side ATS scoring utility
 * 
 * Can be used to calculate ATS scores locally without
 * hitting the backend. Mirrors the backend logic.
 */

export function calculateATSScore(resumeData, keywords) {
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

  // Summary > 50 words: +10
  const summaryWordCount = summaryText.split(/\s+/).filter(Boolean).length;
  if (summaryWordCount > 50) {
    score += 10;
  } else if (summaryWordCount > 0) {
    score += 4;
    suggestions.push('Expand your summary to 80+ words.');
  } else {
    suggestions.push('Add a professional summary section.');
  }

  // Experience 3+ bullets: +8
  const bulletCount = experienceBullets.split('\n').filter(b => b.trim().length > 0).length;
  if (bulletCount >= 3) {
    score += 8;
  } else if (bulletCount > 0) {
    score += 3;
    suggestions.push('Add more bullet points (aim for 3+ per role).');
  } else {
    suggestions.push('Add bullet points to your experience.');
  }

  // Skills 5+: +7
  const totalSkills = (resumeData.skills?.technical?.length || 0) +
    (resumeData.skills?.soft?.length || 0) +
    (resumeData.skills?.tools?.length || 0);
  if (totalSkills >= 5) {
    score += 7;
  } else if (totalSkills > 0) {
    score += 3;
    suggestions.push('Add more skills (aim for 5+ total).');
  } else {
    suggestions.push('Add a skills section.');
  }

  // Contact complete: +5
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

/**
 * Client-side quality assessment for rewritten bullets
 */
export function assessQuality(rewrittenBullets, keywords) {
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

    if (actionVerbs.includes(firstWord)) bulletScore += 40;
    else details.push(`Bullet ${i + 1}: Start with a stronger action verb.`);

    const keywordsFound = allKeywords.filter(k => bullet.toLowerCase().includes(k));
    const kwScore = allKeywords.length > 0
      ? (keywordsFound.length / Math.min(allKeywords.length, 3)) * 35 : 35;
    bulletScore += Math.min(35, kwScore);

    const wordCount = words.length;
    if (wordCount >= 8 && wordCount <= 30) bulletScore += 25;
    else if (wordCount < 8) { bulletScore += 10; details.push(`Bullet ${i + 1}: Too short.`); }
    else { bulletScore += 15; details.push(`Bullet ${i + 1}: Too long.`); }

    totalScore += bulletScore;
  });

  const avgScore = bulletCount > 0 ? Math.round(totalScore / bulletCount) : 0;

  let grade, label;
  if (avgScore >= 75) { grade = 'green'; label = 'High Quality Rewrite'; }
  else if (avgScore >= 50) { grade = 'yellow'; label = 'Good Rewrite'; }
  else { grade = 'red'; label = 'Review Suggested'; }

  return { score: avgScore, grade, label, suggestions: details.slice(0, 5), bulletCount };
}
