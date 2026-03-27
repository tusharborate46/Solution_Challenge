import React from 'react';
import { User, MapPin, Clock, MessageSquare, AlertTriangle } from 'lucide-react';

export default function IncidentCard({ incident, user, onUpdateStatus, onAssign, onOpenChat, isActive }) {
  const isAssigned = incident.responders?.includes(user?._id) || incident.responders?.some(r => r._id === user?._id);
  
  const statusColors = {
    pending: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    active: 'bg-red-500/10 text-red-400 border-red-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  };

  return (
    <div className={`p-5 rounded-xl border transition-all ${isActive ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-500/10' : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/80'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-lg text-slate-300">
             <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-white capitalize">{incident.type} Alert</h4>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <Clock size={12} /> {new Date(incident.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${statusColors[incident.status]}`}>
          {incident.status}
        </span>
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex items-start gap-2 text-sm text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50">
          <MapPin size={16} className="mt-0.5 text-blue-400 shrink-0" />
          <span className="font-mono text-xs mt-0.5">{incident.location?.lat.toFixed(4)}, {incident.location?.lng.toFixed(4)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <User size={16} /> 
          <span>Reported by: <strong>{incident.reportedBy?.username || 'Mobile User'}</strong></span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-700/50">
        {(user?.role === 'staff' || user?.role === 'admin') && incident.status !== 'resolved' && (
          <>
            {!isAssigned && (
              <button 
                onClick={() => onAssign(incident._id)}
                className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-xs font-semibold transition-all"
              >
                Assign Self
              </button>
            )}
            {incident.status === 'active' && isAssigned && (
              <button 
                onClick={() => onUpdateStatus(incident._id, 'resolved')}
                className="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all"
              >
                Mark Resolved
              </button>
            )}
          </>
        )}
        <button 
          onClick={onOpenChat}
          className="flex-1 py-2 flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
        >
          <MessageSquare size={14} /> {incident.chatMessages?.length > 0 ? 'View Chat' : 'Open Dispatch Room'}
        </button>
      </div>
    </div>
  );
}
