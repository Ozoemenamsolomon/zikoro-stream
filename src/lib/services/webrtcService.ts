import { Device } from "mediasoup-client";
import type {
  Transport,
  Producer,
  Consumer,
  RtpCapabilities,
  AppData,
  ProducerCodecOptions,
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
  timestamp: string;
}

class WebRTCService {
  private socket: WebSocket | null = null;
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers = new Map<string, Producer>();
  private consumers = new Map<string, Consumer>();
  private roomId: string | null = null; // stream alias
  private peerId: string | null = null; // attendee Id (Host, Attendee, Invitee)
  private peerName: string | null = null; // attendee name (Host, Attendee, Invitee)
  private isHost = false;
  private isInvitee =  false;
  private transportCreationInProgress = false;
  public isJoining = false;
  public hasJoined = false;
  //> Handle reconnection after (e.g throttle) ==> START
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;
  private isReconnecting = false;
  private onProducerErrorCallback: (() => Promise<void>) | null = null;
  //> END

  private waitForSendTransportResolve: (() => void) | null = null;
  private onNewConsumer:
    | ((consumer: Consumer, peerId: string, peerName: string) => void)
    | null = null;
  private onConsumerClosed: ((consumerId: string) => void) | null = null;
  private onPeerJoined:
    | ((peerId: string, peerName: string, isHost: boolean, isInvitee: boolean) => void)
    | null = null;
  private onPeerLeft: ((peerId: string) => void) | null = null;
  //> START
  private onChatMessage: ((message: any) => void) | null = null;
  private onMessageList: ((messages: any[]) => void) | null = null;
  //>  END
  private onLiveStreamState: ((isLive: boolean) => void) | null = null;

  private onPeerMuted:
    | ((peerId: string, kind: "audio" | "video", muted: boolean) => void)
    | null = null;
  private onPeerSpeaking: ((peerId: string, speaking: boolean) => void) | null =
    null;
  private onConnected: (() => void) | null = null;
  private onDisconnected: (() => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  // Connect to the WebSocket server
  public connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log("WebSocket connected");

          if (this.onConnected) this.onConnected();
          this.setupSocketListeners();
          resolve();
        };

        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          if (this.onError)
            this.onError(new Error("WebSocket connection error"));
          reject(error);
        };

        this.socket.onclose = () => {
          console.log("WebSocket disconnected");
          if (this.onDisconnected) this.onDisconnected();
          this.cleanup();
        };
      } catch (error) {
        console.error("Error connecting to WebSocket:", error);
        reject(error);
      }
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
        case "live-stream-state":
          this.handleLiveStream(message);
          break;
        case "error":
          console.error("Server error:", message.message);
          break;
        default:
          console.warn(`Unknown message type: ${type}`);
      }
    };
  }

  private isViewerReady(): boolean {
    return !!this.device && !!this.recvTransport;
  }

  // Join a room
  public async joinRoom(
    roomId: string,
    peerName: string,
    peerId: string,
    isHost: boolean,
    isInvitee: boolean
  ): Promise<void> {
    if (!this.socket) throw new Error("WebSocket not connected");

    this.roomId = roomId;
    this.peerId = peerId;
    this.peerName = peerName;
    this.isHost = isHost;
    this.isInvitee = isInvitee

    if (this.hasJoined) return;
    this.isJoining = true;

    // Load the mediasoup device
    this.device = new Device();

    // Create Transports

    // Viewers only need receive transport

    console.log(
      "Joining room:",
      roomId,
      "as",
      peerName,
      isHost ? "(host)" : "(viewer)",
      !!this.device
    );

    // Send join room message
    this.socket.send(
      JSON.stringify({
        type: "join-room",
        roomId,
        peerId: this.peerId,
        peerName,
        isHost,
        isInvitee
      })
    );

    const handler = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === "room-info") {
        this.socket?.removeEventListener("message", handler);

        //> don't create a receive transport for host or invitee over here
      // if (!isHost || !isInvitee) {
      //     await this.createRecvTransport();
      //     await new Promise((resolve) => setTimeout(resolve, 100));
      //   }
        this.hasJoined = true;
      }
    };
    this.socket.addEventListener("message", handler);

    this.isJoining = false;
  }

  // `live state
  public sendLiveStream(settings: any, dateString: string, id: number) {
    if (!this.socket) return;

    const data = {
      type: "live-stream-state",
      roomId: this.roomId,
      settings,
      dateString,
      id,
    };

    this.socket.send(JSON.stringify(data));
  }

  private handleLiveStream(message: any): void {
    const { isLive } = message;
    if (this.onLiveStreamState) {
      this.onLiveStreamState(isLive);
    }
  }

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

    // Host, or Invitee creates both send and receive transports
    if (this.isHost || this.isInvitee) {
      if (this.transportCreationInProgress || this.sendTransport) return;

      this.transportCreationInProgress = true;

      try {
        await this.createSendTransport();
        await this.createRecvTransport();
      } finally {
        this.transportCreationInProgress = false;
      }
    }
    else {
      // for viewer
      await this.createRecvTransport();
    }



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
    const routerCapabilities = await new Promise<RtpCapabilities>(
      (resolve, reject) => {
        const onMessage = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "router-capabilities") {
              this.socket?.removeEventListener("message", onMessage);
              resolve(message.routerCapabilities);
            }
          } catch (error) {
            reject(error);
          }
        };
        this.socket?.addEventListener("message", onMessage);

        // Add timeout
        setTimeout(() => {
          this.socket?.removeEventListener("message", onMessage);
          reject(new Error("Timeout waiting for router capabilities"));
        }, 10000);
      }
    );

    console.log("Got router capabilities:", routerCapabilities);

    // Load the device with router capabilities
    await this.device.load({ routerRtpCapabilities: routerCapabilities });
    console.log("Device loaded");
  }

  // Create send transport
  private async createSendTransport(): Promise<void> {
    if (!this.socket || !this.device) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Timeout creating transport")),
        10000
      );

      const handler = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (
          message.type === "transport-created" &&
          message.direction === "send"
        ) {
          clearTimeout(timeout);
          this.socket?.removeEventListener("message", handler);
          resolve();
        }
      };

      this.socket?.addEventListener("message", handler);
      this.socket?.send(
        JSON.stringify({
          type: "create-transport",
          roomId: this.roomId,
          peerId: this.peerId,
          direction: "send",
        })
      );
    });

    // // Request a WebRTC transport for sending media
    // this.socket.send(
    //   JSON.stringify({
    //     type: "create-transport",
    //     roomId: this.roomId,
    //     peerId: this.peerId,
    //     direction: "send",
    //   })
    // );
  }

  public waitForSendTransport(): Promise<void> {
    return new Promise((resolve) => {
      if (this.sendTransport) return resolve();
      this.waitForSendTransportResolve = resolve;
    });
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

  private async handleTransportDisconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    try {
      while (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);

        try {
          //  Safely close existing transport
          await this.safeCloseTransport();

          // Request new transport from server
          await this.requestNewTransport();

          // Wait for new transport creation
          await this.waitForNewTransport();

          // If we have a producer error callback, trigger it
          if (this.onProducerErrorCallback) {
            await this.onProducerErrorCallback();
          }

          // Success - reset attempts
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          return;
        } catch (error) {
          console.error(
            `Reconnect attempt ${this.reconnectAttempts} failed:`,
            error
          );
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            await new Promise((res) =>
              setTimeout(res, this.reconnectDelay * this.reconnectAttempts)
            );
          }
        }
      }

      throw new Error("Max reconnection attempts reached");
    } finally {
      this.isReconnecting = false;
    }
  }

  private async requestNewTransport() {
    if (!this.socket) throw new Error("No socket connection");

    this.socket?.send(
      JSON.stringify({
        type: "create-transport",
        roomId: this.roomId,
        peerId: this.peerId,
        direction: "send",
      })
    );
  }

  private async safeCloseTransport() {
    if (!this.sendTransport) return;

    try {
      console.log(this.sendTransport.closed, "is closed?");
      // Check transport state before closing
      if (this.sendTransport.closed) {
        console.log("Transport already closed");
        return;
      }

      // Remove all listeners first to prevent side effects
      this.sendTransport.removeAllListeners();

      // Close with timeout protection
      await Promise.race([
        this.sendTransport.close(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Transport close timeout")), 5000)
        ),
      ]);
    } catch (error) {
      console.warn("Error closing transport:", error);
    }
  }

  private async waitForNewTransport() {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Transport recreation timeout"));
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeout);
        this.socket?.removeEventListener("message", handler);
      };

      const handler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (
            message.type === "transport-created" &&
            message.direction === "send"
          ) {
            cleanup();
            resolve();
          }
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      this.socket?.addEventListener("message", handler);
    });
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
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      // Set up send transport event listeners
      this.sendTransport.on(
        "connect",
        ({ dtlsParameters }, callback, errback) => {
          console.log("Send transport connect event", transportId);
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
        async ({ kind, rtpParameters, appData }, callback, errback) => {
          console.log("Send transport produce event", kind);
          if (!this.socket) return;

          // timeout for recovery (to handle recovery after throttle)
          const TIMEOUT = 30000;

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
                appData,
              })
            );

            // Wait for producer-created message
            const producerId = await new Promise<string>((resolve, reject) => {
              const onMessage = (event: MessageEvent) => {
                try {
                  const message = JSON.parse(event.data);
                  if (message.type === "producer-created") {
                    this.socket?.removeEventListener("message", onMessage);
                    resolve(message.producerId);
                  }
                } catch (error) {
                  reject(error);
                }
              };
              this.socket?.addEventListener("message", onMessage);

              // Add timeout
              setTimeout(() => {
                this.socket?.removeEventListener("message", onMessage);
                reject(new Error("Timeout waiting for producer creation"));
              }, TIMEOUT);
            });

            console.log("Producer created:", producerId);

            // Tell the transport that the Producer was created
            callback({ id: producerId });
          } catch (error) {
            console.error("Error in produce handler:", error);
            try {
              //> try to repoduce instead
              //  await this.handleTransportDisconnect();
            } catch (error) {
              console.error("Final reconnection failure:", error);
            }
            errback(error as Error);
          }
        }
      );

      if (this.sendTransport) {
        this.sendTransport.on("icegatheringstatechange", (state) => {
          console.log("Send transport ICE gathering state:", state);
        });

        this.sendTransport.on("connectionstatechange", async (state) => {
          console.log("Send transport state:", state);
          if (state === "disconnected" || state === "failed") {
            try {
              //> try to reconnect
              await this.handleTransportDisconnect();
            } catch (error) {
              console.error("Final reconnection failure:", error);
            }
          }
        });
      }

      console.log("Send transport created");

      if (this.waitForSendTransportResolve) {
        this.waitForSendTransportResolve();
        this.waitForSendTransportResolve = null;
      }

      console.log("Is a host");
    } else if (direction === "recv") {
      console.log("Recv transport");
      // Create the receive transport
      this.recvTransport = this.device.createRecvTransport({
        id: transportId,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      // Set up receive transport event listeners
      this.recvTransport.on(
        "connect",
        ({ dtlsParameters }, callback, errback) => {
          console.log("Receive transport connect event", transportId);
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

      // send request for exisiting producers

      console.log("Receive transport created");
      //> get prodcuers after the recieve transport has been created for only host and invitee
      if (this.hasJoined) {
        this.getProducers();
      }

      if (this.recvTransport) {
        this.recvTransport.on("icegatheringstatechange", (state) => {
          console.log("Receive transport ICE gathering state:", state);
        });
      }

      if (this.waitForSendTransportResolve) {
        this.waitForSendTransportResolve();
        this.waitForSendTransportResolve = null;
      }
    }
  }

  private async reproduce() {}

  // Handle transport connected message
  private handleTransportConnected(message: any): void {
    console.log(`Transport ${message.transportId} connected`);
  }

  // Produce media
  public async produceMedia(
    track: MediaStreamTrack,
    appData = {},
    codecOptions?: ProducerCodecOptions
  ): Promise<Producer> {
    console.log("Producing media:", track.kind);
    if (!this.sendTransport) throw new Error("Send transport not created");

    this.producers.forEach((producer, id) => {

      //@ts-ignore
      if (producer.kind === track.kind && producer.appData.source === appData.source) {
        producer.close();
        this.producers.delete(id);
        this.socket?.send(
          JSON.stringify({
            type: "close-producer",
            roomId: this.roomId,
            peerId: this.peerId,
            producerId: id,
          })
        );
      }
    });

    const producer = await this.sendTransport.produce({
      track,
      appData,
      codecOptions,
    });

    // Store the producer
    this.producers.set(producer.id, producer);

    // Handle producer events
    producer.on("transportclose", () => {
      producer.close();
      this.producers.delete(producer.id);
      this.socket?.send(
        JSON.stringify({
          type: "close-producer",
          roomId: this.roomId,
          peerId: this.peerId,
          producerId: producer.id,
        })
      );
    });

    return producer;
  }

  public async produceScreenShare(track: MediaStreamTrack): Promise<Producer> {
    if (!this.sendTransport) throw new Error("Send transport not ready");
    
    // Close existing screen share if any
    this.producers.forEach(p => {
      if (p.appData.source === 'screen') {
        p.close();
        this.producers.delete(p.id);
      }
    });
  
    const producer = await this.sendTransport.produce({
      track,
      appData: { source: "screen" },
      codecOptions: {
        videoGoogleStartBitrate: 2000,
        videoGoogleMaxBitrate: 5000,
        videoGoogleMinBitrate: 1000
      },
      encodings: [
        { scaleResolutionDownBy: 1, maxBitrate: 5000000 },
        { scaleResolutionDownBy: 2, maxBitrate: 2500000 }
      ]
    });
  
    this.producers.set(producer.id, producer);
    return producer;
  }

  // Handle producer created message
  private handleProducerCreated(message: any): void {
    const { producerId } = message;
    console.log(`Producer ${producerId} created`);
  }

  // Handle new producer message
  private async handleNewProducer(message: any): Promise<void> {
    const { producerId, peerId, kind, source } = message;
    console.log(`New producer: ${producerId} from peer ${peerId} (${kind})`);

     // Consume the new producer only if it is not the user's
    if (peerId !== this.peerId) {

      this.consumers.forEach((consumer, id) => {
        if (consumer.kind === kind && 
            consumer.appData?.source === source &&
            consumer.appData?.peerId === peerId) {
          consumer.close();
          this.consumers.delete(id);
          
          if (this.onConsumerClosed) {
            this.onConsumerClosed(id);
          }
        }
      });

      await this.consume(producerId, peerId, kind);
    }
   
   
  }

  // Consume a producer
  private async consume(
    producerId: string,
    peerId: string,
    kind: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recvTransport || !this.device) {
        reject(new Error("Transport or device not initialized"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Consumer creation timeout"));
      }, 10000);

      const handler = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (
          message.type === "consumer-created" &&
          message.producerId === producerId
        ) {
          clearTimeout(timeout);
          this.socket?.removeEventListener("message", handler);
          resolve();
        } else if (message.type === "consume-error") {
          clearTimeout(timeout);
          this.socket?.removeEventListener("message", handler);
          reject(new Error(message.error));
        }
      };

      this.socket?.addEventListener("message", handler);

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
    });
  }

  // Handle consumer created message
  private async handleConsumerCreated(message: any): Promise<void> {
    const {
      consumerId,
      producerId,
      kind,
      rtpParameters,
      producerPeerId,
      producerPeerName,
    } = message;

    console.log("trying to use created consumer", this.recvTransport)

    if (!this.recvTransport) return;

    console.log("Creating consumer:", { consumerId, producerId, kind });
    // Create the consumer
    const consumer = await this.recvTransport.consume({
      id: consumerId,
      producerId,
      kind,
      rtpParameters,
    });

    console.log("Consumer created with track:", {
      trackId: consumer.track.id,
      kind: consumer.track.kind,
      readyState: consumer.track.readyState,
    });
    // Store the consumer
    this.consumers.set(consumer.id, consumer);

    // Handle consumer events
    consumer.on("transportclose", () => {
      console.log(`Consumer ${consumer.id} transport closed`);
      consumer.close();
      this.consumers.delete(consumer.id);
    });

    consumer.on("trackended", () => {
      console.log(`Consumer ${consumer.id} transport closed`);
      consumer.close();
      this.consumers.delete(consumer.id);
    });

    if (consumer.paused) consumer.resume();

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
      this.onNewConsumer(consumer, producerPeerId, producerPeerName);
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

  public async closeProducer(producerId: string): Promise<void> {
    if (!this.socket) throw new Error("Not connected");
    
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.close();
      this.producers.delete(producerId);
      
      this.socket.send(JSON.stringify({
        type: "close-producer",
        roomId: this.roomId,
        peerId: this.peerId,
        producerId
      }));
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

    if (!this.isViewerReady()) {
      console.warn("Received producers before initialization complete");
      return;
    }

    console.log(`Got ${producers.length} producers`);
    // Consume all producers
    for (const { peerId, producerId, kind, peerName, isHost, isInvitee } of producers) {
      this.handlePeerJoined({
        peerId, 
        peerName, 
        isHost, 
        isInvitee
      })
      await this.consume(producerId, peerId, kind);
    }
  }

  // Handle peer joined message
  private handlePeerJoined(message: any): void {
    const { peerId, peerName, isHost, isInvitee } = message;

    console.log(`Peer ${peerName} (${peerId}) joined the room as ${isInvitee ? "Invitee"  :""}`);

    // get existing producers when a new peer join
    // if (this.hasJoined) {
    //   this.getProducers();
    // }

    // Notify the application about the new peer
    if (this.onPeerJoined) {
      this.onPeerJoined(peerId, peerName, isHost, isInvitee);
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

  public getLocalProducers() {
    // Close all producers

    return this.producers;
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

    //> Reset state
    this.device = null;
    this.roomId = null;
    this.peerId = null;
    this.peerName = null;
    this.isHost = false;
    this.isInvitee = false
  }

  public setOnNewConsumer(
    callback: (
      consumer: Consumer<AppData>,
      peerId: string,
      peerName: string
    ) => void
  ): void {
    this.onNewConsumer = callback;
  }

  public setOnConsumerClosed(callback: (consumerId: string) => void): void {
    this.onConsumerClosed = callback;
  }

  public setOnPeerJoined(
    callback: (peerId: string, peerName: string, isHost: boolean, isInvitee:boolean) => void
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

  public setOnLiveStreamState(callback: (isLive: boolean) => void): void {
    this.onLiveStreamState = callback;
  }
  public setOnConnected(callback: () => void): void {
    this.onConnected = callback;
  }

  public setOnDisconnected(callback: () => void): void {
    this.onDisconnected = callback;
  }

  public setOnError(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  public setProducerErrorHandler(callback: () => Promise<void>) {
    this.onProducerErrorCallback = callback;
  }
}

export const webRTCService = new WebRTCService();
