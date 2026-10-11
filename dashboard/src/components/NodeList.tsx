import React from 'react';
import { Peer } from '../types';
import { Server, Laptop, Shield, Trash2, ArrowDownUp, Download } from 'lucide-react';

interface NodeListProps {
  peers: Peer[];
  onDelete: (id: string) => void;
  onDownloadConfig: (id: string) => void;
}

export const NodeList: React.FC<NodeListProps> = ({ peers, onDelete, onDownloadConfig }) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatHandshake = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Registered WireGuard Mesh Peers</h2>
          <p className="text-xs text-slate-400">Dynamic routing nodes and cryptographic identity ledger</p>
        </div>
        <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-md font-mono">
          Total: {peers.length} Nodes
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
              <th className="py-3 px-6">Node & Role</th>
              <th className="py-3 px-6">Overlay IP</th>
              <th className="py-3 px-6">Public Key</th>
              <th className="py-3 px-6">Endpoint</th>
              <th className="py-3 px-6">Handshake</th>
              <th className="py-3 px-6">Traffic (RX / TX)</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {peers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No mesh peers registered. Click &quot;Provision Node&quot; to register your first peer.
                </td>
              </tr>
            ) : (
              peers.map((peer) => {
                const isOnline = peer.status === 'online';

                return (
                  <tr key={peer.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-6 flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300">
                        {peer.role === 'gateway' ? (
                          <Shield className="w-4 h-4 text-amber-400" />
                        ) : peer.role === 'server' ? (
                          <Server className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Laptop className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center space-x-2">
                          <span>{peer.name}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <div className="text-xs text-slate-400 capitalize">{peer.role}</div>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono text-emerald-400 text-xs font-semibold">
                      {peer.internalIp}
                    </td>

                    <td className="py-4 px-6 font-mono text-xs text-slate-400" title={peer.publicKey}>
                      {peer.publicKey.slice(0, 10)}...{peer.publicKey.slice(-6)}
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-300">
                      {peer.endpoint ? (
                        <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                          {peer.endpoint}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Behind NAT / Internal</span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-xs">
                      <span className={isOnline ? 'text-slate-300' : 'text-slate-500'}>
                        {formatHandshake(peer.lastHandshakeAt)}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-300">
                      <div className="flex items-center space-x-1.5 font-mono">
                        <ArrowDownUp className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatBytes(peer.rxBytes)}</span>
                        <span className="text-slate-600">/</span>
                        <span>{formatBytes(peer.txBytes)}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => onDownloadConfig(peer.id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                        title="Download wg0.conf"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {peer.role !== 'gateway' && (
                        <button
                          onClick={() => onDelete(peer.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/20 transition"
                          title="Revoke Peer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
