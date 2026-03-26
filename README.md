# Stellar Payment dApp - Level 1

A beginner-friendly decentralized application to send XLM (Stellar Lumens) on the Stellar Testnet using the Freighter wallet extension.

## Overview

This project demonstrates the core functionality required for a basic Stellar payment dApp:
- Connect to a Stellar wallet (Freighter)
- View account balance
- Send XLM to any Stellar address
- Verify transactions on the blockchain

## Requirements

### Software
- Node.js (v18 or higher)
- npm or yarn
- Modern web browser (Chrome, Firefox, Edge)

### Wallet
- [Freighter Wallet](https://freighter.app/) browser extension installed
- Freighter configured for **Stellar Testnet**

### Getting Testnet XLM
1. Open Freighter and ensure it's set to Testnet
2. Get test XLM from: https://www.stellar.org/developers/guides/get-started/create-account#fund-with-friendbot
3. Enter your Stellar address and click "Get Test Network XLM"

## Features

1. **Wallet Connection**
   - Connect to Freighter wallet extension
   - Auto-detect existing connections on page load
   - Disconnect functionality

2. **Balance Display**
   - Fetch and display current XLM balance
   - Handles new accounts (0 balance)
   - Real-time balance update after transactions

3. **Transaction Sending**
   - Send XLM to any valid Stellar address
   - Proper transaction building with fee estimation
   - User rejection handling (cancelled signing)
   - Transaction verification on Horizon API

4. **Transaction Feedback**
   - Success/error status messages
   - Transaction hash display
   - Transaction details (fee, operations, timestamp)
   - Direct link to StellarChain Explorer

## Project Structure

```
stellar-level-1/
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
├── index.html            # HTML entry point
├── README.md             # Project documentation
└── src/
    ├── main.jsx          # React app entry
    ├── App.jsx           # Main application component
    └── App.css           # Styling
```

## Installation

```bash
# Navigate to project directory
cd stellar-level-1

# Install dependencies
npm install
```

## Running the App

```bash
# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

## Usage Guide

### Connecting Wallet
1. Click "Connect Freighter Wallet" button
2. Approve the connection request in Freighter popup
3. Your address and balance will display automatically

### Sending XLM
1. Enter recipient address (starts with 'G')
2. Enter amount in XLM (e.g., 10)
3. Click "Send XLM"
4. Approve the transaction in Freighter popup
5. Wait for confirmation

### Viewing Transaction
- After successful transaction, click "View on StellarChain Explorer"
- Transaction details shown in the app include:
  - Transaction hash
  - Fee charged (in stroops)
  - Number of operations
  - Creation timestamp

## Technical Details

### Network Configuration
- **Network**: Stellar Testnet
- **Horizon API**: https://horizon-testnet.stellar.org
- **Network Passphrase**: Test SDF Network ; September 2015

### Key Technologies
- **React 18** - Frontend framework
- **Vite** - Build tool
- **@stellar/freighter-api** - Wallet integration
- **stellar-sdk** - Stellar blockchain SDK

### Error Handling
- Wallet not installed detection
- User rejection handling
- Network errors
- Invalid transaction errors

## Common Issues

### "Freighter wallet not installed"
- Install the Freighter extension from https://freighter.app/

### "Transaction signing rejected"
- User cancelled the signing in Freighter
- Simply try again and approve the transaction

### "Invalid transaction"
- Check that recipient address is valid (starts with G)
- Ensure sufficient XLM balance for amount + fee

### Transaction not showing on explorer
- Try StellarChain: https://testnet.stellarchain.io
- Testnet may have been reset

## License

MIT License