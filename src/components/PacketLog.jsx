import React, { useEffect, useRef } from 'react';

const PacketLog = ({ logs }) => {
    const logEndRef = useRef(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Parse log entry and color-code flags
    const renderLogEntry = (log, index) => {
        // Match pattern: [...] at the end contains flags
        const flagMatch = log.match(/\[([^\]]+)\](?!.*\[)/); // Last bracket contains flags

        if (!flagMatch) {
            return <div key={index} className="text-gray-300 border-l-2 border-transparent hover:border-blue-500 pl-1 transition-colors">{log}</div>;
        }

        const flags = flagMatch[1];
        const beforeFlags = log.substring(0, flagMatch.index);
        const afterFlags = log.substring(flagMatch.index + flagMatch[0].length);

        // Determine color based on flags
        let flagColor = 'text-gray-300';
        if (flags.includes('SYN') && flags.includes('ACK')) {
            flagColor = 'text-green-400'; // SYN-ACK = Green
        } else if (flags.includes('RST')) {
            flagColor = 'text-red-400'; // RST = Red
        } else if (flags.includes('SYN')) {
            flagColor = 'text-yellow-400'; // SYN = Yellow
        } else if (flags.includes('ACK')) {
            flagColor = 'text-blue-400'; // ACK = Blue
        } else if (flags.includes('ICMP Type 8') || flags.includes('Echo Request')) {
            flagColor = 'text-cyan-400'; // ICMP Echo Request = Cyan
        } else if (flags.includes('ICMP Type 0') || flags.includes('Echo Reply')) {
            flagColor = 'text-purple-400'; // ICMP Echo Reply = Purple
        } else if (flags.includes('ECHO')) {
            flagColor = 'text-cyan-400'; // ECHO = Cyan
        } else if (flags.includes('REPLY')) {
            flagColor = 'text-purple-400'; // REPLY = Purple
        } else if (flags.includes('UDP')) {
            flagColor = 'text-indigo-400'; // UDP = Indigo
        }

        return (
            <div key={index} className="text-gray-300 border-l-2 border-transparent hover:border-blue-500 pl-1 transition-colors">
                <span>{beforeFlags}</span>
                <span className={`font-bold ${flagColor}`}>[{flags}]</span>
                <span>{afterFlags}</span>
            </div>
        );
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded p-2 flex-1 overflow-y-auto font-mono text-sm max-h-60">
            <h3 className="text-gray-400 border-b border-gray-700 mb-2 sticky top-0 bg-gray-800 uppercase font-bold tracking-wider">Live Packet Log</h3>
            <div className="flex flex-col gap-1">
                {logs.length === 0 && <div className="text-gray-600 italic">Waiting for scan traffic...</div>}
                {logs.map((log, i) => renderLogEntry(log, i))}
                <div ref={logEndRef} />
            </div>
        </div>
    );
};

export default PacketLog;
