"use client";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { IconType } from "react-icons";
import { MdOutlineChat } from "react-icons/md";
import { HiUsers } from "react-icons/hi";
import { Button } from "@/components";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import { ChatSection } from "./_components/ChatSection";
import { GuestList } from "./_components/GuestList";
import { ChatMessage, ResponseMessage } from "@/lib/services/webrtcService";
import { TUser } from "@/types";

function ChipChat({
  isActive,
  Icon,
  onClick,
  title,
}: {
  isActive: boolean;
  Icon: IconType;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-x-2 px-2 py-3 ",
        isActive && "border-b border-baseColor text-baseColor"
      )}
    >
      <Icon size={20} />
      <span>{title}</span>
    </button>
  );
}

export function Chat({
  className,
  toggle,
  isHost,
  sendChatMessage,
  messages,
}: {
  className: string;
  toggle: () => void;
  isHost: boolean;
  sendChatMessage: (msg: string, me: TUser | null) => void;
  messages: ResponseMessage[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div
      className={cn(
        "w-full border rounded-xl flex flex-col justify-between col-span-3 animate-fade-in-out transition-all",
        className
      )}
    >
      <div className="w-full bg-white rounded-t-xl px-3 flex items-center justify-between">
        <p className="w-1 h-1"></p>
        <div className="w-fit flex items-center justify-center gap-x-4">
          <ChipChat
            isActive={active === 0}
            title="Chat"
            Icon={MdOutlineChat}
            onClick={() => setActive(0)}
          />
          <ChipChat
            isActive={active === 1}
            title="Guests"
            Icon={HiUsers}
            onClick={() => setActive(1)}
          />
        </div>
        <Button
          onClick={toggle}
          className="h-5 w-5 px-0  flex items-center justify-center  rounded-full bg-zinc-700"
        >
          <InlineIcon
            icon={"mingcute:close-line"}
            fontSize={18}
            color="#ffffff"
          />
        </Button>
      </div>
      {active === 0 && (
        <ChatSection messages={messages} sendChatMessage={sendChatMessage} />
      )}
      {active === 1 && <GuestList />}
    </div>
  );
}
