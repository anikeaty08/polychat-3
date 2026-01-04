<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Polygon-Amoy-8247E5?style=for-the-badge&logo=polygon&logoColor=white" alt="Polygon" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Supabase-Database-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/IPFS-Storage-65C2CB?style=flat-square&logo=ipfs&logoColor=white" alt="IPFS" />
  <img src="https://img.shields.io/badge/Socket.io-Realtime-010101?style=flat-square&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Hardhat-Contracts-FFF100?style=flat-square&logo=hardhat&logoColor=black" alt="Hardhat" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" alt="PRs" />
  <img src="https://img.shields.io/badge/Status-Active-success?style=flat-square" alt="Status" />
</p>

<h1 align="center">
  💬 PolyChat
</h1>

<p align="center">
  <strong>🔐 Privacy-First Web3 Messaging Platform</strong>
</p>

<p align="center">
  A complete decentralized messaging application built on Polygon with Web3 wallet authentication, end-to-end encryption, IPFS storage, and advanced privacy features.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#screenshots">Screenshots</a>
</p>

---

## ✨ Features

<table>
<tr>
<td>

### 🔒 Privacy & Security
- 🔐 **End-to-End Encryption** - TweetNaCl powered
- 🚫 **No Phone Required** - 100% anonymous
- 👁️ **Privacy Controls** - Hide online status, last seen
- 🛡️ **Incognito Mode** - Browse without traces
- 📱 **Screenshot Blocking** - Prevent screen captures
- 🔑 **Two-Factor Auth** - Extra security layer
- 🗑️ **Disappearing Messages** - Auto-delete support

</td>
<td>

### 💬 Communication
- 📱 **Real-time Messaging** - Socket.io powered
- 📞 **Voice Calls** - Crystal-clear audio
- 🎥 **Video Calls** - HD video support
- 🎤 **Voice Messages** - Quick audio notes
- 📷 **Camera Capture** - One-tap photo sharing
- 😊 **Reactions** - Express with emojis
- 📎 **File Sharing** - Images, videos, documents

</td>
</tr>
<tr>
<td>

### ⛓️ Web3 Integration
- 🦊 **Wallet Auth** - MetaMask, WalletConnect
- 🪙 **Polygon Network** - Fast & cheap transactions
- 📦 **IPFS Storage** - Decentralized file storage
- 📜 **Smart Contracts** - On-chain messaging
- 💸 **Payments** - Server-verified escrow

</td>
<td>

### 🎨 Modern UI/UX
- ✨ **3D Effects** - Stunning visual experience
- 🌗 **Dark/Light Mode** - Eye-friendly themes
- 📱 **Responsive** - Works on all devices
- 🎭 **Glass Morphism** - Modern design language
- 💫 **Smooth Animations** - Delightful interactions

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion |
| **Backend** | Next.js API Routes, Socket.io, Node.js |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Pinata IPFS |
| **Blockchain** | Polygon Amoy, Ethers.js, Hardhat |
| **Encryption** | TweetNaCl.js |
| **State** | Zustand |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask or Web3 wallet
- Supabase account
- Pinata account

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/polychat.git
cd polychat

# Install dependencies
npm install

# Copy environment file
cp env.txt .env

# Run development server
npm run dev
```

### Environment Setup

1. **Supabase** - Create project at [supabase.com](https://supabase.com)
2. **Pinata** - Get API keys at [pinata.cloud](https://pinata.cloud)
3. **Configure `.env`** with your credentials

---

## 📱 Pages

| Page | Description |
|------|-------------|
| `/` | Splash screen with features |
| `/auth/wallet` | Wallet connection |
| `/profile/setup` | Profile creation |
| `/chats` | Chat list |
| `/chats/[id]` | Chat window |
| `/calls` | Call history |
| `/search` | User search |
| `/settings` | App settings |
| `/profile` | User profile |

---

## 🔒 Privacy Features

| Feature | Description |
|---------|-------------|
| **Hide Online Status** | Others can't see when you're online |
| **Hide Last Seen** | Your last seen time is hidden |
| **Hide Profile Photo** | Only contacts see your photo |
| **Incognito Mode** | Browse without leaving traces |
| **Block Screenshots** | Prevent screenshots in chats |
| **App Lock** | Require PIN/biometrics |
| **2FA** | Two-factor authentication |
| **Disappearing Messages** | Auto-delete after set time |
| **Encrypted Backup** | Secure data backup |

---

## 📜 API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/wallet` | POST | Wallet authentication |
| `/api/conversations` | GET/POST | Manage conversations |
| `/api/messages` | GET/POST | Send/receive messages |
| `/api/messages/reactions` | POST | Add message reactions |
| `/api/calls/create` | POST | Initiate calls |
| `/api/profile` | GET/PUT | User profile |
| `/api/blocked` | GET/POST/DELETE | Block management |

---

## 🔐 Security

- ✅ Strong JWT secrets (32+ characters)
- ✅ Server-side signature verification
- ✅ End-to-end encryption
- ✅ HTTPS in production
- ✅ Row Level Security (Supabase)
- ✅ Private key protection

---

## 📄 License

MIT License - feel free to use for your projects!

---

<p align="center">
  Made with 💜 for the decentralized web
</p>

<p align="center">
  <a href="#top">⬆️ Back to Top</a>
</p>
