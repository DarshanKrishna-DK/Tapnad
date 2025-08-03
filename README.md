# Tapnad - Multiplayer Blockchain Racing Game

Tapnad is a real-time multiplayer coin racing game built on the Monad blockchain. Players join competing teams (Bitcoin vs Ethereum) and engage in fast-paced tap-to-advance racing around a circular track.

## Overview

Tapnad combines blockchain technology with instant gameplay mechanics to create an engaging multiplayer racing experience. The game features pure local racing with real-time synchronization across multiple devices and browsers, eliminating transaction delays while maintaining decentralized team management.

## Tech Stack

### Frontend
- **React 18** - Component-based UI framework
- **Next.js 14** - Full-stack React framework with App Router
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **Custom CSS Animations** - Racing effects and visual feedback

### Blockchain
- **Monad Testnet** - High-performance EVM-compatible blockchain
- **Hardhat** - Smart contract development and testing framework
- **Solidity** - Smart contract programming language
- **Scaffold-ETH 2** - dApp development boilerplate

### Web3 Integration
- **wagmi** - React hooks for Ethereum blockchain interaction
- **viem** - TypeScript interface for Ethereum
- **RainbowKit** - Wallet connection and management UI

### Real-time Features
- **BroadcastChannel API** - Cross-tab communication
- **LocalStorage Events** - Cross-device synchronization fallback
- **Aggressive Polling** - Sub-second update intervals

## Key Features

### Instant Racing
- Zero-transaction tapping for responsive gameplay
- Immediate visual feedback and coin movement
- Real-time progress tracking and lap counting
- Automatic game completion at 3 laps

### Multiplayer Synchronization
- Cross-device real-time updates
- BroadcastChannel for same-origin tab communication
- LocalStorage polling for cross-device synchronization
- Visual connection status indicators

### Blockchain Integration
- Decentralized team membership management
- Organizer-controlled game flow (start/reset)
- Event-driven UI updates
- Minimal transaction requirements (join team only)

### User Experience
- Mobile-responsive design
- Wallet connection optional for spectators
- Clear game state indicators
- Automatic session management

## Installation and Setup

### Prerequisites
- Node.js 18+ and yarn package manager
- Git for version control

### Clone Repository
```bash
git clone https://github.com/DarshanKrishna-DK/Tapnad.git
cd Tapnad
```

### Install Dependencies
```bash
yarn install
```

### Environment Configuration
The application is pre-configured for Monad Testnet. No additional environment variables are required for basic functionality.

## Local Development

### Start Local Blockchain (Optional)
```bash
yarn chain
```

### Deploy Smart Contracts
```bash
yarn deploy
```

### Start Frontend Application
```bash
yarn start
```

The application will be available at `http://localhost:3000`

### Development Workflow
1. **Contract Development**: Modify contracts in `packages/hardhat/contracts/`
2. **Frontend Development**: Edit components in `packages/nextjs/app/`
3. **Testing**: Use `http://localhost:3000/debug` for contract interaction testing
4. **Deployment**: Run `yarn deploy` after contract changes

## Smart Contract Architecture

### Race.sol Contract
Located at `packages/hardhat/contracts/Race.sol`

#### State Variables
- `GameState enum`: Lobby, InProgress, Finished
- `mapping coinPosition`: Current position of each coin on track
- `mapping coinSupporters`: Number of players supporting each coin
- `mapping playerSupports`: Which coin each player supports
- `mapping coinSupportersList`: Array of supporters for each coin

#### Core Functions
- `joinRace(uint8 coinId)`: Join a team (requires Lobby state)
- `startGame()`: Begin the race (organizer only)
- `resetGame()`: Reset all game state (organizer only)
- `tap()`: Advance coin position (deprecated - now local only)

#### Events
- `PlayerJoined`: Emitted when a player joins a team
- `GameStarted`: Emitted when organizer starts the game
- `GameReset`: Emitted when game is reset to lobby state

### Deployment Configuration
- **Network**: Monad Testnet (Chain ID: 10143)
- **RPC URL**: https://testnet-rpc.monad.xyz
- **Organizer Address**: Configurable in deployment script

## Game Mechanics

### Team Selection Phase
1. Players connect wallets and join either Bitcoin or Ethereum team
2. Organizer can see player counts and start the game
3. Minimum requirement: at least one player per team

### Racing Phase
1. 3-second countdown timer displays
2. Players tap rapidly to advance their team's coin
3. Real-time position updates across all connected devices
4. First team to complete 3 laps wins

### Results Phase
1. Winner announcement with celebration animations
2. Detailed race analytics and statistics
3. Automatic reset to team selection after 5 seconds

### Local vs Blockchain Operations
- **Local (Instant)**: Tapping, coin movement, progress tracking
- **Blockchain (Transactions)**: Team joining, game start/reset, organizer controls

## Project Structure

```
tapnad/
├── packages/
│   ├── hardhat/              # Smart contract development
│   │   ├── contracts/         # Solidity contracts
│   │   ├── deploy/           # Deployment scripts
│   │   └── test/             # Contract tests
│   └── nextjs/               # Frontend application
│       ├── app/              # Next.js app directory
│       │   ├── game/         # Main game interface
│       │   ├── debug/        # Contract debugging tools
│       │   └── results/      # Race results page
│       ├── components/       # Reusable UI components
│       ├── hooks/            # Custom React hooks
│       ├── utils/            # Utility functions
│       └── contracts/        # Generated contract types
├── yarn.lock
└── package.json
```

## Configuration Files

### Scaffold Configuration
`packages/nextjs/scaffold.config.ts` - Network configuration and target networks

### Hardhat Configuration  
`packages/hardhat/hardhat.config.ts` - Blockchain network settings and deployment configuration

### Contract Deployment
`packages/hardhat/deploy/01_deploy_race_contract.ts` - Contract deployment with organizer address configuration

## Development Commands

### Frontend Development
```bash
yarn start          # Start development server
yarn build          # Build production bundle
yarn next:lint      # Run linting
yarn next:check-types # Type checking
```

### Smart Contract Development
```bash
yarn chain          # Start local blockchain
yarn deploy         # Deploy contracts
yarn verify         # Verify contracts on explorer
yarn hardhat:test   # Run contract tests
```

### Debugging and Testing
```bash
yarn debug          # Access contract debugging interface
yarn test           # Run all tests
```

## Troubleshooting

### Common Issues

#### Players Cannot Join Teams
- **Cause**: Game contract not in Lobby state
- **Solution**: Organizer must click "Reset Game" button
- **Verification**: Check game state indicator shows "Lobby (Ready to Join)"

#### Coin Movement Not Synchronizing
- **Cause**: BroadcastChannel or localStorage sync issues
- **Solution**: Refresh all browser tabs and ensure JavaScript console shows sync messages
- **Debug**: Look for "Broadcasting race data" and "Received BroadcastChannel message" in console

#### Wallet Connection Issues
- **Cause**: Wrong network or insufficient funds
- **Solution**: Switch to Monad Testnet, obtain test tokens from faucet
- **Note**: Only gas fees required, no payment for joining teams

#### Event Updates Not Working
- **Cause**: Blockchain event listeners not functioning
- **Solution**: Hard refresh browser (Ctrl+Shift+R), check console for event detection logs

### Debug Information
Enable browser developer tools (F12) and monitor console for:
- Game state changes and event detection
- Real-time synchronization messages
- BroadcastChannel and localStorage activity
- Contract interaction confirmations

## Game Rules

### Joining Phase
- Teams: Bitcoin vs Ethereum
- Free to join (only gas fees apply)
- Spectators can watch without wallet connection
- Organizer controls game start/reset

### Racing Phase
- Tap as fast as possible to advance your team's coin
- Progress is calculated based on total team taps divided by number of supporters
- Real-time position updates across all devices
- No cooldowns or transaction delays

### Winning Conditions
- First team to complete 3 full laps wins
- Automatic game completion and celebration
- Race statistics and analytics displayed
- Automatic reset for continuous play

## Architecture Highlights

### Hybrid Architecture
- **Blockchain Layer**: Team management, game state, organizer controls
- **Local Layer**: Racing mechanics, tap processing, coin movement
- **Sync Layer**: Real-time multiplayer coordination

### Performance Optimizations
- Instant local updates with background blockchain sync
- Aggressive polling (200ms intervals) for responsiveness
- BroadcastChannel for efficient same-origin communication
- Event-driven UI updates for seamless user experience

### Scalability Features
- Supports unlimited spectators
- Efficient cross-device synchronization
- Minimal blockchain transactions per player
- Responsive design for mobile and desktop

## Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request with detailed description

### Code Standards
- TypeScript for type safety
- ESLint configuration for code quality
- Consistent formatting with Prettier
- Comprehensive error handling

### Testing
- Contract tests in `packages/hardhat/test/`
- Frontend component testing
- End-to-end multiplayer testing across devices
- Cross-browser compatibility verification

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For issues, questions, or contributions, please use the GitHub repository's issue tracking system.