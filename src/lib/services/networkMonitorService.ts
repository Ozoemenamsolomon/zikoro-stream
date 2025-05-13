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
  private thresholds: NetworkQualityThresholds = {
    excellent: {
      minBitrate: 1500000, 
      maxPacketLoss: 0.01,  
      maxJitter: 30        
    },
    good: {
      minBitrate: 800000,   
      maxPacketLoss: 0.03,  
      maxJitter: 50        
    },
    poor: {
      minBitrate: 300000,   
      maxPacketLoss: 0.1,   
      maxJitter: 100        
    }
  };
  private currentQuality: NetworkQuality = 'good';
  private listeners: Array<(quality: NetworkQuality, stats: NetworkStats) => void> = [];

  constructor(transport?: Transport) {
    if (transport) {
      this.setTransport(transport);
    }
  }

  public setTransport(transport: Transport): void {
    this.transport = transport;
  }

  public setThresholds(thresholds: Partial<NetworkQualityThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

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

      
      this.statsHistory.unshift(stats);
      if (this.statsHistory.length > this.maxHistory) {
        this.statsHistory.pop();
      }

     
      if (quality !== this.currentQuality) {
        this.currentQuality = quality;
        this.notifyListeners(quality, stats);
      }
    } catch (error) {
      console.error('Error checking network quality:', error);
    }
  }

  private async collectStats(): Promise<NetworkStats> {
    const stats = await this.transport!.getStats();
    
    const candidatePair = Array.from(stats.values()).find((s: any) => s.type === 'candidate-pair' && s.selected);
    const inboundRtp = Array.from(stats.values()).find((s: any) => s.type === 'inbound-rtp');
    const outboundRtp = Array.from(stats.values()).find((s: any) => s.type === 'outbound-rtp');

    return {
      timestamp: Date.now(),
      availableOutgoingBitrate: candidatePair?.availableOutgoingBitrate || 0,
      availableIncomingBitrate: candidatePair?.availableIncomingBitrate || 0,
      packetLoss: (inboundRtp?.packetsLost / (inboundRtp?.packetsReceived || 1)) || 0,
      jitter: inboundRtp?.jitter || 0,
      roundTripTime: candidatePair?.currentRoundTripTime || 0
    };
  }

  private determineQuality(stats: NetworkStats): NetworkQuality {
    if (this.meetsThreshold(stats, this.thresholds.excellent)) {
      return 'excellent';
    }
    if (this.meetsThreshold(stats, this.thresholds.good)) {
      return 'good';
    }
    if (this.meetsThreshold(stats, this.thresholds.poor)) {
      return 'poor';
    }
    return 'very-poor';
  }

  private meetsThreshold(stats: NetworkStats, threshold: {
    minBitrate: number;
    maxPacketLoss: number;
    maxJitter: number;
  }): boolean {
    return (
      stats.availableOutgoingBitrate >= threshold.minBitrate &&
      stats.packetLoss <= threshold.maxPacketLoss &&
      stats.jitter <= threshold.maxJitter
    );
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