require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { GoogleGenAI, Type } = require('@google/genai');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ============================================
// 1. SETUP & CONFIGURATION
// ============================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_crisissync_key_123';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock-key' });

// ============================================
// 2. DATABASE MODELS
// ============================================
// User Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff', 'user'], default: 'user' }
});
const User = mongoose.model('User', userSchema);

// Incident Model
const incidentSchema = new mongoose.Schema({
  type: { type: String, default: 'medical' },
  severity: { type: String, default: 'medium' },
  location: { lat: Number, lng: Number },
  status: { type: String, enum: ['pending', 'active', 'resolved'], default: 'pending' },
  description: String,
  aiAnalysis: {
    questions: [{ type: String }],
    answers: [{ type: String }],
    classification: String,
    confidenceScore: Number
  },
  dispatchedService: {
    name: String,
    serviceType: String,
    location: { lat: Number, lng: Number },
    distance: String,
    duration: String,
    status: { type: String, default: 'pending' }
  },
  chatMessages: [
    { sender: String, message: String, timestamp: { type: Date, default: Date.now } }
  ]
}, { timestamps: true });
const Incident = mongoose.model('Incident', incidentSchema);

// ============================================
// 3. AI & SERVICES LOGIC
// ============================================
async function analyzeEmergency(questions, answers, location) {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key') {
      return { type: 'medical', severity: 'high', requiredService: 'ambulance', confidenceScore: 0.85 };
    }
    const conversation = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer'}`).join('\n');
    const prompt = `Analyze this emergency conversation:\n${conversation}\nDetermine: type, severity, requiredService, confidenceScore.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            severity: { type: Type.STRING },
            requiredService: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER }
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (err) {
    return { type: 'general', severity: 'medium', requiredService: 'police', confidenceScore: 0.1 };
  }
}

function dispatchNearestService(requiredService, location) {
  // A mock dispatcher that simulates Google Places
  const types = { 'ambulance': 'City Hospital', 'police': 'Metro Police', 'fire_truck': 'Fire Station 1' };
  const serviceType = requiredService.toLowerCase().includes('medical') ? 'ambulance' : 'police';
  return {
    name: types[serviceType] || 'Metro Police',
    serviceType: serviceType,
    location: { lat: location.lat + 0.01, lng: location.lng + 0.01 }, // spawn nearby
    distance: '3.2 km',
    duration: '8 mins',
    status: 'dispatched'
  };
}

// ============================================
// 4. REST API ROUTES
// ============================================
// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token, denied' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Login Route
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { _id: user._id, username: user.username, role: user.role } });
  } catch (err) { res.status(500).send('Server Error'); }
});

// Get Incidents Route
app.get('/api/incidents', authMiddleware, async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) { res.status(500).send('Server Error'); }
});

// Update Incident Status Route
app.put('/api/incidents/:id/status', authMiddleware, async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    io.emit('incident_updated', incident); // Broadcast to all connected clients
    res.json(incident);
  } catch (err) { res.status(500).send('Server Error'); }
});

// Create Incident from Web Web Dashboard 
app.post('/api/incidents', async (req, res) => {
  try {
    const newIncident = new Incident(req.body);
    await newIncident.save();
    io.emit('new_sos_alert', newIncident);
    res.status(201).json(newIncident);
  } catch (err) { res.status(500).send('Server Error'); }
});


// ============================================
// 5. WEBSOCKETS (REAL-TIME COMMANDS)
// ============================================
io.on('connection', (socket) => {
  console.log('User connected to WebSockets:', socket.id);

  // A direct SOS trigger from the web or other clients
  socket.on('sos_alert', async (data) => {
    try {
      const newIncident = new Incident({
        location: data.location || { lat: 34.0522, lng: -118.2437 },
        description: data.description || 'Emergency SOS Button Pressed',
        aiAnalysis: { questions: ["Emergency detected. What is the nature of the emergency?"], answers: [] }
      });
      await newIncident.save();
      
      io.emit('new_sos_alert', newIncident); // Broadcast to dashboard
      socket.emit('sos_acknowledged', { incidentId: newIncident._id, firstQuestion: newIncident.aiAnalysis.questions[0] });
    } catch (err) { console.error('SOS Error:', err); }
  });

  // AI Chat handler
  socket.on('send_ai_message', async (data) => {
    try {
      const incident = await Incident.findById(data.incidentId);
      if (!incident) return;

      incident.aiAnalysis.answers.push(data.message);

      // If we haven't asked 3 questions yet, generate next question
      if (incident.aiAnalysis.questions.length < 3) {
        const nextQ = incident.aiAnalysis.questions.length === 1 
          ? "Are you currently in immediate, life-threatening danger?" 
          : "Are there any specific injuries you can confirm?";
        
        incident.aiAnalysis.questions.push(nextQ);
        await incident.save();
        socket.emit('ai_response', { question: nextQ, complete: false });
        io.emit('incident_updated', incident);
      } else {
        // Analysis phase
        socket.emit('ai_status', { status: 'analyzing' });
        const analysis = await analyzeEmergency(incident.aiAnalysis.questions, incident.aiAnalysis.answers, data.location);
        
        incident.aiAnalysis.classification = analysis.type;
        incident.aiAnalysis.confidenceScore = analysis.confidenceScore;
        incident.severity = analysis.severity;
        incident.type = analysis.type;
        
        // Dispatch Phase
        incident.dispatchedService = dispatchNearestService(analysis.requiredService, data.location || incident.location);
        
        await incident.save();
        socket.emit('ai_response', { analysis: incident.aiAnalysis, dispatch: incident.dispatchedService, complete: true });
        io.emit('incident_updated', incident);
      }
    } catch (err) { console.error('AI Error:', err); }
  });
  
  // Real-time chat messages
  socket.on('send_message', async (data) => {
    try {
      const incident = await Incident.findById(data.incidentId);
      if (incident) {
        incident.chatMessages.push({ sender: data.sender, message: data.message });
        await incident.save();
        io.emit('incident_updated', incident); // Broadcast update
      }
    } catch (err) { console.error(err); }
  });
});

// ============================================
// 6. DB CONNECTION & SERVER START
// ============================================
const startServer = async () => {
  try {
    console.log('Starting Local DB...');
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    
    // Create a default admin user
    const hashedPw = await bcrypt.hash('password123', 10);
    const adminUser = new User({ username: 'admin', password: hashedPw, role: 'admin' });
    await adminUser.save();
    console.log('✅ Temporary DB Connected. Admin user created: admin / password123');

    server.listen(PORT, () => console.log(`🚀 Server fully running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
  }
};

startServer();
