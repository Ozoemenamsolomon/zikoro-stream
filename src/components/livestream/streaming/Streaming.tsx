"use client";

import { cn } from "@/lib/utils";
import { forwardRef, useEffect, useRef } from "react";

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
}

export const Streaming = forwardRef<StreamingPropRef, Prop>(
  ({ className, isHost, localStream, remoteStreams }, ref) => {
    // Local video ref
    const localVideoRef = useRef<HTMLVideoElement>(null);

    // Remote video refs
    const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

    // Set up local video stream
    useEffect(() => {
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }, [localStream]);

    // Set up remote video streams
    useEffect(() => {
      Object.entries(remoteStreams).forEach(([peerId, stream]) => {
        const videoElement = remoteVideoRefs.current[peerId];
        if (videoElement && stream) {
          videoElement.srcObject = stream;
        }
      });
    }, [remoteStreams]);

    return (
      <div
        className={cn(
          "w-full h-full transition-all animate-fade-in-out bg-white rounded-xl border col-span-6",
          className
        )}
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Remote videos */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          {Object.entries(remoteStreams).map(([peerId, _]) => (
            <div
              key={peerId}
              className="w-32 h-24 bg-gray-800 rounded overflow-hidden"
            >
              <video
                ref={(el) => (remoteVideoRefs.current[peerId] = el)}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
);
