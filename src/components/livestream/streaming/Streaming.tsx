"use client";

import { cn } from "@/lib/utils";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useWebRTCContext } from "@/contexts/WebrtcContext";

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

function HostVideo({
  peerId,
  name,
  remoteVideoRefs,
}: {
  remoteVideoRefs: React.RefObject<Record<string, HTMLVideoElement | null>>;
  name: string;
  peerId: string;
}) {
  return (
    <div className="w-full h-full border border-black overflow-hidden">
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
      <p className=" w-fit font-medium  bg-white px-3 py-2 absolute left-0 bottom-0 rounded-tr-lg">
        <span className="gradient-text bg-basePrimary capitalize">{name}</span>
      </p>
    </div>
  );
}

// const RemoteVideo = ({ stream, peerId }: { stream: MediaStream; peerId: string }) => {
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const [isMuted, setIsMuted] = useState(true);
//   const playAttemptRef = useRef<number>(0);
//   const isMountedRef = useRef(true);

//   // Robust play handler with retry logic
//   const safePlay = async () => {
//     if (!isMountedRef.current || !videoRef.current) return;

//     const video = videoRef.current;
//     playAttemptRef.current += 1;
//     const attempt = playAttemptRef.current;

//     try {
//       // Ensure fresh state
//       video.pause();
//       video.srcObject = stream;
//       video.muted = true;

//       console.log(`Attempt ${attempt}: Trying to play ${peerId}`);

//       await video.play();

//       console.log(`Successfully playing ${peerId}`);
//     } catch (err) {
//       console.error(`Attempt ${attempt} failed for ${peerId}:`, err);

//       // Implement exponential backoff for retries (max 3 attempts)
//       if (attempt < 3) {
//         const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
//         setTimeout(safePlay, delay);
//       }
//     }
//   };

//   useEffect(() => {
//     isMountedRef.current = true;

//     // Initialize playback
//     safePlay();

//     // Track events for debugging
//     const video = videoRef.current;
//     if (!video) return;

//     const eventLogger = (e: Event) => console.log(`${peerId} ${e.type}`);
//     const events = ['play', 'playing', 'pause', 'ended', 'error'];
//     events.forEach(e => video.addEventListener(e, eventLogger));

//     return () => {
//       isMountedRef.current = false;
//       if (video) {
//         events.forEach(e => video.removeEventListener(e, eventLogger));
//         video.pause();
//         video.srcObject = null;
//       }
//     };
//   }, [stream, peerId]);

//   return (
//     <div className="relative w-full h-full">
//       <video
//         ref={videoRef}
//         autoPlay
//         playsInline
//         muted={isMuted}
//         className="w-full h-full object-cover"
//       />
//       <div className="absolute bottom-2 left-2 flex gap-2">
//         <span className="bg-black/70 text-white px-2 py-1 rounded">
//           {peerId}
//         </span>
//         <button
//           onClick={() => setIsMuted(!isMuted)}
//           className="bg-black/70 text-white px-2 py-1 rounded"
//         >
//           {isMuted ? '🔇 Unmute' : '🔊 Mute'}
//         </button>
//       </div>
//     </div>
//   );
// };

export const Streaming = forwardRef<StreamingPropRef, Prop>(
  ({ className }, ref) => {
    const {
      localStream,
      remoteStreams,

      isHost,
      stream,

      user,
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
      <div
        className={cn(
          "w-full h-full overflow-hidden relative transition-all animate-fade-in-out bg-white rounded-xl border col-span-6",
          className
        )}
      >
        {/* Remote videos */}

        <div className="w-full h-full gap-2">
          {Array.isArray(Object.entries(remoteStreams.video)) &&
          Object.entries(remoteStreams.video).length === 1 ? (
            <div className="w-full h-full grid grid-cols-1">
              <>
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
              </>
              <div className={cn("", !localStream && "col-span-full")}>
                {Object.entries(remoteStreams.video).map(([peerId, stream]) => (
                  <HostVideo
                    key={peerId}
                    peerId={peerId}
                    name={stream?.name || ""}
                    remoteVideoRefs={remoteVideoRefs}
                  />
                ))}
              </div>
            </div>
          ) : Array.isArray(Object.entries(remoteStreams.video)) &&
            Object.entries(remoteStreams.video).length > 1 ? (
            <div
              className={cn("w-full h-full overflow-y-auto grid grid-cols-1")}
            >
              <>
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
              </>
              {Object.entries(remoteStreams.video).map(([peerId, stream]) => (
                <HostVideo
                  key={peerId}
                  remoteVideoRefs={remoteVideoRefs}
                  peerId={peerId}
                  name={stream?.name || ""}
                />
              ))}
            </div>
          ) : localStream ? (
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
                <p className=" w-fit font-medium  bg-white px-3 py-2 absolute left-0 bottom-0 rounded-tr-lg">
                  <span className="gradient-text bg-basePrimary">You</span>
                </p>
              </div>
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
    );
  }
);
