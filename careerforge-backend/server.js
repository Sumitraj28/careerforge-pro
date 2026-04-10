const express = require('express')
const cors = require('cors')
require('dotenv').config()
const connectDB = require('./config/db')
const { execSync } = require('child_process')

const PORT = process.env.PORT || 5001

// ── Auto-kill stale processes on PORT before starting ──
function freePort(port) {
  try {
    const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim()
    if (pids) {
      // Filter out our own PID
      const myPid = process.pid.toString()
      const otherPids = pids.split('\n').filter(p => p.trim() !== myPid)
      if (otherPids.length > 0) {
        console.log(`Killing stale processes on port ${port}: ${otherPids.join(', ')}`)
        execSync(`kill -9 ${otherPids.join(' ')}`)
        // Brief pause to let OS release the port
        execSync('sleep 0.5')
      }
    }
  } catch (e) {
    // lsof returns exit code 1 if no process found — that's fine
  }
}

const app = express()
connectDB()

app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*' }))

// Stripe webhook requires the raw body, so we parse it before global express.json()
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

if (process.env.NODE_ENV !== 'production') {
  freePort(PORT)
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

module.exports = app;
