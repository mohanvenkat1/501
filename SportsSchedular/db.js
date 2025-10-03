const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sports-scheduler';

async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
}

module.exports = { connectDb, MONGO_URI };
