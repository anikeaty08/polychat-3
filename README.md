# Polygon Chat Application

A fully functional **WhatsApp-like** decentralized chat application built on **Polygon Amoy testnet** with **Lighthouse** for decentralized storage. Features real-time messaging, voice/video calls, user profiles, and blockchain-based identity management.

## 🚀 Current Features

### Core Messaging
- ✅ **Real-time Chat** - Instant messaging with Socket.io
- ✅ **Message Persistence** - Messages stored on Lighthouse/IPFS with on-chain pointers
- ✅ **Read Receipts** - Double blue tick indicators when messages are read
- ✅ **Unread Counts** - Badge indicators showing unread message counts
- ✅ **Message History** - Load previous conversations from blockchain
- ✅ **Auto-contact Discovery** - Contacts automatically added when receiving messages/calls

### User Management
- ✅ **Profile Creation** - Create unique username, display name, bio, and avatar
- ✅ **Profile Updates** - Update avatar, bio, display name, and username anytime
- ✅ **Username Search** - Find users by username or wallet address
- ✅ **Block/Unblock** - Block unwanted users from messaging you
- ✅ **Profile Pictures** - Upload and store avatars on Lighthouse/IPFS

### Communication
- ✅ **Voice Calls** - WebRTC-based peer-to-peer voice calling
- ✅ **Video Calls** - WebRTC-based peer-to-peer video calling with camera/mic controls
- ✅ **Call Controls** - Toggle video, mute audio, and hang up
- ✅ **Real-time Signaling** - Socket.io for call setup and signaling

### User Experience
- ✅ **Modern UI/UX** - Beautiful, responsive design with dark theme
- ✅ **Contact List** - Sorted by most recent activity
- ✅ **Last Message Preview** - See last message in contact list
- ✅ **Auto-scroll** - Smooth message viewing experience
- ✅ **Persistent Storage** - Contacts saved in localStorage
- ✅ **Session Persistence** - Previous chats available after logout/login

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **MetaMask** wallet with Polygon Amoy testnet configured
- **Amoy testnet MATIC** - Get from [Polygon Faucet](https://faucet.polygon.technology/)
- **Lighthouse API key** - Get from [Lighthouse Storage](https://lighthouse.storage/)
- **Alchemy/Infura account** - For Polygon Amoy RPC endpoint

## 🔧 Setup Instructions

### 1. Clone and Install

```bash
# Install contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../web
npm install

# Install realtime server dependencies
cd ../realtime-server
npm install
```

### 2. Environment Variables

Create a `.env` file in the **root** directory:

```env
# Blockchain / Hardhat
AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_AMOY_KEY
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY

# Storage Providers
LIGHTHOUSE_API_KEY=YOUR_LIGHTHOUSE_KEY
```

Create a `.env` file in the **web** directory:

```env
# Frontend Runtime
NEXT_PUBLIC_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_AMOY_KEY
NEXT_PUBLIC_CHAT_REGISTRY_ADDRESS=0x32593a5A622baC68B58A19315A55eF9e785C9F0E
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_LIGHTHOUSE_GATEWAY=https://gateway.lighthouse.storage/ipfs
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo
LIGHTHOUSE_API_KEY=YOUR_LIGHTHOUSE_KEY
```

**⚠️ IMPORTANT:** 
- Replace all `YOUR_*` placeholders with actual values
- The contract is already deployed at `0x32593a5A622baC68B58A19315A55eF9e785C9F0E`
- See [ENV_SETUP.md](./ENV_SETUP.md) for detailed API key setup instructions

### 3. Start the Application

**Terminal 1 - Realtime Server:**
```bash
cd realtime-server
npm run dev
```
Server runs on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd web
npm run dev
```
App runs on `http://localhost:3000`

## 🎯 How to Use

### Connect Wallet
1. Open `http://localhost:3000` in your browser
2. Click **"Connect Wallet"** button
3. Approve the connection in MetaMask
4. Ensure MetaMask is connected to **Polygon Amoy** testnet

### Create Profile
"""
# Polygon Chat Application

A decentralized, WhatsApp-like chat application using Polygon (Amoy testnet) for identity and pointer storage, and Lighthouse/IPFS for message/media storage. It includes a Next.js frontend (`web`), smart contracts (`contracts`), and a Socket.io realtime server (`realtime-server`).

## Table of contents
- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quickstart](#quickstart)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features
- Real-time chat (Socket.io)
- Message persistence via Lighthouse/IPFS with on-chain pointers
- Read receipts, unread counts, and message history
- Profile creation/updates stored on-chain
- Peer-to-peer voice/video calls (WebRTC)

## Tech stack
- Blockchain: Solidity, Hardhat, Polygon Amoy (testnet)
- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Real-time: Socket.io, WebRTC (simple-peer)
- Storage: Lighthouse / IPFS

## Prerequisites
- Node.js 18+ and npm
- MetaMask (or another Web3 wallet) pointed to Polygon Amoy
- Amoy testnet MATIC (Polygon faucet)

## Quickstart
1. Install dependencies:

```powershell
cd contracts
npm ci
cd ../web
npm ci
cd ../realtime-server
npm ci
cd ..
```

2. Create and fill `.env` files (see next section).

3. Start services (three terminals recommended):

Terminal 1 — Realtime server:
```powershell
cd realtime-server
npm run dev
```

Terminal 2 — Frontend:
```powershell
cd web
npm run dev
```

Terminal 3 — (optional) Contracts / testing:
```powershell
cd contracts
npx hardhat node   # local node if needed
```

The frontend runs by default at `http://localhost:3000` and the realtime server at `http://localhost:3001`.

## Environment variables

Add a `.env` in the repository root for contract/deploy keys and a `.env` inside `/web` for frontend runtime vars. Example keys:

Root `.env` (contracts):

```env
AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_AMOY_KEY
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

`web/.env` (frontend):

```env
NEXT_PUBLIC_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_AMOY_KEY
NEXT_PUBLIC_CHAT_REGISTRY_ADDRESS=0x32593a5A622baC68B58A19315A55eF9e785C9F0E
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
LIGHTHOUSE_API_KEY=YOUR_LIGHTHOUSE_KEY
```

Replace placeholders with real values. Do not commit secrets.

## Running tests

Contracts:

```powershell
cd contracts
npx hardhat test
```

Frontend:

```powershell
cd web
npm test
```

## Project structure

```
polygon/
├─ contracts/           # Smart contracts (Hardhat)
├─ web/                 # Next.js frontend
├─ realtime-server/     # Socket.io server
├─ .github/             # CI workflows
├─ LICENSE
└─ README.md
```

For full file layout see the repository tree in this workspace.

## Contributing
Please read `CONTRIBUTING.md` for guidelines. Open issues or pull requests on GitHub.

## License
This project is licensed under the MIT License — see the `LICENSE` file for details.

---

If you'd like, I can also add badges (build/status, license) or a short demo GIF.
"""
