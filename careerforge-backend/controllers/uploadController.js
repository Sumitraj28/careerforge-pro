const pdfParse = require('pdf-parse');
const fs = require('fs');
const { parseResume } = require('../services/geminiService');

const parseUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const data = await pdfParse(req.file.buffer);
    const pdfText = data.text;

    if (!pdfText.trim()) {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    const parsedData = await parseResume(pdfText);

    res.json({ success: true, resumeData: parsedData });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to parse resume file' });
  }
};

module.exports = {
  parseUpload
};
