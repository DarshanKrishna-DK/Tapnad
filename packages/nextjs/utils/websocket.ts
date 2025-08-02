// Simple WebSocket implementation for real-time racing sync
// This allows multiple players on different devices to see each other's progress instantly

export interface RaceData {
  bitcoin: number;
  ethereum: number;
  timestamp: number;
  playerId: string;
}

export class RaceWebSocket {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private onDataReceived: ((data: RaceData) => void) | null = null;

  constructor(private url: string = "wss://echo.websocket.org") {
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
          const data: RaceData = JSON.parse(event.data);
          if (this.onDataReceived && data.playerId !== this.getPlayerId()) {
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
      };

      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        console.error("Failed to send race data:", error);
      }
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
}

// Singleton instance for the entire app
let raceWS: RaceWebSocket | null = null;

export const getRaceWebSocket = (): RaceWebSocket => {
  if (!raceWS) {
    raceWS = new RaceWebSocket();
  }
  return raceWS;
};
