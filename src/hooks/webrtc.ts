"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ResponseMessage, webRTCService } from "@/lib/services/webrtcService";
import type { AppData, Consumer } from "mediasoup-client/types";
import { useAttendeeStore } from "@/store";
import { TStream, TStreamChat, TStreamAttendee } from "@/types";
import {
  NetworkQuality,
  NetworkStats,
} from "@/lib/services/networkMonitorService";

export interface RemoteStreams {
  video: Record<string, { name: string; stream: MediaStream }>;
  audio: Record<string, { name: string; stream: MediaStream }>;
}

export function useWebRTC(
  livestream: TStream,
  isHost: boolean,
  isInvitee: boolean,
  streamChats: TStreamChat[]
) {
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreams>({
    video: {},
    audio: {},
  });
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isLiveStart, setIsLiveStart] = useState<boolean | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ResponseMessage[]>([]);
  const [connectionState, setConnectionState] = useState("unknown");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [adaptiveSettings, setAdaptiveSettings] = useState({
    videoEnabled: true,
    videoQuality: "high",
    lastQualityChange: 0,
  });
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("good");
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);

  const [isOffline, setIsOffline] = useState(false);

  const { user } = useAttendeeStore();
  const [peers, setPeers] = useState<
    Record<string, { name: string; isHost: boolean; isInvitee: boolean }>
  >({});

  const [peerStatus, setPeerStatus] = useState<
    Record<
      string,
      {
        isMuted: boolean;
        isVideoMuted: boolean;
        isSpeaking: boolean;
      }
    >
  >({});

  // console.log("user", user, livestream)

  const videoProducerRef = useRef<any>(null);
  const audioProducerRef = useRef<any>(null);
  const screenProducerRef = useRef<any>(null);
  const cleanupRef = useRef<() => void>(() => {});

  // const setLocalStream = (stream: MediaStream | null) => {
  //   videoProducerRef.current.localStream = stream;
  // };

  const cleanupStreams = (
    streams: Record<string, { name: string; stream: MediaStream }>,
    peerId: string
  ) => {
    const updated = { ...streams };
    if (updated[peerId]) {
      updated[peerId].stream.getTracks().forEach((track) => track.stop());
      delete updated[peerId];
    }
    return updated;
  };

  const handleNewConsumer = (
    consumer: Consumer<AppData>,
    peerId: string,
    peerName: string
  ) => {
    console.log(
      "New consumer:",
      JSON.stringify({
        id: consumer.id,
        kind: consumer.kind,
        track: {
          id: consumer.track.id,
          readyState: consumer.track.readyState,
          enabled: consumer.track.enabled,
          muted: consumer.track.muted,
        },
        codec: consumer.rtpParameters.codecs[0]?.mimeType,
        payloadType: consumer.rtpParameters.codecs[0]?.payloadType,
      })
    );

    //> return if it is my stream
    if (peerId === user?.id.toString()) return;
    console.log(peerId, user?.id);

    const stream = new MediaStream();
    stream.addTrack(consumer.track);

    console.log("Stream created with track:", {
      streamId: stream.id,
      tracks: stream.getTracks().map((t) => ({
        id: t.id,
        kind: t.kind,
        readyState: t.readyState,
        enabled: t.enabled,
      })),
    });

    setRemoteStreams((prev) => {
      const mediaType = consumer.kind as keyof RemoteStreams;
      const stream =
        prev[mediaType][peerId]?.stream || new MediaStream([consumer.track]);
      //  stream.addTrack(consumer.track);

      return {
        ...prev,
        [mediaType]: {
          ...prev[mediaType],
          [peerId]: { name: peerName, stream },
        },
      };
    });

    // Update peer status
    setPeerStatus((prev) => ({
      ...prev,
      [peerId]: {
        ...prev[peerId],
        isVideoMuted: consumer.kind !== "video",
        isSpeaking: false,
      },
    }));
  };

  const removeTrackFromStreams = (
    streams: Record<string, { name: string; stream: MediaStream }>,
    consumerId: string
  ) => {
    const updated = { ...streams };
    for (const [peerId, stream] of Object.entries(updated)) {
      const track = stream.stream
        .getTracks()
        .find((t) => t.id === consumerId || t.id.includes(consumerId));

      if (track) {
        stream.stream.removeTrack(track);
        track.stop();
        if (!stream.stream.getTracks().length) {
          delete updated[peerId];
        }
        break;
      }
    }
    return updated;
  };

  const handleConsumerClosed = (consumerId: string) => {
    setRemoteStreams((prev) => ({
      video: removeTrackFromStreams(prev.video, consumerId),
      audio: removeTrackFromStreams(prev.audio, consumerId),
    }));
  };

  const handlePeerJoined = (
    peerId: string,
    peerName: string,
    peerIsHost: boolean,
    peerIsInvitee: boolean
  ) => {
    console.log(
      "Peer joined:",
      peerName,
      peerId,
      peerIsHost ? "(host)" : "(viewer)",
      peerIsInvitee
    );
    setPeers((prev) => ({
      ...prev,
      [peerId]: {
        name: peerName,
        isHost: peerIsHost,
        isInvitee: peerIsInvitee,
      },
    }));
  };

  const handlePeerLeft = (peerId: string) => {
    setPeers((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });

    setRemoteStreams((prev) => ({
      video: cleanupStreams(prev.video, peerId),
      audio: cleanupStreams(prev.audio, peerId),
    }));
  };

  // Add handler for mute status changes
  const handleMuteStatus = (
    peerId: string,
    kind: "audio" | "video",
    muted: boolean
  ) => {
    setPeerStatus((prev) => ({
      ...prev,
      [peerId]: {
        ...prev[peerId],
        isMuted: kind === "audio" ? muted : prev[peerId]?.isMuted,
        isVideoMuted: kind === "video" ? muted : prev[peerId]?.isVideoMuted,
      },
    }));
  };

  // Add handler for speaking status
  const handleSpeaking = (peerId: string, speaking: boolean) => {
    setPeerStatus((prev) => ({
      ...prev,
      [peerId]: {
        ...prev[peerId],
        isSpeaking: speaking,
      },
    }));
  };

  const handleLiveStreamState = (isLive: boolean) => {
    setIsLiveStart(isLive);
  };

  //> START fetch stream chat on first load
  useEffect(() => {}, [streamChats]);

  const chats = useMemo(() => {
    if (Array.isArray(streamChats)) {
      return streamChats?.map((chat) => {
        return {
          timestamp: chat?.timeStamp,
          content: chat?.chat,
          senderName: chat?.streamAttendeName,
          senderId: chat?.streamAttendeeId?.toString(),
          roomId: chat?.streamAlias,
          id: chat?.streamChatAlias,
        };
      });
    } else return [];
  }, [streamChats]);
  //> END

  const handleChatMessage = (msg: any) => {
    //> retrieving message from the server
    setMessages((prev) => [...prev, msg]);
  };
  const handleMessageList = (list: any[]) => setMessages(list);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const enabled = !audioTracks[0].enabled;
        audioTracks[0].enabled = enabled;
        setIsMicOn(enabled);
        console.log("Microphone", enabled ? "enabled" : "disabled");
      }
    }
  }, [localStream]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        //> toggle the video track
        const enabled = !videoTracks[0].enabled;
        videoTracks[0].enabled = enabled;

        //> update
        webRTCService.notifyMuteStatus("video", enabled);
        setIsCameraOn(enabled);
        console.log("Camera", enabled ? "enabled" : "disabled");
      }
    }
  }, [localStream]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        console.log("Stopping screen sharing");

        // 1. Close screen producer first
        if (screenProducerRef.current) {
          await webRTCService.closeProducer(screenProducerRef.current.id);
          screenProducerRef.current = null;
        }

        // 2. Get new camera stream
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
        } catch (err) {
          console.error("Camera access error:", err);
          throw err;
        }

        // 3. Create new video producer
        const [videoTrack] = stream.getVideoTracks();
        if (videoTrack) {
          videoProducerRef.current = await webRTCService.produceMedia(
            videoTrack,
            { source: "webcam" },
            {
              videoGoogleStartBitrate: 1000,
              videoGoogleMaxBitrate: 3000,
            },
            [
              { maxBitrate: 150000, scaleResolutionDownBy: 4, dtx: true },
              { maxBitrate: 500000, scaleResolutionDownBy: 2, dtx: true },
              { maxBitrate: 1500000, scaleResolutionDownBy: 1, dtx: true },
            ]
          );
        }

        // 4. Handle audio transition
        const [audioTrack] = stream.getAudioTracks();
        if (audioTrack) {
          if (audioProducerRef.current) {
            await webRTCService.closeProducer(audioProducerRef.current.id);
          }
          audioProducerRef.current = await webRTCService.produceMedia(
            audioTrack,
            { source: "mic" },
            { opusStereo: true, opusDtx: true }
          );
        }

        // 5. Update local stream
        setLocalStream((prev) => {
          prev?.getTracks().forEach((t) => t.stop());
          return stream;
        });

        setIsScreenSharing(false);
      } else {
        console.log("Starting screen sharing");

        // 1. Get screen stream
        let screenStream;
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
        } catch (err) {
          console.error("Screen share error:", err);
          throw err;
        }

        // 2. Close camera producer
        if (videoProducerRef.current) {
          await webRTCService.closeProducer(videoProducerRef.current.id);
          videoProducerRef.current = null;
        }

        // 3. Create screen producer
        const [screenTrack] = screenStream.getVideoTracks();
        if (screenTrack) {
          //  screenProducerRef.current = await webRTCService.produceScreenShare(screenTrack);

          // Handle automatic stop
          screenTrack.onended = async () => {
            console.log("Screen sharing ended by browser");
            await toggleScreenShare();
          };
        }

        // 4. Handle audio
        const [screenAudioTrack] = screenStream.getAudioTracks();
        if (screenAudioTrack) {
          if (audioProducerRef.current) {
            await webRTCService.closeProducer(audioProducerRef.current.id);
          }
          audioProducerRef.current = await webRTCService.produceMedia(
            screenAudioTrack,
            { source: "screen-audio" },
            { opusStereo: true, opusDtx: true }
          );
        }

        // 5. Update local stream
        const newStream = new MediaStream();
        if (screenTrack) newStream.addTrack(screenTrack);
        if (screenAudioTrack) {
          newStream.addTrack(screenAudioTrack);
        } else if (localStream?.getAudioTracks().length) {
          newStream.addTrack(localStream.getAudioTracks()[0]);
        }

        setLocalStream((prev) => {
          prev?.getTracks().forEach((t) => t !== screenTrack && t.stop());
          return newStream;
        });

        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error("Screen share transition error:", err);
      // Fallback to camera if screen share fails
      if (isScreenSharing) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          setLocalStream(stream);
          setIsScreenSharing(false);
        } catch (fallbackErr) {
          console.error("Fallback failed:", fallbackErr);
        }
      }
    }
  }, [isScreenSharing, localStream]);

  const sendChatMessage = useCallback(
    (msg: string, me: TStreamAttendee | null) => {
      if (!me) return;

      webRTCService.sendChatMessage(
        msg,
        me?.id.toString(),
        `${me?.firstName} ${me?.lastName}`
      );
    },
    []
  );

  const addParticipant = useCallback(
    (participantId: string) => {
      if (!isHost) return;
      console.log(`Inviting ${participantId} to stream`);
    },
    [isHost]
  );

  const toggleLiveStream = useCallback(
    (settings: any, dateString: string, id: number) => {
      webRTCService.sendLiveStream(settings, dateString, id);
    },
    []
  );
  useEffect(() => {
    const handleQualityChange = (
      quality: NetworkQuality,
      stats?: NetworkStats
    ) => {
      console.log("Network quality changed:", quality, stats);
      setNetworkQuality(quality);
      setNetworkStats(stats || null);

      setConnectionState(stats?.iceState || "unknown");

      // Adapt consumers immediately
      const consumers = Array.from(webRTCService.getLocalConsumers().values());
      adaptConsumerQuality(consumers, quality);

      // // If host/invitee, adapt producers
      // if (isHost || isInvitee) {
      //   webRTCService.adaptToNetwork(quality);
      // }
    };

    // Set up the listener
    webRTCService.setOnNetworkQualityChange(handleQualityChange);

    return () => {
      webRTCService.setOnNetworkQualityChange(() => {});
    };
  }, [isHost, isInvitee]);

  // Updated consumer adaptation
  const adaptConsumerQuality = (
    consumers: Consumer[],
    quality: NetworkQuality
  ) => {
    console.log(`Adapting ${consumers.length} consumers to ${quality} quality`);

    consumers.forEach((consumer) => {
      try {
        if (consumer.kind === "video" && !consumer.closed) {
          switch (quality) {
            case "very-poor":
              if (!consumer.paused) {
                console.log("Pausing video consumer");
                consumer.pause();
              }
              break;

            case "poor":
              console.log("Setting consumer to low quality");

              // consumer.setPreferredLayers({ spatialLayer: 0, temporalLayer: 1 });
              break;

            default:
              if (consumer.paused) {
                console.log("Resuming video consumer");
                consumer.resume();
              }

              console.log("Setting consumer to high quality");

            //consumer.setPreferredLayers({ spatialLayer: 2, temporalLayer: 2 });
          }
        }
      } catch (error) {
        console.error("Error adapting consumer:", error);
      }
    });
  };

  //> connect to socket
  const connectWebsocket = async () => {
    try {
      // return;
      // const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      //|| `${protocol}://127.0.0.1:3000/ws`
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "";
      console.log("trying to connect", wsUrl);
      await webRTCService.connect(wsUrl);
      console.log("connected");
      webRTCService.setOnNewConsumer(handleNewConsumer);
      webRTCService.setOnConsumerClosed(handleConsumerClosed);
      webRTCService.setOnPeerJoined(handlePeerJoined);
      webRTCService.setOnPeerLeft(handlePeerLeft);
      webRTCService.setOnChatMessage(handleChatMessage);
      webRTCService.setOnMessageList(handleMessageList);
      webRTCService.setOnPeerMuted(handleMuteStatus);
      webRTCService.setOnPeerSpeaking(handleSpeaking);
      webRTCService.setOnLiveStreamState(handleLiveStreamState);
      webRTCService.setOnMessageList(handleMessageList);
      webRTCService.setOnConnected(() => setIsConnected(true));
      webRTCService.setOnDisconnected(() => setIsConnected(false));
      webRTCService.setOnError((err) => setError(err.message));

      setMessages(chats || []);
      console.log("chat", chats);
      setIsConnected(true);

      cleanupRef.current = () => {
        webRTCService.leaveRoom();
        localStream?.getTracks().forEach((track) => track.stop());
        audioProducerRef.current?.close();
        videoProducerRef.current?.close();
        screenProducerRef.current?.close();
      };
    } catch (err) {
      console.error("WebRTC connect error:", err);
      if (err) {
        setConnectionState("socket-failed");
      }
      setIsConnected(false);
      setError("Could not connect to the server");
    }
  };

  useEffect(() => {
    connectWebsocket();

    return () => {
      cleanupRef.current();
      // if (isConnected) {
      //   webRTCService.leaveRoom()
      // }
    };
  }, []);

  useEffect(() => {
    const cleanup = () => {
      if (isConnected) {
        webRTCService.leaveRoom();
      }
    };

    window.addEventListener("beforeunload", cleanup);
    return () => {
      cleanup();
      window.removeEventListener("beforeunload", cleanup);
    };
  }, []);

  useEffect(() => {
    console.log(webRTCService.hasJoined, "has joined");
    if (webRTCService.hasJoined || !isConnected) return;
    const join = async () => {
      try {
        let stream: MediaStream | null = null;
        if (isHost || isInvitee) {
          // get local media
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });

          setLocalStream(stream);
        }

        // allow everyone to be connected if the stream is not yet live

        if (!user) return;
        console.log("user");
        const name = user
          ? `${user?.firstName} ${user?.lastName}`
          : `User-${Math.floor(Math.random() * 10000)}`;
        await webRTCService.joinRoom(
          livestream?.streamAlias,
          name,
          user?.id?.toString(),
          isHost,
          isInvitee
        );

        console.log("stream", stream);

        // Wait for sendTransport to be ready
        await webRTCService.waitForSendTransport();

        if ((isHost || isInvitee) && stream !== null) {
          const [audioTrack] = stream.getAudioTracks();
          const [videoTrack] = stream.getVideoTracks();

          //produce media after joining

          // console.log("audio track", audioTrack, "video track", videoTrack)

          if (videoTrack) {
            videoProducerRef.current = await webRTCService.produceMedia(
              videoTrack,
              { source: "webcam" },
              {
                videoGoogleStartBitrate: 1000,
                videoGoogleMaxBitrate: 3000,
                videoGoogleMinBitrate: 300,
              },
              [
                { maxBitrate: 150000, scaleResolutionDownBy: 4 },
                { maxBitrate: 500000, scaleResolutionDownBy: 2 },
                { maxBitrate: 1500000, scaleResolutionDownBy: 1 },
              ]
            );
          }

          if (audioTrack) {
            audioProducerRef.current = await webRTCService.produceMedia(
              audioTrack,
              { source: "mic" },
              { opusStereo: true, opusDtx: true }
            );
          }
        }
      } catch (err) {
        console.error("Join room error:", err);
        setError("Could not join the room");
      }
    };
    join();

    return () => {
      // if (!document.hidden) {
      //   webRTCService.cleanUpProducers();
      // }
    };
  }, [
    isConnected,
    livestream?.streamAlias,
    livestream?.settings?.isLive,
    isHost,
    isInvitee,
    user,
  ]);

  //> maybe useful if need is required to recover a stream
  // async function recoverStream(newStream: MediaStream) {
  //   const producers = webRTCService.getLocalProducers();
  //   if (producers.size > 0) {
  //     const videoProducer = Array.from(producers.values()).find(
  //       (p) => p.kind === "video"
  //     );
  //     const audioProducer = Array.from(producers.values()).find(
  //       (p) => p.kind === "audio"
  //     );
  //   }
  // }

  //> maybe useful if a state is changing when visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      console.log("visibility state", document.visibilityState);
      if (
        document.visibilityState === "visible" &&
        isHost &&
        webRTCService.hasJoined
      ) {
        console.log("it is visible");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isHost, webRTCService]);

  // Update the useEffect for speaking detection
  useEffect(() => {
    const audioContext = new AudioContext();
    const analysers = new Map<
      string,
      { analyser: AnalyserNode; interval: NodeJS.Timeout }
    >();
    const speakingThreshold = -50; // dB
    const checkInterval = 200; // ms

    const checkSpeaking = (peerId: string, stream: MediaStream) => {
      if (!stream.getAudioTracks().length) return;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastSpeakingState = false;

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        const dB = 20 * Math.log10(avg / 255);

        const isSpeaking = dB > speakingThreshold;

        // Only update if state changed
        if (isSpeaking !== lastSpeakingState) {
          setPeerStatus((prev) => {
            const newState = {
              ...prev,
              [peerId]: {
                ...prev[peerId],
                isSpeaking,
              },
            };

            // Notify server about speaking status change
            webRTCService.notifySpeakingStatus(isSpeaking);

            return newState;
          });

          lastSpeakingState = isSpeaking;
        }
      }, checkInterval);

      analysers.set(peerId, { analyser, interval });
    };

    // Setup analysers for each stream
    Object.entries(remoteStreams.audio).forEach(([peerId, stream]) => {
      if (!analysers.has(peerId)) {
        checkSpeaking(peerId, stream.stream);
      }
    });

    return () => {
      // Cleanup all analysers and intervals
      analysers.forEach(({ analyser, interval }) => {
        analyser.disconnect();
        clearInterval(interval);
      });
      analysers.clear();

      // Close audio context
      if (audioContext.state !== "closed") {
        audioContext.close();
      }
    };
  }, [remoteStreams]);

  //> To handle network changes -
  // this will auto reconnect when network went off, and later come back on
  useEffect(() => {
    const handleNetworkChange = () => {
      if (navigator.onLine) {
        // attempt reconnect
        console.log("Network is back online");
        setIsOffline(false);
        if (!isConnected) {
          connectWebsocket();
        }
      } else {
        setIsOffline(true);
        //> do sth
        console.log("Network is offline");
      }
    };

    window.addEventListener("online", handleNetworkChange);
    window.addEventListener("offline", handleNetworkChange);

    return () => {
      window.removeEventListener("online", handleNetworkChange);
      window.removeEventListener("offline", handleNetworkChange);
    };
  }, [isConnected]);

  return {
    localStream: localStream,
    remoteStreams,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    addParticipant,
    error,
    peers,
    messages,
    sendChatMessage,
    toggleLiveStream,
    isLiveStart,
    peerStatus,
    isOffline,
    connectionState,
  };
}
