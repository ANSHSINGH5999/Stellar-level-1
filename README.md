# Stellar Payment dApp - Level 1

![Stellar Payment dApp](screenshots/hero.png)

A beautiful, beginner-friendly decentralized application to send XLM (Stellar Lumens) on the Stellar Testnet using the Freighter wallet extension.

## Overview

This project demonstrates all core requirements for a basic Stellar payment dApp:
- **Wallet Setup**: Connect to Freighter wallet
- **Balance Handling**: Fetch and display XLM balance
- **Transaction Flow**: Send XLM with real-time feedback
- **Transaction Verification**: View transactions on StellarChain Explorer

---

## Screenshots

### 1. Connect Wallet Screen
![Connect Wallet](screenshots/connect-wallet.png)
- Beautiful dark theme UI with animated effects
- Clear call-to-action button
- Network status indicator

### 2. Connected Wallet
![Wallet Connected](screenshots/wallet-connected.png)
- Shows connected wallet address
- Displays current XLM balance
- Send XLM form visible

### 3. Transaction Success
![Transaction Success](screenshots/transaction-success.png)
- Success confirmation message
- Transaction hash display
- Direct link to StellarChain Explorer

---

## Features

### Wallet Connection
- One-click connection to Freighter wallet
- Auto-detect existing connections on page load
- Network validation (ensures Testnet is selected)
- Proper disconnect functionality

### Balance Handling
- Real-time XLM balance fetching from Horizon API
- Handles unfunded accounts (shows "Fund Account" option)
- Balance refresh after transactions
- Copy address to clipboard

### Transaction Flow
- Input validation (address format, amount)
- Real-time fee estimation
- User rejection handling
- Success/error status messages

### Transaction Verification
- Transaction hash display
- Direct link to **https://testnet.stellarchain.io/transactions**
- Real-time balance update after transaction

---

## Requirements

### Software
- Node.js v18 or higher
- npm or yarn
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Wallet Setup
1. Install [Freighter Wallet](https://freighter.app/) browser extension
2. Create a new wallet or import existing account
3. **Important**: Switch to **Testnet** network in Freighter settings
   - Settings → Network → Select **TESTNET**

### Getting Test XLM
1. Open Freighter and ensure Testnet is selected
2. If balance shows 0, click "Fund Account (10,000 XLM)"
3. Or visit: https://friendbot.stellar.org/?addr=YOUR_ADDRESS

---

## Installation

```bash
# Clone or navigate to project directory
cd stellar-level-1

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Usage Guide

### Step 1: Connect Wallet
1. Click the "Connect Wallet" button
2. Approve the connection request in Freighter popup
3. Your wallet address and balance will appear

### Step 2: Fund Account (if needed)
- If balance shows 0, click "Fund Account (10,000 XLM)"
- This uses Friendbot to get free test XLM

### Step 3: Send XLM
1. Enter recipient Stellar address (starts with 'G...')
2. Enter amount to send in XLM
3. Click "Send XLM"
4. Approve the transaction in Freighter popup
5. Wait for confirmation

### Step 4: View Transaction
- After success, click "View on StellarChain.io ↗"
- This opens the transaction in the blockchain explorer

### Disconnect
- Click "Disconnect Wallet" to log out

---

## Technical Details

### Network Configuration
| Setting | Value |
|---------|-------|
| Network | Stellar Testnet |
| Horizon API | https://horizon-testnet.stellar.org |
| Explorer | https://testnet.stellarchain.io |
| Network Passphrase | Test SDF Network ; September 2015 |

### Key Technologies
- **React 18** - UI framework
- **Vite** - Fast build tool
- **@stellar/freighter-api** - Official wallet integration
- **stellar-sdk** - Stellar blockchain SDK

### Dependencies
```json
{
  "@stellar/freighter-api": "^3.1.0",
  "stellar-sdk": "^12.3.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0"
}
```

---

## Error Handling

### "Freighter wallet not detected"
- Install Freighter extension from [freighter.app](https://freighter.app/)
- Refresh the page after installation

### "Please switch to Testnet"
- Open Freighter extension
- Go to Settings → Network
- Select **TESTNET** (not Public)

### "Address mismatch"
- Disconnect and reconnect wallet
- Ensure you're using the same account in Freighter

### "Insufficient balance"
- Fund your account with test XLM
- Keep at least 1 XLM for network reserve

### "Transaction failed"
- Check the error message for details
- Ensure recipient address is valid
- Try again if network is busy

---

## Project Structure

```
stellar-level-1/
├── package.json              # Dependencies and scripts
├── vite.config.js           # Vite configuration
├── index.html               # HTML entry point
├── README.md                # Project documentation
├── screenshots/             # Screenshots for documentation
│   ├── hero.png
│   ├── connect-wallet.png
│   ├── wallet-connected.png
│   └── transaction-success.png
└── src/
    ├── main.jsx             # React app entry
    ├── App.jsx              # Main application component
    └── App.css              # Beautiful dark theme styling
```

---

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Security Considerations

- Never share your secret key
- Always verify transaction details in Freighter before signing
- Use Testnet for development (not real funds)
- The app only connects to Stellar's official Testnet

---

## Troubleshooting

### Transaction keeps failing with "tx_bad_auth"
1. Ensure Freighter is set to **TESTNET** network
2. Disconnect and reconnect the wallet
3. Make sure you're using the correct account

### Balance not updating
- Click the refresh button (↻) next to balance
- Wait a few seconds for network confirmation

### Explorer link not working
- The transaction may take time to appear
- Try refreshing the explorer page
- Check https://testnet.stellarchain.io directly

---

## License

MIT License - Feel free to use this code for learning and development.

---

## Contributing

This is a Level 1 project for Stellar development learning. To earn the Level 1 credential, ensure:

1. ✅ Wallet connects successfully
2. ✅ Balance displays correctly
3. ✅ Transactions work on Testnet
4. ✅ Transaction hash links to explorer
5. ✅ Error handling is implemented

Happy Building! 🚀
