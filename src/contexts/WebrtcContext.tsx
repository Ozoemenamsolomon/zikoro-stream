// WebRTCContext.tsx
"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useWebRTC } from "@/hooks/webrtc";
import type { TStream, TStreamAttendee, TStreamChat } from "@/types";

interface WebRTCProviderProps {
  children: React.ReactNode;
  livestream: TStream;
  user: TStreamAttendee;
  streamChats: TStreamChat[];
}

const WebRTCContext = createContext<
  | (ReturnType<typeof useWebRTC> & {
      isHost: boolean;
      stream: TStream;
      user: TStreamAttendee;
      isInvitee: boolean;
    })
  | null
>(null);

export const WebRTCProvider = ({
  children,
  livestream,
  user,
  streamChats,
}: WebRTCProviderProps) => {
  const isHost = useMemo(() => {
    return user?.userId === livestream?.createdBy;
  }, [user, livestream]);

  const isInvitee = useMemo(() => {
    return (livestream?.invitees || []).some((s) => s?.userId === user?.userId)
  },[user, livestream])


  const value = useWebRTC(livestream, isHost,isInvitee, streamChats);

  console.log("fwefwefwefwe", value.localStream);

  return (
    <WebRTCContext.Provider
      value={{ ...value, isHost, isInvitee, stream: livestream, user }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTCContext = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error("useWebRTCContext must be used within a WebRTCProvider");
  }
  return context;
};
