const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    // Try standard connection first
    let uri = process.env.MONGODB_URI;
    
    // If it's a local URI, we'll try to connect. If that fails, fallback to memory server.
    try {
      const conn = await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 2000 // Don't wait too long if no local DB
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (localError) {
      console.log('No local MongoDB detected. Starting in-memory database...');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      
      const conn = await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`MongoDB Connected (In-Memory): ${conn.connection.host}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
