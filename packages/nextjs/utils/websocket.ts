// Real-time multiplayer racing sync using BroadcastChannel API + localStorage
// This allows multiple players on different devices to see each other's progress instantly

export interface RaceData {
  bitcoin: number;
  ethereum: number;
  timestamp: number;
  playerId: string;
  room: string;
}

export class RaceWebSocket {
  private channel: BroadcastChannel | null = null;
  private isConnected = false;
  private onDataReceived: ((data: RaceData) => void) | null = null;
  private room: string = "tapnad-main-race";
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      if (typeof window !== "undefined") {
        // Use BroadcastChannel for same-origin tab communication
        this.channel = new BroadcastChannel("tapnad-race-sync");

        this.channel.onmessage = event => {
          try {
            console.log("📡 Received BroadcastChannel message:", event.data);
            const data: RaceData = event.data;

            // Only process messages from other players in the same room
            if (this.onDataReceived && data.playerId !== this.getPlayerId() && data.room === this.room) {
              console.log("🏎️ Processing race data from player:", data.playerId, data);
              this.onDataReceived(data);
            }
          } catch (error) {
            console.error("Error processing BroadcastChannel message:", error);
          }
        };

        // Start aggressive localStorage polling for cross-device sync
        this.startLocalStorageSync();

        console.log("🔗 Racing sync connected! (BroadcastChannel + localStorage)");
        this.isConnected = true;
      }
    } catch (error) {
      console.error("Failed to create sync connection:", error);
      // Fallback to localStorage only
      this.startLocalStorageSync();
      this.isConnected = true;
    }
  }

  private startLocalStorageSync() {
    // Clear any existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Poll localStorage every 200ms for real-time sync
    this.syncInterval = setInterval(() => {
      try {
        const syncData = localStorage.getItem("tapnad-realtime-sync");
        if (syncData) {
          const data: RaceData = JSON.parse(syncData);

          // Only process if from different player and newer than 2 seconds
          if (
            this.onDataReceived &&
            data.playerId !== this.getPlayerId() &&
            data.room === this.room &&
            Date.now() - data.timestamp < 2000
          ) {
            console.log("🔄 Syncing from localStorage:", data);
            this.onDataReceived(data);
          }
        }
      } catch (error) {
        console.error("localStorage sync error:", error);
      }
    }, 200); // Very fast polling for responsiveness
  }

  // Removed reconnect logic - not needed for BroadcastChannel

  private getPlayerId(): string {
    let playerId = localStorage.getItem("tapnad-player-id");
    if (!playerId) {
      playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("tapnad-player-id", playerId);
    }
    return playerId;
  }

  public sendRaceData(bitcoin: number, ethereum: number) {
    const data: RaceData = {
      bitcoin,
      ethereum,
      timestamp: Date.now(),
      playerId: this.getPlayerId(),
      room: this.room,
    };

    try {
      console.log("🚀 Broadcasting race data:", data);

      // Send via BroadcastChannel for same-origin tabs
      if (this.channel) {
        this.channel.postMessage(data);
      }

      // Store in localStorage for cross-device sync
      localStorage.setItem("tapnad-realtime-sync", JSON.stringify(data));

      // Also broadcast as storage event for cross-tab sync
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "tapnad-realtime-sync",
          newValue: JSON.stringify(data),
          storageArea: localStorage,
        }),
      );
    } catch (error) {
      console.error("Failed to broadcast race data:", error);
    }
  }

  public onData(callback: (data: RaceData) => void) {
    this.onDataReceived = callback;
  }

  public disconnect() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isConnected = false;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getCurrentPlayerId(): string {
    let playerId = localStorage.getItem("tapnad-player-id");
    if (!playerId) {
      playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("tapnad-player-id", playerId);
    }
    return playerId;
  }
}

// Singleton instance for the entire app
let raceWS: RaceWebSocket | null = null;

export const getRaceWebSocket = (): RaceWebSocket => {
  if (!raceWS) {
    raceWS = new RaceWebSocket();
  }
  return raceWS;
};
