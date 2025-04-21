"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ResponseMessage, webRTCService } from "@/lib/services/webrtcService";
import type { AppData, Consumer } from "mediasoup-client/types";
import { useAttendeeStore } from "@/store";
import { TStream, TStreamChat, TStreamAttendee } from "@/types";

export interface RemoteStreams {
  video: Record<string, {name: string; stream: MediaStream}>;
  audio: Record<string,  {name: string; stream: MediaStream}>;
}

export function useWebRTC(
  livestream: TStream,
  isHost: boolean,
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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const joinedRef = useRef(false);
  const { user } = useAttendeeStore();
  const [peers, setPeers] = useState<
    Record<string, { name: string; isHost: boolean }>
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
    streams: Record<string, {name:string; stream:MediaStream}>,
    peerId: string
  ) => {
    const updated = { ...streams };
    if (updated[peerId]) {
      updated[peerId].stream.getTracks().forEach((track) => track.stop());
      delete updated[peerId];
    }
    return updated;
  };

  const handleNewConsumer = (consumer: Consumer<AppData>, peerId: string, peerName:string) => {
    console.log("New consumer:", JSON.stringify({
      id: consumer.id,
      kind: consumer.kind,
      track: {
        id: consumer.track.id,
        readyState: consumer.track.readyState,
        enabled: consumer.track.enabled,
        muted: consumer.track.muted,
      },
      codec: consumer.rtpParameters.codecs[0]?.mimeType,
      payloadType: consumer.rtpParameters.codecs[0]?.payloadType
    }));

   
    const stream = new MediaStream();
    stream.addTrack(consumer.track);
    
    console.log("Stream created with track:", {
      streamId: stream.id,
      tracks: stream.getTracks().map(t => ({
        id: t.id,
        kind: t.kind,
        readyState: t.readyState,
        enabled: t.enabled
      }))
    });
  
    setRemoteStreams(prev => {
      const mediaType = consumer.kind as keyof RemoteStreams;
      const stream = prev[mediaType][peerId]?.stream || new MediaStream([consumer.track]);
    //  stream.addTrack(consumer.track);
      
      return {
        ...prev,
        [mediaType]: {
          ...prev[mediaType],
          [peerId]: {name: peerName, stream},
        }
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
    streams: Record<string, {name: string; stream:MediaStream}>,
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
    peerIsHost: boolean
  ) => {
    console.log(
      "Peer joined:",
      peerName,
      peerId,
      peerIsHost ? "(host)" : "(viewer)"
    );
    setPeers((prev) => ({
      ...prev,
      [peerId]: { name: peerName, isHost: peerIsHost },
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
        const enabled = !videoTracks[0].enabled;
        videoTracks[0].enabled = enabled;
        setIsCameraOn(enabled);
        console.log("Camera", enabled ? "enabled" : "disabled");
      }
    }
  }, [localStream]);

  const toggleScreenShare = useCallback(async () => {
    if (!isHost) return;

    if (isScreenSharing) {
      console.log("Stopping screen sharing");

      // Switch back to camera
      if (screenProducerRef.current) {
        screenProducerRef.current.close();
        screenProducerRef.current = null;
      }

      // Get camera stream again
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

        // Stop old tracks
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop());
        }

        setLocalStream(stream);

        // Produce video
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoProducerRef.current = await webRTCService.produceMedia(
            videoTrack,
            { source: "webcam" }
          );
        }

        setIsScreenSharing(false);
      } catch (err) {
        console.error("Error accessing media devices:", err);
        setError("Could not access camera or microphone");
      }
    } else {
      console.log("Starting screen sharing");

      // Switch to screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        // Close existing video producer
        if (videoProducerRef.current) {
          videoProducerRef.current.close();
          videoProducerRef.current = null;
        }

        // Create a new stream with screen video and existing audio
        const newStream = new MediaStream();

        // Add screen video track
        const screenTrack = stream.getVideoTracks()[0];
        newStream.addTrack(screenTrack);

        // Add existing audio track if available
        if (localStream) {
          const audioTracks = localStream.getAudioTracks();
          if (audioTracks.length > 0) {
            newStream.addTrack(audioTracks[0]);
          }
        }

        // Stop old video tracks
        if (localStream) {
          localStream.getVideoTracks().forEach((track) => track.stop());
        }

        setLocalStream(newStream);

        // Produce screen share
        if (screenTrack) {
          screenProducerRef.current = await webRTCService.produceMedia(
            screenTrack,
            { source: "screen" }
          );

          // Listen for when the user stops sharing
          screenTrack.onended = async () => {
            await toggleScreenShare();
          };
        }

        setIsScreenSharing(true);
      } catch (err) {
        console.error("Error sharing screen:", err);
        setError("Could not share screen");
      }
    }
  }, [isHost, isScreenSharing, localStream]);

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
      //console.log(settings);
      webRTCService.sendLiveStream(settings, dateString, id);
    },
    []
  );

  useEffect(() => {
    const connect = async () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const wsUrl =
          process.env.NEXT_PUBLIC_WS_URL || `${protocol}://127.0.0.1:3000/ws`;

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

        cleanupRef.current = () => {
          webRTCService.leaveRoom();
          localStream?.getTracks().forEach((track) => track.stop());
          audioProducerRef.current?.close();
          videoProducerRef.current?.close();
          screenProducerRef.current?.close();
        };
      } catch (err) {
        console.error("WebRTC connect error:", err);
        setError("Could not connect to the server");
      }
    };

    connect();

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
    if (isConnected) {
      const join = async () => {
        try {
          let stream: MediaStream | null = null;
          if (isHost) {
            // get local media
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: true,
            });

            setLocalStream(stream);
          }

          // allow only host to be connected if the stream is not yet live
          if (!livestream?.settings?.isLive && !isHost) return;
          //> else connect
          if (!user) return;
          console.log("user");
          const name = user
            ? `${user?.firstName} ${user?.lastName}`
            : `User-${Math.floor(Math.random() * 10000)}`;
          await webRTCService.joinRoom(
            livestream?.streamAlias,
            name,
            user?.id?.toString(),
            isHost
          );

          console.log("stream", stream);

          // Wait for sendTransport to be ready
          await webRTCService.waitForSendTransport();

          if (isHost && stream !== null) {
            const [audioTrack] = stream.getAudioTracks();
            const [videoTrack] = stream.getVideoTracks();

            //produce media after joining

            if (videoTrack) {
              videoProducerRef.current = await webRTCService.produceMedia(
                videoTrack,
                { source: "webcam" },
                { videoGoogleStartBitrate: 1000, videoGoogleMaxBitrate: 3000 }
              );
            }

            if (audioTrack) {
              audioProducerRef.current = await webRTCService.produceMedia(
                audioTrack,
                {source: 'mic'},
                { opusStereo: true, opusDtx: true }
              );
            }
          }

          joinedRef.current = true;
        } catch (err) {
          console.error("Join room error:", err);
          setError("Could not join the room");
        }
      };
      join();
    }
    return () => {
      // Cleanup if needed (e.g., on disconnect)

      joinedRef.current = false;
    };
  }, [
    isConnected,
    livestream?.streamAlias,
    livestream?.settings?.isLive,
    isHost,
    user,
  ]);

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
  };
}
