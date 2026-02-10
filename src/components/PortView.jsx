import React from 'react';

const PortView = ({ targetNode }) => {
    if (!targetNode || !targetNode.ports) return null;

    const ports = Object.entries(targetNode.ports).map(([port, data]) => ({
        port,
        ...data
    }));

    return (
        <div className="bg-gray-800 border border-gray-700 rounded p-4 mt-4">
            <h3 className="text-gray-400 border-b border-gray-700 mb-2">Target Ports (192.168.1.1)</h3>
            <div className="grid grid-cols-4 gap-4">
                {ports.map(({ port, state, service }) => (
                    <div key={port} className="flex flex-col items-center bg-gray-900 p-2 rounded border border-gray-700">
                        <div className={`w-3 h-3 rounded-full mb-1 ${state === 'open' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                                state === 'closed' ? 'bg-red-500' :
                                    'bg-yellow-500'
                            }`}></div>
                        <span className="font-mono text-xs font-bold">{port}/tcp</span>
                        <span className="text-[10px] text-gray-500 uppercase">{state}</span>
                        <span className="text-[10px] text-gray-400">{service}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PortView;
