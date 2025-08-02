"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface RaceResults {
  duration: number;
  bitcoinTaps: number;
  ethereumTaps: number;
  totalPlayers: number;
  winnerCoinId: number;
  winnerName: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<RaceResults | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const { writeContractAsync: writeRaceAsync } = useScaffoldWriteContract({
    contractName: "Race",
  });

  useEffect(() => {
    // Get results from localStorage
    const storedResults = localStorage.getItem("raceResults");
    if (storedResults) {
      setResults(JSON.parse(storedResults));
      setShowCelebration(true);
      // Clear the stored results
      localStorage.removeItem("raceResults");
    } else {
      // If no results, redirect back to game
      router.push("/game");
    }
  }, [router]);

  const resetGame = async () => {
    try {
      await writeRaceAsync({
        functionName: "resetGame",
      });
      router.push("/game");
    } catch (error) {
      console.error("Error resetting game:", error);
    }
  };

  if (!results) {
    return (
      <div className="h-screen racing-gradient flex items-center justify-center">
        <div className="text-white text-xl">Loading results...</div>
      </div>
    );
  }

  return (
    <>
      {/* Celebration Animations CSS */}
      <style jsx>{`
        @keyframes cracker-burst {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.2) rotate(180deg);
            opacity: 0.8;
          }
          100% {
            transform: scale(0.8) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes sparkle {
          0%,
          100% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .cracker-burst {
          animation: cracker-burst 2s ease-out infinite;
        }

        .confetti {
          animation: confetti-fall 3s linear infinite;
        }

        .sparkle {
          animation: sparkle 1.5s ease-in-out infinite;
        }

        .celebration-bg {
          background:
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%),
            linear-gradient(135deg, #581c87 0%, #6d28d9 25%, #7c3aed 50%, #6d28d9 75%, #581c87 100%);
        }
      `}</style>

      <div className="h-screen celebration-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Celebration Effects */}
        {showCelebration && (
          <>
            {/* Confetti */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="confetti absolute w-2 h-2 bg-yellow-400 rounded"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                  }}
                />
              ))}
              {[...Array(10)].map((_, i) => (
                <div
                  key={i + 10}
                  className="confetti absolute w-2 h-2 bg-purple-400 rounded"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>

            {/* Crackers Burst */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="cracker-burst absolute text-4xl"
                  style={{
                    left: `${15 + i * 18}%`,
                    top: `${25 + (i % 2) * 30}%`,
                    animationDelay: `${i * 0.4}s`,
                  }}
                >
                  ✨
                </div>
              ))}
            </div>

            {/* Sparkles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="sparkle absolute text-xl text-yellow-300"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                >
                  ⭐
                </div>
              ))}
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Winner Announcement */}
          <div className="mb-6">
            <div className="text-6xl md:text-7xl mb-4">{results.winnerCoinId === 0 ? "₿" : "Ξ"}</div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500 bg-clip-text mb-3">
              TEAM {results.winnerName.toUpperCase()}
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">WINS THE RACE!</h2>
          </div>

          {/* Race Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Bitcoin Stats */}
            <div
              className={`p-4 rounded-lg border ${
                results.winnerCoinId === 0
                  ? "bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 border-yellow-400"
                  : "bg-yellow-500/10 border-yellow-500/30"
              }`}
            >
              <div className="text-center mb-3">
                <span className="text-3xl">₿</span>
                <h3 className="text-lg font-bold text-yellow-400 mt-1">TEAM BITCOIN</h3>
              </div>
              <div className="space-y-2">
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{results.bitcoinTaps}</p>
                  <p className="text-yellow-300 text-xs font-semibold">Total Taps</p>
                </div>
                <div className="bg-yellow-500/20 p-2 rounded">
                  <p className="text-yellow-300 text-xs font-semibold text-center">
                    Speed: {results.duration > 0 ? (results.bitcoinTaps / results.duration).toFixed(1) : 0} taps/sec
                  </p>
                </div>
              </div>
            </div>

            {/* Ethereum Stats */}
            <div
              className={`p-4 rounded-lg border ${
                results.winnerCoinId === 1
                  ? "bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-blue-400"
                  : "bg-blue-500/10 border-blue-500/30"
              }`}
            >
              <div className="text-center mb-3">
                <span className="text-3xl">Ξ</span>
                <h3 className="text-lg font-bold text-blue-400 mt-1">TEAM ETHEREUM</h3>
              </div>
              <div className="space-y-2">
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{results.ethereumTaps}</p>
                  <p className="text-blue-300 text-xs font-semibold">Total Taps</p>
                </div>
                <div className="bg-blue-500/20 p-2 rounded">
                  <p className="text-blue-300 text-xs font-semibold text-center">
                    Speed: {results.duration > 0 ? (results.ethereumTaps / results.duration).toFixed(1) : 0} taps/sec
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Race Summary */}
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-purple-400/50 mb-6">
            <h3 className="text-lg font-bold text-white mb-3 text-center">RACE SUMMARY</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-white/10 rounded">
                <p className="text-xl font-black text-white">{results.totalPlayers}</p>
                <p className="text-white/70 text-xs font-semibold">Racers</p>
              </div>
              <div className="text-center p-3 bg-white/10 rounded">
                <p className="text-xl font-black text-white">{results.bitcoinTaps + results.ethereumTaps}</p>
                <p className="text-white/70 text-xs font-semibold">Total Taps</p>
              </div>
              <div className="text-center p-3 bg-white/10 rounded">
                <p className="text-xl font-black text-white">{Math.round(results.duration || 0)}s</p>
                <p className="text-white/70 text-xs font-semibold">Race Time</p>
              </div>
              <div className="text-center p-3 bg-white/10 rounded">
                <p className="text-xl font-black text-white">{Math.abs(results.bitcoinTaps - results.ethereumTaps)}</p>
                <p className="text-white/70 text-xs font-semibold">Victory Margin</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={resetGame}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 text-lg border border-green-400/50"
            >
              START NEXT RACE
            </button>
            <div>
              <button
                onClick={() => router.push("/game")}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 border border-purple-400/50"
              >
                Back to Game
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
