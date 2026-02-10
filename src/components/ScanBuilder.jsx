import React, { useState, useEffect } from 'react';

const ScanBuilder = ({ onScan }) => {
    const [target, setTarget] = useState('192.168.1.1');
    const [scanType, setScanType] = useState('-sS'); // Default SYN
    const [timing, setTiming] = useState('-T3');
    const [options, setOptions] = useState({
        sV: false,
        O: false,
        Pn: false,
        sC: false,
        oN: false,
    });

    const applyPreset = (type) => {
        if (type === 'quick') {
            setScanType('-sS');
            setTiming('-T4');
            setOptions({ sV: false, O: false, Pn: false, sC: false, oN: false });
        } else if (type === 'intense') {
            setScanType('-sS');
            setTiming('-T4');
            setOptions({ sV: true, O: true, Pn: false, sC: true, oN: true });
        } else if (type === 'slow') {
            setScanType('-sS');
            setTiming('-T1');
            setOptions({ sV: false, O: false, Pn: false, sC: false, oN: false });
        }
    };

    const generateCommand = () => {
        let cmd = `nmap ${scanType}`;

        // Add Timing if not normal (T3 is default, but explicit is fine for valid commands)
        if (timing !== '-T3') cmd += ` ${timing}`;

        // Add Options
        if (options.Pn) cmd += ' -Pn';
        if (options.sV) cmd += ' -sV';
        if (options.O) cmd += ' -O';
        if (options.sC) cmd += ' -sC';
        if (options.oN) cmd += ' -oN scan.txt';

        cmd += ` ${target}`;
        return cmd;
    };

    const command = generateCommand();

    const handleScan = () => {
        onScan(command);
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs uppercase font-bold tracking-wider">Target</label>
                <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="bg-gray-900 border border-gray-600 text-white px-3 py-2 rounded focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="IP address or CIDR"
                />
            </div>

            <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-2">
                    <label className="text-gray-400 text-xs uppercase font-bold tracking-wider">Scan Type</label>
                    <select
                        value={scanType}
                        onChange={(e) => setScanType(e.target.value)}
                        className="bg-gray-900 border border-gray-600 text-white px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                    >
                        <option value="-sS">TCP SYN Scan (-sS)</option>
                        <option value="-sT">Connect Scan (-sT)</option>
                        <option value="-sU">UDP Scan (-sU)</option>
                        <option value="-sn">Ping Scan (-sn)</option>
                    </select>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                    <label className="text-gray-400 text-xs uppercase font-bold tracking-wider">Timing</label>
                    <input
                        type="range"
                        min="0" max="5"
                        value={timing.replace('-T', '')}
                        onChange={(e) => setTiming(`-T${e.target.value}`)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 font-mono">
                        <span>T0</span><span>T3</span><span>T5</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {Object.keys(options).map(key => (
                    <button
                        key={key}
                        onClick={() => setOptions(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`px-3 py-1 rounded text-xs font-mono border ${options[key] ? 'bg-blue-900 border-blue-500 text-blue-100' : 'bg-gray-900 border-gray-600 text-gray-400'}`}
                    >
                        -{key}
                    </button>
                ))}
            </div>

            <div className="mt-2 bg-black rounded p-3 font-mono text-green-400 text-sm border border-gray-700">
                <span className="text-gray-500">$</span> {command}
            </div>

            <button
                onClick={handleScan}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded shadow-lg transition-colors"
            >
                RUN SCAN
            </button>

            <div className="flex gap-2 justify-center border-t border-gray-700 pt-3 mt-1">
                <span className="text-xs text-gray-500 self-center uppercase font-bold">Presets:</span>
                <button onClick={() => applyPreset('quick')} className="text-xs text-blue-400 hover:text-blue-300 underline">Quick</button>
                <button onClick={() => applyPreset('intense')} className="text-xs text-red-400 hover:text-red-300 underline">Intense</button>
                <button onClick={() => applyPreset('slow')} className="text-xs text-yellow-400 hover:text-yellow-300 underline">Slow</button>
            </div>
        </div>
    );
};

export default ScanBuilder;
