import React, { useState } from 'react';

const Terminal = ({ onCommand }) => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState(['Welcome to Nmap Simulator v1.0. Type a command to start.']);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const cmd = input.trim();
            if (cmd) {
                setHistory([...history, `$ ${cmd}`]);
                onCommand(cmd);
                setInput('');
            }
        }
    };

    return (
        <div className="bg-black text-green-500 font-mono p-4 h-full flex flex-col overflow-hidden text-sm">
            <div className="flex-1 overflow-y-auto mb-2">
                {history.map((line, i) => (
                    <div key={i}>{line}</div>
                ))}
            </div>
            <div className="flex items-center">
                <span className="mr-2">$</span>
                <input
                    type="text"
                    className="bg-transparent border-none outline-none flex-1 text-green-500 placeholder-green-800"
                    placeholder="nmap -sS 192.168.1.1"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            </div>
        </div>
    );
};

export default Terminal;
