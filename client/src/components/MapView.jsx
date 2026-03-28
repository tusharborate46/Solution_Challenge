import React, { useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%',
};

// A dark mode map style for a premium look
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

export default function MapView({ incidents, focusedIncident }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    // We try to load the key from VITE env, otherwise run in development mode
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const center = useMemo(() => {
    if (focusedIncident?.location) {
      return { lat: focusedIncident.location.lat, lng: focusedIncident.location.lng };
    }
    if (incidents && incidents.length > 0 && incidents[0].location) {
      return { lat: incidents[0].location.lat, lng: incidents[0].location.lng };
    }
    return { lat: 34.0522, lng: -118.2437 }; // Default Los Angeles
  }, [incidents, focusedIncident]);

  if (loadError) {
    return <div className="flex-1 bg-slate-900 flex items-center justify-center text-red-500 text-sm p-4 text-center">Map Error: Ensure your API key is correct or disable ad-blockers.</div>;
  }

  if (!isLoaded) {
    return <div className="flex-1 bg-slate-900 flex items-center justify-center text-slate-500 animate-pulse">Initializing Map...</div>;
  }

  return (
    <div className="w-full h-full relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={focusedIncident ? 14 : 11}
        options={{
          styles: darkMapStyle,
          disableDefaultUI: true, // cleaner interface
          zoomControl: true,
        }}
      >
        {/* Render all incidents or just the focused one */}
        {incidents && incidents.map((incident) => (
          <Marker 
            key={incident._id} 
            position={{ lat: incident.location?.lat, lng: incident.location?.lng }}
            icon={incident.status === 'resolved' ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png" : "http://maps.google.com/mapfiles/ms/icons/red-dot.png"}
          />
        ))}

        {/* Render the Service Vehicle if viewing a focused incident */}
        {focusedIncident?.dispatchedService?.location && (
           <Marker 
             key={`service-${focusedIncident._id}`}
             position={{ lat: focusedIncident.dispatchedService.location.lat, lng: focusedIncident.dispatchedService.location.lng }}
             icon={"http://maps.google.com/mapfiles/ms/icons/blue-dot.png"}
           />
        )}
        
        {/* Add a marker if we only get one focused incident but no broad incidents array */}
        {focusedIncident && !incidents && (
           <Marker 
             key={focusedIncident._id} 
             position={{ lat: focusedIncident.location?.lat, lng: focusedIncident.location?.lng }}
             icon={"http://maps.google.com/mapfiles/ms/icons/red-dot.png"}
           />
        )}
      </GoogleMap>
      
      {(!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 p-2 rounded text-xs text-slate-400 text-center backdrop-blur z-10">
          Running in Development Mode without a VITE_GOOGLE_MAPS_API_KEY. Watermarks will appear.
        </div>
      )}
    </div>
  );
}
