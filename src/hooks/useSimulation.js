import { useState, useEffect, useRef } from 'react';
import { Host } from '../engine/Host';
import { Scheduler } from '../engine/Scheduler';
import { Scanner } from '../engine/Scanner';
import { handleNetwork } from '../engine/NetworkLogic';
import { parseCIDR } from '../utils/ip';

export const useSimulation = () => {
  const [packets, setPackets] = useState([]); 
  const [logs, setLogs] = useState([]);
  const [nmapOutput, setNmapOutput] = useState([]); // Real Nmap Text
  const [explanation, setExplanation] = useState('');
  const [downloadLink, setDownloadLink] = useState(null);
  const [manualMode, setManualMode] = useState(false); // Toggle for manual stepping
  const [queueCount, setQueueCount] = useState(0); // Track queue count in state for re-renders
  const [firewallEnabled, setFirewallEnabled] = useState(false); // Firewall/IDS toggle
  
  const [targets, setTargets] = useState([]); 
  const targetsRef = useRef({}); 

  const schedulerRef = useRef(new Scheduler());
  const attackerRef = useRef(new Host('192.168.1.100', 'attacker'));
  const scannerRef = useRef(null);
  const packetQueueRef = useRef([]); // Queue for manual mode
  const completionTimeoutRef = useRef(null); // Track completion timeout
  const quietPeriodTimerRef = useRef(null); // Detect when packets stop arriving
  const scanStartedRef = useRef(false); // Track if scan has started
  const completionAddedRef = useRef(false); // Prevent duplicate completion messages
  const currentScanTypeRef = useRef(null); // Track current scan type (-sS, -sT, etc.)
  const isScanningRef = useRef(false); // Track loop status synchronously


  const [isScanning, setIsScanning] = useState(false); // For UI updates only
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    // Initialize Scanner
    scannerRef.current = new Scanner(
      attackerRef.current.ip,
      schedulerRef.current
    );

    scannerRef.current.onPacketSend = (packet) => {
        if (manualMode) {
            // In manual mode, queue packets instead of sending immediately
            packetQueueRef.current.push(packet);
        } else {
            // Auto mode: send immediately
            addPacketVisual(packet);
            processPacket(packet);
            updateExplanation(packet, 'send');
        }
    };

    return () => stopLoop();
  }, [manualMode]);

  // Spacebar listener for manual mode
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && manualMode && packetQueueRef.current.length > 0) {
        e.preventDefault();
        const nextPacket = packetQueueRef.current.shift();
        setQueueCount(packetQueueRef.current.length); // Update state!
        
        // Add packet to visualization
        setPackets(prev => [...prev, nextPacket]);
        
        // Update explanation
        const direction = nextPacket.source.type === 'attacker' ? 'send' : 'response';
        const fromTo = `${nextPacket.source.ip} -> ${nextPacket.destination.ip}`;
        const flagStr = nextPacket.flags.join(',');
        setExplanation(`[${direction.toUpperCase()}] ${fromTo} [${flagStr}]`);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [manualMode]);

  const startLoop = () => {
    if (isScanningRef.current) return; // Check Ref instead of State
    
    isScanningRef.current = true;
    setIsScanning(true);
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(loop);
  };

  const stopLoop = () => {
    isScanningRef.current = false;
    setIsScanning(false);
    if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
    }
  };

  const loop = (time) => {
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;
    schedulerRef.current.tick(dt);
    animationRef.current = requestAnimationFrame(loop);
  };

  const initializeNetwork = (cidr) => {
      const ips = parseCIDR(cidr);
      const newTargets = {};
      const newTargetsList = [];

      ips.forEach((ip, index) => {
          const os = index % 2 === 0 ? 'Linux 5.4' : 'Windows 10';
          const host = new Host(ip, 'target', os);
          
          // Randomly set some hosts as dead (25% chance of being down)
          host.isAlive = Math.random() > 0.25;
          
          if (ip.endsWith('.1') || ip.endsWith('.100') || ip.endsWith('.254')) {
              host.addPort(80, 'open', 'http');
              host.addPort(443, 'closed', 'https');
              host.addPort(22, 'filtered', 'ssh');
              host.addPort(53, 'open', 'domain'); 
          } else {
              host.addPort(135, 'open', 'msrpc');
              host.addPort(445, 'open', 'microsoft-ds');
          }
          
          // Sync firewall state
          host.firewallEnabled = firewallEnabled;
          
          newTargets[ip] = host;
          newTargetsList.push(host);
      });

      targetsRef.current = newTargets;
      setTargets(newTargetsList);
  };

  const runScan = (cmd) => {
    const args = cmd.split(' ');
    let targetInput = args[args.length - 1]; 
    if (targetInput.startsWith('-') || targetInput === 'nmap') targetInput = '192.168.1.1';

    // Initialize network FIRST so targets are ready
    initializeNetwork(targetInput);
    
    // Then clear only animation/log state
    stopLoop();
    setPackets([]);
    setLogs([]);
    setExplanation('');
    setDownloadLink(null);
    schedulerRef.current.clear();
    
    // Initialize scan tracking
    scanStartedRef.current = true;
    completionAddedRef.current = false;
    if (quietPeriodTimerRef.current) {
        clearTimeout(quietPeriodTimerRef.current);
    }
    
    startLoop();

    const ports = [80, 443, 22, 53, 3000];

    // -- OUTPUT HEADER --
    const startTime = new Date().toLocaleString();
    setNmapOutput([
        `Starting Nmap 7.93 ( https://nmap.org ) at ${startTime}`,
        `Nmap scan report for ${targetInput}`,
        `Host is up (0.0010s latency).`,
        `Not shown: 996 closed ports`,
        `PORT     STATE    SERVICE     VERSION`
    ]);

    // -- TIMING LOGIC --
    let delay = 1000; // Default T3
    if (cmd.includes('-T0')) delay = 5000; // Paranoid
    if (cmd.includes('-T1')) delay = 4000; // Sneaky
    if (cmd.includes('-T2')) delay = 2000; // Polite
    if (cmd.includes('-T3')) delay = 1000; // Normal
    if (cmd.includes('-T4')) delay = 500;  // Aggressive
    if (cmd.includes('-T5')) delay = 100;  // Insane

    // Recreate scanner with the timing delay
    scannerRef.current = new Scanner('192.168.1.100', schedulerRef.current, delay);
    scannerRef.current.onPacketSend = (packet) => {
        // FIREWALL PRE-CHECK: Mark packet as blocked BEFORE visualization starts
        // This is CRITICAL for the "drop halfway" animation to work
        if (packet.destination.type !== 'attacker') {
            const destHost = targetsRef.current[packet.destination.ip];
            //console.log(`🔍 Firewall Check: Host=${destHost?.ip}, Enabled=${destHost?.firewallEnabled}`);
            
            if (destHost && destHost.firewallEnabled) {
                 // SIGNATURE-BASED LOGIC (Deterministic)
                 // We trust the Scanner's intent (timing) embedded in metadata
                 // Default to 1000 (T3) if missing, to be safe
                 const scanDelay = packet.metadata?.timing || 1000;
                 
                 // Rule: Block anything faster than 1500ms (T3, T4, T5)
                 // Allow anything slower (T2, T1, T0)
                 if (scanDelay < 1500) {
                     console.log(`🛑 FIREWALL BLOCK: Signature Detection (Profile: ${scanDelay}ms < 1500ms)`);
                     packet.blocked = true;
                     destHost.blockedCount++;
                 } else {
                     // ALLOW PASS - T2 (2000ms) and slower are "Polite" enough
                 }
            }
        }

        if (manualMode) {
            packetQueueRef.current.push(packet);
            setQueueCount(packetQueueRef.current.length); // Update state to trigger re-render!
        } else {
            // FIREWALL: Only process and log if NOT blocked
            if (!packet.blocked) {
                processPacket(packet);
                updateExplanation(packet, 'send');
            } else {
                console.log('🔇 Creating visual for BLOCKED packet (visual drop only)');
                // We STILL add visual so user sees it drop
            }
            addPacketVisual(packet); 
        }
    };

    // -- OUTPUT LOGIC --
    if (cmd.includes('-oN') || cmd.includes('-oX')) {
        setTimeout(() => {
            setDownloadLink("scan_report.txt"); // Simulate file ready
        }, 5000);
    }

    // Helper to schedule scans
    const schedule = (callback) => {
        const ips = Object.keys(targetsRef.current);
        ips.forEach((ip, i) => {
             schedulerRef.current.addEvent(i * delay, () => callback(ip));
        });
    };

    if (cmd.includes('-sn')) {
        setExplanation(`Starting Ping Scan (-sn). Timing: T${delay < 500 ? '4/5' : delay > 2000 ? '0/1' : '3'}`);
        schedule((ip) => scannerRef.current.pingScan(ip));
    } else if (cmd.includes('-sV')) {
        setExplanation(`Starting Version Scan (-sV).`);
        schedule((ip) => scannerRef.current.versionScan(ip, ports));
    } else if (cmd.includes('-O')) {
        setExplanation(`Starting OS Detection (-O).`);
        schedule((ip) => scannerRef.current.osScan(ip));
    } else if (cmd.includes('-sU')) {
        setExplanation(`Starting UDP Scan (-sU).`);
        schedule((ip) => scannerRef.current.udpScan(ip, [53, 161]));
    } else if (cmd.includes('-sC')) {
        setExplanation(`Starting Script Scan (-sC). Running default scripts...`);
        // Simulating script scan as version scan visualization for now
        schedule((ip) => scannerRef.current.versionScan(ip, ports));
    } else if (cmd.includes('-sS')) {
        setExplanation(`Starting TCP SYN Scan (-sS).`);
        currentScanTypeRef.current = '-sS';
        schedule((ip) => scannerRef.current.scanTarget(ip, ports, 'SYN'));
    } else if (cmd.includes('-sT')) {
        setExplanation(`Starting TCP Connect Scan (-sT). Completing full TCP handshake...`);
        currentScanTypeRef.current = '-sT';
        schedule((ip) => scannerRef.current.connectScan(ip, ports));
    } else {
        setExplanation(`Starting default scan.`);
        currentScanTypeRef.current = '-sS';
        schedule((ip) => scannerRef.current.scanTarget(ip, ports, 'SYN'));
    }
  };

  const processPacket = (packet) => {
    // Determine destination host
    let destHost;
    if (packet.destination.type === 'attacker') { 
        destHost = attackerRef.current;
    } else {
        destHost = targetsRef.current[packet.destination.ip];
    }

    // We no longer generate responses here - that happens in onPacketArrive
    // This just validates the packet can be processed
  };

  const updateExplanation = (packet, direction) => {
     let text = '';
     const flagStr = packet.flags.join(',');
     
     // Enhanced ICMP descriptions
     if (packet.flags.includes('ECHO')) {
         text = direction === 'send' 
             ? `📤 Sending ICMP Echo Request (Type 8) to ${packet.destination.ip} - Host discovery probe`
             : `📥 Received ICMP Echo Request from ${packet.source.ip}`;
     } else if (packet.flags.includes('REPLY')) {
         text = direction === 'send'
             ? `📤 Sending ICMP Echo Reply (Type 0) to ${packet.destination.ip}`
             : `📥 Received ICMP Echo Reply from ${packet.source.ip} ✅ Host is UP`;
     } else if (direction === 'send') {
         text = `📤 Sending ${flagStr} to ${packet.destination.ip}:${packet.destination.port}`;
     } else {
         text = `📥 Received ${flagStr} from ${packet.source.ip}:${packet.source.port}`;
     }
     setExplanation(text);
  };

  const addPacketVisual = (packet) => {
     // STRICT GATEKEEPER: If scan is not running (e.g. after reset), DROP all packets.
     // This handles pending setTimeouts from previous scans that fire after reset.
     if (!scanStartedRef.current) {
         return; 
     }
     
     setPackets(prev => [...prev, packet]);
     // Logging moved to onPacketArrive (in NetworkMap callback)
  };
  
  const onPacketArrive = (packet) => {
      // STRICT GATEKEEPER: Drop logs/updates if scan was reset
      if (!scanStartedRef.current) return; 

      // Manually format since object spread loses toString prototype
      // Enhanced formatting for ICMP packets
      let flagsDisplay = packet.flags.join(',');
      let protocolType = 'TCP';
      
      // Detect ICMP packets and enhance description
      if (packet.flags.includes('ECHO')) {
          protocolType = 'ICMP';
          flagsDisplay = 'ICMP Type 8 (Echo Request)';
      } else if (packet.flags.includes('REPLY')) {
          protocolType = 'ICMP';
          flagsDisplay = 'ICMP Type 0 (Echo Reply)';
      } else if (packet.flags.includes('UDP')) {
          protocolType = 'UDP';
      }
      
      const formatted = `${packet.source.ip}:${packet.source.port} -> ${packet.destination.ip}:${packet.destination.port} [${flagsDisplay}]`;
      
      // LOGGING: Only log if NOT blocked
      if (!packet.blocked) {
          const logEntry = `[${packet.timestamp}] ${formatted}${packet.payload ? ' ' + packet.payload : ''}`;
          setLogs(prev => [...prev, logEntry]);
      } else {
          console.log('🔇 Skipping log for blocked packet');
          return; // Don't process blocked packets further
      }

      // --- CASE 1: Packet Arriving at ATTACKER (Response) ---
      if (packet.destination.type === 'attacker') {
          console.log(`✅ Response arrived at Attacker: ${packet.flags}`);
          
          // SYN-ACK arriving at attacker = port is open, update Nmap output NOW
          if (packet.flags.includes('SYN') && packet.flags.includes('ACK')) {
              const port = packet.source.port;
              const sourceHost = targetsRef.current[packet.source.ip];
              const service = sourceHost?.ports[port]?.service || 'unknown';
              const version = sourceHost?.ports[port]?.version || '';
              
              setNmapOutput(prev => {
                  const line = `${port}/tcp   open     ${service.padEnd(12)} ${version}`;
                  if (!prev.includes(line)) return [...prev, line];
                  return prev;
              });

              // Check scan type to determine response
              const isConnectScan = currentScanTypeRef.current === '-sT';
              
              if (isConnectScan) {
                  // CONNECT SCAN: Send ACK to complete full handshake
                  setTimeout(() => {
                      const ackPacket = {
                          source: packet.destination, // Attacker sends ACK
                          destination: packet.source, // To the target
                          flags: ['ACK'],
                          timestamp: Date.now()
                      };
                      // Visual only
                      const ack = { 
                          ...ackPacket, 
                          source: { ip: '192.168.1.100', type: 'attacker' }, 
                          destination: packet.source 
                      };
                      addPacketVisual(ack);
                      updateExplanation(ack, 'send');
                  }, 300);
              } else {
                  // SYN SCAN: Send RST to abort (stealth scan)
                  setTimeout(() => {
                      const rstPacket = {
                          source: { ip: '192.168.1.100', type: 'attacker' },
                          destination: packet.source,
                          flags: ['RST'],
                          timestamp: Date.now()
                      };
                      const rst = {
                          ...rstPacket,
                          source: { ip: '192.168.1.100', type: 'attacker' },
                          destination: packet.source
                      };
                      addPacketVisual(rst);
                      updateExplanation(rst, 'send');
                  }, 300);
              }
          }
          return;
      }

      // --- CASE 2: Packet Arriving at TARGET (Request) ---
      const destHost = targetsRef.current[packet.destination.ip];
      if (destHost && destHost.type === 'target') {
          // 1. Process via Network/Firewall Logic
          const response = handleNetwork(destHost, packet);
          
          // 2. CHECK FOR BLOCK
          if (response && response.blocked) {
              console.log(`🛑 Packet BLOCKED by firewall at ${destHost.ip} (verified by NetworkLogic)`);
              return; // Packet drop handled by NetworkMap visual
          }
          
          if (packet.flags.includes('ECHO')) {
               // Ping response - handleNetwork usually handles this but we simulate simpler here if needed
               // Actually handleNetwork returns REPLY, so we just visualize 'response' below
          }

          if (response) {
               setTimeout(() => { 
                  addPacketVisual(response);
                  updateExplanation(response, 'response');
                  
                  // OS DETAILS: If response contains fingerprint
                  if (response.payload && response.payload.startsWith('Fingerprint:')) {
                       setNmapOutput(prev => [...prev, `OS details: ${response.payload.split(':')[1]}`]);
                  }
               }, 300); // Small delay before sending response
         }
     }
  };
  
  const resetSimulation = () => {
    stopLoop();
    setPackets([]);
    setLogs([]);
    setNmapOutput([]);
    setExplanation('');
    setDownloadLink(null);
    setManualMode(false);
    setQueueCount(0);
    setTargets([]); 
    targetsRef.current = {}; 
    
    // Clear Ref states
    schedulerRef.current.clear();
    packetQueueRef.current = [];
    scanStartedRef.current = false;
    completionAddedRef.current = false;
    currentScanTypeRef.current = null;
    isScanningRef.current = false;
    
    // Clear timers
    if (quietPeriodTimerRef.current) {
        clearTimeout(quietPeriodTimerRef.current);
        quietPeriodTimerRef.current = null;
    }
  };

  const toggleFirewall = () => {
    setFirewallEnabled(prev => {
      const newValue = !prev;
      const now = Date.now();
      // Update all existing targets
      Object.values(targetsRef.current).forEach(host => {
        host.firewallEnabled = newValue;
        // Initialize lastPacketTime when enabling to prevent first packet bypass
        if (newValue) {
          console.log(`🛡️ Firewall ENABLED for ${host.ip} - Signature Detection Active`);
        } else {
          console.log(`❌ Firewall DISABLED for ${host.ip}`);
        }
      });
      return newValue;
    });
  };

  const toggleManualMode = () => {
    setManualMode(prev => !prev);
  };

  return { 
    packets, 
    logs, 
    runScan, 
    resetSimulation, 
    explanation, 
    targets, 
    downloadLink, 
    nmapOutput,
    manualMode,
    toggleManualMode,
    firewallEnabled,
    toggleFirewall,
    queueCount, 
    onPacketArrive
  };
};
