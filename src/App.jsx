import React, { useState } from 'react';
import Terminal from './components/Terminal';
import NetworkMap from './components/NetworkMap';
import Controls from './components/Controls';
import ScanBuilder from './components/ScanBuilder';
import PacketLog from './components/PacketLog';
import RealOutput from './components/RealOutput';
import { useSimulation } from './hooks/useSimulation';

function App() {
  const { packets, logs, runScan, explanation, targets, downloadLink, nmapOutput, manualMode, toggleManualMode, isScanning, resetSimulation, firewallEnabled, toggleFirewall, queueCount, onPacketArrive } = useSimulation();

  const selectedTarget = targets.length > 0 ? targets[0] : null;

  const handleCommand = (cmd) => {
    runScan(cmd);
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col p-4 font-sans">
      <header className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
        <h1 className="text-2xl font-bold">
          Nmap Simulator <span className="text-sm font-normal text-gray-400 ml-2">Interactive Visualizer</span>
        </h1>
        <div className="flex gap-4 items-center">
          {downloadLink && (
            <span className="text-green-500 text-sm animate-pulse font-mono tracking-wider">
              [REPORT: READY]
            </span>
          )}

          {/* AUTO / MANUAL SWITCH - SEGMENTED CONTROL */}
          <div className="flex h-10 bg-gray-900/50 rounded-lg p-1 border border-white/10 backdrop-blur-md">
            <button
              onClick={() => manualMode && toggleManualMode()}
              className={`px-4 h-full rounded-md text-xs font-bold transition-all uppercase tracking-wider flex items-center ${!manualMode
                ? 'bg-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)] border border-blue-500/50'
                : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              ▶ Auto
            </button>
            <button
              onClick={() => !manualMode && toggleManualMode()}
              className={`px-4 h-full rounded-md text-xs font-bold transition-all uppercase tracking-wider flex items-center ${manualMode
                ? 'bg-yellow-600/20 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] border border-yellow-500/50'
                : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              ⏸ Manual
            </button>
          </div>

          {/* FIREWALL TOGGLE - BRAVE BLUE / SECURITY PURPLE */}
          <button
            onClick={toggleFirewall}
            title="Toggle Firewall Protection"
            className={`
              h-10 flex items-center gap-3 px-5 rounded-lg border text-xs font-bold uppercase tracking-widest transition-all backdrop-blur-md
              ${firewallEnabled
                ? 'bg-indigo-600/30 border-indigo-400 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:bg-indigo-600/40 hover:shadow-[0_0_30px_rgba(99,102,241,0.6)]'
                : 'bg-gray-800/50 border-gray-700 text-gray-500 hover:border-gray-500'
              }
            `}
          >
            <span className={`text-lg transition-transform duration-300 ${firewallEnabled ? 'scale-110' : ''}`}>
              {firewallEnabled ? '🛡️' : '⛨'}
            </span>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] opacity-70">FIREWALL</span>
              <span className={firewallEnabled ? 'text-indigo-200' : ''}>{firewallEnabled ? 'ACTIVE' : 'OFFLINE'}</span>
            </div>
          </button>

          <Controls onReset={resetSimulation} />
        </div>
      </header>

      <div className="flex flex-1 gap-4">
        {/* Left: Controls & Target Details */}
        <div className="w-1/3 flex flex-col gap-4">
          <ScanBuilder onScan={handleCommand} />
          <div className="flex-1 overflow-hidden flex flex-col">
            <RealOutput output={nmapOutput} />
          </div>
        </div>

        {/* Right: Visualization & Logs */}
        <div className="w-2/3 flex flex-col gap-4">
          <div className="flex-1 bg-gray-800 border border-gray-700 rounded relative overflow-hidden h-[60vh]">
            <NetworkMap
              packets={packets}
              targets={targets}
              onPacketArrive={onPacketArrive}
              manualMode={manualMode}
              queueCount={queueCount}
              firewallEnabled={firewallEnabled}
            />
          </div>

          <div className="h-[30vh] flex flex-col">
            <PacketLog logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
