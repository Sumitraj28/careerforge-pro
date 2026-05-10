const mongoose = require('mongoose');

let mongoMemoryServerInstance = null;
let devAuthFallbackAttempted = false;

async function createMemoryUri() {
  if (process.env.NODE_ENV === 'production') {
    console.error('In-memory MongoDB is not allowed in production.');
    process.exit(1);
  }
  const { MongoMemoryServer } = require('mongodb-memory-server');
  console.log('[dev] MongoDB Memory Server starting (embedded database).');
  mongoMemoryServerInstance = await MongoMemoryServer.create();
  return mongoMemoryServerInstance.getUri();
}

async function resolveMongoUri() {
  if (process.env.USE_MONGO_MEMORY_SERVER === 'true') {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'USE_MONGO_MEMORY_SERVER cannot be enabled in production. Set NODE_ENV=production and a real MONGODB_URI on your host.'
      );
      process.exit(1);
    }
    return createMemoryUri();
  }

  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    if (process.env.USE_MONGO_MEMORY_SERVER === 'false') {
      throw new Error(
        'MONGODB_URI is missing. Set it in .env or remove USE_MONGO_MEMORY_SERVER=false to allow dev in-memory MongoDB.'
      );
    }
    console.warn(
      '[dev] MONGODB_URI is unset — using in-memory MongoDB (data resets when the server stops).'
    );
    return createMemoryUri();
  }

  return uri;
}

function printMongoAuthHints() {
  console.error(`
MongoDB authentication failed (production or strict dev). Fix your connection string:

  • Atlas: correct database username/password (URL-encode special characters in the password).
  • Atlas: Network Access must allow your server IP (or your current IP for local dev).
  • Atlas user must have access to the database name in your URI path.

In development only, invalid credentials automatically fall back to in-memory MongoDB
unless USE_MONGO_MEMORY_SERVER=false or DISABLE_MONGO_DEV_MEMORY_FALLBACK=true.
`);
}

const connectDB = async () => {
  try {
    const uri = await resolveMongoUri();

    if (!uri) {
      throw new Error('MONGODB_URI is required when NODE_ENV=production');
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
    });

    if (uri.includes('mongodb.net')) {
      console.log(`✅ MongoDB Connected to Atlas: ${conn.connection.host}`);
      console.log(`📂 Database: ${conn.connection.name}`);
    } else {
      console.log(`ℹ️ MongoDB Connected to local/memory: ${conn.connection.host}`);
    }
  } catch (error) {
    const msg = error.message || String(error);
    console.error(`❌ MongoDB Connection Error: ${msg}`);

    const authFail = /authentication failed|bad auth|IP address/i.test(msg);
    const strictDev =
      process.env.USE_MONGO_MEMORY_SERVER === 'false' ||
      process.env.DISABLE_MONGO_DEV_MEMORY_FALLBACK === 'true';

    if (
      authFail &&
      process.env.NODE_ENV !== 'production' &&
      !devAuthFallbackAttempted &&
      !strictDev
    ) {
      devAuthFallbackAttempted = true;
      await mongoose.disconnect().catch(() => {});
      console.warn(
        '\n⚠️  [dev] MONGODB_URI failed authentication or IP not whitelisted.\n' +
          '   >>> SWITCHING TO IN-MEMORY MONGODB (DATA WILL NOT PERSIST) <<<\n' +
          '   To fix this: Update careerforge-backend/.env with correct Atlas URI and whitelist your IP.\n'
      );
      process.env.USE_MONGO_MEMORY_SERVER = 'true';
      return connectDB();
    }

    if (authFail) {
      printMongoAuthHints();
    }
    process.exit(1);
  }
};

module.exports = connectDB;
