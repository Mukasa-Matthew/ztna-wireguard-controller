import { peerStore } from '../models/store.js';

export const NETWORK_CIDR = '10.42.0.0/16';
export const NETWORK_DNS = ['10.42.0.1', '1.1.1.1'];
export const GATEWAY_IP = '10.42.0.1';

/**
 * IPAM (IP Address Management) Service
 * Allocates deterministic, conflict-free internal IP addresses within 10.42.0.0/16.
 */
export class IpamService {
  /**
   * Allocates the next available IP address in the overlay subnet.
   */
  static async allocateIp(): Promise<string> {
    const peers = await peerStore.getAll();
    const allocatedIps = new Set(peers.map((p) => p.internalIp));

    // Gateway is reserved at 10.42.0.1
    allocatedIps.add(GATEWAY_IP);

    // Subnet allocation scan: 10.42.0.2 -> 10.42.254.254
    for (let thirdOctet = 0; thirdOctet < 255; thirdOctet++) {
      for (let fourthOctet = 2; fourthOctet < 255; fourthOctet++) {
        const candidateIp = `10.42.${thirdOctet}.${fourthOctet}`;
        if (!allocatedIps.has(candidateIp)) {
          return candidateIp;
        }
      }
    }

    throw new Error('IPAM address pool exhausted: No available IP in 10.42.0.0/16');
  }

  /**
   * Validates if an IP address belongs to the overlay CIDR.
   */
  static isOverlayIp(ip: string): boolean {
    return ip.startsWith('10.42.');
  }
}
