"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import {
  useScaffoldReadContract,
  useScaffoldWatchContractEvent,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { type RaceData, getRaceWebSocket } from "~~/utils/websocket";

// 🚨 IMPORTANT: Demo organizer addresses (both can control the game)
const ORGANIZER_ADDRESSES = [
  "0x9A00D0828743a8D94D995FC6e5A6BF50B71f256F", // Primary organizer (deployed contract)
  "0xf33bfa994D5ebeb7DD14ff09fB0dEF2c8e2A7227", // Secondary organizer
];
interface CoinPosition {
  x: number;
  y: number;
  angle: number;
}

export default function GamePage() {
  const { address: connectedAddress } = useAccount();
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [isTapping, setIsTapping] = useState(false);
  // const [lastTapTime, setLastTapTime] = useState(0); // Not needed for instant tapping
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Game flow control - overrides blockchain state for better UX
  const [gamePhase, setGamePhase] = useState<"teamSelection" | "racing" | "results">("teamSelection");

  // Local racing state for instant tapping (fresh start every session)
  const [localTaps, setLocalTaps] = useState({ bitcoin: 0, ethereum: 0 });
  const [localPlayerTaps, setLocalPlayerTaps] = useState(0);
  // WebSocket connection status for multiplayer sync
  const [isMultiplayerConnected, setIsMultiplayerConnected] = useState(false);

  // Read blockchain game state to sync with local gamePhase
  const { data: blockchainGameState } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "gameState",
  });

  const { data: bitcoinSupporters } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "coinSupporters",
    args: [0],
  });

  const { data: ethereumSupporters } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "coinSupporters",
    args: [1],
  });

  const { data: bitcoinSupportersList } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "getCoinSupporters",
    args: [0],
  });

  const { data: ethereumSupportersList } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "getCoinSupporters",
    args: [1],
  });

  const { data: hasJoined } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "hasPlayerJoined",
    args: [connectedAddress],
  });

  const { data: playerTeam } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "playerSupports",
    args: [connectedAddress],
  });

  // Blockchain data (kept for fallback/verification - currently using local state)
  // const { data: bitcoinProgress } = useScaffoldReadContract({
  //   contractName: "Race",
  //   functionName: "getCoinProgress",
  //   args: [0],
  // });

  // const { data: ethereumProgress } = useScaffoldReadContract({
  //   contractName: "Race",
  //   functionName: "getCoinProgress",
  //   args: [1],
  // });

  // const { data: playerTaps } = useScaffoldReadContract({
  //   contractName: "Race",
  //   functionName: "playerTaps",
  //   args: [connectedAddress],
  // });

  const { data: bitcoinTotalTaps } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "totalTaps",
    args: [0],
  });

  const { data: ethereumTotalTaps } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "totalTaps",
    args: [1],
  });

  // Write functions for organizer-only actions (start/reset game)
  const { writeContractAsync: writeRaceAsync } = useScaffoldWriteContract({
    contractName: "Race",
  });

  // Watch for game events and manage UI flow
  useScaffoldWatchContractEvent({
    contractName: "Race",
    eventName: "GameStarted",
    onLogs: () => {
      setIsStarting(false);
      setGamePhase("racing");
      // Reset local racing state for fresh start
      setLocalTaps({ bitcoin: 0, ethereum: 0 });
      setLocalPlayerTaps(0);
      startCountdown();
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "Race",
    eventName: "PlayerJoined",
    onLogs: logs => {
      logs.forEach(log => {
        const teamName = Number(log.args.coinId) === 0 ? "Bitcoin" : "Ethereum";
        if (log.args.player === connectedAddress) {
          notification.success(`You joined Team ${teamName}! 🎉`);
        } else {
          notification.info(`Player joined Team ${teamName}`);
        }
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "Race",
    eventName: "GameFinished",
    onLogs: logs => {
      logs.forEach(log => {
        const winnerCoinId = Number(log.args.winningCoinId);
        const winnerName = winnerCoinId === 0 ? "Bitcoin" : "Ethereum";

        // Capture race results
        const results = {
          duration: Number(log.args.duration) || 0,
          bitcoinTaps: Number(bitcoinTotalTaps) || 0,
          ethereumTaps: Number(ethereumTotalTaps) || 0,
          totalPlayers: (Number(bitcoinSupporters) || 0) + (Number(ethereumSupporters) || 0),
          winnerCoinId,
          winnerName,
        };

        // Store results in localStorage and redirect to results page
        localStorage.setItem("raceResults", JSON.stringify(results));
        router.push("/results");
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "Race",
    eventName: "GameReset",
    onLogs: () => {
      // Reset to team selection phase
      setGamePhase("teamSelection");
      setCountdown(null);
      // Reset local racing state
      setLocalTaps({ bitcoin: 0, ethereum: 0 });
      setLocalPlayerTaps(0);
      notification.info("🔄 Ready for new race! Join your team again.");
    },
  });

  // Sync local gamePhase with blockchain state on load
  useEffect(() => {
    if (blockchainGameState !== undefined) {
      const state = Number(blockchainGameState);
      if (state === 0) {
        // Lobby state - always show team selection
        setGamePhase("teamSelection");
      } else if (state === 1) {
        // InProgress state - show racing only if user has joined a team
        // If user hasn't joined, keep showing team selection
        if (hasJoined) {
          setGamePhase("racing");
        } else {
          setGamePhase("teamSelection");
        }
      } else if (state === 2) {
        // Finished state - might auto-reset to lobby, but we'll let events handle this
      }
    }
  }, [blockchainGameState, hasJoined]);

  // Clear any previous game data on component mount for fresh start every session
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Clear all previous game data
      localStorage.removeItem("tapnad-local-taps");
      localStorage.removeItem("tapnad-player-taps");
      localStorage.removeItem("tapnad-player-id");

      // Ensure fresh game state
      setLocalTaps({ bitcoin: 0, ethereum: 0 });
      setLocalPlayerTaps(0);
      setGamePhase("teamSelection");

      console.log("🔄 Fresh game session started!");
    }
  }, []); // Run only once on mount

  // Real-time multiplayer sync using WebSocket + localStorage fallback
  useEffect(() => {
    let raceWS: ReturnType<typeof getRaceWebSocket> | null = null;
    let syncInterval: NodeJS.Timeout;

    if (typeof window !== "undefined") {
      // Initialize WebSocket for real-time multiplayer sync
      raceWS = getRaceWebSocket();

      // Handle incoming race data from other players
      raceWS.onData((data: RaceData) => {
        console.log("🎮 Received race data from other player:", data);
        setLocalTaps((prev: { bitcoin: number; ethereum: number }) => ({
          bitcoin: Math.max(prev.bitcoin, data.bitcoin),
          ethereum: Math.max(prev.ethereum, data.ethereum),
        }));
      });

      // Monitor connection status
      const checkConnection = () => {
        setIsMultiplayerConnected(raceWS?.getConnectionStatus() || false);
      };

      checkConnection();
      const connectionInterval = setInterval(checkConnection, 2000);

      // Fallback: Poll localStorage for cross-device sync
      const lastSyncCheck = { timestamp: 0 };
      syncInterval = setInterval(() => {
        try {
          const broadcastData = localStorage.getItem("tapnad-last-broadcast");
          if (broadcastData) {
            const data: RaceData = JSON.parse(broadcastData);

            // Only sync if it's newer and from a different player
            if (data.timestamp > lastSyncCheck.timestamp && data.playerId !== raceWS?.getCurrentPlayerId()) {
              console.log("🔄 Syncing from localStorage broadcast:", data);
              setLocalTaps((prev: { bitcoin: number; ethereum: number }) => ({
                bitcoin: Math.max(prev.bitcoin, data.bitcoin),
                ethereum: Math.max(prev.ethereum, data.ethereum),
              }));
              lastSyncCheck.timestamp = data.timestamp;
            }
          }
        } catch (error) {
          console.error("Error syncing from localStorage:", error);
        }
      }, 500); // Check every 500ms for responsive updates

      return () => {
        clearInterval(connectionInterval);
        clearInterval(syncInterval);
        raceWS?.disconnect();
      };
    }
  }, []);

  // Countdown timer
  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Helper variables
  // Note: Both addresses can see organizer controls, but only the primary organizer
  // (set in contract deployment) can successfully execute contract transactions
  const isOrganizer =
    connectedAddress && ORGANIZER_ADDRESSES.map(addr => addr.toLowerCase()).includes(connectedAddress.toLowerCase());
  const canStartGame =
    bitcoinSupporters && ethereumSupporters && Number(bitcoinSupporters) > 0 && Number(ethereumSupporters) > 0;
  const currentPlayerTeam = playerTeam && Number(playerTeam) > 0 ? Number(playerTeam) - 1 : null;
  // Game flow helpers - use our local state for better UX
  const isTeamSelection = gamePhase === "teamSelection";
  const isRacing = gamePhase === "racing";

  // Note: We override blockchain state with local gamePhase for better UX flow

  // Calculate coin positions on circular track
  const calculateCoinPosition = (lap: number, position: number, coinId: number): CoinPosition => {
    const totalProgress = lap * 100 + position;
    const angle = (totalProgress / 100) * 2 * Math.PI - Math.PI / 2;

    // Base radius and center for the circular track
    const baseRadius = isRacing ? 160 : 105;
    const centerX = isRacing ? 300 : 200;
    const centerY = isRacing ? 200 : 150;

    // Lane offset for side-by-side positioning
    const laneOffset = isRacing ? 12 : 8;
    let radius = baseRadius;

    if (coinId === 0) {
      // Bitcoin - inner lane
      radius = baseRadius - laneOffset;
    } else {
      // Ethereum - outer lane
      radius = baseRadius + laneOffset;
    }

    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return {
      x,
      y,
      angle: angle + Math.PI / 2, // Car rotation to follow track direction
    };
  };

  // Calculate positions based on LOCAL TAPS for instant movement!
  const getLocalCoinPosition = (teamName: "bitcoin" | "ethereum", coinId: number) => {
    const taps = localTaps[teamName];
    const supporters = coinId === 0 ? Number(bitcoinSupporters || 1) : Number(ethereumSupporters || 1);

    // Fast racing formula: 2 position units per tap per supporter
    const tapsPerSupporter = Math.floor(taps / supporters);
    const totalPosition = tapsPerSupporter * 2;

    const lap = Math.floor(totalPosition / 100); // 100 position units = 1 lap
    const position = totalPosition % 100;

    return { lap, position };
  };

  // Get positions with instant local updates
  const bitcoinLocalProgress = getLocalCoinPosition("bitcoin", 0);
  const ethereumLocalProgress = getLocalCoinPosition("ethereum", 1);

  const bitcoinPosition = calculateCoinPosition(bitcoinLocalProgress.lap, bitcoinLocalProgress.position, 0);
  const ethereumPosition = calculateCoinPosition(ethereumLocalProgress.lap, ethereumLocalProgress.position, 1);

  // Team selection function
  const joinTeam = async (teamId: 0 | 1) => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet to join a team");
      return;
    }

    try {
      setIsJoining(true);
      await writeRaceAsync({
        functionName: "joinRace",
        args: [teamId],
      });
    } catch (error) {
      console.error("Error joining team:", error);
      notification.error("Failed to join team");
    } finally {
      setIsJoining(false);
    }
  };

  // Start game function
  const startGame = async () => {
    try {
      setIsStarting(true);
      await writeRaceAsync({
        functionName: "startGame",
      });
    } catch (error) {
      console.error("Error starting game:", error);
      notification.error("Failed to start game");
      setIsStarting(false);
    }
  };

  // Reset game function
  const resetGame = async () => {
    try {
      await writeRaceAsync({
        functionName: "resetGame",
      });
    } catch (error) {
      console.error("Error resetting game:", error);
      notification.error("Failed to reset game");
    }
  };

  // INSTANT TAP FUNCTION - Pure local gameplay, NO transactions!
  const handleTap = () => {
    if (!connectedAddress || !hasJoined) {
      notification.error("Please join a team first");
      return;
    }

    // Pure speed contest - no cooldown, instant tapping!
    const teamName = currentPlayerTeam === 0 ? "bitcoin" : "ethereum";

    // Instantly update local state
    setLocalPlayerTaps(prev => prev + 1);
    setLocalTaps((prev: { bitcoin: number; ethereum: number }) => {
      const newTaps = {
        ...prev,
        [teamName]: prev[teamName] + 1,
      };

      // Check for game completion after updating taps
      const supporters = teamName === "bitcoin" ? Number(bitcoinSupporters || 1) : Number(ethereumSupporters || 1);
      const tapsPerSupporter = Math.floor(newTaps[teamName] / supporters);
      const totalPosition = tapsPerSupporter * 2;
      const lap = Math.floor(totalPosition / 100);

      // End game when any team reaches 3 laps!
      if (lap >= 3) {
        setTimeout(() => {
          const winnerName = teamName === "bitcoin" ? "Bitcoin" : "Ethereum";
          notification.success(`🏆 ${winnerName} WINS THE RACE! 🏁`);
          setGamePhase("results");

          // Auto-reset after 5 seconds for next race
          setTimeout(() => {
            setLocalTaps({ bitcoin: 0, ethereum: 0 });
            setLocalPlayerTaps(0);
            setGamePhase("teamSelection");
            notification.info("🔄 Ready for next race! Join your teams!");
          }, 5000);
        }, 100);
      }

      // Broadcast to other players via WebSocket
      if (typeof window !== "undefined") {
        const raceWS = getRaceWebSocket();
        raceWS.sendRaceData(newTaps.bitcoin, newTaps.ethereum);
      }

      return newTaps;
    });

    // Visual feedback
    setIsTapping(true);
    setTimeout(() => setIsTapping(false), 100); // Quick visual feedback
  };

  // Removed batch submission - pure local gameplay only!

  // Mobile responsive classes for much wider track
  const trackSize = isRacing ? "w-full h-80 md:h-96 lg:h-[500px]" : "w-full h-64 md:h-80";
  const viewBox = isRacing ? "0 0 600 400" : "0 0 400 300";

  return (
    <>
      {/* Custom CSS for animations */}
      <style jsx>{`
        .animation-delay-100 {
          animation-delay: 0.1s;
        }
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
        .animation-delay-500 {
          animation-delay: 0.5s;
        }
        .animation-delay-700 {
          animation-delay: 0.7s;
        }
        .animation-delay-900 {
          animation-delay: 0.9s;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        @keyframes racing-zoom {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes tire-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes nitro-boost {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
            transform: scale(1);
          }
          50% {
            box-shadow:
              0 0 40px rgba(139, 92, 246, 1),
              0 0 60px rgba(168, 85, 247, 0.8);
            transform: scale(1.05);
          }
        }

        .racing-zoom {
          animation: racing-zoom 1.5s ease-in-out infinite;
        }

        .tire-spin {
          animation: tire-spin 2s linear infinite;
        }

        .nitro-boost {
          animation: nitro-boost 1s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen racing-gradient p-2 md:p-4 relative overflow-y-auto flex flex-col">
        {/* Racing background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="checkered-pattern w-full h-full"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10 flex-1 flex flex-col">
          {/* Header */}
          <div className="text-center mb-2 md:mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-wider drop-shadow-2xl">
              TAPNAD RACING
            </h1>
            <p className="text-sm md:text-base text-purple-200 font-semibold">Bitcoin vs Ethereum Championship</p>
            {isRacing && (
              <div className="mt-1">
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/30">
                  RACE IN PROGRESS
                </span>
              </div>
            )}
          </div>

          <div className={`${isRacing ? "flex flex-col lg:flex-row gap-4" : "lg:grid lg:grid-cols-3"} gap-6 flex-1`}>
            {/* Race Track */}
            <div className={`${isRacing ? "flex-1 mb-4" : "lg:col-span-2 mb-6 lg:mb-0"}`}>
              <div className="bg-black/40 backdrop-blur-sm rounded-xl md:rounded-2xl p-2 md:p-4 border-2 border-purple-400/50 shadow-2xl racing-track">
                <div className="flex justify-center relative">
                  <svg className={trackSize} viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
                    {/* Track Background */}
                    <rect width="100%" height="100%" fill="#0f172a" />

                    {/* Track Background (Asphalt) */}
                    <circle
                      cx={isRacing ? 300 : 200}
                      cy={isRacing ? 200 : 150}
                      r={isRacing ? 180 : 120}
                      fill="#1f2937"
                      stroke="#374151"
                      strokeWidth="3"
                    />

                    {/* Outer Track Barrier */}
                    <circle
                      cx={isRacing ? 300 : 200}
                      cy={isRacing ? 200 : 150}
                      r={isRacing ? 180 : 120}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="4"
                      strokeDasharray="15,8"
                      opacity="0.8"
                    />

                    {/* Main Racing Track */}
                    <circle
                      cx={isRacing ? 300 : 200}
                      cy={isRacing ? 200 : 150}
                      r={isRacing ? 160 : 105}
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth={isRacing ? "40" : "30"}
                      opacity="0.9"
                    />

                    {/* Track Center Line */}
                    <circle
                      cx={isRacing ? 300 : 200}
                      cy={isRacing ? 200 : 150}
                      r={isRacing ? 160 : 105}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="3"
                      strokeDasharray="20,15"
                      opacity="0.8"
                    />

                    {/* Inner Track Barrier */}
                    <circle
                      cx={isRacing ? 300 : 200}
                      cy={isRacing ? 200 : 150}
                      r={isRacing ? 140 : 90}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="4"
                      strokeDasharray="15,8"
                      opacity="0.8"
                    />

                    {/* Start/Finish Line - Checkered Pattern */}
                    <g>
                      {/* White base */}
                      <rect x={isRacing ? 295 : 195} y={isRacing ? 20 : 30} width="10" height="40" fill="#ffffff" />
                      {/* Black squares for checkered pattern */}
                      <rect x={isRacing ? 295 : 195} y={isRacing ? 20 : 30} width="5" height="5" fill="#000000" />
                      <rect x={isRacing ? 300 : 200} y={isRacing ? 25 : 35} width="5" height="5" fill="#000000" />
                      <rect x={isRacing ? 295 : 195} y={isRacing ? 30 : 40} width="5" height="5" fill="#000000" />
                      <rect x={isRacing ? 300 : 200} y={isRacing ? 35 : 45} width="5" height="5" fill="#000000" />
                      <rect x={isRacing ? 295 : 195} y={isRacing ? 40 : 50} width="5" height="5" fill="#000000" />
                      <rect x={isRacing ? 300 : 200} y={isRacing ? 45 : 55} width="5" height="5" fill="#000000" />
                      <rect x={isRacing ? 295 : 195} y={isRacing ? 50 : 60} width="5" height="5" fill="#000000" />
                      <rect x={isRacing ? 300 : 200} y={isRacing ? 55 : 65} width="5" height="5" fill="#000000" />
                    </g>

                    {/* Racing Markers */}
                    <g opacity="0.6">
                      {/* Quarter markers */}
                      <circle cx={isRacing ? 460 : 305} cy={isRacing ? 200 : 150} r="4" fill="#fbbf24" />
                      <circle cx={isRacing ? 300 : 200} cy={isRacing ? 360 : 270} r="4" fill="#fbbf24" />
                      <circle cx={isRacing ? 140 : 95} cy={isRacing ? 200 : 150} r="4" fill="#fbbf24" />
                    </g>

                    {/* Bitcoin Racing Car */}
                    <g
                      transform={`translate(${bitcoinPosition.x}, ${bitcoinPosition.y}) rotate(${(bitcoinPosition.angle * 180) / Math.PI})`}
                    >
                      {/* Car Body */}
                      <ellipse
                        rx={isRacing ? "18" : "14"}
                        ry={isRacing ? "8" : "6"}
                        fill="#f7931a"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {/* Car Details */}
                      <rect
                        x={isRacing ? "-12" : "-9"}
                        y={isRacing ? "-3" : "-2"}
                        width={isRacing ? "24" : "18"}
                        height={isRacing ? "6" : "4"}
                        fill="#ff8c00"
                        rx="2"
                      />
                      {/* Windshield */}
                      <ellipse rx={isRacing ? "8" : "6"} ry={isRacing ? "4" : "3"} fill="#87ceeb" opacity="0.7" />
                      {/* Bitcoin Symbol */}
                      <text
                        y="3"
                        textAnchor="middle"
                        className={`${isRacing ? "text-xs" : "text-[8px]"} font-bold fill-white`}
                      >
                        ₿
                      </text>
                      {/* Racing Stripes */}
                      <line
                        x1={isRacing ? "-15" : "-12"}
                        y1="0"
                        x2={isRacing ? "15" : "12"}
                        y2="0"
                        stroke="#ffffff"
                        strokeWidth="1"
                        opacity="0.8"
                      />
                    </g>

                    {/* Ethereum Racing Car */}
                    <g
                      transform={`translate(${ethereumPosition.x}, ${ethereumPosition.y}) rotate(${(ethereumPosition.angle * 180) / Math.PI})`}
                    >
                      {/* Car Body */}
                      <ellipse
                        rx={isRacing ? "18" : "14"}
                        ry={isRacing ? "8" : "6"}
                        fill="#627eea"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {/* Car Details */}
                      <rect
                        x={isRacing ? "-12" : "-9"}
                        y={isRacing ? "-3" : "-2"}
                        width={isRacing ? "24" : "18"}
                        height={isRacing ? "6" : "4"}
                        fill="#4169e1"
                        rx="2"
                      />
                      {/* Windshield */}
                      <ellipse rx={isRacing ? "8" : "6"} ry={isRacing ? "4" : "3"} fill="#87ceeb" opacity="0.7" />
                      {/* Ethereum Symbol */}
                      <text
                        y="4"
                        textAnchor="middle"
                        className={`${isRacing ? "text-xs" : "text-[8px]"} font-bold fill-white`}
                      >
                        Ξ
                      </text>
                      {/* Racing Stripes */}
                      <line
                        x1={isRacing ? "-15" : "-12"}
                        y1="0"
                        x2={isRacing ? "15" : "12"}
                        y2="0"
                        stroke="#ffffff"
                        strokeWidth="1"
                        opacity="0.8"
                      />
                    </g>

                    {/* Racing Countdown Timer */}
                    {countdown !== null && (
                      <g>
                        {/* Countdown Background */}
                        <circle
                          cx={isRacing ? "180" : "120"}
                          cy={isRacing ? "180" : "120"}
                          r="50"
                          fill="rgba(0,0,0,0.9)"
                          stroke="#8b5cf6"
                          strokeWidth="4"
                        />
                        {/* Racing stripes around countdown */}
                        <circle
                          cx={isRacing ? "180" : "120"}
                          cy={isRacing ? "180" : "120"}
                          r="45"
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                        {/* Countdown Text */}
                        <text
                          x={isRacing ? "180" : "120"}
                          y={isRacing ? "190" : "130"}
                          textAnchor="middle"
                          className="text-2xl md:text-3xl font-bold fill-white"
                        >
                          {countdown === 0 ? "🏁 GO!" : `${countdown}`}
                        </text>
                        {/* Racing flag emoji for GO */}
                        {countdown === 0 && (
                          <text
                            x={isRacing ? "180" : "120"}
                            y={isRacing ? "170" : "110"}
                            textAnchor="middle"
                            className="text-lg font-bold fill-yellow-400"
                          >
                            🏁
                          </text>
                        )}
                      </g>
                    )}
                  </svg>
                </div>

                {/* Lap Progress (only during race) */}
                {isRacing && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="text-center bg-black/30 rounded-lg p-3 border border-yellow-400/30">
                      <div className="text-yellow-400 font-bold text-sm md:text-base flex items-center justify-center gap-2">
                        🏎️ ₿ Bitcoin Racer
                      </div>
                      <div className="text-yellow-200/80 text-xs md:text-sm font-semibold">
                        Lap {bitcoinLocalProgress.lap + 1} / 3
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3 mt-2 border border-yellow-400/50">
                        <div
                          className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-300 racing-pulse"
                          style={{ width: `${bitcoinLocalProgress.position}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-yellow-300 mt-1">{bitcoinLocalProgress.position}% Complete</div>
                    </div>
                    <div className="text-center bg-black/30 rounded-lg p-3 border border-blue-400/30">
                      <div className="text-blue-400 font-bold text-sm md:text-base flex items-center justify-center gap-2">
                        🏎️ Ξ Ethereum Racer
                      </div>
                      <div className="text-blue-200/80 text-xs md:text-sm font-semibold">
                        Lap {ethereumLocalProgress.lap + 1} / 3
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3 mt-2 border border-blue-400/50">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-cyan-500 h-3 rounded-full transition-all duration-300 racing-pulse"
                          style={{ width: `${ethereumLocalProgress.position}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-blue-300 mt-1">{ethereumLocalProgress.position}% Complete</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Team Selection & Controls */}
            {isTeamSelection && (
              <div className="space-y-4 md:space-y-6">
                {/* Team Selection */}
                <div className="bg-black/40 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 border-2 border-purple-400/50 shadow-2xl">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">Choose Your Racing Team</h3>

                  {/* Game State Indicator */}
                  <div className="mb-4 p-3 rounded-lg border-2 bg-gradient-to-r from-black/60 to-gray-900/60">
                    <p className="text-center text-sm font-bold">
                      Contract State:{" "}
                      <span className={`${Number(blockchainGameState) === 0 ? "text-green-400" : "text-red-400"}`}>
                        {Number(blockchainGameState) === 0
                          ? "🟢 LOBBY (Ready to Join)"
                          : Number(blockchainGameState) === 1
                            ? "🔴 GAME IN PROGRESS"
                            : "🔴 GAME FINISHED"}
                      </span>
                    </p>
                    {Number(blockchainGameState) !== 0 && (
                      <div className="mt-2 p-2 bg-red-900/30 border border-red-400/50 rounded">
                        <p className="text-red-200 text-xs text-center font-semibold">
                          ⚠️ Players cannot join right now. Organizer must reset the game first.
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-center text-green-400 text-sm mb-4 font-semibold bg-black/30 rounded-lg p-2 border border-green-400/30">
                    FREE to join • No payment required • Pure racing skill
                  </p>

                  {/* Bitcoin Racing Team */}
                  <div
                    className={`p-3 md:p-4 rounded-lg mb-4 border-2 transition-all transform hover:scale-105 ${
                      currentPlayerTeam === 0
                        ? "border-yellow-500 bg-gradient-to-br from-yellow-500/30 to-orange-500/20 racing-pulse"
                        : "border-yellow-400/30 hover:border-yellow-400/70 bg-black/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 md:space-x-3">
                        <span className="text-2xl md:text-3xl">₿</span>
                        <div>
                          <h4 className="text-lg md:text-xl font-bold text-yellow-400">Bitcoin Racing Team</h4>
                          <p className="text-xs md:text-sm text-yellow-200/80 font-semibold">
                            The Original Speed Demon
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg md:text-xl font-bold text-white">
                          {bitcoinSupporters?.toString() || "0"}
                        </div>
                        <div className="text-xs text-yellow-300/70 font-semibold">racers</div>
                      </div>
                    </div>
                    {!hasJoined && (
                      <button
                        onClick={() => joinTeam(0)}
                        disabled={isJoining || Number(blockchainGameState) !== 0}
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold py-2 md:py-3 px-4 rounded-lg transition-all transform hover:scale-105 text-sm md:text-base border-2 border-yellow-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isJoining
                          ? "Joining Race..."
                          : Number(blockchainGameState) !== 0
                            ? "Game Not in Lobby"
                            : "Join Bitcoin Racing Team"}
                      </button>
                    )}
                    {currentPlayerTeam === 0 && (
                      <div className="bg-gradient-to-r from-yellow-500/30 to-orange-500/20 text-yellow-300 py-2 px-3 rounded text-center font-bold text-sm border border-yellow-400/50">
                        You&apos;re racing for Bitcoin!
                      </div>
                    )}
                  </div>

                  {/* Ethereum Racing Team */}
                  <div
                    className={`p-3 md:p-4 rounded-lg border-2 transition-all transform hover:scale-105 ${
                      currentPlayerTeam === 1
                        ? "border-blue-500 bg-gradient-to-br from-blue-500/30 to-cyan-500/20 racing-pulse"
                        : "border-blue-400/30 hover:border-blue-400/70 bg-black/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 md:space-x-3">
                        <span className="text-2xl md:text-3xl">Ξ</span>
                        <div>
                          <h4 className="text-lg md:text-xl font-bold text-blue-400">Ethereum Racing Team</h4>
                          <p className="text-xs md:text-sm text-blue-200/80 font-semibold">The Smart Racing Machine</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg md:text-xl font-bold text-white">
                          {ethereumSupporters?.toString() || "0"}
                        </div>
                        <div className="text-xs text-blue-300/70 font-semibold">racers</div>
                      </div>
                    </div>
                    {!hasJoined && (
                      <button
                        onClick={() => joinTeam(1)}
                        disabled={isJoining || Number(blockchainGameState) !== 0}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-2 md:py-3 px-4 rounded-lg transition-all transform hover:scale-105 text-sm md:text-base border-2 border-blue-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isJoining
                          ? "Joining Race..."
                          : Number(blockchainGameState) !== 0
                            ? "Game Not in Lobby"
                            : "Join Ethereum Racing Team"}
                      </button>
                    )}
                    {currentPlayerTeam === 1 && (
                      <div className="bg-gradient-to-r from-blue-500/30 to-cyan-500/20 text-blue-300 py-2 px-3 rounded text-center font-bold text-sm border border-blue-400/50">
                        You&apos;re racing for Ethereum!
                      </div>
                    )}
                  </div>
                </div>

                {/* Racing Team Rosters */}
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                  {/* Bitcoin Racing Team */}
                  <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 md:p-4 border-2 border-yellow-400/30">
                    <h4 className="text-sm md:text-base font-bold text-yellow-400 mb-2 flex items-center gap-2">
                      ₿ Bitcoin Racers
                    </h4>
                    <div className="space-y-1 max-h-32 md:max-h-40 overflow-y-auto">
                      {bitcoinSupportersList && bitcoinSupportersList.length > 0 ? (
                        bitcoinSupportersList.map((supporter, index) => (
                          <div key={index} className="text-xs text-yellow-200/90 bg-yellow-500/10 rounded p-1">
                            <Address address={supporter} size="xs" />
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-yellow-300/50 italic">No racers yet - be the first!</p>
                      )}
                    </div>
                  </div>

                  {/* Ethereum Racing Team */}
                  <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 md:p-4 border-2 border-blue-400/30">
                    <h4 className="text-sm md:text-base font-bold text-blue-400 mb-2 flex items-center gap-2">
                      Ξ Ethereum Racers
                    </h4>
                    <div className="space-y-1 max-h-32 md:max-h-40 overflow-y-auto">
                      {ethereumSupportersList && ethereumSupportersList.length > 0 ? (
                        ethereumSupportersList.map((supporter, index) => (
                          <div key={index} className="text-xs text-blue-200/90 bg-blue-500/10 rounded p-1">
                            <Address address={supporter} size="xs" />
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-blue-300/50 italic">No racers yet - be the first!</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Race Control Center (Organizer Only) */}
                {isOrganizer && (
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 md:p-6 border-2 border-purple-400/50 shadow-2xl">
                    <h4 className="text-lg font-bold text-purple-300 mb-4 text-center">Race Control Center</h4>
                    <div className="space-y-3">
                      {Number(blockchainGameState) !== 0 && (
                        <div className="p-3 bg-red-900/30 border border-red-400/50 rounded-lg">
                          <p className="text-red-200 text-sm font-bold text-center">🚨 ORGANIZER ACTION REQUIRED</p>
                          <p className="text-red-300 text-xs text-center mt-1">
                            Game is stuck in {Number(blockchainGameState) === 1 ? "In Progress" : "Finished"} state.
                            Click Reset to allow new players to join.
                          </p>
                        </div>
                      )}
                      <button
                        onClick={startGame}
                        disabled={!canStartGame || isStarting}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 md:py-4 px-6 rounded-lg transition-all transform hover:scale-105 text-lg md:text-xl disabled:opacity-50 disabled:cursor-not-allowed border-2 border-green-400/50"
                      >
                        {isStarting
                          ? "Starting Engines..."
                          : canStartGame
                            ? "START THE RACE"
                            : "Need racers on both teams"}
                      </button>
                      <button
                        onClick={resetGame}
                        className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 text-sm md:text-base border-2 ${
                          Number(blockchainGameState) !== 0
                            ? "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 border-red-400/50 animate-pulse"
                            : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 border-gray-400/50"
                        }`}
                      >
                        {Number(blockchainGameState) !== 0 ? "🔄 RESET GAME (Required)" : "Reset Championship"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Racing Control Panel (During Race) */}
            {isRacing && (
              <div className="w-full lg:w-80 bg-black/40 backdrop-blur-sm rounded-xl p-4 border-2 border-purple-400/50 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4 text-center">
                  {currentPlayerTeam !== null
                    ? `${currentPlayerTeam === 0 ? "Bitcoin" : "Ethereum"} Racing Control`
                    : "Spectator Mode"}
                </h3>

                {hasJoined && currentPlayerTeam !== null ? (
                  <div className="space-y-4">
                    {/* Circular Racing Accelerator Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={handleTap}
                        disabled={isTapping || countdown !== null}
                        className={`w-32 h-32 rounded-full font-bold text-lg transition-all active:scale-95 border-4 shadow-2xl ${
                          currentPlayerTeam === 0
                            ? "bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black border-yellow-300"
                            : "bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-blue-300"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {countdown !== null ? "Wait..." : isTapping ? "TAPPING!" : "TAP!"}
                      </button>
                    </div>

                    {/* Racing Dashboard */}
                    <div className="bg-black/50 rounded-xl p-3 border border-purple-400/30">
                      <div className="space-y-3">
                        <div className="text-center">
                          <p className="text-sm font-bold text-white">
                            Your Taps: <span className="text-purple-300">{localPlayerTaps}</span>
                          </p>
                        </div>

                        {/* Team Totals - INSTANT LOCAL COUNTS */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-yellow-500/20 rounded-lg p-2 border border-yellow-400/30">
                            <div className="text-center">
                              <span className="text-yellow-400 font-bold text-xs">₿ Bitcoin</span>
                              <div className="text-white text-sm font-bold">{localTaps.bitcoin}</div>
                            </div>
                          </div>
                          <div className="bg-blue-500/20 rounded-lg p-2 border border-blue-400/30">
                            <div className="text-center">
                              <span className="text-blue-400 font-bold text-xs">Ξ Ethereum</span>
                              <div className="text-white text-sm font-bold">{localTaps.ethereum}</div>
                            </div>
                          </div>
                        </div>

                        {/* Racing Info */}
                        <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 p-2 rounded-lg border border-green-400/30">
                          <p className="text-green-300 text-xs font-bold text-center">🚀 PURE SPEED RACING 🚀</p>
                          <p className="text-purple-300 text-xs text-center">No transactions! Just pure speed!</p>
                          <div className="flex flex-col items-center gap-1 mt-1">
                            <div className="flex justify-center items-center gap-1">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  isMultiplayerConnected ? "bg-green-400 animate-pulse" : "bg-gray-500"
                                }`}
                              ></div>
                              <span
                                className={`text-xs ${isMultiplayerConnected ? "text-green-300" : "text-gray-400"}`}
                              >
                                {isMultiplayerConnected ? "Multiplayer ON" : "Single Player"}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400">
                              BTC: {localTaps.bitcoin} | ETH: {localTaps.ethereum}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="bg-black/50 rounded-xl p-6 border-2 border-purple-400/30">
                      <p className="text-purple-200 text-lg font-bold mb-4">
                        {!connectedAddress ? "Connect wallet to join the race!" : "Join a racing team to compete!"}
                      </p>

                      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-4 rounded-lg border border-blue-400/30 mb-4">
                        <p className="text-blue-300 text-sm font-semibold mb-2">Racing Championship Info:</p>
                        <p className="text-purple-200/90 text-xs mb-2">
                          Need test ETH? Use &quot;Burner Wallet&quot; (comes with free racing fuel) or ask the race
                          organizer!
                        </p>
                        <p className="text-green-400 text-xs font-semibold">
                          Joining racing teams is FREE - only gas fees for racing!
                        </p>
                      </div>

                      <button
                        onClick={() => router.push("/")}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg text-sm md:text-base border-2 border-purple-400/50 transform hover:scale-105 transition-all"
                      >
                        Back to Racing Hub
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Back Button (only in team selection) */}
          {isTeamSelection && (
            <div className="text-center mt-6">
              <button
                onClick={() => router.push("/")}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-lg text-sm md:text-base border-2 border-purple-400/50 transform hover:scale-105 transition-all"
              >
                ← Back to Racing Hub
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
