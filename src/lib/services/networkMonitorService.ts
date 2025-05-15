// networkMonitor.ts
import { Transport } from "mediasoup-client/types";

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'very-poor';
export type NetworkStats = {
  timestamp: number;
  availableOutgoingBitrate: number;
  availableIncomingBitrate: number;
  packetLoss: number;
  jitter: number;
  roundTripTime: number;
  connectionState: string;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  bytesReceived: number;
  iceState: string;
};

export type NetworkQualityThresholds = {
  excellent: {
    minBitrate: number;
    maxPacketLoss: number;
    maxJitter: number;
  };
  good: {
    minBitrate: number;
    maxPacketLoss: number;
    maxJitter: number;
  };
  poor: {
    minBitrate: number;
    maxPacketLoss: number;
    maxJitter: number;
  };
};

export class NetworkMonitorService {
 
  private monitorInterval?: NodeJS.Timeout;
  private transport?: Transport;
  private statsHistory: NetworkStats[] = [];
  
  private maxHistory = 10;

  private currentQuality: NetworkQuality = 'good';
  private currentConnectionState: string = "unknown"
  private listeners: Array<(quality: NetworkQuality, stats: NetworkStats) => void> = [];

  constructor(transport?: Transport) {
    if (transport) {
      this.setTransport(transport);
    }
  }

  public setTransport(transport: Transport): void {
    this.transport = transport;
  }

  // public setThresholds(thresholds: Partial<NetworkQualityThresholds>): void {
  //   this.thresholds = { ...this.thresholds, ...thresholds };
  // }

  public start(intervalMs: number = 3000): void {
    this.stop();
    this.monitorInterval = setInterval(() => this.checkNetworkQuality(), intervalMs);
  }

  public stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
  }

  public addListener(listener: (quality: NetworkQuality, stats: NetworkStats) => void): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: (quality: NetworkQuality, stats: NetworkStats) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  public getCurrentQuality(): NetworkQuality {
    return this.currentQuality;
  }

  public getLatestStats(): NetworkStats | undefined {
    return this.statsHistory[0];
  }

  public getStatsHistory(): NetworkStats[] {
    return [...this.statsHistory];
  }

  private async checkNetworkQuality(): Promise<void> {
    if (!this.transport) return;

    try {
      const stats = await this.collectStats();
      const quality = this.determineQuality(stats);

      //> add new stats to the begining
      this.statsHistory.unshift(stats);
      if (this.statsHistory.length > this.maxHistory) {
        this.statsHistory.pop(); //> remove the last one if the stats is greater than max(10)
      }

        //> update the listener only if the quality changes or connection state changes
      // if (quality !== this.currentQuality) {
      //   this.currentQuality = quality;
       
      // }
      this.notifyListeners(quality, stats);
    } catch (error) {
      console.error('Error checking network quality:', error);
    }
  }

  private async collectStats(): Promise<NetworkStats> {
    const stats = await this.transport!.getStats();
    const statsArray = Array.from(stats.values());


  console.group('WebRTC Statistics');
  Array.from(stats.values()).forEach(stat => {
    console.log(`[${stat.type}] ${stat.id}`, stat);
  });
  console.groupEnd();
    
 //> Find the active candidate pair (using nominated)
 const candidatePair = statsArray.find(
  (s) => s.type === 'candidate-pair' && s.nominated
);

//> Find inbound RTP stats (receiver side)
const inboundRtp = statsArray.find(
  (s) => s.type === 'inbound-rtp'
);

//> transport
const transport = statsArray.find(
  (s) => s.type === 'transport'
);

// //> Find remote outbound RTP stats
// const remoteOutboundRtp = statsArray.find(
//   (s) => s.type === 'remote-outbound-rtp'
// );

//> Calculate packet loss from inbound RTP (only reliable source)
const packetLoss = (inboundRtp?.packetsLost / (inboundRtp?.packetsReceived || 1)) || 0;

//> Calculate incoming bitrate (manual calculation)
const bytesReceived = inboundRtp?.bytesReceived || 0;
const lastBytesReceived = this.statsHistory[0]?.bytesReceived || 0;
const timeDiff = this.statsHistory.length >0 ? Date.now() - this.statsHistory[0].timestamp : 1000;
const incomingBitrate = timeDiff > 0 && bytesReceived >= lastBytesReceived? 
  ((bytesReceived - lastBytesReceived) * 8000 / timeDiff) : 0;

//> Use candidate pair's RTT since remote-outbound-rtp doesn't provide it
const roundTripTime = candidatePair?.currentRoundTripTime || 0;


const currentStats = {
  timestamp: Date.now(),
  availableOutgoingBitrate: candidatePair?.availableOutgoingBitrate || 0,
  availableIncomingBitrate: incomingBitrate,
  packetLoss,
  jitter: inboundRtp?.jitter || 0,
  roundTripTime,
  bytesReceived,
  bytesSent: candidatePair?.bytesSent || 0,
  packetsReceived: inboundRtp?.packetsReceived || 0,
  packetsSent: candidatePair?.packetsSent || 0,
  connectionState: candidatePair?.state || 'unknown',
  iceState: transport?.iceState || "unknown"
};



    return currentStats
  }

  private determineQuality(stats: NetworkStats): NetworkQuality {
    //> Use minimum of outgoing and calculated incoming bitrates
    const effectiveBitrate = Math.min(
      stats.availableOutgoingBitrate,
      stats.availableIncomingBitrate
    );
    console.log("effective ------", effectiveBitrate, stats.jitter)
    // Quality thresholds
    if (stats.packetLoss > 0.1) { 
      return 'very-poor';
    }
    if (stats.jitter > 0.03) { 
      return 'poor';
    }
    if (effectiveBitrate < 300000) { 
      return 'poor';
    }
    if (effectiveBitrate < 1000000) { 
      return 'good';
    }
    return 'excellent';
  }



  private notifyListeners(quality: NetworkQuality, stats: NetworkStats): void {
    this.listeners.forEach(listener => listener(quality, stats));
  }

  public destroy(): void {
    this.stop();
    this.listeners = [];
    this.statsHistory = [];
  }
}