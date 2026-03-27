const Incident = require('../models/Incident');

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
          status: 'pending'
        });
        
        await newIncident.save();
        
        // Broadcast globally to all dispatchers natively instead of just dispatch_room
        io.emit('new_sos_alert', newIncident);
      } catch (err) {
        console.error('Failed to save mobile SOS to database:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
