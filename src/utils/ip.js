export const parseCIDR = (cidr) => {
  const [ip, mask] = cidr.split('/');
  if (!mask) return [ip]; // Single IP

  const ipParts = ip.split('.').map(Number);
  const maskBits = Number(mask);
  
  // Simple /24 logic for now (mocking complex subnetting)
  if (maskBits === 24) {
    const subnet = ipParts.slice(0, 3).join('.');
    const hosts = [];
    // Generate some hosts, not all 255 to keep DOM light
    // We'll deterministically pick some "interesting" ones
    const interesting = [1, 10, 20, 50, 100, 254]; 
    interesting.forEach(i => hosts.push(`${subnet}.${i}`));
    return hosts;
  }
  
  return [ip];
};

export const ipToInt = (ip) => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
};
