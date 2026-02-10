import React from 'react';

const Controls = ({ onReset }) => {
    return (
        <div className="flex gap-2">
            <button
                onClick={onReset}
                className="group relative overflow-hidden bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-800 hover:border-cyan-400 text-cyan-500 text-xs px-4 py-1.5 rounded transition-all uppercase font-bold tracking-widest"
            >
                <span className="relative z-10 flex items-center gap-2">
                    <span>↻</span> RESET SIMULATION
                </span>
                <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
            {/* Simulation speed or Pause could go here */}
        </div>
    );
};

export default Controls;
