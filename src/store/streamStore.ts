import { create } from "zustand"
import { nanoid } from "nanoid"


// Define types for our store
interface Room {
  url: string | null
  state: "new" | "connecting" | "connected" | "disconnected" | "closed"
  mediasoupVersion: string | null
  activeSpeakerId: string | null
  error: string | null
}

interface Me {
  id: string | null
  displayName: string | null
  device: any | null
  canSendMic: boolean
  canSendWebcam: boolean
  canChangeWebcam: boolean
  webcamInProgress: boolean
  shareInProgress: boolean
  audioOnly: boolean
  audioMuted: boolean
  restartIceInProgress: boolean
}

interface Producer {
  id: string
  type?: string
  deviceLabel?: string
  paused: boolean
  track: MediaStreamTrack
  rtpParameters: any
  codec: string
}

interface Consumer {
  id: string
  type: string
  locallyPaused: boolean
  remotelyPaused: boolean
  rtpParameters: any
  spatialLayers: number
  temporalLayers: number
  preferredSpatialLayer: number
  preferredTemporalLayer: number
  priority: number
  codec: string
  track: MediaStreamTrack
}

interface Peer {
  id: string
  displayName: string
  device?: any
  consumers: string[]
  isHost?: boolean
}

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

interface Notification {
  id: string
  type: "info" | "error" | "success"
  title?: string
  text: string
  timeout: number
}

interface StreamState {
  room: Room
  me: Me
  producers: Record<string, Producer>
  consumers: Record<string, Consumer>
  peers: Record<string, Peer>
  messages: ResponseMessage[]
  notifications: Notification[]

  // Room actions
  setRoomUrl: (url: string) => void
  setRoomState: (state: Room["state"]) => void
  setRoomError: (error: string | null) => void
  setMediasoupVersion: (version: string) => void
  setRoomActiveSpeaker: (peerId: string) => void

  // Me actions
  setMe: (data: { peerId: string; displayName: string; device: any }) => void
  setMediaCapabilities: (data: { canSendMic: boolean; canSendWebcam: boolean }) => void
  setCanChangeWebcam: (canChangeWebcam: boolean) => void
  setWebcamInProgress: (flag: boolean) => void
  setShareInProgress: (flag: boolean) => void
  setAudioMutedState: (enabled: boolean) => void
  setRestartIceInProgress: (flag: boolean) => void

  // Producer actions
  addProducer: (producer: Producer) => void
  removeProducer: (producerId: string) => void
  setProducerPaused: (producerId: string) => void
  setProducerResumed: (producerId: string) => void
  setProducerTrack: (producerId: string, track: MediaStreamTrack) => void
  setProducerScore: (producerId: string, score: any) => void

  // Consumer actions
  addConsumer: (consumer: Consumer, peerId: string) => void
  removeConsumer: (consumerId: string, peerId: string) => void
  setConsumerPaused: (consumerId: string, originator?: "local" | "remote") => void
  setConsumerResumed: (consumerId: string, originator?: "local" | "remote") => void
  setConsumerTrack: (consumerId: string, track: MediaStreamTrack) => void
  setConsumerScore: (consumerId: string, score: any) => void

  // Peer actions
  addPeer: (peer: Peer) => void
  removePeer: (peerId: string) => void
  setPeerDisplayName: (displayName: string, peerId: string) => void

  // Message actions
  addMessage: (message: ResponseMessage) => void
  clearMessages: () => void

  // Notification actions
  addNotification: (notification: Omit<Notification, "id">) => void
  removeNotification: (notificationId: string) => void
  removeAllNotifications: () => void
  notify: (notification: {
    type?: "info" | "error" | "success"
    text: string
    title?: string
    timeout?: number
  }) => void
}

// Create the store
export const useAppStore = create<StreamState>((set) => ({
  // Initial state
  room: {
    url: null,
    state: "new",
    mediasoupVersion: null,
    activeSpeakerId: null,
    error: null,
  },
  me: {
    id: null,
    displayName: null,
    device: null,
    canSendMic: false,
    canSendWebcam: false,
    canChangeWebcam: false,
    webcamInProgress: false,
    shareInProgress: false,
    audioOnly: false,
    audioMuted: false,
    restartIceInProgress: false,
  },
  producers: {},
  consumers: {},
  peers: {},
  messages: [],
  notifications: [],

  // Room actions
  setRoomUrl: (url) => set((state) => ({ room: { ...state.room, url } })),
  setRoomState: (state) =>
    set((prevState) => {
      if (state === "closed") {
        return {
          room: { ...prevState.room, state, activeSpeakerId: null },
          producers: {},
          consumers: {},
          peers: {},
          me: {
            ...prevState.me,
            webcamInProgress: false,
            shareInProgress: false,
            audioOnly: false,
            audioMuted: false,
            restartIceInProgress: false,
          },
        }
      } else {
        return { room: { ...prevState.room, state } }
      }
    }),
  setRoomError: (error) => set((state) => ({ room: { ...state.room, error } })),
  setMediasoupVersion: (version) => set((state) => ({ room: { ...state.room, mediasoupVersion: version } })),
  setRoomActiveSpeaker: (peerId) => set((state) => ({ room: { ...state.room, activeSpeakerId: peerId } })),

  // Me actions
  setMe: ({ peerId, displayName, device }) =>
    set((state) => ({
      me: { ...state.me, id: peerId, displayName, device },
    })),
  setMediaCapabilities: ({ canSendMic, canSendWebcam }) =>
    set((state) => ({
      me: { ...state.me, canSendMic, canSendWebcam },
    })),
  setCanChangeWebcam: (canChangeWebcam) =>
    set((state) => ({
      me: { ...state.me, canChangeWebcam },
    })),
  setWebcamInProgress: (flag) =>
    set((state) => ({
      me: { ...state.me, webcamInProgress: flag },
    })),
  setShareInProgress: (flag) =>
    set((state) => ({
      me: { ...state.me, shareInProgress: flag },
    })),
  setAudioMutedState: (enabled) =>
    set((state) => ({
      me: { ...state.me, audioMuted: enabled },
    })),
  setRestartIceInProgress: (flag) =>
    set((state) => ({
      me: { ...state.me, restartIceInProgress: flag },
    })),

  // Producer actions
  addProducer: (producer) =>
    set((state) => ({
      producers: { ...state.producers, [producer.id]: producer },
    })),
  removeProducer: (producerId) =>
    set((state) => {
      const newProducers = { ...state.producers }
      delete newProducers[producerId]
      return { producers: newProducers }
    }),
  setProducerPaused: (producerId) =>
    set((state) => {
      const producer = state.producers[producerId]
      if (!producer) return state
      return {
        producers: {
          ...state.producers,
          [producerId]: { ...producer, paused: true },
        },
      }
    }),
  setProducerResumed: (producerId) =>
    set((state) => {
      const producer = state.producers[producerId]
      if (!producer) return state
      return {
        producers: {
          ...state.producers,
          [producerId]: { ...producer, paused: false },
        },
      }
    }),
  setProducerTrack: (producerId, track) =>
    set((state) => {
      const producer = state.producers[producerId]
      if (!producer) return state
      return {
        producers: {
          ...state.producers,
          [producerId]: { ...producer, track },
        },
      }
    }),
  setProducerScore: (producerId, score) =>
    set((state) => {
      const producer = state.producers[producerId]
      if (!producer) return state
      return {
        producers: {
          ...state.producers,
          [producerId]: { ...producer, score },
        },
      }
    }),

  // Consumer actions
  addConsumer: (consumer, peerId) =>
    set((state) => {
      const peer = state.peers[peerId]
      if (!peer) return state

      const newPeers = {
        ...state.peers,
        [peerId]: {
          ...peer,
          consumers: [...peer.consumers, consumer.id],
        },
      }

      return {
        consumers: { ...state.consumers, [consumer.id]: consumer },
        peers: newPeers,
      }
    }),
  removeConsumer: (consumerId, peerId) =>
    set((state) => {
      const peer = state.peers[peerId]
      if (!peer) {
        const newConsumers = { ...state.consumers }
        delete newConsumers[consumerId]
        return { consumers: newConsumers }
      }

      const idx = peer.consumers.indexOf(consumerId)
      if (idx === -1) {
        const newConsumers = { ...state.consumers }
        delete newConsumers[consumerId]
        return { consumers: newConsumers }
      }

      const newConsumers = { ...state.consumers }
      delete newConsumers[consumerId]

      const newConsumersList = [...peer.consumers]
      newConsumersList.splice(idx, 1)

      const newPeers = {
        ...state.peers,
        [peerId]: {
          ...peer,
          consumers: newConsumersList,
        },
      }

      return {
        consumers: newConsumers,
        peers: newPeers,
      }
    }),
  setConsumerPaused: (consumerId, originator = "local") =>
    set((state) => {
      const consumer = state.consumers[consumerId]
      if (!consumer) return state

      const newConsumer =
        originator === "local" ? { ...consumer, locallyPaused: true } : { ...consumer, remotelyPaused: true }

      return {
        consumers: {
          ...state.consumers,
          [consumerId]: newConsumer,
        },
      }
    }),
  setConsumerResumed: (consumerId, originator = "local") =>
    set((state) => {
      const consumer = state.consumers[consumerId]
      if (!consumer) return state

      const newConsumer =
        originator === "local" ? { ...consumer, locallyPaused: false } : { ...consumer, remotelyPaused: false }

      return {
        consumers: {
          ...state.consumers,
          [consumerId]: newConsumer,
        },
      }
    }),
  setConsumerTrack: (consumerId, track) =>
    set((state) => {
      const consumer = state.consumers[consumerId]
      if (!consumer) return state

      return {
        consumers: {
          ...state.consumers,
          [consumerId]: { ...consumer, track },
        },
      }
    }),
  setConsumerScore: (consumerId, score) =>
    set((state) => {
      const consumer = state.consumers[consumerId]
      if (!consumer) return state

      return {
        consumers: {
          ...state.consumers,
          [consumerId]: { ...consumer, score },
        },
      }
    }),

  // Peer actions
  addPeer: (peer) =>
    set((state) => ({
      peers: { ...state.peers, [peer.id]: peer },
    })),
  removePeer: (peerId) =>
    set((state) => {
      const newPeers = { ...state.peers }
      delete newPeers[peerId]

      // Also update active speaker if needed
      const newRoom = { ...state.room }
      if (peerId === state.room.activeSpeakerId) {
        newRoom.activeSpeakerId = null
      }

      return {
        peers: newPeers,
        room: newRoom,
      }
    }),
  setPeerDisplayName: (displayName, peerId) =>
    set((state) => {
      const peer = state.peers[peerId]
      if (!peer) return state

      return {
        peers: {
          ...state.peers,
          [peerId]: { ...peer, displayName },
        },
      }
    }),

  // Message actions
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  clearMessages: () => set({ messages: [] }),

  // Notification actions
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id: nanoid() }],
    })),
  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
    })),
  removeAllNotifications: () => set({ notifications: [] }),
  notify: ({ type = "info", text, title, timeout }) => {
    if (!timeout) {
      switch (type) {
        case "info":
          timeout = 3000
          break
        case "error":
          timeout = 5000
          break
        case "success":
          timeout = 3000
          break
      }
    }

    const notification = {
      type,
      title,
      text,
      timeout,
    }

    set((state) => ({
      notifications: [...state.notifications, { ...notification, id: nanoid() }],
    }))

    // Auto-remove notification after timeout
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.text !== text),
      }))
    }, timeout)
  },
}))
