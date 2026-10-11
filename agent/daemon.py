#!/usr/bin/env python3
"""
agent/daemon.py
Zero-Trust Network Access (ZTNA) WireGuard Node Agent Daemon.
Polls the Control Plane API, synchronizes dynamic peer mesh state,
and configures the local WireGuard network interface.
"""

import os
import sys
import time
import json
import signal
import subprocess
import argparse
import base64
import requests
import yaml
from typing import Dict, Any, Optional


class WireGuardNodeDaemon:
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.running = True
        self.peer_id: Optional[str] = None
        self.auth_token: Optional[str] = None
        self.private_key: Optional[str] = None
        self.public_key: Optional[str] = None
        self.internal_ip: Optional[str] = None

        # Setup signals
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

    def _load_config(self, path: str) -> Dict[str, Any]:
        defaults = {
            "control_plane_url": os.getenv("CONTROL_PLANE_URL", "http://localhost:8000"),
            "poll_interval": int(os.getenv("POLL_INTERVAL", 10)),
            "interface": os.getenv("WG_INTERFACE", "wg0"),
            "node_name": os.getenv("NODE_NAME", f"node-{os.uname().nodename}"),
            "listen_port": int(os.getenv("LISTEN_PORT", 51820)),
            "endpoint": os.getenv("ENDPOINT", None),
            "state_file": "./node_state.json",
            "key_dir": "./keys",
            "dry_run": os.getenv("DRY_RUN", "true").lower() in ("true", "1"),
        }

        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    file_conf = yaml.safe_load(f) or {}
                    defaults.update(file_conf)
            except Exception as e:
                print(f"[Warn] Failed to read {path}: {e}")

        return defaults

    def _handle_signal(self, signum, frame):
        print(f"\n[Agent] Received signal {signum}. Shutting down cleanly...")
        self.running = False

    def setup_keys(self):
        """Generates or loads existing WireGuard keys."""
        key_dir = self.config["key_dir"]
        os.makedirs(key_dir, exist_ok=True)

        priv_path = os.path.join(key_dir, "private.key")
        pub_path = os.path.join(key_dir, "public.key")

        if os.path.exists(priv_path) and os.path.exists(pub_path):
            with open(priv_path, "r") as f:
                self.private_key = f.read().strip()
            with open(pub_path, "r") as f:
                self.public_key = f.read().strip()
            print(f"[Agent] Loaded existing keys (PublicKey: {self.public_key[:12]}...)")
            return

        # Attempt native wg command, otherwise generate standard Curve25519-compatible mock key
        try:
            priv = subprocess.check_output(["wg", "genkey"], text=True).strip()
            proc = subprocess.Popen(["wg", "pubkey"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
            pub, _ = proc.communicate(input=priv)
            pub = pub.strip()
        except (FileNotFoundError, subprocess.SubprocessError):
            print("[Agent] 'wg' utility not found. Generating simulated cryptographic keypair...")
            raw = os.urandom(32)
            priv = base64.b64encode(raw).decode("utf-8")
            pub = base64.b64encode(os.urandom(32)).decode("utf-8")

        self.private_key = priv
        self.public_key = pub

        with open(priv_path, "w") as f:
            f.write(priv)
        with open(pub_path, "w") as f:
            f.write(pub)

        print(f"[Agent] Generated fresh WireGuard keypair (PublicKey: {self.public_key[:12]}...)")

    def register_node(self):
        """Registers node with Control Plane API if not already registered."""
        state_file = self.config["state_file"]
        if os.path.exists(state_file):
            try:
                with open(state_file, "r") as f:
                    data = json.load(f)
                    self.peer_id = data.get("peer_id")
                    self.auth_token = data.get("auth_token")
                    self.internal_ip = data.get("internal_ip")
                    print(f"[Agent] Restored state from {state_file} (Peer ID: {self.peer_id}, IP: {self.internal_ip})")
                    return
            except Exception as e:
                print(f"[Warn] Could not parse state file: {e}")

        # Register via Control Plane REST endpoint
        url = f"{self.config['control_plane_url'].rstrip('/')}/api/v1/peers/register"
        payload = {
            "name": self.config["node_name"],
            "publicKey": self.public_key,
            "listenPort": self.config["listen_port"],
            "endpoint": self.config.get("endpoint"),
            "role": "client",
        }

        print(f"[Agent] Registering node with Control Plane at {url}...")
        try:
            resp = requests.post(url, json=payload, timeout=10)
            if resp.status_code in (200, 201):
                data = resp.json()["peer"]
                self.peer_id = data["id"]
                self.auth_token = data["authToken"]
                self.internal_ip = data["internalIp"]

                with open(state_file, "w") as f:
                    json.dump({
                        "peer_id": self.peer_id,
                        "auth_token": self.auth_token,
                        "internal_ip": self.internal_ip,
                        "public_key": self.public_key,
                    }, f, indent=2)

                print(f"[Agent] Node registered successfully! Assigned overlay IP: {self.internal_ip}")
            elif resp.status_code == 409:
                # Key conflict / already registered
                print("[Agent] Node already registered on Control Plane. Fetching ID...")
                self.peer_id = resp.json().get("peerId")
            else:
                print(f"[Error] Registration failed ({resp.status_code}): {resp.text}")
        except Exception as e:
            print(f"[Error] Failed to connect to Control Plane: {e}")

    def fetch_topology(self) -> Optional[Dict[str, Any]]:
        """Queries Control Plane for dynamic peer mesh topology."""
        if not self.peer_id:
            return None

        url = f"{self.config['control_plane_url'].rstrip('/')}/api/v1/topology/{self.peer_id}"
        headers = {"x-ztna-token": self.auth_token or ""}

        try:
            resp = requests.get(url, headers=headers, timeout=5)
            if resp.status_code == 200:
                return resp.json().get("topology")
            print(f"[Warn] Topology fetch returned status {resp.status_code}")
        except Exception as e:
            print(f"[Error] Failed to fetch topology: {e}")
        return None

    def apply_interface_configuration(self, topology: Dict[str, Any]):
        """Applies WireGuard configuration changes to local kernel interface."""
        iface = self.config["interface"]
        dry_run = self.config["dry_run"]
        mesh_peers = topology.get("meshPeers", [])

        if dry_run:
            print(f"[Agent: DRY-RUN] Synchronizing WireGuard interface '{iface}' ({self.internal_ip}):")
            print(f"  -> Interface Port : {self.config['listen_port']}")
            print(f"  -> Mesh Peers     : {len(mesh_peers)} peer(s) discovered:")
            for p in mesh_peers:
                print(f"     * Peer {p['name']} ({p['id']}): AllowedIPs={p['allowedIps']}, Endpoint={p['endpoint']}")
            return

        # Real Linux kernel WireGuard interface provisioning
        try:
            # 1. Ensure interface exists
            subprocess.run(["ip", "link", "add", "dev", iface, "type", "wireguard"], check=False, stderr=subprocess.DEVNULL)
            # 2. Set IP and up
            subprocess.run(["ip", "addr", "replace", f"{self.internal_ip}/16", "dev", iface], check=True)
            subprocess.run(["ip", "link", "set", "up", "dev", iface], check=True)

            # 3. Apply peers
            for p in mesh_peers:
                cmd = ["wg", "set", iface, "peer", p["publicKey"], "allowed-ips", ",".join(p["allowedIps"])]
                if p.get("endpoint"):
                    cmd.extend(["endpoint", p["endpoint"]])
                if p.get("persistentKeepalive"):
                    cmd.extend(["persistent-keepalive", str(p["persistentKeepalive"])])
                subprocess.run(cmd, check=True)

            print(f"[Agent] Interface {iface} synchronized with {len(mesh_peers)} mesh peers.")
        except Exception as e:
            print(f"[Error] Failed to apply WireGuard kernel configuration: {e}")

    def send_heartbeat(self):
        """Sends telemetry and health report to Control Plane."""
        if not self.peer_id:
            return

        url = f"{self.config['control_plane_url'].rstrip('/')}/api/v1/peers/{self.peer_id}/heartbeat"
        headers = {"x-ztna-token": self.auth_token or ""}
        payload = {
            "lastHandshakeAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "rxBytes": 20480,
            "txBytes": 40960,
        }

        try:
            requests.post(url, json=payload, headers=headers, timeout=5)
        except Exception as e:
            print(f"[Warn] Heartbeat failed: {e}")

    def run(self):
        print("=" * 65)
        print(" Starting ZTNA WireGuard Node Daemon")
        print(f" Control Plane : {self.config['control_plane_url']}")
        print(f" Node Name     : {self.config['node_name']}")
        print(f" Mode          : {'DRY-RUN / Simulation' if self.config['dry_run'] else 'KERNEL ENFORCEMENT'}")
        print("=" * 65)

        self.setup_keys()
        self.register_node()

        while self.running:
            try:
                topology = self.fetch_topology()
                if topology:
                    self.apply_interface_configuration(topology)
                    self.send_heartbeat()
                time.sleep(self.config["poll_interval"])
            except Exception as e:
                print(f"[Error] Main loop error: {e}")
                time.sleep(5)

        print("[Agent] Node daemon terminated.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ZTNA WireGuard Node Daemon")
    parser.add_argument("-c", "--config", default="config.yaml", help="Path to config.yaml")
    args = parser.parse_args()

    daemon = WireGuardNodeDaemon(config_path=args.config)
    daemon.run()
