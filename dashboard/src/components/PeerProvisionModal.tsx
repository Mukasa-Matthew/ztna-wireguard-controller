import React, { useState } from 'react';
import { X, Key, Shield, CheckCircle2 } from 'lucide-react';
import { Peer } from '../types';

interface PeerProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPeer: Peer) => void;
}

export const PeerProvisionModal: React.FC<PeerProvisionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'client' | 'server' | 'gateway'>('client');
  const [publicKey, setPublicKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPeer, setCreatedPeer] = useState<Peer | null>(null);

  if (!isOpen) return null;

  const handleGenerateMockKey = () => {
    // Generate simulated 32-byte base64 Curve25519 public key
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    let binary = '';
    array.forEach((b) => (binary += String.fromCharCode(b)));
    setPublicKey(btoa(binary));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/peers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          publicKey,
          endpoint: endpoint.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register peer');
      }

      setCreatedPeer(data.peer);
      onSuccess(data.peer);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName('');
    setPublicKey('');
    setEndpoint('');
    setCreatedPeer(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Provision Zero-Trust Peer</h3>
          </div>
          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdPeer ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start space-x-3 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">Node Successfully Provisioned!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Assigned Internal Overlay IP: <strong className="font-mono text-emerald-400">{createdPeer.internalIp}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-slate-400">Node Identifier</label>
              <div className="p-2 bg-slate-800 rounded font-mono text-slate-200">{createdPeer.id}</div>

              <label className="text-slate-400">Node Auth Token (Save for Daemon)</label>
              <div className="p-2 bg-slate-800 rounded font-mono text-amber-300 break-all select-all">
                {(createdPeer as any).authToken || 'Token saved in database'}
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Node Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. prod-db-replica-01, dev-laptop"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Role & Policy</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="client">Client (Mesh End-User / Worker)</option>
                <option value="server">Server (Protected Service)</option>
                <option value="gateway">Gateway (Subnet Router)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">WireGuard Public Key</label>
                <button
                  type="button"
                  onClick={handleGenerateMockKey}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                >
                  <Key className="w-3 h-3" />
                  <span>Generate Key</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Base64 32-byte public key (e.g. wg pubkey)"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Public Endpoint (Optional)
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="e.g. 203.0.113.50:51820 (Leave empty if behind NAT)"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? 'Provisioning...' : 'Provision Node'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
