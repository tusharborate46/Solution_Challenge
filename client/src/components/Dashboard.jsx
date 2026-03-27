import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, CheckCircle, Activity, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import IncidentCard from './IncidentCard';
import ChatBox from './ChatBox';

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const socket = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [activeChatId, setActiveChatId] = useState(null);

  useEffect(() => {
    fetchIncidents();
    if (socket) {
      socket.on('new_sos_alert', (incident) => {
        setIncidents(prev => [incident, ...prev]);
      });
      socket.on('incident_updated', (updatedIncident) => {
        setIncidents(prev => prev.map(i => i._id === updatedIncident._id ? updatedIncident : i));
      });
    }
    return () => {
      if (socket) {
        socket.off('new_sos_alert');
        socket.off('incident_updated');
      }
    };
  }, [socket, token]);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/incidents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setIncidents(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await fetch(`http://localhost:5000/api/incidents/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/incidents/${id}/assign`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ responderId: user._id })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredIncidents = filter === 'all' 
    ? incidents 
    : incidents.filter(i => i.status === filter);

  const activeCount = incidents.filter(i => i.status === 'active' || i.status === 'pending').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg"><ShieldAlert size={24} /></div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">CrisisSync V2</h1>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-4 tracking-wider">Dashboard Views</p>
            <button onClick={() => setFilter('all')} className={`w-full text-left px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>All Incidents</button>
            <button onClick={() => setFilter('pending')} className={`w-full text-left px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Pending Dispatch</button>
            <button onClick={() => setFilter('active')} className={`w-full text-left px-4 py-2 rounded-lg ${filter === 'active' ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Active Response</button>
            <button onClick={() => setFilter('resolved')} className={`w-full text-left px-4 py-2 rounded-lg ${filter === 'resolved' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Resolved Cases</button>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-800">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium">{user?.username || 'Dispatcher'}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role || 'Staff'}</p>
          </div>
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-300 rounded-lg transition-colors text-sm font-semibold">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header / Analytics */}
        <div className="h-24 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-8 shadow-sm z-10">
          <h2 className="text-2xl font-semibold">Incident Command Center</h2>
          <div className="flex gap-4">
            <div className="flex items-center gap-4 bg-slate-800/50 px-5 py-2.5 rounded-xl border border-slate-700/50">
              <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><Activity size={20} /></div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Active Emergencies</p>
                <p className="text-xl font-bold">{activeCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-800/50 px-5 py-2.5 rounded-xl border border-slate-700/50">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><CheckCircle size={20} /></div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Cases Resolved</p>
                <p className="text-xl font-bold">{resolvedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* List View */}
          <div className={`flex flex-col border-r border-slate-800 bg-slate-900/50 transition-all ${activeChatId ? 'w-1/3' : 'w-1/2'} overflow-y-auto p-6 scrollbar-hide`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-200">Incident Feed</h3>
              <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-medium text-slate-400">{filteredIncidents.length} Records</span>
            </div>
            <div className="space-y-4">
              {filteredIncidents.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <ShieldAlert size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No incidents match this filter view.</p>
                </div>
              ) : (
                filteredIncidents.map(incident => (
                  <IncidentCard 
                    key={incident._id} 
                    incident={incident} 
                    user={user}
                    onUpdateStatus={handleUpdateStatus}
                    onAssign={handleAssign}
                    onOpenChat={() => setActiveChatId(incident._id)}
                    isActive={activeChatId === incident._id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Stage: Maps / Chat UI */}
          <div className="flex-1 bg-slate-950 relative flex flex-col">
            {activeChatId ? (
              <ChatBox incidentId={activeChatId} token={token} onClose={() => setActiveChatId(null)} user={user}/>
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col text-slate-500">
                <MapPin size={64} className="mb-6 text-slate-800" />
                <h3 className="text-xl font-medium mb-2 text-slate-400">Live Map View Unavailable</h3>
                <p className="max-w-md text-center">Google Maps integration requires an API key. Map view will display all active incident locations here once configured via the implementation plan.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
