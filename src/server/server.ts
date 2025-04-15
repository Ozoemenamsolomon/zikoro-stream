import { App, DEDICATED_COMPRESSOR_3KB, SSLApp, type WebSocket } from "uWebSockets.js";
import * as mediasoup from "mediasoup";
import type { Worker, Router, WebRtcTransport, Producer, Consumer, Transport } from "mediasoup/node/lib/types";
import { config } from "./config";
import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";


interface SocketData {
  peerId: string;
  roomId: string;
}

interface Room {
  id: string;
  router: Router;
  peers: Map<string, Peer>;
  messages: Message[];
}

interface Peer {
  id: string;
  name: string;
  socket: WebSocket<SocketData>;
  transports: Map<string, Transport>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
  isHost: boolean;
  status: {
    audioMuted: boolean;
    videoMuted: boolean;
    speaking: boolean;
  };
}

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

// Global variables
const workers: Worker[] = [];
const rooms = new Map<string, Room>();
const serverEvents = new EventEmitter();

// Mediasoup setup
async function createWorkers() {
  const { numWorkers, workerSettings } = config.mediasoup;

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: workerSettings.logLevel as any,
      logTags: workerSettings.logTags as any,
      rtcMinPort: workerSettings.rtcMinPort,
      rtcMaxPort: workerSettings.rtcMaxPort,
    });

    worker.on("died", () => {
      console.error(`Worker ${worker.pid} died, exiting in 2 seconds...`);
      setTimeout(() => process.exit(1), 2000);
    });

    workers.push(worker);
  }
}

function getMediasoupWorker() {
  return workers[Math.floor(Math.random() * workers.length)];
}

async function createRouter() {
  const worker = getMediasoupWorker();
  const { mediaCodecs } = config.mediasoup.routerOptions;
   // @ts-ignore
  return await worker.createRouter({ mediaCodecs });
}

async function getOrCreateRoom(roomId: string): Promise<Room> {
  let room = rooms.get(roomId);

  if (!room) {
    const router = await createRouter();
    room = {
      id: roomId,
      router,
      peers: new Map(),
      messages: [],
    };
    rooms.set(roomId, room);
    
    serverEvents.on(`room-empty:${roomId}`, () => {
      if (room && room.peers.size === 0) {
        room.router.close();
        rooms.delete(roomId);
      }
    });
  }

  return room;
}

async function createWebRtcTransport(router: Router) {
  const { listenIps, initialAvailableOutgoingBitrate } = config.mediasoup.webRtcTransportOptions;

  return await router.createWebRtcTransport({
    listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate,
  });
}

function broadcastToRoom(roomId: string, message: any, excludePeerId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const messageStr = JSON.stringify(message);
  
  for (const [peerId, peer] of room.peers) {
    if (peerId !== excludePeerId) {
      try {
        peer.socket.send(messageStr);
      } catch (err) {
        console.error(`Error sending to peer ${peerId}:`, err);
      }
    }
  }
}

function handleSocketMessage(ws: WebSocket<SocketData>, message: any, isBinary: boolean) {
  if (isBinary) return;

  try {
    const data = JSON.parse(Buffer.from(message).toString());
    const { type } = data;

    switch (type) {
      case "join-room":
        handleJoinRoom(ws, data);
        break;
      case "create-transport":
        handleCreateTransport(ws, data);
        break;
      case "connect-transport":
        handleConnectTransport(ws, data);
        break;
      case "produce":
        handleProduce(ws, data);
        break;
      case "consume":
        handleConsume(ws, data);
        break;
      case "resume-consumer":
        handleResumeConsumer(ws, data);
        break;
      case "get-producers":
        handleGetProducers(ws, data);
        break;
      case "chat-message":
        handleChatMessage(ws, data);
        break;
      case "get-messages":
        handleGetMessages(ws, data);
        break;
      case "leave-room":
        handleLeaveRoom(ws, data);
        break;
      case "mute-status":
        handleMuteStatus(ws, data);
        break;
      case "speaking":
        handleSpeakingStatus(ws, data);
        break;
      case "get-router-capabilities":
        handleGetRouterCapabilities(ws, data);
        break;
      default:
        console.warn(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendError(ws, "Error processing request");
  }
}

function sendError(ws: WebSocket<SocketData>, message: string) {
  ws.send(JSON.stringify({
    type: "error",
    message,
  }));
}

async function handleJoinRoom(ws: WebSocket<SocketData>, data: any) {
  const { roomId, peerId, peerName, isHost } = data;

  try {
    const room = await getOrCreateRoom(roomId);

    const peer: Peer = {
      id: peerId,
      name: peerName,
      socket: ws,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      isHost,
      status: {
        audioMuted: false,
        videoMuted: false,
        speaking: false,
      },
    };

    room.peers.set(peerId, peer);
    ws.getUserData().peerId = peerId;
    ws.getUserData().roomId = roomId;

    broadcastToRoom(roomId, {
      type: "peer-joined",
      peerId,
      peerName,
      isHost,
    });

    const peerInfos = Array.from(room.peers.entries())
      .filter(([id]) => id !== peerId)
      .map(([id, p]) => ({
        id,
        name: p.name,
        isHost: p.isHost,
      }));

    ws.send(JSON.stringify({
      type: "room-info",
      roomId,
      peers: peerInfos,
    }));

    ws.send(JSON.stringify({
      type: "router-capabilities",
      routerCapabilities: room.router.rtpCapabilities,
    }));

  } catch (error) {
    console.error("Error joining room:", error);
    sendError(ws, "Error joining room");
  }
}

async function handleCreateTransport(ws: WebSocket<SocketData>, data: any) {
  const { roomId, peerId, direction } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    const transport = await createWebRtcTransport(room.router);
    peer.transports.set(transport.id, transport);

    transport.on("routerclose", () => {
      transport.close();
      peer.transports.delete(transport.id);
    });

    ws.send(JSON.stringify({
      type: "transport-created",
      direction,
      transportId: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    }));

  } catch (error) {
    console.error("Error creating transport:", error);
    sendError(ws, "Error creating transport");
  }
}

async function handleConnectTransport(ws: WebSocket<SocketData>, data: any) {
  const { roomId, peerId, transportId, dtlsParameters } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);

    await transport.connect({ dtlsParameters });

    ws.send(JSON.stringify({
      type: "transport-connected",
      transportId,
    }));

  } catch (error) {
    console.error("Error connecting transport:", error);
    sendError(ws, "Error connecting transport");
  }
}

async function handleProduce(ws: WebSocket<SocketData>, data: any) {
  const { roomId, peerId, transportId, kind, rtpParameters } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    const transport = peer.transports.get(transportId) as WebRtcTransport;
    if (!transport) throw new Error(`Transport ${transportId} not found`);

    const producer = await transport.produce({ kind, rtpParameters });
    peer.producers.set(producer.id, producer);

    producer.on("transportclose", () => {
      producer.close();
      peer.producers.delete(producer.id);
    });

    broadcastToRoom(roomId, {
      type: "new-producer",
      producerId: producer.id,
      peerId,
      kind,
    }, peerId);

    ws.send(JSON.stringify({
      type: "producer-created",
      producerId: producer.id,
    }));

  } catch (error) {
    console.error("Error producing:", error);
    sendError(ws, "Error producing");
  }
}

async function handleConsume(ws: WebSocket<SocketData>, data: any) {
  const { roomId, peerId, transportId, producerId, rtpCapabilities } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    const transport = peer.transports.get(transportId) as WebRtcTransport;
    if (!transport) throw new Error(`Transport ${transportId} not found`);

    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error("Cannot consume");
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
    });

    peer.consumers.set(consumer.id, consumer);

    consumer.on("transportclose", () => {
      consumer.close();
      peer.consumers.delete(consumer.id);
    });

    consumer.on("producerclose", () => {
      consumer.close();
      peer.consumers.delete(consumer.id);
      ws.send(JSON.stringify({
        type: "consumer-closed",
        consumerId: consumer.id,
      }));
    });

    const producerPeer = Array.from(room.peers.values())
      .find(p => Array.from(p.producers.keys()).includes(producerId));

    ws.send(JSON.stringify({
      type: "consumer-created",
      consumerId: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      producerPeerId: producerPeer?.id,
    }));

  } catch (error) {
    console.error("Error consuming:", error);
    sendError(ws, "Error consuming");
  }
}

async function handleResumeConsumer(ws: WebSocket<SocketData>, data: any) {
  const { roomId, peerId, consumerId } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    const consumer = peer.consumers.get(consumerId);
    if (!consumer) throw new Error(`Consumer ${consumerId} not found`);

    await consumer.resume();

  } catch (error) {
    console.error("Error resuming consumer:", error);
    sendError(ws, "Error resuming consumer");
  }
}

async function handleGetProducers(ws: WebSocket<SocketData>, data: any) {
  const { roomId, peerId } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const producers = Array.from(room.peers.entries())
      .filter(([id]) => id !== peerId)
      .flatMap(([id, peer]) => 
        Array.from(peer.producers.entries()).map(([producerId, producer]) => ({
          peerId: id,
          producerId,
          kind: producer.kind,
        }))
      );

    ws.send(JSON.stringify({
      type: "producer-list",
      producers,
    }));

  } catch (error) {
    console.error("Error getting producers:", error);
    sendError(ws, "Error getting producers");
  }
}

function handleChatMessage(ws: WebSocket<SocketData>, data: any) {
  const { roomId, peerId, peerName, content } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    const message: Message = {
      id: uuidv4(),
      roomId,
      senderId: peerId,
      senderName: peerName,
      content,
      timestamp: Date.now(),
    };

    room.messages.push(message);
    broadcastToRoom(roomId, {
      type: "chat-message",
      message,
    });

  } catch (error) {
    console.error("Error sending chat message:", error);
    sendError(ws, "Error sending chat message");
  }
}

function handleGetMessages(ws: WebSocket<SocketData>, data: any) {
  const { roomId } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    ws.send(JSON.stringify({
      type: "message-list",
      messages: room.messages,
    }));

  } catch (error) {
    console.error("Error getting messages:", error);
    sendError(ws, "Error getting messages");
  }
}

function handleGetRouterCapabilities(ws: WebSocket<SocketData>, data: any) {
  const { roomId } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    ws.send(JSON.stringify({
      type: "router-capabilities",
      routerCapabilities: room.router.rtpCapabilities,
    }));

  } catch (error) {
    console.error("Error getting router capabilities:", error);
    sendError(ws, "Error getting router capabilities");
  }
}

function handleMuteStatus(ws: WebSocket<SocketData>, data: any) {
  const { roomId, peerId, kind, muted } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    if (kind === 'audio') {
      peer.status.audioMuted = muted;
    } else if (kind === 'video') {
      peer.status.videoMuted = muted;
    }

    broadcastToRoom(roomId, {
      type: "mute-status",
      peerId,
      kind,
      muted,
    }, peerId);

  } catch (error) {
    console.error("Error handling mute status:", error);
    sendError(ws, "Error handling mute status");
  }
}

function handleSpeakingStatus(ws: WebSocket<SocketData>, data: any) {
  const { roomId, peerId, speaking } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    peer.status.speaking = speaking;

    broadcastToRoom(roomId, {
      type: "speaking",
      peerId,
      speaking,
    }, peerId);

  } catch (error) {
    console.error("Error handling speaking status:", error);
    sendError(ws, "Error handling speaking status");
  }
}

function handleLeaveRoom(ws: WebSocket<SocketData>, data: any) {
  const { roomId, peerId } = data;

  try {
    const room = rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(peerId);
    if (!peer) return;

    peer.transports.forEach(transport => transport.close());
    peer.producers.forEach(producer => producer.close());
    peer.consumers.forEach(consumer => consumer.close());

    room.peers.delete(peerId);

    broadcastToRoom(roomId, {
      type: "peer-left",
      peerId,
    });

    if (room.peers.size === 0) {
      serverEvents.emit(`room-empty:${roomId}`);
    }

  } catch (error) {
    console.error("Error leaving room:", error);
  }
}

async function startServer() {
  await createWorkers();

  const app = (process.env.NODE_ENV === "production" && process.env.SSL_KEY && process.env.SSL_CERT)
    ? SSLApp({
        key_file_name: process.env.SSL_KEY,
        cert_file_name: process.env.SSL_CERT,
      })
    : App();

     // Add CORS middleware for HTTP requests
  app.any("/*", (res, req) => {
    res.writeHeader("Access-Control-Allow-Origin", "*");
    res.writeHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.writeHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
  });

  app.ws("/ws", {
    compression: DEDICATED_COMPRESSOR_3KB,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 60,

    open: (ws) => {
      console.log("WebSocket connection opened");
    },

    message: (ws, message, isBinary) => {
         // @ts-ignore
      handleSocketMessage(ws, message, isBinary);
    },

    close: (ws, code, message) => {
      console.log("WebSocket connection closed");
      const userData = ws.getUserData();

      // @ts-ignore
      if (userData.peerId && userData.roomId) {
         // @ts-ignore
        handleLeaveRoom(ws, { roomId: userData.roomId, peerId: userData.peerId });
      }
    },
  })
  .listen(3000, (token) => {
    if (token) {
      console.log('WebSocket server is running on port 3000');
    }
  });

  app.get("/", (res, _) => {
    res.writeStatus("200 OK").writeHeader("Content-Type", "text/plain").end("WebRTC SFU Server");
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(port, (token) => {
    if (token) {
      console.log(`Server started on port ${port}`);
    } else {
      console.error(`Failed to start server on port ${port}`);
    }
  });
}

startServer().catch(console.error);