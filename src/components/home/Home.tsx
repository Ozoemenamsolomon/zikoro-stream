"use client";

import { useUserStore } from "@/store";
import { Header } from "./_components";
import SelectOrganization from "./_components/SelectOrganization";
import {
  LiveStreamIcon,
  RecordSessionIcon,
  UploadSessionIcon,
} from "@/constants/icon";
import { useState } from "react";
import { MyLibrary } from "./_components/MyLibrary";
import { AddLiveStreamModal } from "./_components/AddLiveStreamModal";

function ActionCard({
  title,
  Icon,
  onClick,
}: {
  title: string;
  Icon: () => React.JSX.Element;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl  h-30 justify-center flex items-center gap-x-3"
    >
      <Icon />
      <p className="font-semibold gradient-text bg-basePrimary text-base sm:text-lg">
        {title}
      </p>
    </button>
  );
}

export default function Home() {
  const { user } = useUserStore();
  const [isOpenLive, setIsOpenLive] = useState(false);

  const actions = [
    {
      title: "Start Live Stream",
      Icon: LiveStreamIcon,
      onClick: () => setIsOpenLive(true),
    },
    { title: "Record Session", Icon: RecordSessionIcon, onClick: () => {} },
    { title: "Upload", Icon: UploadSessionIcon, onClick: () => {} },
  ];

  return (
    <>
      <div className="w-full">
        <Header />

        <div className="w-full mx-auto max-w-7xl ">
          {/** sub header */}
          <div className="w-full flex items-center justify-between my-4 sm:my-8">
            <div className="flex flex-col gap-y-2 items-start justify-start">
              <p className="text-sm sm:text-[15px] capitalize">
                Hello <span className="font-semibold">{user?.firstName}</span>
              </p>
              <p>What will you be working on today?</p>
            </div>

            {/** work space */}
            <div className="flex items-start flex-col justify-start gap-1">
              <SelectOrganization />
            </div>
          </div>
          {/** action cardz */}
          <div className="w-full bg-basePrimary rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {actions.map((item, index) => (
              <ActionCard key={index} {...item} />
            ))}
          </div>

          <MyLibrary />
        </div>
      </div>
      {isOpenLive && <AddLiveStreamModal close={() => setIsOpenLive(false)} />}
    </>
  );
}
