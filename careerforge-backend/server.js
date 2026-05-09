const express = require('express')
const cors = require('cors')
require('dotenv').config()
const connectDB = require('./config/db')

const PORT = process.env.PORT || 5001

const app = express()

app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*' }))

// Stripe webhook requires the raw body
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/api/ai', require('./routes/ai'))
app.use('/api/resume', require('./routes/resume'))
app.use('/api/payment', require('./routes/payment'))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/upload', require('./routes/upload'))
app.use('/api/coverletter', require('./routes/coverletter'))

app.get('/', (req, res) => {
  res.json({ status: 'CareerForge API Running' })
})

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`)
  })
})

module.exports = app
