import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PacketVisual = ({ packet, targets, onComplete }) => {
    const isRequest = packet.source.type === 'attacker';

    // Target Index Calculation
    let targetIndex = 0;
    let totalTargets = targets.length || 1;
    if (isRequest) {
        targetIndex = targets.findIndex(t => t.ip === packet.destination.ip);
    } else {
        targetIndex = targets.findIndex(t => t.ip === packet.source.ip);
    }
    if (targetIndex === -1) targetIndex = 0;

    // Calculate target position - star topology
    let targetX, targetY;
    if (totalTargets === 1) {
        // Single target: original position
        targetX = 90;
        targetY = 50;
    } else {
        // Multiple targets: circular/star layout around center
        const centerX = 50;
        const centerY = 50;
        const radius = 30; // radius of the circle
        const angle = (targetIndex / totalTargets) * 2 * Math.PI - Math.PI / 2; // start from top
        targetX = centerX + radius * Math.cos(angle);
        targetY = centerY + radius * Math.sin(angle);
    }

    // Color Coding Logic
    const flags = packet.flags || [];
    let colorClass = 'bg-blue-500 text-blue-500'; // Default
    let shadowClass = '';
    let label = '?';

    if (flags.includes('RST')) {
        colorClass = 'bg-red-500 text-red-500';
        shadowClass = 'shadow-[0_0_15px_rgba(239,68,68,0.8)]';
        label = 'RST';
    } else if (flags.includes('SYN') && flags.includes('ACK')) {
        colorClass = 'bg-green-500 text-green-500';
        shadowClass = 'shadow-[0_0_15px_rgba(34,197,94,0.8)]';
        label = 'SYN-ACK';
    } else if (flags.includes('SYN')) {
        colorClass = 'bg-yellow-400 text-yellow-400';
        shadowClass = 'shadow-[0_0_20px_rgba(250,204,21,0.8)]';
        label = 'SYN';
    } else if (flags.includes('ACK')) {
        colorClass = 'bg-green-400 text-green-400';
        shadowClass = 'shadow-[0_0_15px_rgba(74,222,128,0.8)]';
        label = 'ACK';
    } else if (flags.includes('FIN')) {
        colorClass = 'bg-purple-500 text-purple-500';
        shadowClass = 'shadow-[0_0_15px_rgba(168,85,247,0.8)]';
        label = 'FIN';
    } else if (flags.includes('ECHO') || flags.includes('REPLY')) {
        colorClass = 'bg-cyan-400 text-cyan-400';
        shadowClass = 'shadow-[0_0_15px_rgba(34,211,238,0.8)]';
        label = flags.includes('ECHO') ? 'PING' : 'PONG';
    } else if (flags.includes('UDP')) {
        colorClass = 'bg-indigo-500 text-indigo-500';
        shadowClass = 'shadow-[0_0_15px_rgba(99,102,241,0.8)]';
        label = 'UDP';
    }

    // Determine Trail Direction
    const trailClass = isRequest ? 'packet-trail-right' : 'packet-trail-left';

    // Check if packet is blocked by firewall
    const isBlocked = packet.blocked === true;
    const targetDistance = isBlocked ? 0.85 : 1.0; // Blocked packets get close to firewall (85%)

    // Determine operator position based on target count
    const operatorX = totalTargets === 1 ? 10 : 50;
    const operatorY = 50;

    return (
        <motion.div
            initial={{
                left: isRequest ? `${operatorX}%` : `${targetX}%`,
                top: isRequest ? `${operatorY}%` : `${targetY}%`,
                opacity: 0,
                scale: 0.2,
                x: '-50%',
                y: '-50%'
            }}
            animate={{
                left: isBlocked
                    ? [
                        isRequest ? `${operatorX}%` : `${targetX}%`,  // Start position
                        isRequest ? `${operatorX + ((targetX - operatorX) * targetDistance)}%` : `${targetX - ((targetX - operatorX) * targetDistance)}%`, // Move to firewall
                        isRequest ? `${operatorX + ((targetX - operatorX) * targetDistance)}%` : `${targetX - ((targetX - operatorX) * targetDistance)}%`, // Pause at firewall
                        isRequest ? `${operatorX + ((targetX - operatorX) * targetDistance)}%` : `${targetX - ((targetX - operatorX) * targetDistance)}%`  // Stay while dropping
                    ]
                    : isRequest ? `${targetX}%` : `${operatorX}%`,
                top: isBlocked
                    ? [
                        isRequest ? `${operatorY}%` : `${targetY}%`,  // Start position
                        `${operatorY + (targetY - operatorY) * targetDistance}%`, // Move to firewall
                        `${operatorY + (targetY - operatorY) * targetDistance}%`, // Pause at collision
                        '120%' // DROP DOWN
                    ]
                    : isRequest ? `${targetY}%` : `${operatorY}%`,
                opacity: isBlocked ? [0, 1, 1, 1, 0.5, 0] : 1,
                scale: isBlocked
                    ? [
                        0.2,  // Start small
                        1,    // Grow while traveling
                        1.3,  // Expand on collision
                        0.9,  // Compress on impact
                        0.7,  // Shrink while falling
                        0     // Disappear
                    ]
                    : 1,
                rotate: isBlocked
                    ? [
                        0,   // No rotation during travel
                        0,   // No rotation at firewall
                        0,   // No rotation during collision
                        45,  // Start tilting when dropping
                        90,  // Tilt more
                        120  // Final rotation
                    ]
                    : 0
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
                duration: isBlocked ? 2.5 : 2.5,
                times: isBlocked ? [0, 0.4, 0.5, 0.6, 0.85, 1] : undefined, // 0-40% travel, 40-50% collision pause, 50-60% impact, 60-100% drop
                ease: isBlocked ? ["easeInOut", "easeIn", "easeOut", "easeIn", "easeIn"] : "linear",
            }}
            onAnimationComplete={() => {
                onComplete();
            }}
            className={`absolute z-30 flex items-center justify-center`}
        >
            {/* The Packet Shape (Rectangle) */}
            <div className={`w-12 h-8 rounded-sm flex items-center justify-center ${isBlocked ? 'bg-red-600 text-red-600' : colorClass} ${isBlocked ? 'shadow-[0_0_25px_rgba(220,38,38,0.9)]' : shadowClass} ${trailClass} relative border border-white/20`}>
                <div className="w-full h-[2px] bg-black/20 absolute top-1/2 transform -translate-y-1/2"></div>
                <div className="w-[2px] h-full bg-black/20 absolute left-1/2 transform -translate-x-1/2"></div>
            </div>

            {/* Floating Label */}
            <div className={`absolute -top-8 text-xs font-bold font-mono whitespace-nowrap px-2 py-0.5 rounded bg-gray-900/90 border border-gray-700 ${colorClass.replace('bg-', 'text-')}`}>
                {label}
            </div>
        </motion.div>
    );
};

const AttackerNode = ({ centered = false }) => {
    return (
        <div className={`absolute ${centered ? 'left-1/2 top-1/2' : 'left-[10%] top-1/2'} transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 w-36 h-36`}>
            {/* Simple Glow - Static */}
            <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl -z-10"></div>

            <div className="w-30 h-30 bg-gray-900 border-2 border-blue-500/80 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] relative">
                <div className="text-center z-10 relative flex flex-col items-center justify-center h-full w-full">
                    {/* Terminal Prompt Icon */}
                    <div className="flex items-center justify-center mb-1">
                        <span className="text-blue-400 font-mono text-3xl font-bold">&gt;</span>
                        <span className="text-blue-400 font-mono text-3xl font-bold animate-pulse">_</span>
                    </div>
                </div>

                {/* Status Bar at bottom */}
                <div className="absolute bottom-0 inset-x-0 h-5 bg-blue-900/30 flex items-center justify-center border-t border-blue-500/20">
                    <span className="text-[9px] font-bold text-blue-400/80 tracking-widest uppercase">OPERATOR</span>
                </div>
            </div>

            {/* IP Label */}
            <div className="mt-2 text-gray-400 text-xs font-mono bg-gray-900/80 px-2 rounded border border-gray-700">192.168.1.100</div>
        </div>
    );
};

const NetworkMap = ({ packets, targets = [], onPacketArrive, manualMode, queueCount, firewallEnabled = false }) => {
    const [activePackets, setActivePackets] = useState([]);
    const lastPacketIndexRef = useRef(-1); // Track which packets we've already visualized
    const loggedPacketsRef = useRef(new Set()); // Track which packets have been logged
    const targetsRef = useRef({}); // Track targets by IP

    // Track "hit" targets for ripple effect
    const [hitTargets, setHitTargets] = useState({});

    useEffect(() => {
        // Reset tracking when packets are cleared
        if (packets.length === 0) {
            console.log('🔄 Packets cleared, resetting lastPacketIndexRef AND activePackets');
            lastPacketIndexRef.current = -1;
            setActivePackets([]); // Clear visual packets too!
            return; // Exit early, nothing to add
        }

        // Only add packets we haven't visualized yet
        if (packets.length > lastPacketIndexRef.current + 1) {
            const newPackets = packets.slice(lastPacketIndexRef.current + 1);
            console.log('🎬 NetworkMap adding', newPackets.length, 'new packets, last index was', lastPacketIndexRef.current);
            newPackets.forEach(newPacket => {
                const visualId = Date.now() + Math.random();
                setActivePackets(prev => [...prev, { ...newPacket, visualId }]);
                // Mark target as being scanned
                if (targetsRef.current[newPacket.destination.ip]) {
                    targetsRef.current[newPacket.destination.ip].isBeingScanned = true;
                }
            });
            lastPacketIndexRef.current = packets.length - 1;
        }
    }, [packets]);

    const removePacket = (id, packet) => {
        setActivePackets(prev => prev.filter(p => p.visualId !== id));

        // Log packet when it arrives - but only once per unique packet
        const packetKey = `${packet.source.ip}:${packet.source.port}->${packet.destination.ip}:${packet.destination.port}-${packet.flags.join(',')}-${packet.timestamp}`;

        if (!loggedPacketsRef.current.has(packetKey)) {
            console.log('✅ onPacketArrive (logging):', packet.flags, 'from', packet.source.ip);
            loggedPacketsRef.current.add(packetKey);
            if (onPacketArrive) onPacketArrive(packet);
        } else {
            console.log('⏭️ Skipping duplicate:', packet.flags);
        }

        const targetIP = packet.destination.ip;
        if (targetsRef.current[targetIP]) {
            targetsRef.current[targetIP].isBeingScanned = false;
        }

        // Trigger hit effect on destination
        setHitTargets(prev => ({ ...prev, [targetIP]: true }));
        // Reset hit after short delay
        setTimeout(() => {
            setHitTargets(prev => ({ ...prev, [targetIP]: false }));
        }, 100);
    };

    const renderTargets = () => {
        const displayTargets = targets.length > 0 ? targets : [{ ip: '192.168.1.1', isAlive: true }];
        const count = displayTargets.length;

        // Scale nodes based on count to fit better
        const nodeSize = count > 10 ? 'w-16 h-16' : count > 5 ? 'w-20 h-20' : 'w-25 h-25';
        const iconSize = count > 10 ? 'text-2xl' : count > 5 ? 'text-3xl' : 'text-4xl';

        return displayTargets.map((target, i) => {
            let left, top;

            if (count === 1) {
                // Single target: original position
                left = 90;
                top = 50;
            } else {
                // Multiple targets: circular/star layout
                const centerX = 50;
                const centerY = 50;
                const radius = 30; // radius percentage of canvas
                const angle = (i / count) * 2 * Math.PI - Math.PI / 2; // start from top
                left = centerX + radius * Math.cos(angle);
                top = centerY + radius * Math.sin(angle);
            }

            const isBeingScanned = activePackets.some(p => p.destination.ip === target.ip);
            const isHit = hitTargets[target.ip];

            return (
                <div key={target.ip}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500`}
                    style={{ left: `${left}%`, top: `${top}%` }}
                >
                    {/* Firewall Shield Bubble - Wraps Everything */}
                    <AnimatePresence>
                        {firewallEnabled && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="absolute -inset-6 z-0 pointer-events-none"
                            >
                                {/* Capsule Shape */}
                                <div className="absolute inset-0 border-2 border-cyan-400/50 bg-cyan-900/20 rounded-[2rem] shadow-[0_0_30px_rgba(34,211,238,0.3)] backdrop-blur-sm">
                                    {/* Grid Pattern */}
                                    <div className="absolute inset-0 rounded-[2rem] opacity-20" style={{
                                        backgroundImage: 'radial-gradient(circle, #22d3ee 1px, transparent 1px)',
                                        backgroundSize: '8px 8px',
                                    }}></div>
                                </div>

                                {/* Top Badge */}
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-cyan-500 rounded-full px-2 py-0.5 shadow-lg flex items-center gap-1">
                                    <span className="text-xs">🛡️</span>
                                    <span className="text-[10px] font-bold text-cyan-400 tracking-wider">SECURE</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>



                    <div className={`relative ${isBeingScanned ? 'scanline-effect overflow-hidden rounded-xl' : ''}`}>
                        {/* Hit Flash Overlay */}
                        <div className={`absolute inset-0 bg-white rounded-xl transition-opacity duration-100 ${isHit ? 'opacity-50' : 'opacity-0'} z-20`}></div>

                        <div className={`${nodeSize} ${target.isAlive ? 'bg-red-900 border-red-500' : 'bg-gray-800 border-gray-600 opacity-60'} border-4 ${isBeingScanned ? 'border-red-400 shadow-[0_0_50px_rgba(248,113,113,0.9),0_0_20px_rgba(239,68,68,1)]' : target.isAlive ? 'shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'shadow-none'} rounded-xl flex items-center justify-center transition-shadow duration-300 relative z-10 scale-${isHit ? '110' : '100'}`}>
                            <span className={iconSize}>{target.isAlive ? '🖥️' : '💀'}</span>
                        </div>
                        {/* Status Indicator - Only show for alive hosts */}
                        {target.isAlive && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-green-500 border-2 border-black shadow-[0_0_15px_rgba(34,197,94,0.8)] z-20"></div>
                        )}
                        {/* Dead Host Indicator */}
                        {!target.isAlive && (
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-red-500 rounded px-1.5 py-0.5">
                                <span className="text-[8px] font-bold text-red-400 tracking-wider">DOWN</span>
                            </div>
                        )}
                    </div>
                    <div className={`mt-2 font-mono text-sm relative z-50 ${isBeingScanned ? 'text-red-300 font-bold drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]' : 'text-red-400'}`}>{target.ip}</div>
                </div>
            );
        });
    };

    return (
        <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
            {/* Floating HUD - Manual Mode Notification */}
            {manualMode && queueCount > 0 && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="relative backdrop-blur-md bg-cyan-500/10 border border-cyan-400/30 rounded-lg px-5 py-2.5 shadow-[0_8px_32px_0_rgba(0,229,255,0.2)] animate-pulse-slow">
                        {/* Subtle Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-cyan-400/10 to-cyan-500/5 rounded-lg blur-sm"></div>

                        {/* Content */}
                        <div className="relative flex items-center gap-2.5 text-cyan-300">
                            {/* System Prompt Icon */}
                            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>

                            {/* Stylized SPACE Key */}
                            <div className="relative">
                                <div className="px-3 py-1 bg-gradient-to-b from-cyan-400/20 to-cyan-500/30 border border-cyan-400/40 rounded shadow-[0_2px_8px_rgba(0,229,255,0.2)] font-mono text-xs font-bold text-cyan-100">
                                    SPACE
                                </div>
                                {/* Key Depression Shadow */}
                                <div className="absolute inset-0 bg-cyan-500/5 rounded translate-y-0.5 -z-10"></div>
                            </div>

                            {/* Text */}
                            <span className="text-xs font-mono font-medium">
                                Send Next
                            </span>

                            {/* Queue Badge */}
                            <div className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-400/30 rounded-full">
                                <span className="text-xs font-bold text-cyan-200">{queueCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Connection Lines - SVG Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                {(targets.length > 0 ? targets : [{ ip: '192.168.1.1', isAlive: true }]).map((target, i) => {
                    const displayTargets = targets.length > 0 ? targets : [{ ip: '192.168.1.1', isAlive: true }];
                    const count = displayTargets.length;

                    let targetX, targetY, operatorX, operatorY;
                    if (count === 1) {
                        // Single target: original position
                        targetX = 90;
                        targetY = 50;
                        operatorX = 10;
                        operatorY = 50;
                    } else {
                        // Multiple targets: circular/star layout
                        const centerX = 50;
                        const centerY = 50;
                        const radius = 30;
                        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
                        targetX = centerX + radius * Math.cos(angle);
                        targetY = centerY + radius * Math.sin(angle);
                        operatorX = 50;
                        operatorY = 50;
                    }

                    return (
                        <line
                            key={`line-${i}`}
                            x1={`${operatorX}%`}
                            y1={`${operatorY}%`}
                            x2={`${targetX}%`}
                            y2={`${targetY}%`}
                            stroke="#374151"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            opacity="0.3"
                        />
                    );
                })}
            </svg>

            {/* Attacker Node */}
            <AttackerNode centered={targets.length > 1} />

            {/* Target Nodes */}
            {renderTargets()}

            <AnimatePresence>
                {activePackets.map((pkt) => (
                    <PacketVisual
                        key={pkt.visualId}
                        packet={pkt}
                        targets={targets}
                        onComplete={() => removePacket(pkt.visualId, pkt)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default NetworkMap;
