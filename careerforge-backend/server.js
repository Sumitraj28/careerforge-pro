const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
require('dotenv').config()
const connectDB = require('./config/db')
const { apiLimiter, aiLimiter, authLimiter } = require('./middleware/rateLimiter')
const errorHandler = require('./middleware/errorHandler')

const PORT = process.env.PORT || 5001
const isProd = process.env.NODE_ENV === 'production'

const app = express()

// Security Headers (relax COOP in dev so Google OAuth popup flows work reliably)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}))

// Compression
app.use(compression())

// CORS Configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://careerforge-pro-cv.vercel.app',
      ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(u => u.trim()) : [])
    ]
  : ['http://localhost:3000', 'http://localhost:5173']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true)
    else {
      console.warn(`CORS blocked for origin: ${origin}`)
      callback(new Error('CORS policy: Origin not allowed'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Stripe webhook requires the raw body - handled BEFORE express.json()
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Rate Limiters
app.use('/api/', apiLimiter)
app.use('/api/ai/', aiLimiter)
app.use('/api/auth/', authLimiter)

// Routes
app.use('/api/ai', require('./routes/ai'))
app.use('/api/resume', require('./routes/resume'))
app.use('/api/payment', require('./routes/payment'))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/upload', require('./routes/upload'))
app.use('/api/coverletter', require('./routes/coverletter'))

app.get('/', (req, res) => {
  res.json({ status: 'CareerForge API Running', environment: process.env.NODE_ENV })
})

// Global Error Handler
app.use(errorHandler)

// Startup Validation
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.warn('WARNING: JWT_SECRET should be at least 32 characters for production.')
}

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`)
  })
})

module.exports = app
