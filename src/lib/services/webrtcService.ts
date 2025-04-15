import { Device } from "mediasoup-client";
import type {
  Transport,
  Producer,
  Consumer,
  RtpCapabilities,
} from "mediasoup-client/types";

export interface ChatMessage {
  type: string;
  roomId: string | null;
  peerId: string | null;
  peerName: string | null;
  userId: string;
  userName: string;
  content: string;
  timeStamp: Date;
}

export interface ResponseMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

class WebRTCService {
  private socket: WebSocket | null = null;
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers = new Map<string, Producer>();
  private consumers = new Map<string, Consumer>();
  private roomId: string | null = null;
  private peerId: string | null = null;
  private peerName: string | null = null;
  private isHost = false;
  private onNewConsumer: ((consumer: Consumer, peerId: string) => void) | null =
    null;
  private onConsumerClosed: ((consumerId: string) => void) | null = null;
  private onPeerJoined:
    | ((peerId: string, peerName: string, isHost: boolean) => void)
    | null = null;
  private onPeerLeft: ((peerId: string) => void) | null = null;
  private onChatMessage: ((message: any) => void) | null = null;
  private onMessageList: ((messages: any[]) => void) | null = null;

  // Connect to the WebSocket server
  public connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log("WebSocket connected");
        this.setupSocketListeners();
        resolve();
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };

      this.socket.onclose = () => {
        console.log("WebSocket disconnected");
        this.cleanup();
      };
    });
  }

  // Set up WebSocket message listeners
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      const { type } = message;

      switch (type) {
        case "room-info":
          this.handleRoomInfo(message);
          break;
        case "peer-joined":
          this.handlePeerJoined(message);
          break;
        case "peer-left":
          this.handlePeerLeft(message);
          break;
        case "transport-created":
          this.handleTransportCreated(message);
          break;
        case "transport-connected":
          this.handleTransportConnected(message);
          break;
        case "producer-created":
          this.handleProducerCreated(message);
          break;
        case "new-producer":
          this.handleNewProducer(message);
          break;
        case "consumer-created":
          this.handleConsumerCreated(message);
          break;
        case "consumer-closed":
          this.handleConsumerClosed(message);
          break;
        case "producer-list":
          this.handleProducerList(message);
          break;
        case "chat-message":
          this.handleChatMessage(message);
          break;
        case "message-list":
          this.handleMessageList(message);
          break;
        case "mute-status":
          this.handleMuteStatus(message);
          break;
        case "speaking":
          this.handleSpeaking(message);
          break;
        case "error":
          console.error("Server error:", message.message);
          break;
        default:
          console.warn(`Unknown message type: ${type}`);
      }
    };
  }

  // Join a room
  public async joinRoom(
    roomId: string,
    peerName: string,
    isHost: boolean
  ): Promise<void> {
    if (!this.socket) throw new Error("WebSocket not connected");

    this.roomId = roomId;
    this.peerId = crypto.randomUUID();
    this.peerName = peerName;
    this.isHost = isHost;

    // Load the mediasoup device
    this.device = new Device();

    // Send join room message
    this.socket.send(
      JSON.stringify({
        type: "join-room",
        roomId,
        peerId: this.peerId,
        peerName,
        isHost,
      })
    );
  }

  private onPeerMuted:
    | ((peerId: string, kind: "audio" | "video", muted: boolean) => void)
    | null = null;
  private onPeerSpeaking: ((peerId: string, speaking: boolean) => void) | null =
    null;

  // Add this method to notify about mute status changes
  public notifyMuteStatus(kind: "audio" | "video", muted: boolean): void {
    if (!this.socket) return;

    this.socket.send(
      JSON.stringify({
        type: "mute-status",
        roomId: this.roomId,
        peerId: this.peerId,
        kind,
        muted,
      })
    );
  }

  public notifySpeakingStatus(speaking: boolean): void {
    if (!this.socket || !this.roomId || !this.peerId) return;

    this.socket.send(
      JSON.stringify({
        type: "speaking",
        roomId: this.roomId,
        peerId: this.peerId,
        speaking,
      })
    );
  }

  private handleMuteStatus(message: any): void {
    const { peerId, kind, muted } = message;
    if (this.onPeerMuted) {
      this.onPeerMuted(peerId, kind, muted);
    }
  }

  private handleSpeaking(message: any): void {
    const { peerId, speaking } = message;
    if (this.onPeerSpeaking) {
      this.onPeerSpeaking(peerId, speaking);
    }
  }

  // Handle room info message
  private async handleRoomInfo(message: any): Promise<void> {
    const { roomId, peers } = message;

    // Load the mediasoup device with router RTP capabilities
    await this.loadDevice();

    // Create send and receive transports
    await this.createSendTransport();
    await this.createRecvTransport();

    // Get the list of producers in the room
    this.getProducers();

    // Get the list of messages in the room
    this.getMessages();

    console.log(`Joined room ${roomId} with ${peers.length} peers`);
  }

  // Load the mediasoup device
  private async loadDevice(): Promise<void> {
    if (!this.socket || !this.device) return;

    // Get router RTP capabilities
    this.socket.send(
      JSON.stringify({
        type: "get-router-capabilities",
        roomId: this.roomId,
      })
    );

    // Wait for router capabilities
    const routerCapabilities = await new Promise<RtpCapabilities>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === "router-capabilities") {
          this.socket?.removeEventListener("message", onMessage);
          resolve(message.routerCapabilities);
        }
      };
      if (this.socket) {
        this.socket.addEventListener("message", onMessage);
      }
    });

    // Load the device with router capabilities
    await this.device.load({ routerRtpCapabilities: routerCapabilities });
  }

  // Create send transport
  private async createSendTransport(): Promise<void> {
    if (!this.socket || !this.device) return;

    // Request a WebRTC transport for sending media
    this.socket.send(
      JSON.stringify({
        type: "create-transport",
        roomId: this.roomId,
        peerId: this.peerId,
        direction: "send",
      })
    );
  }

  // Create receive transport
  private async createRecvTransport(): Promise<void> {
    if (!this.socket || !this.device) return;

    // Request a WebRTC transport for receiving media
    this.socket.send(
      JSON.stringify({
        type: "create-transport",
        roomId: this.roomId,
        peerId: this.peerId,
        direction: "recv",
      })
    );
  }

  // Handle transport created message
  private async handleTransportCreated(message: any): Promise<void> {
    const {
      direction,
      transportId,
      iceParameters,
      iceCandidates,
      dtlsParameters,
    } = message;

    if (!this.device) return;

    if (direction === "send") {
      // Create the send transport
      this.sendTransport = this.device.createSendTransport({
        id: transportId,
        iceParameters,
        iceCandidates,
        dtlsParameters,
      });

      // Set up send transport event listeners
      this.sendTransport.on(
        "connect",
        ({ dtlsParameters }, callback, errback) => {
          this.socket?.send(
            JSON.stringify({
              type: "connect-transport",
              roomId: this.roomId,
              peerId: this.peerId,
              transportId,
              dtlsParameters,
            })
          );
          callback();
        }
      );

      this.sendTransport.on(
        "produce",
        async ({ kind, rtpParameters }, callback, errback) => {
          if (!this.socket) return;

          try {
            // Tell the server to create a Producer
            this.socket.send(
              JSON.stringify({
                type: "produce",
                roomId: this.roomId,
                peerId: this.peerId,
                transportId,
                kind,
                rtpParameters,
              })
            );

            // Wait for producer-created message
            const producerId = await new Promise<string>((resolve) => {
              const onMessage = (event: MessageEvent) => {
                const message = JSON.parse(event.data);
                if (message.type === "producer-created") {
                  this.socket?.removeEventListener("message", onMessage);
                  resolve(message.producerId);
                }
              };
              if (this.socket)
                this.socket.addEventListener("message", onMessage);
            });

            // Tell the transport that the Producer was created
            callback({ id: producerId });
          } catch (error) {
            errback(error as Error);
          }
        }
      );
    } else if (direction === "recv") {
      // Create the receive transport
      this.recvTransport = this.device.createRecvTransport({
        id: transportId,
        iceParameters,
        iceCandidates,
        dtlsParameters,
      });

      // Set up receive transport event listeners
      this.recvTransport.on(
        "connect",
        ({ dtlsParameters }, callback, errback) => {
          this.socket?.send(
            JSON.stringify({
              type: "connect-transport",
              roomId: this.roomId,
              peerId: this.peerId,
              transportId,
              dtlsParameters,
            })
          );
          callback();
        }
      );
    }
  }

  // Handle transport connected message
  private handleTransportConnected(message: any): void {
    console.log(`Transport ${message.transportId} connected`);
  }

  // Produce media
  public async produceMedia(track: MediaStreamTrack): Promise<Producer> {
    if (!this.sendTransport) throw new Error("Send transport not created");

    const producer = await this.sendTransport.produce({ track });

    // Store the producer
    this.producers.set(producer.id, producer);

    // Handle producer events
    producer.on("transportclose", () => {
      producer.close();
      this.producers.delete(producer.id);
    });

    return producer;
  }

  // Handle producer created message
  private handleProducerCreated(message: any): void {
    const { producerId } = message;
    console.log(`Producer ${producerId} created`);
  }

  // Handle new producer message
  private async handleNewProducer(message: any): Promise<void> {
    const { producerId, peerId, kind } = message;

    // Consume the new producer
    await this.consume(producerId, peerId, kind);
  }

  // Consume a producer
  private async consume(
    producerId: string,
    peerId: string,
    kind: string
  ): Promise<void> {
    if (!this.recvTransport || !this.device) return;

    // Request to consume the producer
    this.socket?.send(
      JSON.stringify({
        type: "consume",
        roomId: this.roomId,
        peerId: this.peerId,
        transportId: this.recvTransport.id,
        producerId,
        rtpCapabilities: this.device.rtpCapabilities,
      })
    );
  }

  // Handle consumer created message
  private async handleConsumerCreated(message: any): Promise<void> {
    const { consumerId, producerId, kind, rtpParameters, producerPeerId } =
      message;

    if (!this.recvTransport) return;

    // Create the consumer
    const consumer = await this.recvTransport.consume({
      id: consumerId,
      producerId,
      kind,
      rtpParameters,
    });

    // Store the consumer
    this.consumers.set(consumer.id, consumer);

    // Handle consumer events
    consumer.on("transportclose", () => {
      consumer.close();
      this.consumers.delete(consumer.id);
    });

    // Resume the consumer
    this.socket?.send(
      JSON.stringify({
        type: "resume-consumer",
        roomId: this.roomId,
        peerId: this.peerId,
        consumerId,
      })
    );

    // Notify the application about the new consumer
    if (this.onNewConsumer) {
      this.onNewConsumer(consumer, producerPeerId);
    }
  }

  // Handle consumer closed message
  private handleConsumerClosed(message: any): void {
    const { consumerId } = message;

    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.close();
      this.consumers.delete(consumerId);

      // Notify the application about the closed consumer
      if (this.onConsumerClosed) {
        this.onConsumerClosed(consumerId);
      }
    }
  }

  // Get the list of producers in the room
  private getProducers(): void {
    this.socket?.send(
      JSON.stringify({
        type: "get-producers",
        roomId: this.roomId,
        peerId: this.peerId,
      })
    );
  }

  // Handle producer list message
  private async handleProducerList(message: any): Promise<void> {
    const { producers } = message;

    // Consume all producers
    for (const { peerId, producerId, kind } of producers) {
      await this.consume(producerId, peerId, kind);
    }
  }

  // Handle peer joined message
  private handlePeerJoined(message: any): void {
    const { peerId, peerName, isHost } = message;

    console.log(`Peer ${peerName} (${peerId}) joined the room`);

    // Notify the application about the new peer
    if (this.onPeerJoined) {
      this.onPeerJoined(peerId, peerName, isHost);
    }
  }

  // Handle peer left message
  private handlePeerLeft(message: any): void {
    const { peerId } = message;

    console.log(`Peer ${peerId} left the room`);

    // Notify the application about the peer leaving
    if (this.onPeerLeft) {
      this.onPeerLeft(peerId);
    }
  }

  // Send a chat message

  public sendChatMessage(
    content: string,
    userId: string,
    userName: string
  ): void {
    if (!this.socket) return;

    const message: ChatMessage = {
      type: "chat-message",
      roomId: this.roomId,
      peerId: this.peerId,
      peerName: this.peerName,
      userId,
      userName,
      content,
      timeStamp: new Date(),
    };

    this.socket.send(JSON.stringify(message));
  }

  // Handle chat message
  private handleChatMessage(message: any): void {
    if (this.onChatMessage) {
      this.onChatMessage(message.message);
    }
  }

  // Get the list of messages in the room
  private getMessages(): void {
    this.socket?.send(
      JSON.stringify({
        type: "get-messages",
        roomId: this.roomId,
      })
    );
  }

  // Handle message list
  private handleMessageList(message: any): void {
    if (this.onMessageList) {
      this.onMessageList(message.messages);
    }
  }

  // Leave the room
  public leaveRoom(): void {
    if (!this.socket) return;

    this.socket.send(
      JSON.stringify({
        type: "leave-room",
        roomId: this.roomId,
        peerId: this.peerId,
      })
    );

    this.cleanup();
  }

  // Clean up resources
  private cleanup(): void {
    // Close all producers
    for (const producer of this.producers.values()) {
      producer.close();
    }
    this.producers.clear();

    // Close all consumers
    for (const consumer of this.consumers.values()) {
      consumer.close();
    }
    this.consumers.clear();

    // Close transports
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }

    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }

    // Reset state
    this.device = null;
    this.roomId = null;
    this.peerId = null;
    this.peerName = null;
    this.isHost = false;
  }

  // Set event handlers
  public setOnNewConsumer(
    callback: (consumer: Consumer, peerId: string) => void
  ): void {
    this.onNewConsumer = callback;
  }

  public setOnConsumerClosed(callback: (consumerId: string) => void): void {
    this.onConsumerClosed = callback;
  }

  public setOnPeerJoined(
    callback: (peerId: string, peerName: string, isHost: boolean) => void
  ): void {
    this.onPeerJoined = callback;
  }

  public setOnPeerLeft(callback: (peerId: string) => void): void {
    this.onPeerLeft = callback;
  }

  public setOnChatMessage(callback: (message: any) => void): void {
    this.onChatMessage = callback;
  }

  public setOnMessageList(callback: (messages: any[]) => void): void {
    this.onMessageList = callback;
  }

  public setOnPeerMuted(
    callback: (peerId: string, kind: "audio" | "video", muted: boolean) => void
  ): void {
    this.onPeerMuted = callback;
  }

  public setOnPeerSpeaking(
    callback: (peerId: string, speaking: boolean) => void
  ): void {
    this.onPeerSpeaking = callback;
  }
}

export const webRTCService = new WebRTCService();
