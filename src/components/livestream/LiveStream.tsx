"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Streaming } from "./streaming/Streaming";
import { Chat } from "./chat/Chat";
import { cn } from "@/lib/utils";
import {
  LSSettingIcon,
  MicroPhoneIcon,
  PeopleIcon,
  RaisedHandIcon,
  ShareScreenIcon,
  VideoScreenIcon,
} from "@/constants/icon";
import { Button } from "../custom/Button";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import { calculateAndSetWindowHeight } from "@/utils/utils";
import { useAttendeeStore, useUserStore } from "@/store";
import { TStream, TStreamAttendee, TStreamChat } from "@/types/stream.type";
import { useGetData } from "@/hooks";
import { LoadingState } from "../custom/LoadingState";
import { ShareStream } from "./_components/ShareStream";
import { AddBanner } from "./_components/AddBanner";
import { RiLoader3Fill } from "react-icons/ri";
import { getRequest } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { WebRTCProvider, useWebRTCContext } from "@/contexts/WebrtcContext";

function WaitingForHost() {
  return (
    <div className="w-screen h-screen bg-white flex flex-col items-center justify-center gap-6">
      <h2 className="gradient-text bg-basePrimary font-semibold text-base sm:text-lg">
        Waiting for the host to start the live session
      </h2>

      <RiLoader3Fill size={60} className="animate-spin text-baseColor" />
    </div>
  );
}

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

function LiveStreamMainComp() {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [isHideChat, setHideChat] = useState(false);
  const [isShare, setIsShare] = useState(false);
  const [isBanner, setIsBanner] = useState(false);
  const [isInvite, setIsInvite] = useState(false); // to toggle sharing invite link

  const {
    isMicOn,
    isCameraOn,
    isScreenSharing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    peers,
    toggleLiveStream,
    isHost,
    isInvitee,
    stream,
    isLiveStart,
    user,
  } = useWebRTCContext();

  useEffect(() => {
    if (divRef !== null) {
      calculateAndSetWindowHeight(divRef, 200);
    }
  }, [divRef, isLiveStart]);

  async function goLive() {
    toggleLiveStream(
      {
        ...stream?.settings,
        isLive: !isLiveStart,
      },
      new Date().toISOString(),
      stream?.id
    );
  }

  const isCurrentlyLive = useMemo(() => {
    if (isLiveStart !== null) {
      return isLiveStart;
    } else return stream?.settings?.isLive;
  }, [isLiveStart, stream]);

  //> number of peers
  const numberOfPeers = useMemo(() => {
    return Object.values(peers).length;
  }, [peers]);

  return (
    <>
      {!isCurrentlyLive && !isHost && !isInvitee ? (
        <WaitingForHost />
      ) : (
        <div className="w-full p-4 sm:p-6">
          <div className="w-full flex items-center mb-2 justify-between">
            <h2 className="font-semibold text-sm capitalize sm:text-base">
              {stream?.title}
            </h2>

            <div className="flex items-center gap-x-3">
              <div className="bg-baseColor-200 rounded-3xl px-2 py-2 flex items-center justify-center w-fit">
                <PeopleIcon />
                <p className="font-medium gradient-text bg-basePrimary">
                  {numberOfPeers}
                </p>
              </div>

              {isHost ? (
                <>
                  <div className="flex items-center gap-x-[1px]">
                    <Button
                      onClick={() => setIsShare(true)}
                      className="h-9 rounded-l-xl  rounded-r-none bg-basePrimary text-white"
                    >
                      Share
                    </Button>
                    <Button
                      onClick={() => {
                        setIsShare(true);
                        setIsInvite(true);
                      }}
                      className="h-9 rounded-l-none  rounded-r-none bg-basePrimary text-white"
                    >
                      Invite
                    </Button>
                    <Button className="h-9 rounded-l-none  rounded-r-none bg-basePrimary text-white">
                      Edit
                    </Button>
                    <Button className="h-9 rounded-r-xl  rounded-l-none bg-basePrimary text-white">
                      <InlineIcon icon="mage:dots-circle" fontSize={18} />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="w-10 text-base uppercase font-semibold text-white h-10 rounded-lg bg-basePrimary flex items-center justify-center">
                  {user
                    ? `${user?.firstName?.charAt(0)}${user?.lastName?.charAt(
                        0
                      )}`
                    : "U"}
                </div>
              )}
            </div>
          </div>
          <div
            ref={divRef}
            className="w-full grid grid-cols-12  items-start  gap-2"
          >
            <Streaming className={cn("", isHideChat && "col-span-full")} />
            <Chat
              toggle={() => setHideChat(true)}
              className={cn("h-full", isHideChat && "hidden")}
            />
            
          </div>
          <div className="w-full mt-4  flex items-center">
          {isHost || isInvitee ? (
            <div className="w-fit mx-auto flex items-center gap-x-3 justify-center rounded-[3rem] bg-white border">
              <div className="rounded-[3rem] flex items-center gap-x-2 border p-2">
                <button
                  onClick={goLive}
                  className="rounded-[2rem] flex items-center p-2 border"
                >
                  <InlineIcon
                    icon="solar:stop-circle-bold-duotone"
                    fontSize={50}
                    color={isCurrentlyLive ? "#E63946" : "#00C91B"}
                  />
                  <p
                    className={cn(
                      "text-[#00C91B] font-medium",
                      isCurrentlyLive && "text-[#E63946]"
                    )}
                  >
                    {isCurrentlyLive ? "End Live" : "Go Live"}
                  </p>
                </button>
                <button className="rounded-[2rem] p-2 flex items-center border">
                  <InlineIcon icon="fluent:record-12-regular" fontSize={52} />
                  <p className="text-zinc-600 font-medium">REC</p>
                </button>
              </div>
              <div className="gap-x-3 flex  p-2 items-center h-full">
                <button
                  onClick={toggleMic}
                  className="w-fit rounded-full relative"
                >
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
          ) : (
            <button className="w-fit  mx-auto  mt-4 items-center justify-center flex relative rounded-full">
              {true ? (
                <></>
              ) : (
                <div className="absolute inset-0 w-full h-full bg-white/40" />
              )}
              <RaisedHandIcon />
            </button>
          )}

          <div
              className={cn(
                "items-center self-end p-4 gap-x-4 hidden",
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
              {isHost && (
                <TabButton
                  title="Banner"
                  icon="entypo:flag"
                  onClick={() => setIsBanner(true)}
                />
              )}
            </div>
          </div>
       
        </div>
      )}
      {isShare && (
        <ShareStream
          close={() => {
            setIsShare(false), setIsInvite(false);
          }}
          urlLink={`${window.location.origin}/${
            isInvite ? "invite" : "join"
          }/ls/${stream.streamAlias}`}
          title={isInvite ? "Invite to stream" : "Share Stream"}
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
    `/stream/${streamId}`,
    "stream"
  );
  const { data: streamChats, isLoading: loadingChats } = useGetData<
    TStreamChat[]
  >(`/stream/chat/${streamId}`, "chat");
  const { user } = useUserStore();
  const { setAttendee } = useAttendeeStore();

  const getData = async (userId: string, streamId: string) => {
    try {
      const { data: responseData, status } = await getRequest<TStreamAttendee>({
        endpoint: `/stream/attendee/${userId}/${streamId}`,
      });

      if (status !== 200) {
        throw new Error("Failed to fetch data");
      }

      setAttendee(responseData.data);

      return responseData.data;
    } catch (error) {
      throw error;
    } finally {
    }
  };

  const {
    data: streamAttendee,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["stream-attendee", user?.id, streamId],
    queryFn: () => getData(user?.id?.toString()!, streamId),
    enabled: !!user?.id,
  });

  // const memoizedStreamMain = useMemo(() => {
  //   if (!stream || !streamAttendee || !streamChats) return null;
  //   return (
  //     <LiveStreamMainComp
  //       stream={stream}
  //       user={streamAttendee}
  //       streamChats={streamChats}
  //     />
  //   );
  // }, [stream?.streamAlias]);
  if (isLoading || loading || !streamAttendee || loadingChats) {
    return <LoadingState />;
  }

  return (
    <>
      {stream && streamAttendee ? (
        <WebRTCProvider
          livestream={stream}
          streamChats={streamChats || []}
          user={streamAttendee}
        >
          <LiveStreamMainComp />
        </WebRTCProvider>
      ) : (
        <p>No Access</p>
      )}
    </>
  );
}
