// Real-time multiplayer racing sync using WebSocket broadcasting
// This allows multiple players on different devices to see each other's progress instantly

export interface RaceData {
  bitcoin: number;
  ethereum: number;
  timestamp: number;
  playerId: string;
  room: string; // Add room concept for game sessions
}

export class RaceWebSocket {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private onDataReceived: ((data: RaceData) => void) | null = null;
  private room: string = "tapnad-main-race"; // Default room for all players

  constructor(private url: string = "wss://ws.postman-echo.com/raw") {
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("🔗 Racing WebSocket connected!");
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = event => {
        try {
          console.log("📡 Received WebSocket message:", event.data);
          const data: RaceData = JSON.parse(event.data);

          // Only process messages from other players in the same room
          if (this.onDataReceived && data.playerId !== this.getPlayerId() && data.room === this.room) {
            console.log("🏎️ Processing race data from player:", data.playerId, data);
            this.onDataReceived(data);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("🔌 Racing WebSocket disconnected");
        this.isConnected = false;
        this.attemptReconnect();
      };

      this.ws.onerror = error => {
        console.error("🚨 WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  private getPlayerId(): string {
    let playerId = localStorage.getItem("tapnad-player-id");
    if (!playerId) {
      playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("tapnad-player-id", playerId);
    }
    return playerId;
  }

  public sendRaceData(bitcoin: number, ethereum: number) {
    if (this.isConnected && this.ws) {
      const data: RaceData = {
        bitcoin,
        ethereum,
        timestamp: Date.now(),
        playerId: this.getPlayerId(),
        room: this.room,
      };

      try {
        console.log("🚀 Sending race data:", data);
        this.ws.send(JSON.stringify(data));

        // Also store in localStorage for immediate local sync
        localStorage.setItem("tapnad-last-broadcast", JSON.stringify(data));
      } catch (error) {
        console.error("Failed to send race data:", error);
      }
    } else {
      console.log("⚠️ WebSocket not connected, storing data locally only");
      // Fallback: store in localStorage for cross-tab sync
      const data: RaceData = {
        bitcoin,
        ethereum,
        timestamp: Date.now(),
        playerId: this.getPlayerId(),
        room: this.room,
      };
      localStorage.setItem("tapnad-last-broadcast", JSON.stringify(data));
    }
  }

  public onData(callback: (data: RaceData) => void) {
    this.onDataReceived = callback;
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
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
