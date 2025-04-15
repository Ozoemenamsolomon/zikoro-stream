"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Streaming } from "./streaming/Streaming";
import { Chat } from "./chat/Chat";
import { cn } from "@/lib/utils";
import {
  GoLiveIcon,
  LSSettingIcon,
  MicroPhoneIcon,
  PeopleIcon,
  ShareScreenIcon,
  VideoScreenIcon,
} from "@/constants/icon";
import { Button } from "../custom/Button";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import { calculateAndSetWindowHeight } from "@/utils/utils";
import { useUserStore } from "@/store";
import { useWebRTC } from "@/hooks/webrtc";
import { TStream } from "@/types/stream.type";
import { TUser } from "@/types";
import { useGetData } from "@/hooks";
import { LoadingState } from "../custom/LoadingState";
import { ShareStream } from "./_components/ShareStream";
import { AddBanner } from "./_components/AddBanner";

function TabButton({
  icon,
  title,
  onClick,
}: {
  title: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-1 rounded-lg flex flex-col items-center justify-center hover:bg-gray-100/20"
    >
      <InlineIcon icon={icon} fontSize={28} />
      <p>{title}</p>
    </button>
  );
}

function LiveStreamMainComp({
  stream,
  user,
}: {
  stream: TStream;
  user: TUser | null;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [isHideChat, setHideChat] = useState(false);
  const [isShare, setIsShare] = useState(false);
  const [isBanner, setIsBanner] = useState(false);
  const isHost = useMemo(() => {
    return user?.id === stream?.createdBy;
  }, [user]);

  useEffect(() => {
    if (divRef !== null) {
      calculateAndSetWindowHeight(divRef, 200);
    }
  }, [divRef]);

  // WebRTC state
  const {
    localStream,
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
  } = useWebRTC(stream.streamAlias, isHost);

  console.log("peers", peers);

  return (
    <>
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">
        <div className="w-full flex items-center mb-2 justify-between">
          <h2 className="font-semibold text-sm capitalize sm:text-base">
            {stream?.title}
          </h2>

          <div className="bg-baseColor-200 rounded-3xl px-2 py-2 flex items-center justify-center w-fit">
            <PeopleIcon />
            <p className="font-medium gradient-text bg-basePrimary">0</p>
          </div>
          <div className="flex items-center gap-x-[1px]">
            <Button
              onClick={() => setIsShare(true)}
              className="h-9 rounded-l-xl  rounded-r-none bg-basePrimary text-white"
            >
              Share
            </Button>
            <Button className="h-9 rounded-l-none  rounded-r-none bg-basePrimary text-white">
              Edit
            </Button>
            <Button className="h-9 rounded-r-xl  rounded-l-none bg-basePrimary text-white">
              <InlineIcon icon="mage:dots-circle" fontSize={18} />
            </Button>
          </div>
        </div>
        <div
          ref={divRef}
          className="w-full grid grid-cols-9 items-start  gap-2"
        >
          <Streaming
            localStream={localStream}
            remoteStreams={remoteStreams}
            isHost={isHost}
            className={cn("", isHideChat && "col-span-8")}
          />
          <Chat
            toggle={() => setHideChat(true)}
            className={cn("h-full", isHideChat && "hidden")}
            isHost={isHost}
            messages={messages}
            sendChatMessage={sendChatMessage}
          />
          <div
            className={cn(
              "col-span-1 flex-col gap-4 items-start hidden",
              isHideChat && "flex"
            )}
          >
            <TabButton
              title="Chat"
              icon="line-md:chat-twotone"
              onClick={() => setHideChat(false)}
            />
            <TabButton
              title="Guest"
              icon="healthicons:people"
              onClick={() => setHideChat(false)}
            />
            <TabButton
              title="Banner"
              icon="entypo:flag"
              onClick={() => setIsBanner(true)}
            />
          </div>
        </div>
        <div className="w-fit mx-auto mt-4 flex items-center gap-x-3 justify-center rounded-[3rem] bg-white border">
          <div className="rounded-[3rem] flex items-center gap-x-2 border p-2">
            <button className="rounded-[2rem] flex items-center p-2 border">
              <GoLiveIcon />
              <p className="text-green-300 font-medium">Go Live</p>
            </button>
            <button className="rounded-[2rem] p-2 flex items-center border">
              <InlineIcon icon="fluent:record-12-regular" fontSize={52} />
              <p className="text-zinc-600 font-medium">REC</p>
            </button>
          </div>
          <div className="gap-x-3 flex  p-2 items-center h-full">
            <button onClick={toggleMic} className="w-fit rounded-full relative">
              {isMicOn ? (
                <></>
              ) : (
                <div className="absolute inset-0 w-full h-full bg-white/40" />
              )}
              <MicroPhoneIcon />
            </button>
            <button
              onClick={toggleCamera}
              className="w-fit relative rounded-full"
            >
              {isCameraOn ? (
                <></>
              ) : (
                <div className="absolute inset-0 w-full h-full bg-white/40" />
              )}
              <VideoScreenIcon />
            </button>
            <button
              onClick={toggleScreenShare}
              className="w-fit rounded-full relative"
            >
              {isScreenSharing ? (
                <></>
              ) : (
                <div className="absolute inset-0 w-full h-full bg-white/40" />
              )}
              <ShareScreenIcon />
            </button>
            <button className="w-fit rounded-full">
              <LSSettingIcon />
            </button>
          </div>
        </div>
      </div>
      {isShare && (
        <ShareStream
          close={() => setIsShare(false)}
          urlLink={`${window.location.origin}/ls/${stream.streamAlias}`}
          title="Share Stream"
        />
      )}

      {isBanner && (
        <AddBanner
          close={() => setIsBanner(false)}
          stream={stream}
          banners={stream?.banner}
        />
      )}
    </>
  );
}

export default function Livestream({ streamId }: { streamId: string }) {
  const { data: stream, isLoading } = useGetData<TStream>(
    `/stream/${streamId}`
  );
  const { user } = useUserStore();

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <>
      {stream ? (
        <LiveStreamMainComp user={user} stream={stream} />
      ) : (
        <p>No Access</p>
      )}
    </>
  );
}
