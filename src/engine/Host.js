export class Host {
  constructor(ip, type = 'target', os = 'Linux 5.4') {
    this.ip = ip;
    this.type = type; // 'attacker' or 'target'
    this.os = os; // 'Windows 10', 'Linux 5.4', etc.
    this.ports = {}; // { 80: { state: 'open', service: 'http', version: 'Apache 2.4.41' }, ... }
    this.firewallEnabled = false; // Firewall toggle
    this.lastPacketTime = 0; // Track last packet arrival for rate limiting
    this.blockedCount = 0; // Track blocked packets
    this.isAlive = true; // Host status (true = responding, false = dead/down)
    this.inbox = [];
  }

  addPort(port, state = 'closed', service = 'unknown') {
    this.ports[port] = { state, service };
  }

  receivePacket(packet) {
    this.inbox.push(packet);
  }

  // Basic firewall logic could go here
  processPacket(packet) {
    // Return a response packet or null
    // This will be overridden or handled by the Simulation Engine
    return null;
  }
}
