# 🎯 Tapnad Demo Setup Instructions

## Quick Setup for Hackathon Demo

### 1. Set Your Organizer Address
Open `packages/nextjs/app/game/page.tsx` and update line 10:

```typescript
// Replace with your wallet address for demo control
const ORGANIZER_ADDRESS = "0x742d35Cc6734C0532925a3b8D400aE1cF92C1c0a"; 
```

### 2. Demo Flow
1. **Start**: Open homepage - show game overview
2. **Click**: "GO TO GAME" button
3. **Team Selection**: 
   - Show Bitcoin vs Ethereum teams
   - Players can join teams (wallet optional for spectators)
   - Display player lists and counts
4. **Start Race**: Only you (organizer) can start the race
5. **Live Racing**: 
   - 3-2-1-TAP countdown appears
   - Track expands, tap button appears
   - Real-time position updates

### 3. Mobile Demo Tips
- ✅ Fully responsive design
- ✅ Large tap buttons for mobile
- ✅ Clear team selection UI
- ✅ Visible countdown timer

### 4. Demo Script
1. "Welcome to Tapnad - Bitcoin vs Ethereum racing game"
2. "Click Go To Game to enter the arena"
3. "Choose your team - Bitcoin or Ethereum - it's FREE to join!"
4. "For demo: Use 'Burner Wallet' for instant test ETH, or I can send you some!"
5. "Joining costs nothing - just tiny gas fees for blockchain transactions"
6. "I'm the organizer, so I can start the race"
7. "This is a SPEED CONTEST - tap as fast as you can, no cooldowns!"
8. "First team to complete 3 laps wins!"
9. "After each race, the game auto-resets for continuous play!"

### 4.1. Audience Participation Options
**Option A (Recommended)**: "Click Connect Wallet → Choose 'Burner Wallet' for instant participation!"
**Option B**: "Connect your wallet and I'll send you test ETH from the faucet"
**Option C**: "Just watch as a spectator - you can see everything live!"

### 5. Technical Notes
- **Network**: Works on Hardhat local network or Monad testnet
- **Wallet**: Optional for spectators, required for participants
- **Cost**: Joining teams is FREE (tiny gas fees paid in test ETH)
- **Speed**: No tap cooldowns - pure speed contest!
- **Auto-Reset**: Games automatically reset after completion for continuous play
- **ETH Usage**: Only for gas fees, not game costs
- **Events**: Real-time updates via WebSocket
- **Mobile**: Optimized for phone presentations

### 6. Organizer Setup
- **Primary Organizer**: `0x9A00D0828743a8D94D995FC6e5A6BF50B71f256F` (Set in smart contract)
- **Secondary Organizer**: `0xf33bfa994D5ebeb7DD14ff09fB0dEF2c8e2A7227` (UI access only)
- **Contract Address**: `0x0f152ABAbF664D85c3209DcdB9A5c6449c53756a` (Latest deployment)
- **Note**: Both addresses see organizer controls, but only primary can execute contract functions

### 7. Quick Start Commands
```bash
# Deploy contracts
yarn deploy

# Start frontend
yarn start

# Open browser to localhost:3000
```

Your demo is ready! 🚀