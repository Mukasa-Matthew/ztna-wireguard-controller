export interface Peer {
  id: string;
  name: string;
  publicKey: string;
  internalIp: string;
  endpoint: string | null;
  listenPort: number;
  role: 'gateway' | 'server' | 'client' | 'admin';
  status: 'online' | 'offline' | 'pending';
  allowedIps: string[];
  lastHandshakeAt: string | null;
  rxBytes: number;
  txBytes: number;
  createdAt: string;
  updatedAt: string;
}
