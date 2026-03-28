import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShieldAlert, LogOut, CheckCircle, Activity, MapPin, AlertTriangle, Clock, User, MessageSquare, Truck, Bot, X, Send } from 'lucide-react';
import { io } from 'socket.io-client';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const SERVER_URL = 'http://localhost:5000';

// ============================================
// 1. MAIN APP & STATE (AUTH + SOCKETS)
// ============================================
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (token) {
      const newSocket = io(SERVER_URL);
      setSocket(newSocket);
      return () => newSocket.close();
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else alert(data.msg);
    } catch (err) { alert('Login Failed'); }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  if (!token) return <LoginScreen onLogin={login} />;
  return <DashboardScreen user={user} token={token} logout={logout} socket={socket} />;
}

// ============================================
// 2. LOGIN COMPONENT
// ============================================
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  
  const submit = (e) => { e.preventDefault(); onLogin(username, password); };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-slate-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-700">
        <div className="flex justify-center mb-6 text-blue-500">
          <ShieldAlert size={48} />
        </div>
        <h2 className="text-2xl font-bold text-center text-white mb-8">CrisisSync HQ</h2>
        <div className="space-y-4">
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg mt-4 transition">Access Dashboard</button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// 3. MAIN DASHBOARD UI
// ============================================
function DashboardScreen({ user, token, logout, socket }) {
  const [incidents, setIncidents] = useState([]);
  const [activeIncidentId, setActiveIncidentId] = useState(null);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/incidents`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(data => setIncidents(data)).catch(console.error);

    if (socket) {
      socket.on('new_sos_alert', (incident) => setIncidents(prev => [incident, ...prev]));
      socket.on('incident_updated', (updated) => {
        setIncidents(prev => prev.map(i => i._id === updated._id ? updated : i));
      });
    }
  }, [socket, token]);

  const updateStatus = async (id, status) => {
    await fetch(`${SERVER_URL}/api/incidents/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
  };

  const createFakeSosTest = async () => {
    socket.emit('sos_alert', {
      location: { lat: 34.0522 + (Math.random()*0.1), lng: -118.2437 + (Math.random()*0.1) },
      description: "Admin Web Triggered Mock SSO"
    });
  };

  const activeIncident = incidents.find(i => i._id === activeIncidentId);

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-3 mb-8 text-blue-400">
            <ShieldAlert size={28} />
            <h1 className="text-xl font-bold text-white">CrisisSync</h1>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Controls</p>
          <button onClick={createFakeSosTest} className="w-full bg-red-600/20 text-red-400 border border-red-500 py-2 rounded font-bold hover:bg-red-600 hover:text-white transition">
            + Trigger Test SOS
          </button>
        </div>
        <div>
          <div className="mb-4">
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-xs text-slate-500 capitalize">Role: {user.role}</p>
          </div>
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm"><LogOut size={16} /> Sign Out</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Incident List */}
        <div className="w-1/3 bg-slate-900 flex flex-col border-r border-slate-800">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-semibold">Incident Feed</h2>
            <p className="text-sm text-slate-400">Active Tracking: {incidents.length}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {incidents.map(inc => (
              <div key={inc._id} onClick={() => setActiveIncidentId(inc._id)} className={`p-4 rounded-xl border cursor-pointer hover:bg-slate-800 transition ${activeIncidentId === inc._id ? 'border-blue-500 bg-slate-800' : 'border-slate-700 bg-slate-800/50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-white uppercase flex items-center gap-2"><AlertTriangle size={16} className="text-orange-400"/> {inc.type}</h4>
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-slate-900 text-slate-300">{inc.status}</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mb-3"><Clock size={12}/> {new Date(inc.createdAt).toLocaleString()}</div>
                
                {inc.status !== 'resolved' && (
                  <button onClick={(e) => { e.stopPropagation(); updateStatus(inc._id, 'resolved'); }} className="w-full py-1.5 bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-600 hover:text-white rounded text-xs font-bold transition">Mark Resolved</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Detail Panes */}
        <div className="flex-1 bg-slate-950 flex flex-col relative">
           {activeIncidentId && activeIncident ? (
             <IncidentDetailView incident={activeIncident} socket={socket} close={() => setActiveIncidentId(null)} user={user}/>
           ) : (
             <SimpleMap incidents={incidents} />
           )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 4. INCIDENT DETAIL / AI VIEW
// ============================================
function IncidentDetailView({ incident, close, socket, user }) {
  const [chatInput, setChatInput] = useState('');
  
  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    // We can simulate an admin talking to AI or user sending an AI response manually for demo purposes
    socket.emit('send_ai_message', {
      incidentId: incident._id,
      message: chatInput,
      location: incident.location
    });
    setChatInput('');
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <h3 className="font-bold flex items-center gap-2"><MapPin size={18} className="text-blue-500"/> Tracker: {incident._id}</h3>
        <button onClick={close} className="p-2 hover:bg-slate-800 rounded"><X size={16}/></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Core Detail */}
        <div className="bg-slate-800 p-5 rounded border border-slate-700 grid grid-cols-2 gap-4">
           <div><span className="text-slate-500 text-xs block uppercase">Severity</span> {incident.severity}</div>
           <div><span className="text-slate-500 text-xs block uppercase">Coordinates</span> {incident.location?.lat.toFixed(4)}, {incident.location?.lng.toFixed(4)}</div>
           <div className="col-span-2"><span className="text-slate-500 text-xs block uppercase">Report</span> {incident.description}</div>
        </div>

        {/* Dispatch Block */}
        {incident.dispatchedService && (
           <div className="bg-emerald-900/20 p-5 rounded border border-emerald-800/50">
             <h3 className="font-semibold text-emerald-400 flex items-center gap-2 mb-3"><Truck size={18}/> Fleet Dispatched</h3>
             <ul className="text-sm space-y-2 text-slate-300">
               <li><strong className="text-slate-400">Unit:</strong> {incident.dispatchedService.name}</li>
               <li><strong className="text-slate-400">ETA:</strong> {incident.dispatchedService.duration} / {incident.dispatchedService.distance}</li>
               <li><strong className="text-slate-400">Status:</strong> {incident.dispatchedService.status}</li>
             </ul>
           </div>
        )}

        {/* AI Conversation View */}
        <div className="bg-blue-900/10 rounded border border-blue-900/30">
          <div className="p-4 border-b border-blue-900/30 flex justify-between bg-blue-900/20">
             <h3 className="font-semibold text-blue-400 flex items-center gap-2"><Bot size={18}/> AI Intelligence Log</h3>
             <span className="text-xs text-blue-500 font-mono">Confidence: {(incident.aiAnalysis?.confidenceScore || 0) * 100}%</span>
          </div>
          <div className="p-4 space-y-3">
             {incident.aiAnalysis?.questions.map((q, i) => (
               <div key={`qa-${i}`} className="text-sm">
                 <div className="bg-blue-950 text-blue-300 px-3 py-2 rounded-t font-medium border border-blue-900">AI: {q}</div>
                 <div className="bg-slate-900 text-slate-300 px-3 py-2 rounded-b border border-t-0 border-slate-800">
                   Requester: {incident.aiAnalysis.answers[i] || <span className="italic text-slate-600">Waiting for response...</span>}
                 </div>
               </div>
             ))}
          </div>
          
          {/* Mock Console to send answers directly to the AI as the victim */}
          <form onSubmit={sendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
            <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Simulate victim reply..." className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 text-sm text-white focus:outline-none" />
            <button type="submit" className="bg-blue-600 p-2 rounded text-white hover:bg-blue-500"><Send size={16}/></button>
          </form>
        </div>
        
      </div>
    </div>
  );
}

// ============================================
// 5. GLOBAL MAP COMPONENT
// ============================================
function SimpleMap({ incidents }) {
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '' });
  if (!isLoaded) return <div className="flex-1 flex items-center justify-center text-slate-500">Loading Tracking Module...</div>;

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={{ lat: 34.0522, lng: -118.2437 }}
      zoom={11}
      options={{ disableDefaultUI: true, styles: [{ stylers: [{ invert_lightness: true }] }] }} // simple dark mode
    >
      {incidents.map(inc => (
        <Marker key={inc._id} position={{ lat: inc.location?.lat, lng: inc.location?.lng }} />
      ))}
    </GoogleMap>
  );
}
