"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ChatMessage, ResponseMessage, webRTCService } from "@/lib/services/webrtcService";
import type { Consumer } from "mediasoup-client/types";
import { useUserStore } from "@/store";
import { TUser } from "@/types";

export function useWebRTC(roomId: string, isHost: boolean) {
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState<
    Record<string, { name: string; isHost: boolean }>
  >({});

  const [peerStatus, setPeerStatus] = useState<Record<string, {
    isMuted: boolean;
    isVideoMuted: boolean;
    isSpeaking: boolean;}>
  >({});

  const [messages, setMessages] = useState<ResponseMessage[]>([]);
  const { user } = useUserStore();

  console.log("user", user, isHost)

  const mediaRef = useRef({
    localStream: null as MediaStream | null,
    audioProducer: null as any,
    videoProducer: null as any,
    screenProducer: null as any,
  });
  const cleanupRef = useRef<() => void>(() => {});

  const setLocalStream = (stream: MediaStream | null) => {
    mediaRef.current.localStream = stream;
  };

  const getLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(stream);

      const [audioTrack] = stream.getAudioTracks();
      const [videoTrack] = stream.getVideoTracks();

      if (audioTrack)
        mediaRef.current.audioProducer = await webRTCService.produceMedia(
          audioTrack
        );
      if (videoTrack)
        mediaRef.current.videoProducer = await webRTCService.produceMedia(
          videoTrack
        );
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setError("Could not access camera or microphone");
    }
  };

  const handleNewConsumer = (consumer: Consumer, peerId: string) => {
    setRemoteStreams((prev) => {
      const existingStream = prev[peerId] || new MediaStream();
      existingStream.addTrack(consumer.track);
      return { ...prev, [peerId]: existingStream };
    });

    setPeerStatus(prev => ({
        ...prev,
        [peerId]: {
          isMuted: false,
          isVideoMuted: consumer.kind === 'video' ? false : true,
          isSpeaking: false
        }
      }));
  };

  const handleConsumerClosed = (consumerId: string) => {
    setRemoteStreams((prev) => {
      const updated = { ...prev };
      for (const [peerId, stream] of Object.entries(updated)) {
        const track = stream
          .getTracks()
          .find((t) => t.id === consumerId || t.id.includes(consumerId));
        if (track) {
          stream.removeTrack(track);
          track.stop();
          if (!stream.getTracks().length) delete updated[peerId];
          else updated[peerId] = stream;
          break;
        }
      }
      return updated;
    });
  };

  const handlePeerJoined = (
    peerId: string,
    peerName: string,
    peerIsHost: boolean
  ) => {
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
    setRemoteStreams((prev) => {
      const updated = { ...prev };
      if (updated[peerId]) {
        updated[peerId].getTracks().forEach((track) => track.stop());
        delete updated[peerId];
      }
      return updated;
    });
  };

    // Add handler for mute status changes
    const handleMuteStatus = (peerId: string, kind: 'audio' | 'video', muted: boolean) => {
        setPeerStatus(prev => ({
          ...prev,
          [peerId]: {
            ...prev[peerId],
            isMuted: kind === 'audio' ? muted : prev[peerId]?.isMuted,
            isVideoMuted: kind === 'video' ? muted : prev[peerId]?.isVideoMuted
          }
        }));
      };
    
      // Add handler for speaking status
      const handleSpeaking = (peerId: string, speaking: boolean) => {
        setPeerStatus(prev => ({
          ...prev,
          [peerId]: {
            ...prev[peerId],
            isSpeaking: speaking
          }
        }));
      };

  const handleChatMessage = (msg: any) => setMessages((prev) => [...prev, msg]);
  const handleMessageList = (list: any[]) => setMessages(list);

  const toggleMic = useCallback(() => {
    const track = mediaRef.current.localStream?.getAudioTracks()?.[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMicOn(track.enabled);
      webRTCService.notifyMuteStatus('audio', !track.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = mediaRef.current.localStream?.getVideoTracks()?.[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsCameraOn(track.enabled);
      webRTCService.notifyMuteStatus('video', !track.enabled);

    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!isHost) return;

    try {
      if (isScreenSharing) {
        mediaRef.current.screenProducer?.close();
        mediaRef.current.screenProducer = null;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setLocalStream(stream);

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack)
          mediaRef.current.videoProducer = await webRTCService.produceMedia(
            videoTrack
          );

        setIsScreenSharing(false);
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        mediaRef.current.videoProducer?.close();
        mediaRef.current.videoProducer = null;

        mediaRef.current.localStream
          ?.getAudioTracks()
          .forEach((track) => stream.addTrack(track));
        setLocalStream(stream);

        const screenTrack = stream.getVideoTracks()[0];
        if (screenTrack) {
          mediaRef.current.screenProducer = await webRTCService.produceMedia(
            screenTrack
          );
          screenTrack.onended = toggleScreenShare;
        }

        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error("Screen share error:", err);
      setError("Could not share screen");
    }
  }, [isHost, isScreenSharing]);

  const sendChatMessage = useCallback((msg: string, me: TUser | null) => {
   
    if (!me) return;
  
    webRTCService.sendChatMessage(
      msg,
      me?.id.toString(),
      `${me?.firstName} ${me?.lastName}`
    );
  }, []);

  const addParticipant = useCallback(
    (participantId: string) => {
      if (!isHost) return;
      console.log(`Inviting ${participantId} to stream`);
    },
    [isHost]
  );

  useEffect(() => {
    const connect = async () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const wsUrl =
          process.env.NEXT_PUBLIC_WS_URL ||
          `${protocol}://${window.location.hostname}:3000/ws`;
        await webRTCService.connect(wsUrl);

        webRTCService.setOnNewConsumer(handleNewConsumer);
        webRTCService.setOnConsumerClosed(handleConsumerClosed);
        webRTCService.setOnPeerJoined(handlePeerJoined);
        webRTCService.setOnPeerLeft(handlePeerLeft);
        webRTCService.setOnChatMessage(handleChatMessage);
        webRTCService.setOnMessageList(handleMessageList);
        webRTCService.setOnPeerMuted(handleMuteStatus);
        webRTCService.setOnPeerSpeaking(handleSpeaking);

        setIsConnected(true);

        cleanupRef.current = () => {
          webRTCService.leaveRoom();
          mediaRef.current.localStream
            ?.getTracks()
            .forEach((track) => track.stop());
          mediaRef.current.audioProducer?.close();
          mediaRef.current.videoProducer?.close();
          mediaRef.current.screenProducer?.close();
        };
      } catch (err) {
        console.error("WebRTC connect error:", err);
        setError("Could not connect to the server");
      }
    };

    connect();

    return () => {
      cleanupRef.current();
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      const join = async () => {
        try {
          const name =
            user ?  `${user?.firstName} ${user?.lastName}`: 
            `User-${Math.floor(Math.random() * 10000)}`;
          await webRTCService.joinRoom(roomId, name, isHost);
          await getLocalMedia();
        } catch (err) {
          console.error("Join room error:", err);
          setError("Could not join the room");
        }
      };
      join();
    }
  }, [isConnected, roomId, isHost]);


  // Update the useEffect for speaking detection
useEffect(() => {
    const audioContext = new AudioContext();
    const analysers = new Map<string, { analyser: AnalyserNode, interval: NodeJS.Timeout }>();
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
          setPeerStatus(prev => {
            const newState = {
              ...prev,
              [peerId]: {
                ...prev[peerId],
                isSpeaking
              }
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
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      if (!analysers.has(peerId)) {
        checkSpeaking(peerId, stream);
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
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [remoteStreams]);

  return {
    localStream: mediaRef.current.localStream,
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
    peerStatus
  };
}
