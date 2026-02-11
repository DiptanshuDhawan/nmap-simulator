import { Packet } from './Packet';

export function handleNetwork(host, packet) {
  // FIREWALL LOGIC
  if (host.firewallEnabled && packet.source.type === 'attacker') {
     const now = Date.now();
     const timeSinceLastPacket = now - (host.lastPacketTime || 0);
     
     // 1500ms Threshold for Rate Limiting
     // If packet arrives too fast, BLOCK IT
     if (timeSinceLastPacket < 1500 && host.lastPacketTime !== 0) {
         host.lastPacketTime = now;
         host.blockedCount = (host.blockedCount || 0) + 1;
         
         // Return specialized BLOCKED response
         return {
             source: host,
             destination: packet.source,
             flags: ['BLOCKED'],
             blocked: true,
             timestamp: now
         };
     }
     host.lastPacketTime = now;
  }
  
  const { destination, source, flags, payload } = packet;
  const port = destination.port;
  
  // ICMP Handling (Ping) - Check if host is alive
  if (flags.includes('ECHO')) {
      // Dead hosts don't respond to pings
      if (!host.isAlive) {
          return null; // No response = host is down
      }
      return new Packet(destination, source, ['REPLY']);
  }

  // If no port logic defined, assume closed
  // specific behavior depends on protocol
  const portInfo = host.ports[port];
  const portState = portInfo ? portInfo.state : 'closed';

  // --- UDP SCAN Logic (-sU) ---
  // If packet has NO flags (common for UDP) or specific UDP-like structure
  // For sim, let's say flags=['UDP']
  if (flags.includes('UDP')) {
      if (portState === 'open') {
          // Open UDP ports often don't respond (open|filtered)
          // OR they respond with data if payload matched service
          if (payload) return new Packet(destination, source, ['UDP'], 'Data');
          return null; // No response = Open|Filtered
      } else if (portState === 'closed') {
          // Closed UDP ports send ICMP Port Unreachable
          return new Packet(destination, source, ['ICMP_UNREACH']); // Visual simplification
      } else {
          return null; // Filtered
      }
  }

  // --- Service Detection (-sV) ---
  if (payload === 'ServiceProbe') {
      // If port is open, return banner
      if (portState === 'open') {
          // Default mock banners
          let banner = 'Unknown Service';
          if (port === 80) banner = 'Apache/2.4.52 (Ubuntu)';
          else if (port === 22) banner = 'OpenSSH 8.9p1';
          else if (port === 443) banner = 'nginx/1.18.0';
          else if (port === 53) banner = 'BIND 9.18.1';
          else if (port === 3000) banner = 'Node.js Express';
          
          return new Packet(destination, source, ['ACK', 'PSH'], banner);
      }
      return null;
  }

  // --- OS Detection (-O) ---
  // Bogus TCP flags signature check
  if (flags.includes('FIN') && flags.includes('URG') && flags.includes('PSH')) {
      // "Xmas" tree packet or OS probe
      // Linux often ignores, Windows might respond differently.
      // For sim, let's just reply with an "OS_REPLY"
      return new Packet(destination, source, ['RST', 'ACK'], `Fingerprint: ${host.os}`);
  }

  // --- TCP SCAN Logic (-sS, -sT) ---
  if (flags.includes('SYN')) {
    if (portState === 'open') {
      return new Packet(destination, source, ['SYN', 'ACK']);
    } else if (portState === 'closed') {
      return new Packet(destination, source, ['RST', 'ACK']);
    } else if (portState === 'filtered') {
      return null; // Drop packet
    }
  }

  // TCP Connect Scan Completion (ACK step)
  // If attacker sends ACK (last step of handshake), target might send data or nothing
  if (flags.includes('ACK') && !flags.includes('SYN') && !flags.includes('RST')) {
      // Connection established logic would go here
      return null;
  }
  
  // Generic RST for others?
  return null;
}
