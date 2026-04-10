const express = require('express')
const router = express.Router()
const multer = require('multer')
const pdfParse = require('pdf-parse')
const fs = require('fs')
const { parseResume } = require('../services/geminiService')

// Set up multer for temporary file storage
const upload = multer({ dest: 'uploads/' })

router.post('/parse', upload.single('resumeFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Read the file buffer
    const dataBuffer = fs.readFileSync(req.file.path)
    
    // Parse PDF text
    const data = await pdfParse(dataBuffer)
    const pdfText = data.text

    // Delete the temp file
    fs.unlinkSync(req.file.path)

    if (!pdfText.trim()) {
      return res.status(400).json({ error: 'Could not extract text from PDF' })
    }

    // Pass to Gemini to get structured data
    const parsedData = await parseResume(pdfText)

    res.json({ success: true, resumeData: parsedData })
  } catch (error) {
    console.error('Upload error:', error)
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({ error: 'Failed to parse resume file' })
  }
})

module.exports = router
