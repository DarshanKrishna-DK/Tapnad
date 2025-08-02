"use client";

import { useRouter } from "next/navigation";
import type { NextPage } from "next";

const Home: NextPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen racing-gradient flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Racing background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="checkered-pattern checkered-animated w-full h-full"></div>
      </div>

      {/* Speed lines effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="speed-lines w-full h-full"></div>
      </div>

      <div className="text-center max-w-4xl mx-auto relative z-10">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="text-8xl md:text-9xl mb-6">🏁</div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-2xl tracking-wider">TAPNAD</h1>
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
            <p className="text-xl md:text-2xl text-white/95 mb-4 font-bold drop-shadow">
              The Ultimate Crypto Racing Championship
            </p>
            <p className="text-lg md:text-xl text-purple-200 max-w-2xl mx-auto drop-shadow">
              Bitcoin vs Ethereum - Choose your racing team, tap to victory!
              <br />
              <span className="text-yellow-300 font-semibold">High-speed, multiplayer blockchain racing</span>
            </p>
          </div>
        </div>

        {/* Racing Teams Preview */}
        <div className="bg-black/40 backdrop-blur-sm rounded-3xl p-8 mb-12 border-2 border-purple-400/50 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Choose Your Racing Team</h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-center p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl border-2 border-yellow-400/50">
              <div className="text-7xl mb-4">₿</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">Team Bitcoin</h3>
              <p className="text-yellow-100 font-semibold">The Original Speed Demon</p>
              <div className="mt-4 text-sm text-yellow-200/80">Legacy Champion • Pure Power</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl border-2 border-blue-400/50">
              <div className="text-7xl mb-4">Ξ</div>
              <h3 className="text-2xl font-bold text-blue-300 mb-2">Team Ethereum</h3>
              <p className="text-blue-100 font-semibold">The Smart Racing Machine</p>
              <div className="mt-4 text-sm text-blue-200/80">Innovation Leader • Tech Advantage</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="space-y-6">
          <button
            onClick={() => router.push("/game")}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 px-12 rounded-2xl text-2xl md:text-3xl transition-all duration-300 transform hover:scale-105 shadow-2xl border-2 border-white/30"
          >
            START YOUR ENGINES
          </button>

          <div className="text-center bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-purple-400/30">
            <p className="text-purple-200 text-sm md:text-base font-semibold">
              Connect wallet to race • Joining teams is FREE
            </p>
            <p className="text-yellow-300 text-xs mt-2">Only gas fees apply</p>
          </div>
        </div>

        {/* Racing Rules */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/50 hover:border-purple-300 transition-all duration-300 transform hover:scale-105">
            <div className="text-4xl mb-3">🏎️</div>
            <h4 className="text-lg font-bold text-purple-200 mb-2">Choose Your Racer</h4>
            <p className="text-purple-100/80 text-sm">Pick Bitcoin or Ethereum racing team</p>
            <div className="mt-3 text-xs text-yellow-300">Strategic team selection</div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/50 hover:border-purple-300 transition-all duration-300 transform hover:scale-105">
            <div className="text-4xl mb-3">⚡</div>
            <h4 className="text-lg font-bold text-purple-200 mb-2">Tap to Accelerate</h4>
            <p className="text-purple-100/80 text-sm">Rapid taps power your racer forward</p>
            <div className="mt-3 text-xs text-yellow-300">No speed limits!</div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/50 hover:border-purple-300 transition-all duration-300 transform hover:scale-105">
            <div className="text-4xl mb-3">🏁</div>
            <h4 className="text-lg font-bold text-purple-200 mb-2">Cross the Finish</h4>
            <p className="text-purple-100/80 text-sm">First team to complete 3 laps wins</p>
            <div className="mt-3 text-xs text-yellow-300">Victory awaits!</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
