# Zero-Trust Network Access (ZTNA) & WireGuard Mesh Controller

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![WireGuard](https://img.shields.io/badge/WireGuard-Fast%20%26%20Secure-red.svg)](https://www.wireguard.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.11-yellow.svg)](https://www.python.org/)

A production-grade, open-source Zero-Trust Network Access (ZTNA) and dynamic WireGuard mesh overlay controller. Provides centralized cryptographic identity management, automated IPAM address allocation, dynamic mesh topology calculation, node daemon synchronization, and a modern web dashboard.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph ControlPlaneLayer ["Control Plane (control-plane/)"]
        API["Express REST API\n(Port 8000)"]
        IPAM["Dynamic IPAM Service\n(Subnet: 10.42.0.0/16)"]
        Topology["Topology & Mesh Engine"]
        Ledger[("Persistent Peer Ledger\n(JSON Store)")]
    end

    subgraph AdminLayer ["Admin Interface (dashboard/)"]
        WebUI["React + Tailwind Dashboard\n(Port 5173)"]
    end

    subgraph MeshNodes ["WireGuard Mesh Nodes (agent/)"]
        NodeA["Node Alpha\n(10.42.0.2)"]
        NodeB["Node Beta\n(10.42.0.3)"]
        GatewayNode["Central Gateway\n(10.42.0.1)"]
    end

    WebUI <-->|Manage Peers / Telemetry| API
    API <--> IPAM
    API <--> Topology
    API <--> Ledger

    NodeA -->|1. Register & Poll Topology| API
    NodeB -->|1. Register & Poll Topology| API
    NodeA -->|2. Heartbeat & Metrics| API
    NodeB -->|2. Heartbeat & Metrics| API

    NodeA <===>|Encrypted WireGuard Mesh (UDP 51820)| NodeB
    NodeA <===>|Subnet Routing| GatewayNode
    NodeB <===>|Subnet Routing| GatewayNode
```

### Core Zero-Trust Pillars

1. **Cryptographic Identity Verification**:
   - Access to the overlay network is governed by Curve25519 WireGuard public/private key pairs. Nodes cannot route traffic without registered public keys.
2. **Automated Overlay IPAM**:
   - Central controller allocates deterministic `/32` addresses within the private overlay subnet (`10.42.0.0/16`), eliminating manual IP address collisions.
3. **Dynamic Topology Convergence**:
   - Node agents continuously poll the control plane to learn about new peers, roaming endpoint IP changes, and updated routing boundaries without manual configuration reloads.
4. **NAT Traversal & Keepalives**:
   - Nodes behind symmetric NAT or stateful firewalls use persistent keepalives (`25s`) and route through reachable mesh gateways.

---

## Monorepo Directory Structure

```text
ztna-wireguard-controller/
├── README.md                      # Architecture guide and runbooks
├── .gitignore                     # Monorepo git exclusion rules
├── control-plane/                 # Backend API & Topology Engine (Node.js/TypeScript)
│   ├── package.json               # Express, Helmet, CORS dependencies
│   ├── tsconfig.json              # TypeScript compilation settings
│   └── src/
│       ├── server.ts              # Express initialization & listener
│       ├── models/
│       │   ├── types.ts           # Peer & Topology interfaces
│       │   └── store.ts           # File-backed persistence store
│       ├── routes/
│       │   ├── auth.routes.ts     # Token authentication middleware
│       │   ├── peers.routes.ts    # Node registration & CRUD
│       │   └── topology.routes.ts # Dynamic WireGuard configuration endpoints
│       └── services/
│           ├── ipam.service.ts    # Subnet IP allocation engine
│           └── topology.service.ts# Mesh topology generator & wg0.conf builder
├── agent/                         # WireGuard Node Daemon (Python)
│   ├── daemon.py                  # Polling, wg interface config & heartbeat loop
│   ├── config.yaml                # Daemon configuration parameters
│   └── requirements.txt           # Python dependencies (requests, pyyaml)
├── dashboard/                     # Web Admin Dashboard (React / Tailwind CSS)
│   ├── package.json               # React, Lucide, Tailwind dependencies
│   ├── vite.config.ts             # Vite dev server with API proxy
│   └── src/
│       ├── App.tsx                # Dashboard root with live polling
│       └── components/
│           ├── Navbar.tsx         # Header with mesh stats
│           ├── NodeList.tsx       # Peer table with traffic and handshake
│           ├── PeerProvisionModal.tsx # Manual node provisioning dialog
│           └── TopologyVisualizer.tsx # Network subnet telemetry cards
└── deploy/                        # Orchestration & Containerization
    ├── docker-compose.yml         # Full-stack composition (API, UI, 2 Test Nodes)
    ├── Dockerfile.control-plane   # Multi-stage Node.js build
    ├── Dockerfile.dashboard       # Multi-stage React build
    └── Dockerfile.agent           # Alpine container with WireGuard tools
```

---

## Quickstart

### Method 1: Run Full Stack via Docker Compose (Recommended)

To spin up the Control Plane, Web Dashboard, and two test node agents in a self-contained environment:

```bash
cd deploy
docker compose up --build
```

- **Web Dashboard**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Control Plane API**: Accessible at [http://localhost:8000](http://localhost:8000).
- **Test Agents**: `ztna-node-alpha` and `ztna-node-beta` will automatically register, receive internal IPs (`10.42.0.2`, `10.42.0.3`), and start heartbeat reporting.

---

### Method 2: Local Development Workflow

#### 1. Start the Control Plane API

```bash
cd control-plane
npm install
npm run dev
```

The control plane starts on `http://localhost:8000` and automatically seeds an initial mesh gateway node.

#### 2. Start the Admin Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Visit `http://localhost:5173` to view the live dashboard and provision peers.

#### 3. Run a Local Node Agent Daemon

In a separate terminal:

```bash
cd agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run in dry-run mode (does not require root/kernel WireGuard)
python3 daemon.py --config config.yaml
```

---

## REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | Service liveness probe |
| `/api/v1/peers` | `GET` | List all registered mesh peers |
| `/api/v1/peers/register` | `POST` | Register a new peer (assigns internal IP) |
| `/api/v1/peers/:id` | `GET` | Get peer details |
| `/api/v1/peers/:id` | `DELETE` | Revoke and remove peer from mesh |
| `/api/v1/peers/:id/heartbeat`| `POST` | Report handshake and RX/TX traffic |
| `/api/v1/topology/:id` | `GET` | Get dynamic mesh topology JSON |
| `/api/v1/topology/:id/config`| `GET` | Download generated `wg0.conf` file |
