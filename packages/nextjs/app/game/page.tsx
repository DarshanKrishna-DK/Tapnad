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

// 🚨 IMPORTANT: Replace with YOUR wallet address for demo control
const ORGANIZER_ADDRESS = "0xf33bfa994D5ebeb7DD14ff09fB0dEF2c8e2A7227";
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
  const [lastTapTime, setLastTapTime] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Game flow control - overrides blockchain state for better UX
  const [gamePhase, setGamePhase] = useState<"teamSelection" | "racing" | "results">("teamSelection");
  const [winner, setWinner] = useState<{ coinId: number; name: string } | null>(null);
  const [raceResults, setRaceResults] = useState<{
    duration: number;
    bitcoinTaps: number;
    ethereumTaps: number;
    totalPlayers: number;
  } | null>(null);

  // Note: We use local gamePhase state instead of blockchain gameState for better UX flow

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

  const { data: bitcoinProgress } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "getCoinProgress",
    args: [0],
  });

  const { data: ethereumProgress } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "getCoinProgress",
    args: [1],
  });

  const { data: playerTaps } = useScaffoldReadContract({
    contractName: "Race",
    functionName: "playerTaps",
    args: [connectedAddress],
  });

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

  // Write function (with notifications disabled for cleaner tap experience)
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
        setWinner({ coinId: winnerCoinId, name: winnerName });
        setRaceResults({
          duration: Number(log.args.duration) || 0,
          bitcoinTaps: Number(bitcoinTotalTaps) || 0,
          ethereumTaps: Number(ethereumTotalTaps) || 0,
          totalPlayers: (Number(bitcoinSupporters) || 0) + (Number(ethereumSupporters) || 0),
        });

        // Transition to results page
        setGamePhase("results");
        setCountdown(null);
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "Race",
    eventName: "GameReset",
    onLogs: () => {
      // Reset to team selection phase
      setGamePhase("teamSelection");
      setWinner(null);
      setRaceResults(null);
      setCountdown(null);
      notification.info("🔄 Ready for new race! Join your team again.");
    },
  });

  // Track tapping activity for UX feedback
  useEffect(() => {
    // No cooldown needed - pure speed contest!
  }, [lastTapTime]);

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
  const isOrganizer = connectedAddress && connectedAddress.toLowerCase() === ORGANIZER_ADDRESS.toLowerCase();
  const canStartGame =
    bitcoinSupporters && ethereumSupporters && Number(bitcoinSupporters) > 0 && Number(ethereumSupporters) > 0;
  const currentPlayerTeam = playerTeam && Number(playerTeam) > 0 ? Number(playerTeam) - 1 : null;
  // Game flow helpers - use our local state for better UX
  const isTeamSelection = gamePhase === "teamSelection";
  const isRacing = gamePhase === "racing";
  const isResults = gamePhase === "results";

  // Note: We override blockchain state with local gamePhase for better UX flow

  // Calculate coin positions
  const calculateCoinPosition = (lap: number, position: number): CoinPosition => {
    const totalProgress = lap * 100 + position;
    const angle = (totalProgress / 100) * 2 * Math.PI - Math.PI / 2;
    const radius = isRacing ? 120 : 80;
    const centerX = isRacing ? 180 : 120;
    const centerY = isRacing ? 180 : 120;

    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      angle: angle + Math.PI / 2,
    };
  };

  const bitcoinPosition = bitcoinProgress
    ? calculateCoinPosition(Number(bitcoinProgress[0]), Number(bitcoinProgress[1]))
    : { x: 120, y: 40, angle: 0 };
  const ethereumPosition = ethereumProgress
    ? calculateCoinPosition(Number(ethereumProgress[0]), Number(ethereumProgress[1]))
    : { x: 120, y: 40, angle: 0 };

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

  // Tap function - pure speed contest!
  const handleTap = async () => {
    if (!connectedAddress || !hasJoined) {
      notification.error("Please join a team first");
      return;
    }

    // No cooldown - tap as fast as you can!
    try {
      setIsTapping(true);
      setLastTapTime(Date.now());
      await writeRaceAsync({
        functionName: "tap",
      });
      // No success notification - keep it fast and clean!
    } catch (error) {
      console.error("Error tapping:", error);
      // Note: ETH deduction is just gas fees for blockchain transactions
      notification.error("Tap failed - ensure you have test ETH for gas fees");
    } finally {
      setIsTapping(false);
    }
  };

  // Mobile responsive classes
  const trackSize = isRacing ? "w-80 h-80 md:w-96 md:h-96" : "w-60 h-60 md:w-72 md:h-72";
  const viewBox = isRacing ? "0 0 360 360" : "0 0 240 240";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-2 md:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 md:mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">🏁 TAPNAD</h1>
          <p className="text-lg md:text-xl text-white/80">Bitcoin vs Ethereum Racing</p>
          {isRacing && (
            <div className="mt-2">
              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                🏁 RACE IN PROGRESS
              </span>
            </div>
          )}
        </div>

        <div className={`${isRacing ? "block" : "lg:grid lg:grid-cols-3"} gap-6`}>
          {/* Race Track */}
          <div className={`${isRacing ? "mb-6" : "lg:col-span-2 mb-6 lg:mb-0"}`}>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/20">
              <div className="flex justify-center relative">
                <svg className={trackSize} viewBox={viewBox}>
                  {/* Track */}
                  <circle
                    cx={isRacing ? "180" : "120"}
                    cy={isRacing ? "180" : "120"}
                    r={isRacing ? "120" : "80"}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeDasharray="8,4"
                    opacity="0.6"
                  />

                  {/* Start/Finish Line */}
                  <line
                    x1={isRacing ? "180" : "120"}
                    y1={isRacing ? "50" : "35"}
                    x2={isRacing ? "180" : "120"}
                    y2={isRacing ? "80" : "55"}
                    stroke="#ef4444"
                    strokeWidth="4"
                  />

                  {/* Bitcoin */}
                  <g transform={`translate(${bitcoinPosition.x}, ${bitcoinPosition.y})`}>
                    <circle r={isRacing ? "16" : "12"} fill="#f7931a" stroke="#ffffff" strokeWidth="2" />
                    <text
                      y="5"
                      textAnchor="middle"
                      className={`${isRacing ? "text-sm" : "text-xs"} font-bold fill-white`}
                    >
                      ₿
                    </text>
                  </g>

                  {/* Ethereum */}
                  <g transform={`translate(${ethereumPosition.x}, ${ethereumPosition.y})`}>
                    <circle r={isRacing ? "16" : "12"} fill="#627eea" stroke="#ffffff" strokeWidth="2" />
                    <text
                      y="6"
                      textAnchor="middle"
                      className={`${isRacing ? "text-sm" : "text-xs"} font-bold fill-white`}
                    >
                      Ξ
                    </text>
                  </g>

                  {/* Countdown Timer */}
                  {countdown !== null && (
                    <g>
                      <circle
                        cx={isRacing ? "180" : "120"}
                        cy={isRacing ? "180" : "120"}
                        r="40"
                        fill="rgba(0,0,0,0.8)"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={isRacing ? "180" : "120"}
                        y={isRacing ? "190" : "130"}
                        textAnchor="middle"
                        className="text-2xl md:text-3xl font-bold fill-white"
                      >
                        {countdown === 0 ? "TAP!" : countdown}
                      </text>
                    </g>
                  )}
                </svg>
              </div>

              {/* Lap Progress (only during race) */}
              {isRacing && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold text-sm md:text-base">₿ Bitcoin</div>
                    <div className="text-white/70 text-xs md:text-sm">
                      Lap {bitcoinProgress ? (Number(bitcoinProgress[0]) + 1).toString() : "1"} / 3
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${bitcoinProgress ? Number(bitcoinProgress[1]) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-bold text-sm md:text-base">Ξ Ethereum</div>
                    <div className="text-white/70 text-xs md:text-sm">
                      Lap {ethereumProgress ? (Number(ethereumProgress[0]) + 1).toString() : "1"} / 3
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${ethereumProgress ? Number(ethereumProgress[1]) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Team Selection & Controls */}
          {isTeamSelection && (
            <div className="space-y-4 md:space-y-6">
              {/* Team Selection */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/20">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">Choose Your Team</h3>
                <p className="text-center text-green-400 text-sm mb-4 font-semibold">
                  ✅ FREE to join • No payment required
                </p>

                {/* Bitcoin Team */}
                <div
                  className={`p-3 md:p-4 rounded-lg mb-4 border-2 transition-all ${
                    currentPlayerTeam === 0
                      ? "border-yellow-500 bg-yellow-500/20"
                      : "border-white/20 hover:border-yellow-400/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <span className="text-2xl md:text-3xl">₿</span>
                      <div>
                        <h4 className="text-lg md:text-xl font-bold text-yellow-400">Team Bitcoin</h4>
                        <p className="text-xs md:text-sm text-white/70">The Original</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg md:text-xl font-bold text-white">
                        {bitcoinSupporters?.toString() || "0"}
                      </div>
                      <div className="text-xs text-white/70">supporters</div>
                    </div>
                  </div>
                  {!hasJoined && (
                    <button
                      onClick={() => joinTeam(0)}
                      disabled={isJoining}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 md:py-3 px-4 rounded-lg transition-colors text-sm md:text-base"
                    >
                      {isJoining ? "Joining..." : "Join Team Bitcoin"}
                    </button>
                  )}
                  {currentPlayerTeam === 0 && (
                    <div className="bg-yellow-500/20 text-yellow-300 py-2 px-3 rounded text-center font-bold text-sm">
                      ✅ You&apos;re on this team!
                    </div>
                  )}
                </div>

                {/* Ethereum Team */}
                <div
                  className={`p-3 md:p-4 rounded-lg border-2 transition-all ${
                    currentPlayerTeam === 1
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-white/20 hover:border-blue-400/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <span className="text-2xl md:text-3xl">Ξ</span>
                      <div>
                        <h4 className="text-lg md:text-xl font-bold text-blue-400">Team Ethereum</h4>
                        <p className="text-xs md:text-sm text-white/70">Smart Contracts</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg md:text-xl font-bold text-white">
                        {ethereumSupporters?.toString() || "0"}
                      </div>
                      <div className="text-xs text-white/70">supporters</div>
                    </div>
                  </div>
                  {!hasJoined && (
                    <button
                      onClick={() => joinTeam(1)}
                      disabled={isJoining}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 md:py-3 px-4 rounded-lg transition-colors text-sm md:text-base"
                    >
                      {isJoining ? "Joining..." : "Join Team Ethereum"}
                    </button>
                  )}
                  {currentPlayerTeam === 1 && (
                    <div className="bg-blue-500/20 text-blue-300 py-2 px-3 rounded text-center font-bold text-sm">
                      ✅ You&apos;re on this team!
                    </div>
                  )}
                </div>
              </div>

              {/* Player Lists */}
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                {/* Bitcoin Players */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/20">
                  <h4 className="text-sm md:text-base font-bold text-yellow-400 mb-2">₿ Players</h4>
                  <div className="space-y-1 max-h-32 md:max-h-40 overflow-y-auto">
                    {bitcoinSupportersList && bitcoinSupportersList.length > 0 ? (
                      bitcoinSupportersList.map((supporter, index) => (
                        <div key={index} className="text-xs text-white/80">
                          <Address address={supporter} size="xs" />
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-white/50 italic">No players yet</p>
                    )}
                  </div>
                </div>

                {/* Ethereum Players */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/20">
                  <h4 className="text-sm md:text-base font-bold text-blue-400 mb-2">Ξ Players</h4>
                  <div className="space-y-1 max-h-32 md:max-h-40 overflow-y-auto">
                    {ethereumSupportersList && ethereumSupportersList.length > 0 ? (
                      ethereumSupportersList.map((supporter, index) => (
                        <div key={index} className="text-xs text-white/80">
                          <Address address={supporter} size="xs" />
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-white/50 italic">No players yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Start Button (Organizer Only) */}
              {isOrganizer && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20">
                  <div className="space-y-3">
                    <button
                      onClick={startGame}
                      disabled={!canStartGame || isStarting}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 md:py-4 px-6 rounded-lg transition-colors text-lg md:text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isStarting ? "Starting..." : canStartGame ? "🚀 START RACE" : "Need players on both teams"}
                    </button>
                    <button
                      onClick={resetGame}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm md:text-base"
                    >
                      🔄 Reset Game
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tap Button (During Race) */}
          {isRacing && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
                {currentPlayerTeam !== null
                  ? `Team ${currentPlayerTeam === 0 ? "Bitcoin" : "Ethereum"}`
                  : "Spectator Mode"}
              </h3>

              {hasJoined && currentPlayerTeam !== null ? (
                <div className="text-center space-y-4">
                  <button
                    onClick={handleTap}
                    disabled={isTapping || countdown !== null}
                    className={`w-full py-8 md:py-12 px-6 rounded-xl font-bold text-2xl md:text-4xl transition-all active:scale-95 ${
                      currentPlayerTeam === 0
                        ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {countdown !== null ? "Wait..." : isTapping ? "Tapping..." : "TAP FAST! 🚀"}
                  </button>

                  <div className="space-y-2">
                    <p className="text-lg md:text-xl font-bold text-white">
                      Your Taps: {playerTaps?.toString() || "0"}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-yellow-400">₿ Total:</span>
                        <span className="text-white ml-1">{bitcoinTotalTaps?.toString() || "0"}</span>
                      </div>
                      <div>
                        <span className="text-blue-400">Ξ Total:</span>
                        <span className="text-white ml-1">{ethereumTotalTaps?.toString() || "0"}</span>
                      </div>
                    </div>
                    <div className="bg-green-900/50 p-3 rounded-lg border border-green-400/30 mt-3">
                      <p className="text-green-300 text-xs font-semibold">⚡ SPEED CONTEST</p>
                      <p className="text-white/80 text-xs">No cooldown! Tap as fast as you can!</p>
                      <p className="text-blue-300 text-xs mt-1">💡 ETH used = Gas fees (not game cost)</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-white/70 text-sm md:text-base">
                    {!connectedAddress ? "Connect wallet to participate" : "Join a team to race!"}
                  </p>
                  <div className="bg-blue-900/50 p-4 rounded-lg border border-blue-400/30">
                    <p className="text-blue-300 text-sm font-semibold mb-2">💡 Demo Participants:</p>
                    <p className="text-white/80 text-xs mb-2">
                      Need test ETH? Use &quot;Burner Wallet&quot; (comes with free ETH) or ask organizer to send from
                      faucet!
                    </p>
                    <p className="text-green-400 text-xs">✅ Joining teams is FREE - only gas fees apply</p>
                  </div>
                  <button
                    onClick={() => router.push("/")}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg text-sm md:text-base"
                  >
                    🏠 Back to Home
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results Page */}
          {isResults && winner && raceResults && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20">
              {/* Winner Celebration */}
              <div className="text-center mb-6">
                <div className="mb-4">
                  <span className="text-6xl md:text-8xl">{winner.coinId === 0 ? "₿" : "Ξ"}</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">🏆 Team {winner.name} Wins! 🏆</h2>
                <div className="flex justify-center space-x-2 text-4xl md:text-6xl mb-4">
                  <span>🎉</span>
                  <span>🏁</span>
                  <span>🎉</span>
                </div>
              </div>

              {/* Race Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-yellow-500/20 p-4 rounded-lg border border-yellow-500/30">
                  <h4 className="text-lg font-bold text-yellow-400 mb-2">₿ Team Bitcoin</h4>
                  <p className="text-white text-xl font-bold">{raceResults.bitcoinTaps} taps</p>
                  <p className="text-white/70 text-sm">
                    {raceResults.totalPlayers > 0
                      ? Math.round(raceResults.bitcoinTaps / (raceResults.totalPlayers / 2) || 1)
                      : 0}{" "}
                    avg taps/player
                  </p>
                </div>
                <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/30">
                  <h4 className="text-lg font-bold text-blue-400 mb-2">Ξ Team Ethereum</h4>
                  <p className="text-white text-xl font-bold">{raceResults.ethereumTaps} taps</p>
                  <p className="text-white/70 text-sm">
                    {raceResults.totalPlayers > 0
                      ? Math.round(raceResults.ethereumTaps / (raceResults.totalPlayers / 2) || 1)
                      : 0}{" "}
                    avg taps/player
                  </p>
                </div>
              </div>

              {/* Overall Stats */}
              <div className="bg-white/10 p-4 rounded-lg mb-6">
                <h4 className="text-lg font-bold text-white mb-3">🏁 Race Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{raceResults.totalPlayers}</p>
                    <p className="text-white/70 text-sm">Total Players</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {raceResults.bitcoinTaps + raceResults.ethereumTaps}
                    </p>
                    <p className="text-white/70 text-sm">Total Taps</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{Math.round(raceResults.duration || 0)}s</p>
                    <p className="text-white/70 text-sm">Race Duration</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {Math.round((raceResults.bitcoinTaps + raceResults.ethereumTaps) / (raceResults.duration || 1))}
                    </p>
                    <p className="text-white/70 text-sm">Taps/Second</p>
                  </div>
                </div>
              </div>

              {/* Next Race Button (Organizer Only) */}
              {isOrganizer && (
                <div className="text-center">
                  <button
                    onClick={resetGame}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
                  >
                    🔄 Start New Race
                  </button>
                </div>
              )}

              {/* Celebration Animation */}
              <div className="text-center mt-6">
                <p className="text-white/80 text-sm">Game will auto-reset for next round...</p>
              </div>
            </div>
          )}
        </div>

        {/* Back Button (only in team selection) */}
        {isTeamSelection && (
          <div className="text-center mt-6">
            <button
              onClick={() => router.push("/")}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg text-sm md:text-base"
            >
              ← Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
