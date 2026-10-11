/**
 * ZTNA WireGuard Controller Data Types
 */

export type PeerRole = 'gateway' | 'server' | 'client' | 'admin';
export type PeerStatus = 'online' | 'offline' | 'pending';

export interface Peer {
  id: string;
  name: string;
  publicKey: string;
  internalIp: string;
  endpoint: string | null;
  listenPort: number;
  role: PeerRole;
  status: PeerStatus;
  allowedIps: string[];
  lastHandshakeAt: string | null;
  rxBytes: number;
  txBytes: number;
  authToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface PeerMeshEntry {
  id: string;
  name: string;
  publicKey: string;
  endpoint: string | null;
  allowedIps: string[];
  persistentKeepalive: number;
}

export interface DynamicTopology {
  peer: {
    id: string;
    name: string;
    internalIp: string;
    listenPort: number;
    allowedIps: string[];
  };
  network: {
    cidr: string;
    dns: string[];
    gatewayIp: string;
  };
  meshPeers: PeerMeshEntry[];
  generatedAt: string;
}

export interface HeartbeatPayload {
  lastHandshakeAt?: string;
  rxBytes?: number;
  txBytes?: number;
  endpoint?: string;
}
