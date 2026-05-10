const rateLimit = require('express-rate-limit');

exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please try again later.' }
});

exports.aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'AI request limit reached. Please wait a minute.' }
});

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Increased for easier testing
  message: { error: 'Too many auth attempts. Please try again later.' }
});
