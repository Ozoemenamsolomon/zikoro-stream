"use client";

import { cn } from "@/lib/utils";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useWebRTCContext } from "@/contexts/WebrtcContext";
import { OfflineModal } from "./_components/OfflineModal";
import { PeerDefault } from "./_components/PeerDefault";
import { NetworkConnectionState } from "./_components/NetworkConnectionState";

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
      <div className="w-full h-full relative border border-black overflow-hidden">
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
      </div>
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
      connectionState
    } = useWebRTCContext();
    // Local video ref
    const localVideoRef = useRef<HTMLVideoElement>(null);

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

    return (
      <>
        <div
          className={cn(
            "w-full h-full overflow-hidden relative transition-all animate-fade-in-out bg-white rounded-xl border col-span-9",
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

          <div className="w-full h-full  animate-grid">
            {Array.isArray(Object.entries(remoteStreams.video)) &&
            Object.entries(remoteStreams.video).length === 1 ? (
              <div className="w-full h-full grid grid-cols-2">
                <>
                  {localStream && (
                    <>
                      <div className="w-full h-full  relative">
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
                      </div>
                    </>
                  )}
                </>
                <div className={cn("", !localStream && "col-span-full")}>
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
                </div>
              </div>
            ) : Array.isArray(Object.entries(remoteStreams.video)) &&
              Object.entries(remoteStreams.video).length > 1 ? (
              <div
                className={cn("w-full h-full overflow-y-auto grid grid-cols-2")}
              >
                <>
                  {localStream && (
                    <>
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
                      </div>
                    </>
                  )}
                </>
                {Object.entries(remoteStreams.video).map(([peerId, stream]) => (
                  <PeerVideo
                    key={peerId}
                    remoteVideoRefs={remoteVideoRefs}
                    peerId={peerId}
                    name={stream?.name || ""}
                    videoMuted={peerStatus[peerId].isVideoMuted}
                  />
                ))}
              </div>
            ) : localStream ? (
              <>
                {localStream && (
                  <>
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
                    </div>
                  </>
                )}
              </>
            ) : null}
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
        <NetworkConnectionState state={connectionState}/>
      </>
    );
  }
);
