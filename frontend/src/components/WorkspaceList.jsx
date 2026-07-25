import React from 'react';
import { History, ChevronRight } from 'lucide-react';

const SURFACE = "#101A33";
const TEXT = "#F5F3FF";
const MUTED = "#D6D6D6";

export default function WorkspaceList({ history, onSelect }) {
  if (!history || history.length === 0) return null;

  return (
    <div className="w-full md:w-64 shrink-0 mt-8">
      <div className="flex items-center gap-2 mb-4 text-sm font-medium" style={{ color: TEXT }}>
        <History size={16} style={{ color: "#4EA8FF" }} />
        Research Workspaces
      </div>
      <div className="space-y-2 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
        {history.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(item)}
            className="w-full text-left p-3 rounded-md transition border hover:scale-[1.02]"
            style={{ 
              backgroundColor: SURFACE, 
              borderColor: "#2A4A73",
              color: MUTED
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = TEXT; e.currentTarget.style.borderColor = "#4EA8FF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = "#2A4A73"; }}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium truncate pr-2">{item.idea}</span>
              <ChevronRight size={14} className="opacity-50 shrink-0" />
            </div>
            <div className="text-xs opacity-60 mt-1">
              {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
