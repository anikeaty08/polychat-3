# Polychat Setup Guide

Complete step-by-step guide to set up and run Polychat on your local system.

## Prerequisites

Before starting, ensure you have:
- Node.js 18 or higher installed ([Download](https://nodejs.org/))
- npm or yarn package manager
- A code editor (VS Code recommended)
- MetaMask browser extension installed
- Git (optional, for version control)

## Step 1: Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

This will install all required dependencies. Wait for the installation to complete.

## Step 2: Set Up Supabase Database

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" or "New Project"
3. Sign up or log in if needed
4. Click "New Project"
5. Fill in:
   - **Name**: polychat (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier works fine
6. Click "Create new project"
7. Wait 2-3 minutes for project to be ready

### 2.2 Run Database Schema

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `lib/supabase-schema.sql` from this project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for "Success" message
8. Verify tables were created by checking **Table Editor** in sidebar

### 2.3 Get API Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - **Keep this secret!**

## Step 3: Set Up Pinata IPFS

### 3.1 Create Pinata Account

1. Go to [pinata.cloud](https://pinata.cloud)
2. Click "Sign Up" and create an account
3. Verify your email if required
4. Complete onboarding

### 3.2 Create API Key

1. In Pinata dashboard, go to **API Keys** section
2. Click **New Key**
3. Configure:
   - **Key Name**: polychat-api
   - **Admin**: Enable (check the box)
   - **PinFileToIPFS**: Enable
   - **PinJSONToIPFS**: Enable
   - **Unpin**: Optional (enable if you want to delete files)
4. Click **Create Key**
5. **Important**: Copy both:
   - **API Key** (starts with letters/numbers)
   - **Secret API Key** (long string) - **Copy immediately, you won't see it again!**

### 3.3 Alternative: Use JWT Token

If you prefer JWT authentication:
1. Go to **API Keys** > **JWT**
2. Click **Generate New Token**
3. Copy the JWT token

## Step 4: Configure Environment Variables

### 4.1 Create .env File

1. Copy `env.txt` to `.env`:
   ```bash
   cp env.txt .env
   ```
   
   Or manually create `.env` file in the root directory.

### 4.2 Fill in Supabase Values

Open `.env` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 4.3 Fill in Pinata Values

Add your Pinata credentials:

```env
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
```

OR if using JWT:

```env
PINATA_JWT=your_pinata_jwt_token
```

### 4.4 Generate JWT Secret

Generate a secure JWT secret:

**On Windows (PowerShell):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**On Mac/Linux:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add to `.env`:

```env
JWT_SECRET=paste_generated_string_here
```

### 4.5 Configure Polygon Amoy

These are already set, but verify:

```env
NEXT_PUBLIC_POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_CHAIN_ID=80002
```

### 4.6 Set Up Server Wallet (for Payments)

1. Create a new wallet in MetaMask (or use existing)
2. Get testnet MATIC from [Polygon Faucet](https://faucet.polygon.technology/)
3. Copy wallet address and private key
4. Add to `.env`:

```env
SERVER_WALLET_ADDRESS=0xYourServerWalletAddress
SERVER_PRIVATE_KEY=your_server_private_key_keep_secret
```

**⚠️ WARNING**: Never share or commit your private key!

### 4.7 Optional: Smart Contracts

If you want to deploy smart contracts:

1. Install Hardhat:
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   ```

2. Get testnet MATIC for deployment wallet
3. Add to `.env`:
   ```env
   PRIVATE_KEY=your_deployer_private_key
   ```

4. Deploy contracts:
   ```bash
   npx hardhat run scripts/deploy.js --network amoy
   ```

5. Copy contract addresses to `.env`:
   ```env
   NEXT_PUBLIC_PAYMENT_ESCROW_ADDRESS=0x...
   NEXT_PUBLIC_USER_REGISTRY_ADDRESS=0x...
   ```

### 4.8 Final .env Check

Your `.env` file should have:

✅ Supabase credentials (3 variables)
✅ Pinata credentials (2-3 variables)
✅ JWT_SECRET
✅ Polygon Amoy RPC (already set)
✅ Server wallet (for payments)
✅ Contract addresses (if deployed)
✅ App configuration

## Step 5: Run the Application

### 5.1 Start Development Server

```bash
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

### 5.2 Open in Browser

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 6: First Time Setup

### 6.1 Connect Wallet

1. Click "Get Started" on the welcome screen
2. Click "Connect MetaMask"
3. Approve connection in MetaMask
4. Sign the authentication message
5. Wait for authentication to complete

### 6.2 Create Profile

1. Enter a username (3-20 characters, alphanumeric + underscore)
2. Wait for availability check (green checkmark)
3. Optionally add:
   - Display name
   - Profile picture
   - Status message
4. Click "Create Profile"

### 6.3 Start Using

- Search for users to start chatting
- Send messages with end-to-end encryption
- Upload files (stored on IPFS)
- Use stickers and emojis
- Manage privacy settings

## Step 7: Optional - Socket.io Server

For production or separate real-time server:

1. Update `.env`:
   ```env
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   ```

2. Run Socket.io server:
   ```bash
   node server.js
   ```

## Troubleshooting

### Database Connection Error

**Problem**: "Failed to connect to Supabase"

**Solutions**:
- Verify Supabase URL is correct
- Check API keys are correct
- Ensure project is active (not paused)
- Verify SQL schema was executed

### Pinata Upload Fails

**Problem**: "Failed to upload to Pinata"

**Solutions**:
- Verify API keys are correct
- Check account has quota remaining
- Ensure file size is under 5MB
- Try using JWT token instead

### Wallet Connection Issues

**Problem**: "MetaMask not detected" or "Connection failed"

**Solutions**:
- Ensure MetaMask extension is installed
- Refresh the page
- Switch to Polygon Amoy testnet in MetaMask
- Clear browser cache
- Try different browser

### Payment Errors

**Problem**: "Payment failed" or "Server wallet not configured"

**Solutions**:
- Verify `SERVER_PRIVATE_KEY` is set in `.env`
- Ensure server wallet has MATIC
- Check contract addresses are correct (if using contracts)
- Verify network is Polygon Amoy

### Build Errors

**Problem**: TypeScript or build errors

**Solutions**:
- Run `npm install` again
- Delete `node_modules` and `.next` folder, then `npm install`
- Check all environment variables are set
- Verify Node.js version is 18+

## Production Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add all environment variables from `.env`
5. Deploy

### Environment Variables for Production

Set all variables in your hosting platform:
- All Supabase credentials
- All Pinata credentials
- JWT_SECRET (use a different one for production!)
- Server wallet credentials
- Update `NEXT_PUBLIC_APP_URL` to your production URL
- Contract addresses (if deployed)

## Security Checklist

Before going to production:

- [ ] Use strong `JWT_SECRET` (32+ characters, random)
- [ ] Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code
- [ ] Keep `SERVER_PRIVATE_KEY` secret
- [ ] Use HTTPS in production
- [ ] Enable Supabase Row Level Security (RLS) if needed
- [ ] Set up proper CORS policies
- [ ] Regularly update dependencies
- [ ] Use environment-specific secrets

## Getting Help

If you encounter issues:

1. Check the console for error messages
2. Verify all environment variables are set correctly
3. Check Supabase logs in dashboard
4. Review the README.md for more details
5. Check that all dependencies are installed

## Next Steps

After setup:

- Customize the UI/UX
- Add more wallet providers
- Deploy smart contracts
- Set up production environment
- Configure custom domain
- Add analytics
- Set up monitoring

## Quick Reference

**Start development:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
npm start
```

**Check types:**
```bash
npm run type-check
```

**Lint code:**
```bash
npm run lint
```

---

**Need help?** Check the README.md or review the code comments for more details.

