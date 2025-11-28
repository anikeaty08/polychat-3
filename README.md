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
1. After connecting, the profile creation modal will appear automatically
2. Enter a **username** (required, unique, stored on-chain)
3. Optionally add:
   - **Display name** - What others see
   - **Bio** - Short description
   - **Profile picture** - Uploaded to Lighthouse/IPFS
4. Click **"Create Profile"** and confirm the transaction

### Start a Chat
1. In the search bar, enter:
   - A wallet address (e.g., `0x...`)
   - Or a username (e.g., `alice`)
2. The conversation opens automatically
3. Type a message and press Enter
4. Messages are:
   - Uploaded to Lighthouse/IPFS
   - Message pointer stored on-chain
   - Broadcasted in real-time via Socket.io

### Make a Call
1. Open a conversation
2. Click the **green phone icon** to start a voice/video call
3. Grant camera/microphone permissions when prompted
4. Use controls to:
   - Toggle video on/off
   - Mute/unmute audio
   - End the call (red phone icon)

### Update Profile
1. Click **"Edit"** button in the sidebar
2. Update any field (avatar, bio, display name, username)
3. Click **"Update Profile"** and confirm the transaction

### Block/Unblock Users
1. Open a conversation
2. Click the **block icon** in the chat header
3. Confirm to block/unblock the user

## 📁 Project Structure

```
polygon/
├── contracts/              # Smart contracts (Hardhat)
│   ├── contracts/
│   │   └── PolygonChatRegistry.sol  # Main chat registry contract
│   ├── scripts/
│   │   └── deploy.ts       # Deployment script
│   ├── test/
│   │   └── PolygonChatRegistry.ts   # Contract tests
│   └── hardhat.config.ts   # Hardhat configuration
│
├── web/                    # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/        # API routes (Lighthouse upload)
│   │   │   ├── layout.tsx  # Root layout
│   │   │   └── page.tsx    # Main page
│   │   ├── components/
│   │   │   ├── call-panel.tsx      # Voice/video call UI
│   │   │   ├── chat-sidebar.tsx    # Contact list sidebar
│   │   │   ├── chat-window.tsx     # Main chat interface
│   │   │   ├── profile-sheet.tsx   # Profile creation/editing
│   │   │   └── wallet-connect-button.tsx
│   │   ├── lib/
│   │   │   ├── chains.ts           # Chain configuration
│   │   │   ├── contracts.ts        # Contract ABI and address
│   │   │   ├── conversation.ts     # Conversation utilities
│   │   │   ├── lighthouse.ts       # Lighthouse storage helpers
│   │   │   ├── socket.ts           # Socket.io client
│   │   │   └── wagmi.ts            # Wagmi configuration
│   │   └── state/
│   │       └── chat-store.ts       # Zustand state management
│   └── .env                # Frontend environment variables
│
├── realtime-server/        # Socket.io server
│   ├── index.js            # Socket.io server implementation
│   └── package.json
│
├── .env                    # Root environment variables
├── ENV_SETUP.md           # Detailed environment setup guide
└── README.md              # This file
```

## 🔗 Smart Contract

**Deployed Address:** `0x32593a5A622baC68B58A19315A55eF9e785C9F0E`  
**Network:** Polygon Amoy Testnet  
**Explorer:** [View on Polygonscan](https://amoy.polygonscan.com/address/0x32593a5A622baC68B58A19315A55eF9e785C9F0E)

### Contract Functions

- `registerProfile(username, avatarCid, bio, displayName)` - Create a new user profile
- `updateProfile(avatarCid, bio, displayName)` - Update profile information
- `changeUsername(newUsername)` - Change username (must be unique)
- `setBlockStatus(target, shouldBlock)` - Block/unblock a user
- `upsertMessagePointer(counterparty, cid, contentHash)` - Store message pointer on-chain
- `getProfile(address)` - Get user profile data
- `ownerOfUsername(username)` - Get address for a username
- `isBlocked(owner, target)` - Check if a user is blocked
- `getConversationMeta(conversationId)` - Get conversation metadata

## 🛠️ Tech Stack

### Blockchain
- **Polygon Amoy** - Testnet for smart contracts
- **Solidity** - Smart contract language
- **Hardhat** - Development environment
- **Wagmi** - React Hooks for Ethereum
- **Viem** - TypeScript interface for Ethereum

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **Socket.io Client** - Real-time communication

### Storage & Communication
- **Lighthouse** - Decentralized IPFS storage
- **Socket.io** - Real-time messaging and signaling
- **WebRTC (simple-peer)** - Peer-to-peer voice/video calls

## 🛠️ Development

### Compile Contracts
```bash
cd contracts
npx hardhat compile
```

### Run Contract Tests
```bash
cd contracts
npx hardhat test
```

### Deploy Contract (if needed)
```bash
cd contracts
npx hardhat run scripts/deploy.ts --network amoy
```

### Build Frontend
```bash
cd web
npm run build
```

## 🚧 Future Features Roadmap

### Group Chat (High Priority)
- **Create Groups** - Users can create group chats with multiple participants
- **Group Management** - Add/remove members, assign admin roles
- **Group Profiles** - Group name, description, and avatar
- **Group Settings** - Privacy settings, member permissions
- **Group Messages** - Broadcast messages to all group members
- **Group Calls** - Multi-participant voice/video calls

### Enhanced Messaging
- **Media Sharing** - Send images, videos, documents, and files
- **Voice Messages** - Record and send audio messages
- **Message Reactions** - React to messages with emojis
- **Message Forwarding** - Forward messages to other chats
- **Message Search** - Search through message history
- **Message Pinning** - Pin important messages
- **Message Deletion** - Delete messages (with blockchain record)

### Status & Stories
- **Status Updates** - Share text, image, or video status updates
- **Stories** - 24-hour disappearing stories (like WhatsApp)
- **Status Privacy** - Control who can see your status
- **Status Reactions** - React to friends' status updates

### Advanced Features
- **Message Encryption** - End-to-end encryption for messages
- **Disappearing Messages** - Auto-delete messages after set time
- **Message Scheduling** - Schedule messages to send later
- **Chat Backup** - Export chat history to file
- **Multiple Devices** - Sync across multiple devices
- **Desktop App** - Electron-based desktop application

### User Experience
- **Dark/Light Theme** - Toggle between themes
- **Custom Themes** - Create custom color themes
- **Notifications** - Browser push notifications
- **Sound Effects** - Custom notification sounds
- **Chat Wallpapers** - Custom background images
- **Font Size** - Adjustable text size
- **Language Support** - Multi-language interface

### Social Features
- **Contact Sync** - Import contacts from wallet
- **QR Code Sharing** - Share profile via QR code
- **Profile Links** - Shareable profile links
- **Mutual Contacts** - See mutual contacts with users
- **Last Seen** - Show when user was last active
- **Online Status** - Real-time online/offline indicators

### Business Features
- **Business Profiles** - Verified business accounts
- **Business Hours** - Set availability hours
- **Quick Replies** - Pre-written message templates
- **Automated Messages** - Auto-reply when away
- **Analytics** - Message and engagement analytics

### Integration & API
- **REST API** - API for third-party integrations
- **Webhooks** - Event-based webhooks
- **Bot Support** - Create and interact with bots
- **Payment Integration** - Send/receive crypto payments
- **NFT Sharing** - Share NFT images in chats

### Security & Privacy
- **Two-Factor Authentication** - Additional security layer
- **Biometric Lock** - Fingerprint/face ID lock
- **Privacy Settings** - Granular privacy controls
- **Blocked Contacts List** - Manage blocked users
- **Report & Spam** - Report spam or abuse

## 📝 Architecture Overview

### Message Flow
1. User sends a message → Uploaded to Lighthouse/IPFS
2. Receive CID → Store message pointer on-chain via smart contract
3. Broadcast via Socket.io → Real-time delivery to recipient
4. Recipient receives → Message added to conversation
5. Read receipt → Marked as read when conversation is viewed

### Storage Strategy
- **On-Chain**: User profiles, usernames, message pointers (CIDs), conversation metadata
- **IPFS/Lighthouse**: Actual message content, media files, profile pictures
- **LocalStorage**: Contact list, UI preferences (client-side only)

### Real-time Communication
- **Socket.io**: Handles real-time message delivery and call signaling
- **WebRTC**: Direct peer-to-peer connections for voice/video calls
- **Smart Contract Events**: Used to discover previous conversations

## 🐛 Troubleshooting

**"Network amoy doesn't exist"**
- Ensure `AMOY_RPC_URL` is set in root `.env` file

**"Must be authenticated"**
- Check that your `AMOY_RPC_URL` includes your Alchemy API key

**"Insufficient funds"**
- Get Amoy MATIC from the [Polygon Faucet](https://faucet.polygon.technology/)

**Socket connection fails**
- Ensure the realtime server is running on port 3001
- Check `NEXT_PUBLIC_SOCKET_URL` in `web/.env`

**Messages not appearing**
- Check browser console for errors
- Verify Lighthouse API key is correct
- Ensure both users are connected to the same Socket.io server
- Check that contract address is correct

**Calls not working**
- Grant camera/microphone permissions in browser
- Check browser console for WebRTC errors
- Ensure both users are in the same conversation

**Profile not loading**
- Verify contract address is set correctly
- Check that user has created a profile
- Ensure wallet is connected to Polygon Amoy

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues, questions, or suggestions, please open an issue on the repository.

---

**Built with ❤️ on Polygon Amoy**
#   w e b c h a t - 3 . 0 
 
 