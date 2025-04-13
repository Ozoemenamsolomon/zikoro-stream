"use client";

import { useEffect, useRef, useState } from "react";
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

export default function Livestream() {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [isHideChat, setHideChat] = useState(false);

  useEffect(() => {
    if (divRef !== null) {
  calculateAndSetWindowHeight(divRef, 200)
    }
  },[divRef]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">
      <div className="w-full flex items-center mb-2 justify-between">
        <h2 className="font-semibold text-sm sm:text-base">Livestream title</h2>

        <div className="bg-baseColor-200 rounded-3xl px-2 py-2 flex items-center justify-center w-fit">
          <PeopleIcon />
          <p className="font-medium gradient-text bg-basePrimary">0</p>
        </div>
        <div className="flex items-center gap-x-[1px]">
          <Button className="h-9 rounded-l-xl  rounded-r-none bg-basePrimary text-white">
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
      <div ref={divRef} className="w-full grid grid-cols-9 gap-2">
        <Streaming className={cn("", isHideChat && "col-span-8")} />
        <Chat
          toggle={() => setHideChat(true)}
          className={cn("", isHideChat && "hidden")}
        />
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
          <button className="w-fit rounded-full">
            <MicroPhoneIcon />
          </button>
          <button className="w-fit rounded-full">
            <VideoScreenIcon />
          </button>
          <button className="w-fit rounded-full">
            <ShareScreenIcon />
          </button>
          <button className="w-fit rounded-full">
            <LSSettingIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
