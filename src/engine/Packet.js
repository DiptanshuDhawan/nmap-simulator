export class Packet {
  constructor(source, destination, flags = [], payload = null, metadata = {}) {
    this.source = source;
    this.destination = destination;
    this.flags = flags; // ['SYN', 'ACK', 'RST', 'FIN']
    this.payload = payload;
    this.metadata = metadata; // { timing: 1000, type: 'SYN' }
    this.timestamp = Date.now();
  }

  toString() {
    return `${this.source.ip}:${this.source.port} -> ${this.destination.ip}:${this.destination.port} [${this.flags.join(',')}]`;
  }
}
