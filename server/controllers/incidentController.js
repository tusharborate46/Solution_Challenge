const Incident = require('../models/Incident');

// @routes POST /api/incidents
// @access Private (Guest or Staff)
exports.createIncident = async (req, res) => {
  try {
    const { type, severity, location, description } = req.body;
    
    const newIncident = new Incident({ 
      type, 
      severity, 
      location, 
      description,
      reportedBy: req.user.id 
    });
    
    await newIncident.save();

    // Trigger Socket.io event or Notifications
    req.app.get('io').emit('new_sos_alert', await newIncident.populate('reportedBy', 'username'));

    res.status(201).json(newIncident);
  } catch (err) {
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

// @routes GET /api/incidents
// @access Private
exports.getIncidents = async (req, res) => {
  try {
    // Allows filtering by status via query ?status=active
    const filter = req.query.status ? { status: req.query.status } : {};
    
    const incidents = await Incident.find(filter)
      .populate('reportedBy', 'username')
      .populate('responders', 'username')
      .sort({ createdAt: -1 });
      
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

// @routes PUT /api/incidents/:id/status
// @access Private (Staff/Admin)
exports.updateIncidentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'active', 'resolved'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const incident = await Incident.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    ).populate('reportedBy responders');

    if (!incident) return res.status(404).json({ msg: 'Incident not found' });

    // Emit live status change to socket clients
    req.app.get('io').emit('incident_updated', incident);

    res.json(incident);
  } catch (err) {
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

// @routes PUT /api/incidents/:id/assign
// @access Private (Staff/Admin)
exports.assignResponder = async (req, res) => {
  try {
    const { responderId } = req.body; // usually sent by dispatcher, or just req.user.id if self-assigning

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ msg: 'Incident not found' });

    if (!incident.responders.includes(responderId)) {
      incident.responders.push(responderId);
      if (incident.status === 'pending') incident.status = 'active'; // auto-activate
      await incident.save();
    }

    const updatedIncident = await Incident.findById(req.params.id).populate('reportedBy responders');
    
    req.app.get('io').emit('incident_updated', updatedIncident);
    
    res.json(updatedIncident);
  } catch (err) {
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};
