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

- **Node.js** 18+ and npm (or bun)
- **MetaMask** wallet with Polygon Amoy testnet configured
- **Amoy testnet MATIC** - Get from [Polygon Faucet](https://faucet.polygon.technology/)
- **Lighthouse API key** - Get from [Lighthouse Storage](https://lighthouse.storage/)
- **Alchemy account** - For Polygon Amoy RPC endpoint

## 🔧 Setup Instructions

### 1. Clone and Install

```bash
# Install all dependencies (root handles workspaces)
npm install

# Or manually install each workspace
cd contracts && npm install
cd ../web && npm install
cd ../realtime-server && npm install
```

### 2. Environment Variables

Create a `.env` file in the **root** directory:

```env
# Blockchain / Hardhat
AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_AMOY_KEY
DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY

# Storage
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

# Server-side Lighthouse
LIGHTHOUSE_API_KEY=YOUR_LIGHTHOUSE_KEY
```

**⚠️ IMPORTANT:** 
- Replace all `YOUR_*` placeholders with actual values
- The contract is already deployed at `0x32593a5A622baC68B58A19315A55eF9e785C9F0E`
- Never commit your private keys or API keys

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
1. After connecting, you'll be prompted to create a profile
2. Choose a unique **username** (3-32 characters)
3. Add a **display name** (optional, what friends see)
4. Write a **bio** (optional)
5. Upload an **avatar** (optional, stored on Lighthouse)
6. Click **"Create Profile"** and confirm the transaction

### Start Chatting
1. Click the input at the top that says "New chat: enter wallet address or username"
2. Enter a friend's wallet address (0x...) or username
3. Click **"Start"** to open the conversation
4. Type your message and click **"Send"**
5. Confirm the transaction in MetaMask

### Voice/Video Calls
1. Open a conversation with a contact
2. Click the **phone icon** (voice) or **video icon** (video call)
3. Your contact will receive a call notification
4. They can accept or decline the call
5. Use controls to mute/unmute, toggle video, or hang up

## 🏗️ Tech Stack

- **Blockchain**: Solidity, Hardhat, Polygon Amoy testnet
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, Wagmi v2
- **Real-time**: Socket.io, WebRTC (simple-peer)
- **Storage**: Lighthouse/IPFS for decentralized file storage
- **State**: Zustand with localStorage persistence

## 📁 Project Structure

```
polychat-3/
├── contracts/              # Smart contracts (Hardhat)
│   ├── contracts/         # Solidity contracts
│   ├── scripts/           # Deployment scripts
│   └── test/              # Contract tests
├── web/                   # Next.js frontend
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities and configs
│   │   └── state/        # Zustand stores
│   └── public/           # Static assets
├── realtime-server/       # Socket.io server
│   └── index.js          # WebSocket & signaling server
└── package.json          # Workspace root
```

## 🧪 Testing

**Contract Tests:**
```bash
cd contracts
npx hardhat test
```

**Frontend:**
Open `http://localhost:3000` in two different browsers or incognito windows to test messaging between two users.

## 🛠️ Development

- **Lint**: `npm run lint` (in web directory)
- **Type Check**: `npm run type-check` (if configured)
- **Build**: `npm run build` (in web directory)

## 📝 Smart Contract

The `PolygonChatRegistry` contract is deployed at:
- **Address**: `0x32593a5A622baC68B58A19315A55eF9e785C9F0E`
- **Network**: Polygon Amoy Testnet

### Key Functions:
- `registerProfile(username, avatarCid, bio, displayName)` - Create user profile
- `updateProfile(avatarCid, bio, displayName)` - Update profile details
- `changeUsername(newUsername)` - Change username
- `upsertMessagePointer(recipient, cid, contentHash)` - Store message pointer
- `setBlockStatus(user, blocked)` - Block/unblock users
- `getProfile(address)` - Get user profile
- `ownerOfUsername(username)` - Find address by username

## 🔒 Security Notes

- Never commit `.env` files or private keys
- Private keys in `.env` are for development only
- Use environment variables for production deployments
- Lighthouse API keys should be kept secure

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

**Built with ❤️ using Polygon, Lighthouse, and Next.js**