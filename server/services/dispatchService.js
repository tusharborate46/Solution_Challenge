const axios = require('axios');

/**
 * Mock dispatcher service, mimicking Google Maps Places and Distance Matrix API integration.
 * In production, it should use:
 * https://maps.googleapis.com/maps/api/place/nearbysearch/json
 * https://maps.googleapis.com/maps/api/distancematrix/json
 */

const MOCK_SERVICES = {
  ambulance: [
    { name: 'City Central Hospital', lat: 34.0522, lng: -118.2437 },
    { name: 'Valley Medical Center', lat: 34.0622, lng: -118.2537 }
  ],
  police: [
    { name: 'LAPD Headquarters', lat: 34.0522, lng: -118.2437 },
    { name: 'Precinct 42', lat: 34.0422, lng: -118.2337 }
  ],
  fire_truck: [
    { name: 'Fire Station 1', lat: 34.0522, lng: -118.2437 },
    { name: 'Fire Station 9', lat: 34.0722, lng: -118.2637 }
  ]
};

async function dispatchNearestService(requiredService, userLocation) {
  try {
    // If we have an API key, we should query Google Maps. 
    // Example:
    /*
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      // 1. Find nearest places of type (hospital, police, fire_station)
      // 2. Compute distance using Distance Matrix
      // 3. Select best and return
    }
    */

    // Using mock data for the prototype
    const typeKey = requiredService.toLowerCase().includes('ambulance') || requiredService.toLowerCase().includes('medical') 
      ? 'ambulance' 
      : requiredService.toLowerCase().includes('police') || requiredService.toLowerCase().includes('crime')
        ? 'police' 
        : 'fire_truck';
        
    const services = MOCK_SERVICES[typeKey] || MOCK_SERVICES['police'];
    
    // In a real scenario, we calculate the nearest one here based on lat/lng.
    // For scaffolding, just pick the first one and mock distance/time
    const selectedService = services[0];
    
    // Adding minor random offset to location for realism
    const latOffset = (Math.random() - 0.5) * 0.02;
    const lngOffset = (Math.random() - 0.5) * 0.02;

    return {
      name: selectedService.name,
      serviceType: typeKey,
      location: { 
        lat: selectedService.lat + latOffset, 
        lng: selectedService.lng + lngOffset 
      },
      distance: `${(Math.random() * 5 + 1).toFixed(1)} km`,
      duration: `${Math.floor(Math.random() * 10 + 3)} mins`,
      status: 'dispatched'
    };

  } catch (error) {
    console.error('Error dispatching service:', error);
    return null;
  }
}

module.exports = {
  dispatchNearestService
};
