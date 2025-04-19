import { Device } from "mediasoup-client"
import { v4 as uuidv4 } from "uuid"
import Logger from "../logger"
import { useAppStore } from "@/store/streamStore"
import type { Consumer, Producer, Transport } from "mediasoup-client/types"

const logger = new Logger("WebRTCService")

// Video constraints
const VIDEO_CONSTRAINS = {
  qvga: { width: { ideal: 320 }, height: { ideal: 240 } },
  vga: { width: { ideal: 640 }, height: { ideal: 480 } },
  hd: { width: { ideal: 1280 }, height: { ideal: 720 } },
}

// PC proprietary constraints
const PC_PROPRIETARY_CONSTRAINTS = {
  // optional: [{ googDscp: true }]
}

interface WebRTCServiceOptions {
  roomId: string
  peerId: string
  displayName: string
  device: any
  forceTcp?: boolean
  produce?: boolean
  consume?: boolean
  forceVP8?: boolean
  forceH264?: boolean
  enableWebcamLayers?: boolean
  enableSharingLayers?: boolean
  webcamScalabilityMode?: string
  sharingScalabilityMode?: string
  numSimulcastStreams?: number
}

export default class WebRTCService {
  // Private properties
  private _closed: boolean
  private _roomId: string
  private _displayName: string
  private _device: any
  private _forceTcp: boolean
  private _produce: boolean
  private _consume: boolean
  private _forceVP8: boolean
  private _forceH264: boolean
  private _enableWebcamLayers: boolean
  private _enableSharingLayers: boolean
  private _webcamScalabilityMode: string
  private _sharingScalabilityMode: string
  private _numSimulcastStreams: number
  private _wsUrl: string
  private _socket: WebSocket | null
  private _mediasoupDevice: Device | null
  private _sendTransport: Transport | null
  private _recvTransport: Transport | null
  private _micProducer: Producer | null
  private _webcamProducer: Producer | null
  private _shareProducer: Producer | null
  private _consumers: Map<string, Consumer>
  private _webcams: Map<string, MediaDeviceInfo>
  private _webcam: { device: MediaDeviceInfo | null; resolution: string }
  private _peerId: string
  private _peers: Map<string, any>

  // Event handlers
  private _onConnected: (() => void) | null
  private _onDisconnected: (() => void) | null
  private _onPeerJoined: ((peerId: string, displayName: string, isHost: boolean) => void) | null
  private _onPeerLeft: ((peerId: string) => void) | null
  private _onNewConsumer: ((consumer: Consumer, peerId: string) => void) | null
  private _onConsumerClosed: ((consumerId: string) => void) | null
  private _onChatMessage: ((message: any) => void) | null
  private _onError: ((error: Error) => void) | null

  constructor({
    roomId,
    peerId,
    displayName,
    device,
    forceTcp = false,
    produce = true,
    consume = true,
    forceVP8 = false,
    forceH264 = false,
    enableWebcamLayers = true,
    enableSharingLayers = true,
    webcamScalabilityMode = "L3T3",
    sharingScalabilityMode = "L3T3",
    numSimulcastStreams = 3,
  }: WebRTCServiceOptions) {
    logger.debug(
      'constructor() [roomId:"%s", peerId:"%s", displayName:"%s", device:%s]',
      roomId,
      peerId,
      displayName,
      device.flag,
    )

    // Closed flag.
    this._closed = false

    // Room ID.
    this._roomId = roomId

    // Display name.
    this._displayName = displayName

    // Device info.
    this._device = device

    // Whether we want to force RTC over TCP.
    this._forceTcp = forceTcp

    // Whether we want to produce audio/video.
    this._produce = produce

    // Whether we should consume.
    this._consume = consume

    // Force VP8 codec for sending.
    this._forceVP8 = Boolean(forceVP8)

    // Force H264 codec for sending.
    this._forceH264 = Boolean(forceH264)

    // Whether simulcast or SVC should be used for webcam.
    this._enableWebcamLayers = Boolean(enableWebcamLayers)

    // Whether simulcast or SVC should be used in desktop sharing.
    this._enableSharingLayers = Boolean(enableSharingLayers)

    // Scalability mode for webcam.
    this._webcamScalabilityMode = webcamScalabilityMode

    // Scalability mode for sharing.
    this._sharingScalabilityMode = sharingScalabilityMode

    // Number of simulcast streams for webcam and sharing.
    this._numSimulcastStreams = numSimulcastStreams

    // WebSocket URL.
    this._wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${window.location.hostname}:3001/ws`

    // WebSocket connection.
    this._socket = null

    // mediasoup-client Device instance.
    this._mediasoupDevice = null

    // mediasoup Transport for sending.
    this._sendTransport = null

    // mediasoup Transport for receiving.
    this._recvTransport = null

    // Local mic mediasoup Producer.
    this._micProducer = null

    // Local webcam mediasoup Producer.
    this._webcamProducer = null

    // Local share mediasoup Producer.
    this._shareProducer = null

    // mediasoup Consumers.
    this._consumers = new Map()

    // Map of webcam MediaDeviceInfos indexed by deviceId.
    this._webcams = new Map()

    // Local Webcam.
    this._webcam = {
      device: null,
      resolution: "hd",
    }

    // Our peer ID.
    this._peerId = peerId

    // Map of peers.
    this._peers = new Map()

    // Event handlers
    this._onConnected = null
    this._onDisconnected = null
    this._onPeerJoined = null
    this._onPeerLeft = null
    this._onNewConsumer = null
    this._onConsumerClosed = null
    this._onChatMessage = null
    this._onError = null
  }

  // Public getters and setters
  setRoomId(roomId: string): void {
    this._roomId = roomId
  }

  getRoomId(): string {
    return this._roomId
  }

  setPeerId(peerId: string): void {
    this._peerId = peerId
  }

  getPeerId(): string {
    return this._peerId
  }

  setDisplayName(displayName: string): void {
    this._displayName = displayName
  }

  getDisplayName(): string {
    return this._displayName
  }

  setDevice(device: any): void {
    this._device = device
  }

  getDevice(): any {
    return this._device
  }

  // Initialize the service with new values
  init(options: { roomId?: string; peerId?: string; displayName?: string; device?: any }): void {
    if (options.roomId) this._roomId = options.roomId
    if (options.peerId) this._peerId = options.peerId
    if (options.displayName) this._displayName = options.displayName
    if (options.device) this._device = options.device
  }

  close() {
    if (this._closed) return

    this._closed = true

    logger.debug("close()")

    // Close WebSocket connection
    if (this._socket) {
      this._socket.close()
      this._socket = null
    }

    // Close mediasoup Transports.
    if (this._sendTransport) {
      this._sendTransport.close()
      this._sendTransport = null
    }

    if (this._recvTransport) {
      this._recvTransport.close()
      this._recvTransport = null
    }

    useAppStore.getState().setRoomState("closed")
  }

  async connect() {
    try {
      this._socket = new WebSocket(this._wsUrl)

      this._socket.onopen = () => {
        logger.debug("WebSocket connected")
        this._joinRoom()
        if (this._onConnected) this._onConnected()
      }

      this._socket.onclose = () => {
        logger.debug("WebSocket disconnected")
        if (this._onDisconnected) this._onDisconnected()

        // Close mediasoup Transports.
        if (this._sendTransport) {
          this._sendTransport.close()
          this._sendTransport = null
        }

        if (this._recvTransport) {
          this._recvTransport.close()
          this._recvTransport = null
        }

        useAppStore.getState().setRoomState("closed")
      }

      this._socket.onerror = (error) => {
        logger.error("WebSocket error:", error)
        if (this._onError) this._onError(new Error("WebSocket connection error"))
      }

      this._socket.onmessage = (event) => {
        this._handleSocketMessage(event)
      }

      useAppStore.getState().setRoomState("connecting")
    } catch (error) {
      logger.error("connect() | failed:%o", error)
      if (this._onError) this._onError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  async _joinRoom() {
    logger.debug("_joinRoom()")

    try {
      this._mediasoupDevice = new Device()

      // Send join message
      this._sendRequest("join-room", {
        roomId: this._roomId,
        peerId: this._peerId,
        displayName: this._displayName,
        device: this._device,
        rtpCapabilities: this._consume && this._mediasoupDevice ? this._mediasoupDevice.rtpCapabilities : undefined,
      })
    } catch (error) {
      logger.error("_joinRoom() | failed:%o", error)
      useAppStore.getState().setRoomError(`Could not join the room: ${error}`)
      this.close()
    }
  }

  _handleSocketMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data)
      const { type, data } = message

      logger.debug("received message: %s", type)

      switch (type) {
        case "room-info":
          this._handleRoomInfo(data)
          break
        case "router-capabilities":
          this._handleRouterCapabilities(data)
          break
        case "transport-created":
          this._handleTransportCreated(data)
          break
        case "transport-connected":
          this._handleTransportConnected(data)
          break
        case "producer-created":
          this._handleProducerCreated(data)
          break
        case "new-producer":
          this._handleNewProducer(data)
          break
        case "consumer-created":
          this._handleConsumerCreated(data)
          break
        case "consumer-closed":
          this._handleConsumerClosed(data)
          break
        case "peer-joined":
          this._handlePeerJoined(data)
          break
        case "peer-left":
          this._handlePeerLeft(data)
          break
        case "active-speaker":
          this._handleActiveSpeaker(data)
          break
        case "chat-message":
          this._handleChatMessage(data)
          break
        case "error":
          this._handleError(data)
          break
        default:
          logger.warn("unknown message type: %s", type)
      }
    } catch (error) {
      logger.error("_handleSocketMessage() | failed:%o", error)
    }
  }

  _sendRequest(type: string, data: any = {}) {
    if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
      logger.warn("sendRequest() | WebSocket not connected")
      return
    }

    const message = JSON.stringify({ type, ...data })
    this._socket.send(message)
  }

  async _handleRoomInfo(data: any) {
    const { roomId, peers, routerRtpCapabilities } = data

    logger.debug("_handleRoomInfo() [roomId:%s, peers:%o]", roomId, peers)

    try {
      // Load mediasoup device with router capabilities
      if (this._mediasoupDevice) {
        await this._mediasoupDevice.load({ routerRtpCapabilities })
      }

      // Create transports
      this._sendRequest("create-transport", {
        roomId: this._roomId,
        peerId: this._peerId,
        direction: "send",
        forceTcp: this._forceTcp,
        producing: this._produce,
        consuming: false,
      })

      this._sendRequest("create-transport", {
        roomId: this._roomId,
        peerId: this._peerId,
        direction: "recv",
        forceTcp: this._forceTcp,
        producing: false,
        consuming: this._consume,
      })

      // Add peers
      for (const peer of peers) {
        useAppStore.getState().addPeer({ ...peer, consumers: [] })
      }

      useAppStore.getState().setRoomState("connected")
    } catch (error) {
      logger.error("_handleRoomInfo() | failed:%o", error)
      useAppStore.getState().setRoomError(`Error setting up room: ${error}`)
    }
  }

  _handleRouterCapabilities(data: any) {
    const { routerRtpCapabilities } = data
    logger.debug("_handleRouterCapabilities()")

    // This is handled in the promise in _loadDevice
  }

  async _handleTransportCreated(data: any) {
    const { direction, transportId, iceParameters, iceCandidates, dtlsParameters } = data

    logger.debug("_handleTransportCreated() [direction:%s, transportId:%s]", direction, transportId)

    try {
      if (!this._mediasoupDevice) {
        throw new Error("No mediasoup device")
      }

      if (direction === "send") {
        this._sendTransport = this._mediasoupDevice.createSendTransport({
          id: transportId,
          iceParameters,
          iceCandidates,
          dtlsParameters: {
            ...dtlsParameters,
            role: "auto",
          },
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
          proprietaryConstraints: PC_PROPRIETARY_CONSTRAINTS,
        })

        this._sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
          logger.debug('sendTransport "connect" event')

          this._sendRequest("connect-transport", {
            roomId: this._roomId,
            peerId: this._peerId,
            transportId,
            dtlsParameters,
          })

          callback()
        })

        this._sendTransport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
          logger.debug('sendTransport "produce" event [kind:%s]', kind)

          try {
            this._sendRequest("produce", {
              roomId: this._roomId,
              peerId: this._peerId,
              transportId,
              kind,
              rtpParameters,
              appData,
            })

            // We'll get the producerId in the producer-created event
            const producerIdPromise = new Promise<string>((resolve) => {
              const onProducerCreated = (event: MessageEvent) => {
                const message = JSON.parse(event.data)
                if (message.type === "producer-created") {
                  this._socket?.removeEventListener("message", onProducerCreated)
                  resolve(message.data.producerId)
                }
              }
              this._socket?.addEventListener("message", onProducerCreated)

              // Add timeout
              setTimeout(() => {
                this._socket?.removeEventListener("message", onProducerCreated)
                errback(new Error("Timeout waiting for producer creation"))
              }, 10000)
            })

            const producerId = await producerIdPromise

            callback({ id: producerId })
          } catch (error) {
            logger.error('sendTransport "produce" event failed:%o', error)
            errback(error instanceof Error ? error : new Error(String(error)))
          }
        })

        // Enable media if we're ready
        if (this._produce) {
          this._updateWebcams()
            .then(() => {
              // Enable mic and webcam
              this.enableMic()
              this.enableWebcam()
            })
            .catch((error) => {
              logger.error("Failed to update webcams:%o", error)
            })
        }
      } else if (direction === "recv") {
        this._recvTransport = this._mediasoupDevice.createRecvTransport({
          id: transportId,
          iceParameters,
          iceCandidates,
          dtlsParameters: {
            ...dtlsParameters,
            role: "auto",
          },
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
        })

        this._recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
          logger.debug('recvTransport "connect" event')

          this._sendRequest("connect-transport", {
            roomId: this._roomId,
            peerId: this._peerId,
            transportId,
            dtlsParameters,
          })

          callback()
        })

        // Get existing producers in the room
        this._sendRequest("get-producers", {
          roomId: this._roomId,
          peerId: this._peerId,
        })
      }
    } catch (error) {
      logger.error("_handleTransportCreated() | failed:%o", error)
      useAppStore.getState().setRoomError(`Error creating transport: ${error}`)
    }
  }

  _handleTransportConnected(data: any) {
    const { transportId } = data
    logger.debug("_handleTransportConnected() [transportId:%s]", transportId)
  }

  _handleProducerCreated(data: any) {
    const { producerId } = data
    logger.debug("_handleProducerCreated() [producerId:%s]", producerId)

    // This is handled in the promise in the produce event
  }

  async _handleNewProducer(data: any) {
    const { producerId, peerId, kind } = data

    logger.debug("_handleNewProducer() [producerId:%s, peerId:%s, kind:%s]", producerId, peerId, kind)

    // Consume this producer
    if (this._consume && this._recvTransport && this._mediasoupDevice) {
      this._sendRequest("consume", {
        roomId: this._roomId,
        peerId: this._peerId,
        transportId: this._recvTransport.id,
        producerId,
        rtpCapabilities: this._mediasoupDevice.rtpCapabilities,
      })
    }
  }

  async _handleConsumerCreated(data: any) {
    const { consumerId, producerId, kind, rtpParameters, producerPeerId } = data

    logger.debug("_handleConsumerCreated() [consumerId:%s, producerId:%s, kind:%s]", consumerId, producerId, kind)

    try {
      if (!this._recvTransport) {
        throw new Error("No receive transport")
      }

      const consumer = await this._recvTransport.consume({
        id: consumerId,
        producerId,
        kind,
        rtpParameters,
      })

      // Store the consumer
      this._consumers.set(consumerId, consumer)

      consumer.on("transportclose", () => {
        this._consumers.delete(consumerId)
      })

      // Resume the consumer
      this._sendRequest("resume-consumer", {
        roomId: this._roomId,
        peerId: this._peerId,
        consumerId,
      })

      const { spatialLayers, temporalLayers } = {
        spatialLayers: 1,
        temporalLayers: 1,
      }

      // Add the consumer to the store
      useAppStore.getState().addConsumer(
        {
          id: consumer.id,
          type: kind,
          locallyPaused: false,
          remotelyPaused: false,
          rtpParameters: consumer.rtpParameters,
          spatialLayers,
          temporalLayers,
          preferredSpatialLayer: spatialLayers - 1,
          preferredTemporalLayer: temporalLayers - 1,
          priority: 1,
          codec: consumer.rtpParameters.codecs[0].mimeType.split("/")[1],
          track: consumer.track,
        },
        producerPeerId,
      )

      // Notify the application
      if (this._onNewConsumer) {
        this._onNewConsumer(consumer, producerPeerId)
      }
    } catch (error) {
      logger.error("_handleConsumerCreated() | failed:%o", error)
    }
  }

  _handleConsumerClosed(data: any) {
    const { consumerId } = data

    logger.debug("_handleConsumerClosed() [consumerId:%s]", consumerId)

    const consumer = this._consumers.get(consumerId)

    if (!consumer) return

    consumer.close()
    this._consumers.delete(consumerId)

    // Find the peer ID for this consumer
    const { peers } = useAppStore.getState()
    let peerId = null

    for (const id in peers) {
      if (peers[id].consumers.includes(consumerId)) {
        peerId = id
        break
      }
    }

    if (peerId) {
      useAppStore.getState().removeConsumer(consumerId, peerId)
    }

    // Notify the application
    if (this._onConsumerClosed) {
      this._onConsumerClosed(consumerId)
    }
  }

  _handlePeerJoined(data: any) {
    const { peerId, displayName, device, isHost } = data

    logger.debug("_handlePeerJoined() [peerId:%s, displayName:%s]", peerId, displayName)

    useAppStore.getState().addPeer({
      id: peerId,
      displayName,
      device,
      consumers: [],
      isHost,
    })

    // Notify the application
    if (this._onPeerJoined) {
      this._onPeerJoined(peerId, displayName, isHost)
    }
  }

  _handlePeerLeft(data: any) {
    const { peerId } = data

    logger.debug("_handlePeerLeft() [peerId:%s]", peerId)

    useAppStore.getState().removePeer(peerId)

    // Notify the application
    if (this._onPeerLeft) {
      this._onPeerLeft(peerId)
    }
  }

  _handleActiveSpeaker(data: any) {
    const { peerId } = data

    logger.debug("_handleActiveSpeaker() [peerId:%s]", peerId)

    useAppStore.getState().setRoomActiveSpeaker(peerId)
  }

  _handleChatMessage(data: any) {
    const { message } = data

    logger.debug("_handleChatMessage()")

    useAppStore.getState().addMessage(message)

    // Notify the application
    if (this._onChatMessage) {
      this._onChatMessage(message)
    }
  }

  _handleError(data: any) {
    const { error } = data

    logger.error("_handleError() [error:%s]", error)

    useAppStore.getState().setRoomError(error)

    // Notify the application
    if (this._onError) {
      this._onError(new Error(error))
    }
  }

  async enableMic() {
    logger.debug("enableMic()")

    if (this._micProducer) return

    if (!this._mediasoupDevice || !this._mediasoupDevice.canProduce("audio")) {
      logger.error("enableMic() | cannot produce audio")
      return
    }

    let track: MediaStreamTrack | undefined

    try {
      logger.debug("enableMic() | calling getUserMedia()")

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      track = stream.getAudioTracks()[0]

      if (!this._sendTransport) {
        throw new Error("No send transport")
      }

      this._micProducer = await this._sendTransport.produce({
        track,
        codecOptions: {
          opusStereo: true,
          opusDtx: true,
          opusFec: true,
          opusNack: true,
        },
      })

      useAppStore.getState().addProducer({
        id: this._micProducer.id,
        paused: this._micProducer.paused,
        track: this._micProducer.track,
        rtpParameters: this._micProducer.rtpParameters,
        codec: this._micProducer.rtpParameters.codecs[0].mimeType.split("/")[1],
      })

      this._micProducer.on("transportclose", () => {
        this._micProducer = null
      })

      this._micProducer.on("trackended", () => {
        this.disableMic().catch((error) => logger.error("disableMic() failed:%o", error))
      })
    } catch (error) {
      logger.error("enableMic() | failed:%o", error)

      if (track) track.stop()
    }
  }

  async disableMic() {
    logger.debug("disableMic()")

    if (!this._micProducer) return

    this._micProducer.close()

    useAppStore.getState().removeProducer(this._micProducer.id)

    try {
      this._sendRequest("close-producer", {
        roomId: this._roomId,
        peerId: this._peerId,
        producerId: this._micProducer.id,
      })
    } catch (error) {
      logger.error("disableMic() | failed:%o", error)
    }

    this._micProducer = null
  }

  async enableWebcam() {
    logger.debug("enableWebcam()")

    if (this._webcamProducer) return

    if (!this._mediasoupDevice || !this._mediasoupDevice.canProduce("video")) {
      logger.error("enableWebcam() | cannot produce video")
      return
    }

    let track: MediaStreamTrack | undefined
    let device: MediaDeviceInfo | null

    useAppStore.getState().setWebcamInProgress(true)

    try {
      await this._updateWebcams()
      device = this._webcam.device

      const { resolution } = this._webcam

      if (!device) throw new Error("no webcam devices")

      logger.debug("enableWebcam() | calling getUserMedia()")

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { ideal: device.deviceId },
          ...VIDEO_CONSTRAINS[resolution as keyof typeof VIDEO_CONSTRAINS],
        },
      })

      track = stream.getVideoTracks()[0]

      if (!this._sendTransport) {
        throw new Error("No send transport")
      }

      let encodings
      let codec
      const codecOptions = {
        videoGoogleStartBitrate: 1000,
      }

      if (this._forceVP8 && this._mediasoupDevice) {
        codec = this._mediasoupDevice.rtpCapabilities.codecs?.find((c) => c.mimeType.toLowerCase() === "video/vp8")

        if (!codec) {
          throw new Error("desired VP8 codec+configuration is not supported")
        }
      } else if (this._forceH264 && this._mediasoupDevice) {
        codec = this._mediasoupDevice.rtpCapabilities.codecs?.find((c) => c.mimeType.toLowerCase() === "video/h264")

        if (!codec) {
          throw new Error("desired H264 codec+configuration is not supported")
        }
      }

      if (this._enableWebcamLayers) {
        encodings = [
          {
            scaleResolutionDownBy: 1,
            maxBitrate: 5000000,
            scalabilityMode: this._webcamScalabilityMode,
          },
        ]

        if (this._numSimulcastStreams > 1) {
          encodings.unshift({
            scaleResolutionDownBy: 2,
            maxBitrate: 1000000,
            scalabilityMode: this._webcamScalabilityMode,
          })
        }

        if (this._numSimulcastStreams > 2) {
          encodings.unshift({
            scaleResolutionDownBy: 4,
            maxBitrate: 500000,
            scalabilityMode: this._webcamScalabilityMode,
          })
        }
      }

      this._webcamProducer = await this._sendTransport.produce({
        track,
        encodings,
        codecOptions,
        codec,
      })

      useAppStore.getState().addProducer({
        id: this._webcamProducer.id,
        deviceLabel: device.label,
        type: "webcam",
        paused: this._webcamProducer.paused,
        track: this._webcamProducer.track,
        rtpParameters: this._webcamProducer.rtpParameters,
        codec: this._webcamProducer.rtpParameters.codecs[0].mimeType.split("/")[1],
      })

      this._webcamProducer.on("transportclose", () => {
        this._webcamProducer = null
      })

      this._webcamProducer.on("trackended", () => {
        this.disableWebcam().catch((error) => logger.error("disableWebcam() failed:%o", error))
      })
    } catch (error) {
      logger.error("enableWebcam() | failed:%o", error)

      if (track) track.stop()
    }

    useAppStore.getState().setWebcamInProgress(false)
  }

  async disableWebcam() {
    logger.debug("disableWebcam()")

    if (!this._webcamProducer) return

    this._webcamProducer.close()

    useAppStore.getState().removeProducer(this._webcamProducer.id)

    try {
      this._sendRequest("close-producer", {
        roomId: this._roomId,
        peerId: this._peerId,
        producerId: this._webcamProducer.id,
      })
    } catch (error) {
      logger.error("disableWebcam() | failed:%o", error)
    }

    this._webcamProducer = null
  }

  async enableShare() {
    logger.debug("enableShare()")

    if (this._shareProducer) return

    if (!this._mediasoupDevice || !this._mediasoupDevice.canProduce("video")) {
      logger.error("enableShare() | cannot produce video")
      return
    }

    let track: MediaStreamTrack | undefined

    useAppStore.getState().setShareInProgress(true)

    try {
      logger.debug("enableShare() | calling getDisplayMedia()")

      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: {
          displaySurface: "monitor",
          logicalSurface: true,
          cursor: true,
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 },
        },
      })

      track = stream.getVideoTracks()[0]

      if (!this._sendTransport) {
        throw new Error("No send transport")
      }

      let encodings
      let codec
      const codecOptions = {
        videoGoogleStartBitrate: 1000,
      }

      if (this._forceVP8 && this._mediasoupDevice) {
        codec = this._mediasoupDevice.rtpCapabilities.codecs?.find((c) => c.mimeType.toLowerCase() === "video/vp8")

        if (!codec) {
          throw new Error("desired VP8 codec+configuration is not supported")
        }
      } else if (this._forceH264 && this._mediasoupDevice) {
        codec = this._mediasoupDevice.rtpCapabilities.codecs?.find((c) => c.mimeType.toLowerCase() === "video/h264")

        if (!codec) {
          throw new Error("desired H264 codec+configuration is not supported")
        }
      }

      if (this._enableSharingLayers) {
        encodings = [
          {
            scaleResolutionDownBy: 1,
            maxBitrate: 5000000,
            scalabilityMode: this._sharingScalabilityMode,
            dtx: true,
          },
        ]

        if (this._numSimulcastStreams > 1) {
          encodings.unshift({
            scaleResolutionDownBy: 2,
            maxBitrate: 1000000,
            scalabilityMode: this._sharingScalabilityMode,
            dtx: true,
          })
        }

        if (this._numSimulcastStreams > 2) {
          encodings.unshift({
            scaleResolutionDownBy: 4,
            maxBitrate: 500000,
            scalabilityMode: this._sharingScalabilityMode,
            dtx: true,
          })
        }
      }

      this._shareProducer = await this._sendTransport.produce({
        track,
        encodings,
        codecOptions,
        codec,
        appData: {
          share: true,
        },
      })

      useAppStore.getState().addProducer({
        id: this._shareProducer.id,
        type: "share",
        paused: this._shareProducer.paused,
        track: this._shareProducer.track,
        rtpParameters: this._shareProducer.rtpParameters,
        codec: this._shareProducer.rtpParameters.codecs[0].mimeType.split("/")[1],
      })

      this._shareProducer.on("transportclose", () => {
        this._shareProducer = null
      })

      this._shareProducer.on("trackended", () => {
        this.disableShare().catch((error) => logger.error("disableShare() failed:%o", error))
      })
    } catch (error) {
      logger.error("enableShare() | failed:%o", error)

      if (track) track.stop()
    }

    useAppStore.getState().setShareInProgress(false)
  }

  async disableShare() {
    logger.debug("disableShare()")

    if (!this._shareProducer) return

    this._shareProducer.close()

    useAppStore.getState().removeProducer(this._shareProducer.id)

    try {
      this._sendRequest("close-producer", {
        roomId: this._roomId,
        peerId: this._peerId,
        producerId: this._shareProducer.id,
      })
    } catch (error) {
      logger.error("disableShare() | failed:%o", error)
    }

    this._shareProducer = null
  }

  async sendChatMessage(content: string, ) {
    logger.debug("sendChatMessage()")

    try {
      const message = {
        id: uuidv4(),
        peerId: this._peerId,
        displayName: this._displayName,
        content,
        timestamp: Date.now(),
      }

      this._sendRequest("chat-message", {
        roomId: this._roomId,
        peerId: this._peerId,
        message,
      })

      // Add to local store
     // useAppStore.getState().addMessage(message)
    } catch (error) {
      logger.error("sendChatMessage() | failed:%o", error)
    }
  }

  async _updateWebcams() {
    logger.debug("_updateWebcams()")

    // Reset the list
    this._webcams = new Map()

    logger.debug("_updateWebcams() | calling enumerateDevices()")

    const devices = await navigator.mediaDevices.enumerateDevices()

    for (const device of devices) {
      if (device.kind !== "videoinput") continue

      this._webcams.set(device.deviceId, device)
    }

    const array = Array.from(this._webcams.values())
    const len = array.length
    const currentWebcamId = this._webcam.device ? this._webcam.device.deviceId : undefined

    logger.debug("_updateWebcams() [webcams:%o]", array)

    if (len === 0) this._webcam.device = null
    else if (!currentWebcamId || !this._webcams.has(currentWebcamId)) this._webcam.device = array[0]

    useAppStore.getState().setCanChangeWebcam(this._webcams.size > 1)
  }

  // Event handlers
  setOnConnected(callback: () => void) {
    this._onConnected = callback
  }

  setOnDisconnected(callback: () => void) {
    this._onDisconnected = callback
  }

  setOnPeerJoined(callback: (peerId: string, displayName: string, isHost: boolean) => void) {
    this._onPeerJoined = callback
  }

  setOnPeerLeft(callback: (peerId: string) => void) {
    this._onPeerLeft = callback
  }

  setOnNewConsumer(callback: (consumer: Consumer, peerId: string) => void) {
    this._onNewConsumer = callback
  }

  setOnConsumerClosed(callback: (consumerId: string) => void) {
    this._onConsumerClosed = callback
  }

  setOnChatMessage(callback: (message: any) => void) {
    this._onChatMessage = callback
  }

  setOnError(callback: (error: Error) => void) {
    this._onError = callback
  }
}

// Create a singleton instance
export const webRTCService = new WebRTCService({
  roomId: "",
  peerId: "",
  displayName: "",
  device: { flag: "unknown" },
})
