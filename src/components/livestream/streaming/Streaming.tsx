"use client";

import { cn } from "@/lib/utils";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useWebRTCContext } from "@/contexts/WebrtcContext";
import { OfflineModal } from "./_components/OfflineModal";
import { PeerDefault } from "./_components/PeerDefault";
import { NetworkConnectionState } from "./_components/NetworkConnectionState";
import { motion, AnimatePresence } from "framer-motion";

export interface StreamingPropRef {
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}
interface Prop {
  className: string;
}

function PeerVideo({
  peerId,
  name,
  remoteVideoRefs,
  videoMuted,
}: {
  remoteVideoRefs: React.RefObject<Record<string, HTMLVideoElement | null>>;
  name: string;
  peerId: string;
  videoMuted: boolean;
}) {
  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full relative border-baseColor border-2 rounded-lg overflow-hidden"
      >
        <video
          ref={(el) => {
            remoteVideoRefs.current[peerId] = el;
          }}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{
            transform: "scaleX(-1)",
          }}
          muted
        />
        <p className=" w-fit font-medium  bg-white px-3 py-2 absolute z-40 shadow left-0 bottom-0 rounded-tr-lg">
          <span className="gradient-text bg-basePrimary capitalize">
            {name}
          </span>
        </p>
        {!videoMuted && (
          <PeerDefault
            userName={name}
            className="h-full absolute inset-0 z-10 w-full"
          />
        )}
      </motion.div>
    </>
  );
}

export const Streaming = forwardRef<StreamingPropRef, Prop>(
  ({ className }, ref) => {
    const {
      localStream,
      remoteStreams,

      isHost,
      stream,
      isOffline,
      peerStatus,
      isCameraOn,
      user,
      connectionState,
    } = useWebRTCContext();
    // Local video ref
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const [windowSize, setWindowSize] = useState({
      width: typeof window !== 'undefined' ? window.innerWidth : 0,
      height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });

    // Remote video refs
    const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
    const remoteAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
    // Set up local video stream
    useEffect(() => {
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }, [localStream, localVideoRef.current]);

    // Set up remote video & audio streams with track verification
    useEffect(() => {
      Object.entries(remoteStreams.video).forEach(([peerId, stream]) => {
        //video
        const videoElement = remoteVideoRefs.current[peerId];
        if (videoElement && stream?.stream) {
          const tracks = stream.stream.getTracks();
          if (tracks.length > 0) {
            console.log(
              `Setting stream for peer ${peerId} with ${tracks.length} tracks`
            );
            videoElement.srcObject = stream.stream;
          } else {
            console.warn(`No tracks in stream for peer ${peerId}`);
            videoElement.srcObject = null;
          }
        }
      });
    }, [remoteStreams]);

    useEffect(() => {
      const handleUserInteraction = () => {
        console.log("interacted");
        Object.entries(remoteAudioRefs.current).forEach(([peerId, audioEl]) => {
          if (audioEl) {
            audioEl
              .play()
              .then(() => {
                console.log(`Playing audio for ${peerId}`);
              })
              .catch((err) => {
                console.warn(`Couldn't autoplay for ${peerId}:`, err);
              });
          }
        });

        window.removeEventListener("click", handleUserInteraction);
      };

      window.addEventListener("click", handleUserInteraction);

      return () => {
        window.removeEventListener("click", handleUserInteraction);
      };
    }, [remoteStreams.audio]);

    //> to get an active banner
    /**
     * @returns TSreamBanner  | null | undefined
     */
    const activeBanner = useMemo(() => {
      const banners = stream?.banner;
      if (!banners) return null;
      return banners?.find((b) => b?.isActive);
    }, [stream]);

    console.log(remoteStreams, "remote");

    useEffect(() => {
      const handleResize = () => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    const numberOfStreams = useMemo(() => {
      if (Object.values(remoteStreams.video).length > 0) {
        return Object.values(remoteStreams.video).length + 1;
      } else return 1;
    }, [remoteStreams]);


    const gridConfig = useMemo(() => {
      let columns = 1;
      let itemHeight = '100%';
      let containerHeight = '100%';
      let alignItems = 'stretch';
      
      if (numberOfStreams > 1) {
        // Determine columns based on screen width
        if (windowSize.width >= 1024) {
          columns = Math.min(3, numberOfStreams);
        } else if (windowSize.width >= 768) {
          columns = Math.min(2, numberOfStreams);
        } else {
          columns = 1;
        }
        
        
        const rowsNeeded = Math.ceil(numberOfStreams / columns);
        const maxVisibleRows = Math.floor(windowSize.height / 300); 
        
        if (rowsNeeded > maxVisibleRows) {
          
          itemHeight = '300px';
          containerHeight = '100%';
          alignItems = 'flex-start';
        } else {
         
          itemHeight = `${100 / rowsNeeded}%`;
          containerHeight = 'auto';
          alignItems = 'center';
        }
      }

      return {
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        height: containerHeight,
        gridAutoRows: itemHeight,
        alignItems,
        justifyContent: numberOfStreams === 1 ? 'stretch' : 'center',
      };
    }, [numberOfStreams, windowSize.width, windowSize.height]);

   

    return (
      <>
        <div
          className={cn(
            "w-full h-full flex items-center justify-center relative bg-white rounded-xl border col-span-9",
            className
          )}
        >
          {/* Remote videos */}
          {/* <>
            {localStream && (
              <div className="w-full h-full overflow-hidden relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{
                    transform: "scaleX(-1)",
                  }}
                />
                <p className=" w-fit font-medium  bg-white px-3 py-2 absolute left-0 bottom-0 rounded-tr-lg">
                  <span className="gradient-text bg-basePrimary">You</span>
                </p>
              </div>
            )}
          </> */}

          <div
              ref={gridRef}
              style={{
                display: 'grid',
                gap: '1rem',
                ...gridConfig,
              }}
            className="w-full h-full  p-4 sm:p-6 overflow-y-auto"
          >
            <AnimatePresence>
              {Array.isArray(Object.entries(remoteStreams.video)) &&
              Object.entries(remoteStreams.video).length === 1 ? (
                <>
                  <>
                    {localStream && (
                      <>
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.3 }}
                          className="w-full h-full border-baseColor border-2 relative rounded-lg overflow-hidden"
                        >
                          <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{
                              transform: "scaleX(-1)",
                            }}
                          />
                          <p className=" w-fit font-medium z-20 bg-white shadow px-3 py-2 absolute left-0 bottom-0 rounded-tr-lg">
                            <span className="gradient-text bg-basePrimary">
                              You
                            </span>
                          </p>
                          {!isCameraOn && (
                            <PeerDefault
                              userName={`${user?.firstName} ${user?.lastName}`}
                              className="w-full absolute inset-0 z-10 h-full"
                            />
                          )}
                        </motion.div>
                      </>
                    )}
                  </>
                  <>
                    {Object.entries(remoteStreams.video).map(
                      ([peerId, stream]) => (
                        <PeerVideo
                          key={peerId}
                          peerId={peerId}
                          name={stream?.name || ""}
                          remoteVideoRefs={remoteVideoRefs}
                          videoMuted={peerStatus[peerId].isVideoMuted}
                        />
                      )
                    )}
                  </>
                </>
              ) : Array.isArray(Object.entries(remoteStreams.video)) &&
                Object.entries(remoteStreams.video).length > 1 ? (
                <>
                  <>
                    {localStream && (
                      <>
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.3 }}
                          className="w-full h-full border-baseColor border-2 relative rounded-lg overflow-hidden"
                        >
                          <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{
                              transform: "scaleX(-1)",
                            }}
                          />
                          <p className=" w-fit font-medium z-20 shadow bg-white px-3 py-2 absolute left-0 bottom-0 rounded-tr-lg">
                            <span className="gradient-text bg-basePrimary">
                              You
                            </span>
                          </p>
                          {!isCameraOn && (
                            <PeerDefault
                              userName={`${user?.firstName} ${user?.lastName}`}
                              className="w-full absolute inset-0 z-10 h-full"
                            />
                          )}
                        </motion.div>
                      </>
                    )}
                  </>
                  {Object.entries(remoteStreams.video).map(
                    ([peerId, stream]) => (
                      <PeerVideo
                        key={peerId}
                        remoteVideoRefs={remoteVideoRefs}
                        peerId={peerId}
                        name={stream?.name || ""}
                        videoMuted={peerStatus[peerId].isVideoMuted}
                      />
                    )
                  )}
                </>
              ) : localStream ? (
                <>
                  {localStream && (
                    <>
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full border-baseColor border-2 relative rounded-lg overflow-hidden"
                      >
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                          style={{
                            transform: "scaleX(-1)",
                          }}
                        />
                        <p className=" w-fit font-medium z-20 shadow bg-white px-3 py-2 absolute left-0 bottom-0 rounded-tr-lg">
                          <span className="gradient-text bg-basePrimary">
                            You
                          </span>
                        </p>
                        {!isCameraOn && (
                          <PeerDefault
                            userName={`${user?.firstName} ${user?.lastName}`}
                            className="w-full absolute inset-0 z-10 h-full"
                          />
                        )}
                      </motion.div>
                    </>
                  )}
                </>
              ) : null}
            </AnimatePresence>
          </div>
          {Object.entries(remoteStreams.audio).map(([peerId, stream]) => (
            <audio
              key={`audio-${peerId}`}
              ref={(el) => {
                if (el) {
                  el.srcObject = stream.stream;
                  remoteAudioRefs.current[peerId] = el;
                }
              }}
              autoPlay
              muted={peerId === user?.id?.toString()}
              // controls
              // style={{ display: "none" }}
            />
          ))}
          {/**  display any active banner */}
          {activeBanner && (
            <div
              style={{
                backgroundColor: activeBanner?.backgroundColor,
                color: activeBanner?.textColor,
              }}
              className="w-full font-medium p-3 line-clamp-3 h-fit absolute inset-x-0 bottom-0 z-20"
            >
              {activeBanner?.content}
            </div>
          )}
        </div>
        {isOffline && <OfflineModal />}
        <NetworkConnectionState state={connectionState} />
      </>
    );
  }
);
