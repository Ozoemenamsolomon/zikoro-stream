"use client";

import { useEffect, useRef, useState } from "react";
import { IoMdNavigate } from "react-icons/io";
import { Button } from "@/components/custom/Button";
import { useWebRTC } from "@/hooks/webrtc";
import { useAttendeeStore, useUserStore } from "@/store";
import { ResponseMessage } from "@/lib/services/webrtcService";
import { TStreamAttendee, TUser } from "@/types";
import { formatRelativeDuration } from "@/utils/utils";

export function ChatSection({
  messages,
  sendChatMessage,
}: {
  sendChatMessage: (msg: string, me: TStreamAttendee | null) => void;
  messages: ResponseMessage[];
}) {
  const [value, setValue] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAttendeeStore();

  const handleSend = () => {
    if (value.trim() !== "") {
      sendChatMessage(value.trim(), user);
      setValue("");
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  console.log(messages);

  return (
    <>
      <div className="w-full overflow-y-auto vert-scroll h-[85%]">
        <div className="w-full flex p-4 flex-col gap-4">
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user?.id?.toString();
            return isMe ? (
              <MeWidget
                key={idx}
                date={msg?.timestamp}
                message={msg.content}
                name={msg.senderName}
              />
            ) : (
              <OtherWidget
                key={idx}
                message={msg.content}
                name={msg.senderName}
                date={msg?.timestamp}
              />
            );
          })}
          <div ref={scrollRef} />
        </div>
      </div>
      <div className="w-full rounded-b-xl p-3 flex items-center bg-white">
        <textarea
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="w-[90%] h-fit max-h-16 resize-none px-3 py-1"
          placeholder="Send a message ..."
        />
        <Button
          disabled={value.trim() === ""}
          onClick={handleSend}
          className="px-0 w-8 text-white relative h-8 rounded-full bg-basePrimary"
        >
          {value.trim() === "" && (
            <div className="absolute inset-0 w-full h-full bg-white/40" />
          )}
          <IoMdNavigate className="rotate-90" size={16} />
        </Button>
      </div>
    </>
  );
}

function OtherWidget({
  name,
  date,
  message,
}: {
  date: string;
  name: string;
  message: string;
}) {
  return (
    <div className="w-full flex flex-col justify-end items-start">
      <div className="flex items-center gap-x-2">
        <p className="rounded-full uppercase flex items-center justify-center bg-basePrimary text-white w-6 h-6 font-semibold">
          {/* {name?.toUpperCase()} */}
          {name?.charAt(0)}
        </p>
        <p>
          {formatRelativeDuration(date)}.{" "}
          <span className="font-medium">{name}</span>
        </p>
      </div>
      <div className="max-w-full w-fit p-3 rounded-xl bg-baseColor-100 border text-start ml-7">
        {message}
      </div>
    </div>
  );
}

function MeWidget({
  name,
  message,
  date,
}: {
  date: string;
  name: string;
  message: string;
}) {
  return (
    <div className="w-full flex flex-col justify-end items-end">
      <div className="flex items-center gap-x-2">
        <p>
          {formatRelativeDuration(date)}.{" "}
          <span className="font-medium">{name}</span>
        </p>
        <p className="rounded-full uppercase flex items-center justify-center bg-basePrimary text-white w-6 h-6 font-semibold">
          {/* {name[0]?.toUpperCase()} */}
          {name?.charAt(0)}
        </p>
      </div>
      <div className="max-w-full w-fit p-3 rounded-xl bg-baseColor-100 border text-start mr-7">
        {message}
      </div>
    </div>
  );
}
