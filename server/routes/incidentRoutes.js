const express = require('express');
const { 
  createIncident, 
  getIncidents, 
  updateIncidentStatus, 
  assignResponder 
} = require('../controllers/incidentController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.post('/', verifyToken, createIncident);
router.get('/', verifyToken, getIncidents);

// Only staff and admins can update statuses or assign
router.put('/:id/status', verifyToken, authorizeRoles('staff', 'admin'), updateIncidentStatus);
router.put('/:id/assign', verifyToken, authorizeRoles('staff', 'admin'), assignResponder);

module.exports = router;
