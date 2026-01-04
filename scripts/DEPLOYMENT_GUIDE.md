# Contract Deployment Guide

This guide explains how to deploy each contract individually or all at once.

## Available Contracts

You have **5 contracts** in total:

1. **PaymentEscrow** - Handles payment escrow functionality
2. **UserRegistry** - Manages user registration on-chain
3. **PolychatMessaging** - Handles on-chain messaging
4. **PolychatCalls** - Handles on-chain call records
5. **PolychatStatus** - Handles on-chain status updates

## Deployment Scripts

### Individual Deployment Scripts

Each contract has its own deployment script:

```bash
# Deploy PaymentEscrow only
npx hardhat run scripts/deploy-payment-escrow.js --network amoy

# Deploy UserRegistry only
npx hardhat run scripts/deploy-user-registry.js --network amoy

# Deploy PolychatMessaging only
npx hardhat run scripts/deploy-messaging.js --network amoy

# Deploy PolychatCalls only
npx hardhat run scripts/deploy-calls.js --network amoy

# Deploy PolychatStatus only
npx hardhat run scripts/deploy-status-only.js --network amoy
```

### Deploy All Contracts

To deploy all contracts at once:

```bash
npx hardhat run scripts/deploy.js --network amoy
```

## Environment Variables Required

After deployment, add these addresses to your `.env` file:

```env
NEXT_PUBLIC_PAYMENT_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_USER_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_MESSAGING_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CALLS_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_STATUS_CONTRACT_ADDRESS=0x...
```

## Verification

After deployment, verify each contract on Polygonscan:

```bash
# Verify PaymentEscrow
npx hardhat run scripts/verify-contract.js <contract-address> PaymentEscrow --network amoy

# Verify other contracts (no constructor args)
npx hardhat run scripts/verify-contract.js <contract-address> UserRegistry --network amoy
npx hardhat run scripts/verify-contract.js <contract-address> PolychatMessaging --network amoy
npx hardhat run scripts/verify-contract.js <contract-address> PolychatCalls --network amoy
npx hardhat run scripts/verify-contract.js <contract-address> PolychatStatus --network amoy
```

## Contract Summary

| Contract | Script | Required Env Var |
|----------|--------|------------------|
| PaymentEscrow | `deploy-payment-escrow.js` | `NEXT_PUBLIC_PAYMENT_ESCROW_ADDRESS` |
| UserRegistry | `deploy-user-registry.js` | `NEXT_PUBLIC_USER_REGISTRY_ADDRESS` |
| PolychatMessaging | `deploy-messaging.js` | `NEXT_PUBLIC_MESSAGING_CONTRACT_ADDRESS` |
| PolychatCalls | `deploy-calls.js` | `NEXT_PUBLIC_CALLS_CONTRACT_ADDRESS` |
| PolychatStatus | `deploy-status-only.js` | `NEXT_PUBLIC_STATUS_CONTRACT_ADDRESS` |

## Notes

- **PaymentEscrow** requires `SERVER_WALLET_ADDRESS` in `.env` for deployment
- All other contracts have no constructor arguments
- Make sure you have enough testnet MATIC in your deployer wallet
- Contracts are deployed to Polygon Amoy testnet by default



