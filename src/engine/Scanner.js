import { Packet } from './Packet';

export class Scanner {
  constructor(attackerIP, scheduler, timing = 1000) {
    this.attackerIP = attackerIP;
    this.scheduler = scheduler;
    this.timing = timing; // Delay between packets in ms
  }

  // Updated to accept targetIP (single) or we handle loops outside
  // Actually, let's keep it simple: scanTarget(targetIP, ports, type)
  
  scanTarget(targetIP, ports, type = 'SYN') {
    ports.forEach((port, index) => {
      this.scheduler.addEvent(index * this.timing, () => {
        const flags = type === 'UDP' ? ['UDP'] : [type];
        const packet = new Packet(
          { ip: this.attackerIP, port: 55000 + index, type: 'attacker' },
          { ip: targetIP, port: port },
          flags,
          null, // payload
          { timing: this.timing } // metadata
        );
        this.emitPacket(packet);
      });
    });
  }

  connectScan(targetIP, ports) {
      // Connect scan completes full TCP handshake: SYN -> SYN/ACK -> ACK
      ports.forEach((port, index) => {
        this.scheduler.addEvent(index * this.timing, () => {
          const packet = new Packet(
            { ip: this.attackerIP, port: 55000 + index, type: 'attacker' },
            { ip: targetIP, port: port },
            ['SYN'],
            'CONNECT', // Mark as connect scan
            { timing: this.timing }
          );
          this.emitPacket(packet);
        });
      });
  }

  udpScan(targetIP, ports) {
      this.scanTarget(targetIP, ports, 'UDP');
  }

  versionScan(targetIP, ports) {
      // Send Service Probe to ports
      // Visual shorthand: specific payload
      ports.forEach((port, index) => {
        this.scheduler.addEvent(index * this.timing, () => {
          const packet = new Packet(
            { ip: this.attackerIP, port: 56000 + index, type: 'attacker' },
            { ip: targetIP, port: port },
            ['ACK'], // Often sends data in ACK packet after handshake
            'ServiceProbe',
            { timing: this.timing }
          );
          this.emitPacket(packet);
        });
      });
  }

  osScan(targetIP) {
      this.scheduler.addEvent(0, () => {
         const packet = new Packet(
            { ip: this.attackerIP, port: 40000, type: 'attacker' },
            { ip: targetIP, port: 80 }, // Target open port usually
            ['FIN', 'URG', 'PSH'], // Weird flags
            'OSProbe',
            { timing: this.timing }
         );
         this.emitPacket(packet);
      });
  }

  pingScan(targetIP) {
     this.scheduler.addEvent(0, () => {
        // TCP ACK ping (port 80) + ICMP echo (simulated)
        // For visual simplicity, let's send a fake "PING" flag packet or just ICMP?
        // Let's use a "ICMP" type packet if we can, or just flags=['ECHO']
        const packet = new Packet(
          { ip: this.attackerIP, port: 0, type: 'attacker' },
          { ip: targetIP, port: 0 }, // 0 for ICMP
          ['ECHO'], // Representing ICMP Echo Request
          null,
          { timing: this.timing }
        );
        this.emitPacket(packet);
     });
  }

  emitPacket(packet) {
    if (this.onPacketSend) {
      this.onPacketSend(packet);
    }
  }
}
