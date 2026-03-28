const Incident = require('../models/Incident');
const aiService = require('../services/aiService');
const dispatchService = require('../services/dispatchService');

exports.socketConnection = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a general dispatch room
    socket.on('join_dispatch', () => {
      socket.join('dispatch_room');
      console.log(`User ${socket.id} joined general dispatch room.`);
    });

    // Join an incident-specific chat room
    socket.on('join_incident', (incidentId) => {
      socket.join(`incident_${incidentId}`);
      console.log(`User ${socket.id} entered incident room: ${incidentId}`);
    });

    // Handle real-time chat messages within an incident room
    socket.on('send_message', async (data) => {
      const { incidentId, sender, message } = data;
      // In production, you would authenticate the sender via token instead of trusting the payload
      try {
        const incident = await Incident.findById(incidentId);
        if (incident) {
          const chatMsg = { sender, message, timestamp: new Date() };
          incident.chatMessages.push(chatMsg);
          await incident.save();

          // Broadcast to everyone in that specific room
          io.to(`incident_${incidentId}`).emit('new_message', chatMsg);
        }
      } catch (error) {
        console.error('Failed to process chat message:', error);
      }
    });

    // Handle AI Conversation interactions
    socket.on('send_ai_message', async (data) => {
      const { incidentId, message, location } = data;
      try {
        const incident = await Incident.findById(incidentId);
        if (!incident) return;

        // Save user message
        incident.aiAnalysis.answers.push(message);

        // Generate next question
        const nextQuestion = await aiService.generateNextQuestion(
          incident.aiAnalysis.questions, 
          incident.aiAnalysis.answers, 
          incident.type
        );

        if (nextQuestion) {
          incident.aiAnalysis.questions.push(nextQuestion);
          await incident.save();

          // Stream back AI question
          socket.emit('ai_response', { question: nextQuestion, complete: false });
          io.to('dispatch_room').emit('incident_updated', incident); // update dashboard instantly
        } else {
          // If no more questions, run analysis
          socket.emit('ai_status', { status: 'analyzing' });
          
          const analysis = await aiService.analyzeEmergency(
            incident.aiAnalysis.questions,
            incident.aiAnalysis.answers,
            location || incident.location
          );

          incident.aiAnalysis.classification = analysis.type;
          incident.aiAnalysis.confidenceScore = analysis.confidenceScore;
          incident.severity = analysis.severity;
          incident.type = analysis.type;

          const dispatch = await dispatchService.dispatchNearestService(
            analysis.requiredService, 
            location || incident.location
          );

          if (dispatch) {
             incident.dispatchedService = dispatch;
          }

          await incident.save();
          socket.emit('ai_response', { analysis, dispatch, complete: true });
          io.to('dispatch_room').emit('incident_updated', incident); // update dashboard instantly
        }
      } catch (error) {
        console.error('AI Processing Error:', error);
      }
    });

    // Handle incoming mobile SOS signals that aren't routed via the REST API yet
    socket.on('sos_alert', async (data) => {
      console.log('SOS Alert Received via pure Socket:', data);
      
      try {
        // Convert the raw mobile payload into a real V2 database incident
        const newIncident = new Incident({
          type: data.type || 'medical',
          severity: 'high',  // default pure SOS severity
          location: data.location,
          description: data.description || 'Emergency triggered via mobile SOS button.',
          status: 'pending',
          aiAnalysis: { questions: [], answers: [] }
        });
        
        const firstQuestion = await aiService.generateNextQuestion([], [], newIncident.type);
        newIncident.aiAnalysis.questions.push(firstQuestion);
        
        await newIncident.save();
        
        // Broadcast globally to all dispatchers natively instead of just dispatch_room
        io.emit('new_sos_alert', newIncident);
        
        // Return new incident back to the sender so they know their ID for AI chat
        socket.emit('sos_acknowledged', { incidentId: newIncident._id, firstQuestion });
      } catch (err) {
        console.error('Failed to save mobile SOS to database:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
