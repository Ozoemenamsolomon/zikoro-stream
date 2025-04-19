"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {  webRTCService } from "@/lib/services/webrtcService";
import type { Consumer } from "mediasoup-client/types";
import { useAttendeeStore, useUserStore } from "@/store";
import { TUser, TStream, TStreamChat, TStreamAttendee } from "@/types";
import { useGetData } from "./request";
import { useAppStore } from "@/store/streamStore";

export function useWebRTC(livestream: TStream, isHost: boolean, streamChats: TStreamChat[]) {
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const { producers, consumers, peers, messages } = useAppStore()
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isLiveStart, setIsLiveStart] = useState<boolean | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // const { data: streamChats } = useGetData<TStreamChat[]>(
  //   `/stream/chat/${livestream?.streamAlias}`,
  //   "chat"
  // );
  const joinedRef = useRef(false);
  const { user } = useAttendeeStore();


  // const [peerStatus, setPeerStatus] = useState<
  //   Record<
  //     string,
  //     {
  //       isMuted: boolean;
  //       isVideoMuted: boolean;
  //       isSpeaking: boolean;
  //     }
  //   >
  // >({});

   // Connect to the WebRTC server
   useEffect(() => {

    if (!user) return;
    // Initialize WebRTC service
    webRTCService.init({
      roomId: livestream?.streamAlias,
      peerId: user?.id?.toString(),
      displayName: `${user?.firstName} ${user?.lastName}`,
      device: { flag: navigator.userAgent }
    })

    // Set up event handlers
    webRTCService.setOnConnected(() => setIsConnected(true))
    webRTCService.setOnDisconnected(() => setIsConnected(false))
    webRTCService.setOnNewConsumer(handleNewConsumer)
    webRTCService.setOnConsumerClosed(handleConsumerClosed)
    webRTCService.setOnError((err) => setError(err.message))

    // Connect to the server
    webRTCService.connect().catch((err) => {
      console.error("Error connecting to WebRTC server:", err)
      setError("Could not connect to the server")
    })

    return () => {
      // Clean up
      webRTCService.close()
    }
  }, [livestream?.streamAlias, user])

  // Update local stream when producers change
  useEffect(() => {
    const stream = new MediaStream()

    Object.values(producers).forEach((producer) => {
      if (producer.track) {
        stream.addTrack(producer.track)
      }
    })

    if (stream.getTracks().length > 0) {
      setLocalStream(stream)
    }
  }, [producers])

  // Handle new consumer
  const handleNewConsumer = useCallback((consumer: Consumer, peerId: string) => {
    console.log("New consumer:", consumer.id, "from peer", peerId)

    setRemoteStreams((prev) => {
      const newStreams = { ...prev }

      if (!newStreams[peerId]) {
        newStreams[peerId] = new MediaStream()
      }

      // Add the track to the stream
      newStreams[peerId].addTrack(consumer.track)

      return newStreams
    })
  }, [])

  // Handle consumer closed
  const handleConsumerClosed = useCallback((consumerId: string) => {
    console.log("Consumer closed:", consumerId)

    // Find which peer this consumer belongs to and remove the track
    setRemoteStreams((prev) => {
      const newStreams = { ...prev }

      for (const peerId in newStreams) {
        const stream = newStreams[peerId]
        const tracks = stream.getTracks()

        for (const track of tracks) {
          if (track.id === consumerId) {
            stream.removeTrack(track)
            track.stop()

            // If no tracks left, remove the stream
            if (stream.getTracks().length === 0) {
              delete newStreams[peerId]
            }

            return newStreams
          }
        }
      }

      return prev
    })
  }, [])

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (isMicOn) {
      webRTCService
        .disableMic()
        .then(() => setIsMicOn(false))
        .catch((err) => console.error("Error disabling mic:", err))
    } else {
      webRTCService
        .enableMic()
        .then(() => setIsMicOn(true))
        .catch((err) => console.error("Error enabling mic:", err))
    }
  }, [isMicOn])

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (isCameraOn) {
      webRTCService
        .disableWebcam()
        .then(() => setIsCameraOn(false))
        .catch((err) => console.error("Error disabling webcam:", err))
    } else {
      webRTCService
        .enableWebcam()
        .then(() => setIsCameraOn(true))
        .catch((err) => console.error("Error enabling webcam:", err))
    }
  }, [isCameraOn])

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (!isHost) return

    if (isScreenSharing) {
      await webRTCService.disableShare()
      await webRTCService.enableWebcam()
      setIsScreenSharing(false)
    } else {
      await webRTCService.disableWebcam()
      await webRTCService.enableShare()
      setIsScreenSharing(true)
    }
  }, [isHost, isScreenSharing])

  // Add a participant to the stream (for host only)
  const addParticipant = useCallback(
    (participantId: string) => {
      if (!isHost) return

      // In a real app, you would send a signal to the participant
      console.log(`Inviting participant ${participantId} to join the stream`)
    },
    [isHost],
  )

  // Send a chat message
  const sendChatMessage = useCallback(
    (msg: string, me: TStreamAttendee | null) => {
      if (!me) return;

      webRTCService.sendChatMessage(
        msg,
       
      );
    },
    []
  );



  // console.log("user", user, livestream)

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

 



  // const handlePeerJoined = (
  //   peerId: string,
  //   peerName: string,
  //   peerIsHost: boolean
  // ) => {
  //   setPeers((prev) => ({
  //     ...prev,
  //     [peerId]: { name: peerName, isHost: peerIsHost },
  //   }));
  // };

  // const handlePeerLeft = (peerId: string) => {
  //   setPeers((prev) => {
  //     const updated = { ...prev };
  //     delete updated[peerId];
  //     return updated;
  //   });
  //   setRemoteStreams((prev) => {
  //     const updated = { ...prev };
  //     if (updated[peerId]) {
  //       updated[peerId].getTracks().forEach((track) => track.stop());
  //       delete updated[peerId];
  //     }
  //     return updated;
  //   });
  // };

  // Add handler for mute status changes
  // const handleMuteStatus = (
  //   peerId: string,
  //   kind: "audio" | "video",
  //   muted: boolean
  // ) => {
  //   setPeerStatus((prev) => ({
  //     ...prev,
  //     [peerId]: {
  //       ...prev[peerId],
  //       isMuted: kind === "audio" ? muted : prev[peerId]?.isMuted,
  //       isVideoMuted: kind === "video" ? muted : prev[peerId]?.isVideoMuted,
  //     },
  //   }));
  // };

  // // Add handler for speaking status
  // const handleSpeaking = (peerId: string, speaking: boolean) => {
  //   setPeerStatus((prev) => ({
  //     ...prev,
  //     [peerId]: {
  //       ...prev[peerId],
  //       isSpeaking: speaking,
  //     },
  //   }));
  // };

  // const handleLiveStreamState = (isLive: boolean) => {
  //   setIsLiveStart(isLive);
  // };

  //> START fetch stream chat on first load
  // useEffect(() => {
    
  // }, [streamChats]);

  // const chats = useMemo(() => {
  //   if (Array.isArray(streamChats)) {
  //     return streamChats?.map((chat) => {
  //       return {
  //         timestamp: chat?.timeStamp,
  //         content: chat?.chat,
  //         senderName: chat?.streamAttendeName,
  //         senderId: chat?.streamAttendeeId?.toString(),
  //         roomId: chat?.streamAlias,
  //         id: chat?.streamChatAlias,
  //       };
  //     });

      
  //   } else return []
  // },[streamChats])
  // //> END



  // const toggleLiveStream = useCallback(
  //   (settings: any, dateString: string, id: number) => {
  //     console.log(settings)
  //     webRTCService.sendLiveStream(settings, dateString, id);
  //   },
  //   []
  // );

  // useEffect(() => {
  //   const connect = async () => {
  //     try {
  //       const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  //       const wsUrl =
  //         process.env.NEXT_PUBLIC_WS_URL ||
  //         `${protocol}://${window.location.hostname}:3000/ws`;

  //       console.log("trying to connect", wsUrl);
  //       await webRTCService.connect(wsUrl);
  //       console.log("connected");
  //       webRTCService.setOnNewConsumer(handleNewConsumer);
  //       webRTCService.setOnConsumerClosed(handleConsumerClosed);
  //       webRTCService.setOnPeerJoined(handlePeerJoined);
  //       webRTCService.setOnPeerLeft(handlePeerLeft);
  //       webRTCService.setOnChatMessage(handleChatMessage);
  //       webRTCService.setOnMessageList(handleMessageList);
  //       webRTCService.setOnPeerMuted(handleMuteStatus);
  //       webRTCService.setOnPeerSpeaking(handleSpeaking);
  //       webRTCService.setOnLiveStreamState(handleLiveStreamState);

  //       setIsConnected(true);
  //       //> add prev chat
  //       setMessages(chats)
  //       console.log("chat", chats)

  //       cleanupRef.current = () => {
  //         webRTCService.leaveRoom();
  //         mediaRef.current.localStream
  //           ?.getTracks()
  //           .forEach((track) => track.stop());
  //         mediaRef.current.audioProducer?.close();
  //         mediaRef.current.videoProducer?.close();
  //         mediaRef.current.screenProducer?.close();
  //       };
  //     } catch (err) {
  //       console.error("WebRTC connect error:", err);
  //       setError("Could not connect to the server");
  //     }
  //   };

  //   connect();

  //   return () => {
  //     cleanupRef.current();
  //   };
  // }, []);

  // useEffect(() => {
  //   if (isConnected) {
  //     const join = async () => {
  //       try {
  //         // get local media
  //         const stream = await navigator.mediaDevices.getUserMedia({
  //           audio: true,
  //           video: true,
  //         });

  //         setLocalStream(stream);

  //         // allow only host to be connected if the stream is not yet live
  //         if (!livestream?.settings?.isLive && !isHost) return;
  //         //> else connect
  //         if (!user) return;
  //         console.log("user");
  //         const name = user
  //           ? `${user?.firstName} ${user?.lastName}`
  //           : `User-${Math.floor(Math.random() * 10000)}`;
  //         await webRTCService.joinRoom(
  //           livestream?.streamAlias,
  //           name,
  //           user?.id?.toString(),
  //           isHost
  //         );

  //         // Wait for sendTransport to be ready
  //         await webRTCService.waitForSendTransport();

  //         const [audioTrack] = stream.getAudioTracks();
  //         const [videoTrack] = stream.getVideoTracks();

  //         //produce media after joining

  //         if (audioTrack) {
  //           mediaRef.current.audioProducer = await webRTCService.produceMedia(
  //             audioTrack
  //           );
  //         }

  //         if (videoTrack) {
  //           mediaRef.current.videoProducer = await webRTCService.produceMedia(
  //             videoTrack
  //           );
  //         }

  //         joinedRef.current = true;
  //       } catch (err) {
  //         console.error("Join room error:", err);
  //         setError("Could not join the room");
  //       }
  //     };
  //     join();
  //   }
  //   return () => {
  //     // Cleanup if needed (e.g., on disconnect)

  //     joinedRef.current = false;
  //   };
  // }, [
  //   isConnected,
  //   livestream?.streamAlias,
  //   livestream?.settings?.isLive,
  //   isHost,
  //   user,
  // ]);

  // // Update the useEffect for speaking detection
  // useEffect(() => {
  //   const audioContext = new AudioContext();
  //   const analysers = new Map<
  //     string,
  //     { analyser: AnalyserNode; interval: NodeJS.Timeout }
  //   >();
  //   const speakingThreshold = -50; // dB
  //   const checkInterval = 200; // ms

  //   const checkSpeaking = (peerId: string, stream: MediaStream) => {
  //     if (!stream.getAudioTracks().length) return;

  //     const source = audioContext.createMediaStreamSource(stream);
  //     const analyser = audioContext.createAnalyser();
  //     analyser.fftSize = 32;
  //     source.connect(analyser);

  //     const dataArray = new Uint8Array(analyser.frequencyBinCount);
  //     let lastSpeakingState = false;

  //     const interval = setInterval(() => {
  //       analyser.getByteFrequencyData(dataArray);
  //       const sum = dataArray.reduce((a, b) => a + b, 0);
  //       const avg = sum / dataArray.length;
  //       const dB = 20 * Math.log10(avg / 255);

  //       const isSpeaking = dB > speakingThreshold;

  //       // Only update if state changed
  //       if (isSpeaking !== lastSpeakingState) {
  //         setPeerStatus((prev) => {
  //           const newState = {
  //             ...prev,
  //             [peerId]: {
  //               ...prev[peerId],
  //               isSpeaking,
  //             },
  //           };

  //           // Notify server about speaking status change
  //           webRTCService.notifySpeakingStatus(isSpeaking);

  //           return newState;
  //         });

  //         lastSpeakingState = isSpeaking;
  //       }
  //     }, checkInterval);

  //     analysers.set(peerId, { analyser, interval });
  //   };

  //   // Setup analysers for each stream
  //   Object.entries(remoteStreams).forEach(([peerId, stream]) => {
  //     if (!analysers.has(peerId)) {
  //       checkSpeaking(peerId, stream);
  //     }
  //   });

  //   return () => {
  //     // Cleanup all analysers and intervals
  //     analysers.forEach(({ analyser, interval }) => {
  //       analyser.disconnect();
  //       clearInterval(interval);
  //     });
  //     analysers.clear();

  //     // Close audio context
  //     if (audioContext.state !== "closed") {
  //       audioContext.close();
  //     }
  //   };
  // }, [remoteStreams]);

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
    //toggleLiveStream,
    isLiveStart,
   // peerStatus,
  };
}
