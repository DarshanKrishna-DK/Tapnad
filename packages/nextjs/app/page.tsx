"use client";

import { useRouter } from "next/navigation";
import type { NextPage } from "next";

const Home: NextPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="text-8xl md:text-9xl mb-6">🏁</div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-lg">TAPNAD</h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 font-medium drop-shadow">
            The Ultimate Crypto Racing Showdown
          </p>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12 drop-shadow">
            Bitcoin vs Ethereum - Choose your side, tap to victory!
            <br />
            Fast-paced, multiplayer blockchain racing game.
          </p>
        </div>

        {/* Game Preview */}
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 mb-12 border border-white/20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-center">
              <div className="text-6xl mb-4">₿</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">Team Bitcoin</h3>
              <p className="text-white/80">The Original Cryptocurrency</p>
            </div>
            <div className="text-center">
              <div className="text-6xl mb-4">Ξ</div>
              <h3 className="text-2xl font-bold text-blue-300 mb-2">Team Ethereum</h3>
              <p className="text-white/80">Smart Contract Pioneer</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="space-y-6">
          <button
            onClick={() => router.push("/game")}
            className="bg-white text-gray-800 hover:bg-gray-100 font-bold py-6 px-12 rounded-2xl text-2xl md:text-3xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
          >
            🎮 GO TO GAME
          </button>

          <div className="text-center">
            <p className="text-white/70 text-sm md:text-base">
              No wallet required to spectate • Connect wallet to play • Joining teams is FREE
            </p>
          </div>
        </div>

        {/* Game Rules */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-3xl mb-3">👥</div>
            <h4 className="text-lg font-bold text-white mb-2">Choose Team</h4>
            <p className="text-white/80 text-sm">Pick Bitcoin or Ethereum</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-3xl mb-3">⚡</div>
            <h4 className="text-lg font-bold text-white mb-2">Tap to Race</h4>
            <p className="text-white/80 text-sm">Rapid taps advance your coin</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-3xl mb-3">🏆</div>
            <h4 className="text-lg font-bold text-white mb-2">Team Victory</h4>
            <p className="text-white/80 text-sm">First to complete 3 laps wins</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
