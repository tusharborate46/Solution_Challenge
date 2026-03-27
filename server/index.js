require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

const authRoutes = require('./routes/authRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const { socketConnection } = require('./sockets');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] } });

app.set('io', io);
socketConnection(io);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);

const PORT = process.env.PORT || 5000;
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://false_trigger_fail.internal';

const startDatabase = async () => {
  try {
    console.log('Attempting local MongoDB connection...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
    console.log('Connected to Local MongoDB MVP Database');
  } catch (err) {
    console.log('Local MongoDB not detected. Spinning up In-Memory fallback database...');
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('Connected to fallback In-Memory MVC Database');
    
    // Auto-seed so you can log in instantly
    const adminUser = new User({ username: 'admin', password: 'password123', role: 'admin' });
    const staffUser = new User({ username: 'responder1', password: 'password123', role: 'staff' });
    await adminUser.save();
    await staffUser.save();
    console.log('Automatically seeded [admin/password123] and [responder1/password123]');
  }
};

startDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
