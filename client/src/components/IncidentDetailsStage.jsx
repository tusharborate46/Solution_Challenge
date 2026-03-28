import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { X, Bot, Shield, MapPin, Truck, AlertTriangle } from 'lucide-react';
import ChatBox from './ChatBox';
import MapView from './MapView';

export default function IncidentDetailsStage({ incident, onClose, user, token, onUpdateIncident }) {
  const [activeTab, setActiveTab] = useState('details');

  if (!incident) return null;

  const renderDetails = () => (
    <div className="p-6 space-y-6 overflow-y-auto">
      <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2"><AlertTriangle size={20} className="text-orange-400"/> General Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
          <div><strong className="block text-slate-500 text-xs uppercase mb-1">Type:</strong> {incident.type}</div>
          <div><strong className="block text-slate-500 text-xs uppercase mb-1">Severity:</strong> {incident.severity}</div>
          <div><strong className="block text-slate-500 text-xs uppercase mb-1">Status:</strong> {incident.status}</div>
          <div><strong className="block text-slate-500 text-xs uppercase mb-1">Reported:</strong> {new Date(incident.createdAt).toLocaleString()}</div>
        </div>
      </div>

      {incident.aiAnalysis && incident.aiAnalysis.questions?.length > 0 && (
        <div className="bg-blue-900/10 p-5 rounded-xl border border-blue-800/30">
          <h3 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2"><Bot size={20} /> AI Analysis Log</h3>
          <div className="space-y-4">
            {incident.aiAnalysis.classification && (
               <div className="mb-4 bg-blue-900/40 p-3 rounded-lg flex justify-between items-center text-sm border border-blue-700/50">
                 <span><strong className="text-slate-300">Classification:</strong> <span className="text-white capitalize">{incident.aiAnalysis.classification}</span></span>
                 <span><strong className="text-slate-300">Confidence:</strong> <span className="text-emerald-400">{(incident.aiAnalysis.confidenceScore * 100).toFixed(0)}%</span></span>
               </div>
            )}
            {incident.aiAnalysis.questions.map((q, i) => (
              <div key={i} className="text-sm">
                <div className="text-blue-300 font-medium bg-blue-950 px-3 py-2 rounded-t-lg border border-blue-900">AI: {q}</div>
                <div className="text-slate-300 bg-slate-900 px-3 py-2 rounded-b-lg border border-slate-800 border-t-0">
                  User: {incident.aiAnalysis.answers[i] || <span className="text-slate-500 italic">Pending response...</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {incident.dispatchedService && (
        <div className="bg-emerald-900/10 p-5 rounded-xl border border-emerald-800/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2"><Truck size={20} /> Dispatch Status</h3>
            {user?.role === 'admin' && (
               <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition">Override Dispatch</button>
            )}
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-2"><strong className="w-24 text-slate-500">Service:</strong> <span className="capitalize text-white">{incident.dispatchedService.serviceType} - {incident.dispatchedService.name}</span></div>
            <div className="flex items-center gap-2"><strong className="w-24 text-slate-500">Status:</strong> <span className="uppercase tracking-wider text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-400 border border-emerald-800">{incident.dispatchedService.status}</span></div>
            <div className="flex items-center gap-2"><strong className="w-24 text-slate-500">ETA / Dist:</strong> {incident.dispatchedService.duration} / {incident.dispatchedService.distance}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full bg-slate-900 border-l border-slate-800 relative z-10 w-full animate-in slide-in-from-right fade-in duration-300">
      <div className="flex flex-col flex-1 w-full border-r border-slate-800">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-white">Incident Control</h3>
            <p className="text-xs text-slate-400">ID: {incident._id}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X size={18} /></button>
        </div>
        
        <div className="flex border-b border-slate-800 bg-slate-900/50">
          <button onClick={() => setActiveTab('details')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>Details & AI</button>
          <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'chat' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>Dispatch Chat</button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'details' ? renderDetails() : (
             <div className="absolute inset-0">
               <ChatBox incidentId={incident._id} token={token} onClose={onClose} user={user} />
             </div>
          )}
        </div>
      </div>
      
      {/* Mini Map View Panel - Right Side of Stage */}
      <div className="w-64 bg-slate-950 hidden xl:flex flex-col border-l border-slate-800 relative shadow-inner">
         <div className="p-4 border-b border-slate-800 bg-slate-900/50">
           <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><MapPin size={16}/> Live Tracking</h4>
         </div>
         <div className="flex-1 w-full bg-slate-900 relative">
            <MapView focusedIncident={incident} />
         </div>
      </div>
    </div>
  );
}
