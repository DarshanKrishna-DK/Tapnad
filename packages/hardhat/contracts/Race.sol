//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

/**
 * Tapnad - Bitcoin vs Ethereum Racing Game dApp
 * Players tap to advance their chosen crypto around a circular track
 * Team Bitcoin (₿) vs Team Ethereum (Ξ)
 * @author BuidlGuidl
 */
contract Race {
    // Game States
    enum GameState { Lobby, InProgress, Finished }
    
    // State Variables
    address public immutable organizer;
    GameState public gameState;
    
    // Race tracking
    mapping(uint8 => uint256) public currentLap; // coinId => lap (0-2, 3 laps total)
    mapping(uint8 => uint256) public coinPosition; // coinId => position (0-100, 100 = full lap)
    mapping(address => uint8) public playerSupports; // player => coinId they support
    mapping(address => uint256) public playerTaps; // player => total taps by this player
    mapping(uint8 => uint256) public totalTaps; // coinId => total taps for this coin
    mapping(address => uint256) public lastTapTime; // player => timestamp of last tap
    
    // Player management
    uint256 public totalPlayers;
    mapping(uint8 => uint256) public coinSupporters; // coinId => number of supporters
    mapping(uint8 => address[]) public coinSupportersList; // coinId => list of supporter addresses
    
    // Constants
    uint256 public constant POSITION_PER_LAP = 100; // 100 position units per lap
    uint256 public constant LAPS_TO_WIN = 3; // 3 laps to finish
    
    // Game timing
    uint256 public gameStartTime;
    uint256 public gameEndTime;
    
    // Events
    event PlayerJoined(address indexed player, uint8 indexed coinId);
    event GameStarted(uint256 timestamp);
    event CoinAdvanced(uint8 indexed coinId, uint256 newPosition, uint256 currentLap);
    event LapCompleted(uint8 indexed coinId, uint256 currentLap);
    event GameFinished(uint8 indexed winningCoinId, uint256 duration);
    event GameReset();
    event PlayerTapped(address indexed player, uint8 indexed coinId, uint256 playerTaps, uint256 totalTaps);

    // Constructor
    constructor(address _organizer) {
        organizer = _organizer;
        gameState = GameState.Lobby;
    }

    // Modifiers
    modifier onlyOrganizer() {
        require(msg.sender == organizer, "Only organizer can call this function");
        _;
    }

    modifier inLobby() {
        require(gameState == GameState.Lobby, "Game must be in lobby state");
        _;
    }

    modifier gameInProgress() {
        require(gameState == GameState.InProgress, "Game must be in progress");
        _;
    }

    modifier validCoin(uint8 coinId) {
        require(coinId == 0 || coinId == 1, "Invalid coin ID (must be 0 or 1)");
        _;
    }

    /**
     * Join the race by supporting a specific crypto team
     * @param coinId The team to support (0 = Bitcoin, 1 = Ethereum)
     */
    function joinRace(uint8 coinId) external inLobby validCoin(coinId) {
        require(playerSupports[msg.sender] == 0 && !hasPlayerJoined(msg.sender), "Player already joined");
        
        playerSupports[msg.sender] = coinId + 1; // Store as 1 or 2 to differentiate from default 0
        coinSupporters[coinId]++;
        coinSupportersList[coinId].push(msg.sender);
        totalPlayers++;
        
        emit PlayerJoined(msg.sender, coinId);
    }

    /**
     * Start the game (only organizer)
     * Requires at least one player supporting each coin
     */
    function startGame() external onlyOrganizer inLobby {
        require(coinSupporters[0] > 0 && coinSupporters[1] > 0, "Each team must have at least one supporter");
        
        gameState = GameState.InProgress;
        gameStartTime = block.timestamp;
        
        emit GameStarted(block.timestamp);
    }

    /**
     * Tap to advance the supported coin
     * Pure speed contest - tap as fast as you can!
     */
    function tap() external gameInProgress {
        require(hasPlayerJoined(msg.sender), "Player must join race first");
        
        uint8 coinId = playerSupports[msg.sender] - 1; // Convert back to 0 or 1
        
        // Update tap counts
        playerTaps[msg.sender]++;
        totalTaps[coinId]++;
        lastTapTime[msg.sender] = block.timestamp; // For tracking purposes
        
        // Calculate new position based on taps and supporters
        uint256 tapsPerSupporter = totalTaps[coinId] / coinSupporters[coinId];
        uint256 newTotalPosition = tapsPerSupporter * 2; // 2 position units per tap per supporter
        
        uint256 newLap = newTotalPosition / POSITION_PER_LAP;
        uint256 newPosition = newTotalPosition % POSITION_PER_LAP;
        
        // Check for lap completion
        if (newLap > currentLap[coinId]) {
            currentLap[coinId] = newLap;
            emit LapCompleted(coinId, newLap);
            
            // Check for game completion
            if (newLap >= LAPS_TO_WIN) {
                gameState = GameState.Finished;
                gameEndTime = block.timestamp;
                emit GameFinished(coinId, gameEndTime - gameStartTime);
                
                // Auto-reset to lobby for continuous play (demo-friendly)
                _resetGameState();
                return;
            }
        }
        
        coinPosition[coinId] = newPosition;
        
        emit PlayerTapped(msg.sender, coinId, playerTaps[msg.sender], totalTaps[coinId]);
        emit CoinAdvanced(coinId, newPosition, currentLap[coinId]);
    }

    /**
     * Reset the game to lobby state (only organizer)
     */
    function resetGame() external onlyOrganizer {
        _resetGameState();
        emit GameReset();
    }

    /**
     * Internal function to reset game state
     * Used both by manual reset and auto-reset after game completion
     */
    function _resetGameState() internal {
        gameState = GameState.Lobby;
        
        // Reset race data
        currentLap[0] = 0;
        currentLap[1] = 0;
        coinPosition[0] = 0;
        coinPosition[1] = 0;
        totalTaps[0] = 0;
        totalTaps[1] = 0;
        
        // Reset player data
        for (uint8 coinId = 0; coinId < 2; coinId++) {
            for (uint256 i = 0; i < coinSupportersList[coinId].length; i++) {
                address player = coinSupportersList[coinId][i];
                playerSupports[player] = 0;
                playerTaps[player] = 0;
                lastTapTime[player] = 0;
            }
            delete coinSupportersList[coinId];
            coinSupporters[coinId] = 0;
        }
        
        totalPlayers = 0;
        gameStartTime = 0;
        gameEndTime = 0;
    }

    // View Functions
    function hasPlayerJoined(address player) public view returns (bool) {
        return playerSupports[player] > 0;
    }

    function getPlayerCoin(address player) external view returns (uint8) {
        require(hasPlayerJoined(player), "Player has not joined");
        return playerSupports[player] - 1;
    }

    function getCoinSupporters(uint8 coinId) external view validCoin(coinId) returns (address[] memory) {
        return coinSupportersList[coinId];
    }

    function getGameDuration() external view returns (uint256) {
        if (gameStartTime == 0) return 0;
        if (gameEndTime == 0) return block.timestamp - gameStartTime;
        return gameEndTime - gameStartTime;
    }

    function getCoinProgress(uint8 coinId) external view validCoin(coinId) returns (uint256 lap, uint256 position, uint256 totalPosition) {
        lap = currentLap[coinId];
        position = coinPosition[coinId];
        totalPosition = lap * POSITION_PER_LAP + position;
    }

    function getGameStats() external view returns (
        uint256 totalPlayersCount,
        uint256 coin0Supporters,
        uint256 coin1Supporters,
        uint256 coin0Taps,
        uint256 coin1Taps,
        uint256 duration
    ) {
        totalPlayersCount = totalPlayers;
        coin0Supporters = coinSupporters[0];
        coin1Supporters = coinSupporters[1];
        coin0Taps = totalTaps[0];
        coin1Taps = totalTaps[1];
        duration = this.getGameDuration();
    }
}