"use client";

import { cn } from "@/lib/utils";
import { TStream } from "@/types";
import { forwardRef, useEffect, useMemo, useRef } from "react";

export interface StreamingPropRef {
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}
interface Prop {
  isHost: boolean;
  className: string;
  remoteStreams: Record<string, MediaStream>;
  localStream: MediaStream | null;
  stream: TStream;
  
}

export const Streaming = forwardRef<StreamingPropRef, Prop>(
  ({ className, isHost, localStream, remoteStreams, stream }, ref) => {
    // Local video ref
    const localVideoRef = useRef<HTMLVideoElement>(null);

    // Remote video refs
    const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

    // Set up local video stream
    useEffect(() => {
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }, [localStream, localVideoRef.current]);

   // Set up remote video streams with track verification
   useEffect(() => {
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      const videoElement = remoteVideoRefs.current[peerId];
      if (videoElement && stream) {
        const tracks = stream.getTracks();
        if (tracks.length > 0) {
          console.log(`Setting stream for peer ${peerId} with ${tracks.length} tracks`);
          videoElement.srcObject = stream;
        } else {
          console.warn(`No tracks in stream for peer ${peerId}`);
          videoElement.srcObject = null;
        }
      }
    });
  }, [remoteStreams]);

    //> to get an active banner
    /**
     * @returns TSreamBanner  | null | undefined
     */
    const activeBanner = useMemo(() => {
      const banners = stream?.banner;
      if (!banners) return null;
      return banners?.find((b) => b?.isActive);
    }, [stream]);

    console.log('wqdqwdqw',remoteStreams)

console.log("local", localStream)

    return (
      <div
        className={cn(
          "w-full h-full overflow-hidden relative transition-all animate-fade-in-out bg-white rounded-xl border col-span-6",
          className
        )}
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
        {/* Remote videos */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          {Object.entries(remoteStreams).map(([peerId, _]) => (
            <div
              key={peerId}
              className="w-32 h-24 border rounded overflow-hidden"
            >
              <video
                ref={(el) => (remoteVideoRefs.current[peerId] = el)}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{
                  transform: "scaleX(-1)",
                }}
              />
            </div>
          ))}
        </div>
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
