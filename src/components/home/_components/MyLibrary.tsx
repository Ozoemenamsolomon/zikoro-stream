"use client"

import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import Image from "next/image";
import { ActionModal } from "@/components/custom/ActionModal";
import { Button } from "@/components/custom/Button";
import { useRouter } from "next/navigation";
import { useDeleteRequest } from "@/hooks";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import { LiveStreamIcon } from "@/constants/icon";

function Chip({
  title,
  count,
  isActive,
  onClick,
}: {
  title: string;
  count: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl bg-baseColor-100 font-medium flex items-center justify-center h-10 px-3 gap-x-2",
        isActive && "bg-white border border-baseColor"
      )}
    >
      <span>{title}</span>
      <span className="text-[11px] rounded-full h-7 w-7 flex bg-basePrimary text-white items-center justify-center font-medium">
        {count}
      </span>
    </button>
  );
}

function Action({ close }: { close: () => void }) {
  const router = useRouter();
  const { deleteData, isLoading } = useDeleteRequest(`/stream/1`);
  const [isDeleteModal, setIsDeleteModal] = useState(false);
  async function deletes() {
    deleteData();
  }
  return (
    <>
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-[10px] top-8"
      >
        <div onClick={close} className="fixed inset-0 w-full h-full "></div>
        <div className="relative w-[100px] z-[60] text-mobile sm:text-sm bg-white  shadow rounded-lg py-2">
          <Button onClick={() => {}} className="w-full justify-start h-10">
            <p className=" text-start">Edit</p>
          </Button>
          <Button
            onClick={() => setIsDeleteModal(true)}
            className="w-full justify-start h-10"
          >
            <p className="text-red-600 text-start">Delete</p>
          </Button>
        </div>
      </div>
      {isDeleteModal && (
        <ActionModal
          close={() => setIsDeleteModal(false)}
          asynAction={deletes}
          loading={isLoading}
          buttonText="Delete"
          buttonColor="text-red-500"
        />
      )}
    </>
  );
}

function LibraryCard() {
  const [isAction, setIsAction] = useState(false);

  const Icon = useMemo(() => {
    return LiveStreamIcon;
  }, []);
  return (
    <div className="w-full rounded-xl p-2 bg-baseColor-100">
      <div className="w-full h-40 rounded-xl relative">
        <div className="w-full mx-auto absolute flex items-center justify-between inset-x-0 top-2 px-3">
          <div className="w-[30px] h-[30px]">
            <Icon />
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setIsAction(true);
            }}
            className="px-0 w-8 bg-baseColor-100 h-8 rounded-full"
          >
            <InlineIcon icon="mdi-light:dots-vertical" fontSize={20} />

            {isAction && <Action close={() => setIsAction(false)} />}
          </Button>
        </div>

        {/* {gift?.image && (gift?.image as string).startsWith("https://") ? (
            <Image
              className="w-full rounded-xl h-48  object-cover"
              alt="gift"
              src={gift?.image}
              width={400}
              height={400}
            />
          ) : ( */}
        <div className="w-full rounded-xl  h-full  bg-white"> </div>
        {/* )} */}
      </div>
      <div className="w-full flex flex-col items-start justify-start gap-2">
        <h3 className="font-semibold text-ellipsis whitespace-nowrap overflow-hidden">
          New Age Conference
        </h3>
        <div className="w-full flex items-center justify-between">
          <p>Feb 20 2025</p>
          <p className="text-red-500">10hrs</p>
        </div>
      </div>
    </div>
  );
}

export function MyLibrary() {
  const [active, setActive] = useState(0);
  return (
    <div className="w-full bg-white rounded-xl p-3 mt-6 sm:mt-10">
      {/** top section */}
      <div className="w-full flex items-start sm:items-center flex-col sm:flex-row justify-start sm:justify-between mb-4 sm:mb-6">
        <h2 className="font-semibold text-base sm:text-lg">My Library</h2>

        <div className="flex items-center gap-x-2">
          <Chip
            title="Upcoming"
            count="2"
            isActive={active === 2}
            onClick={() => setActive(2)}
          />
          <Chip
            title="Drafts"
            count="2"
            isActive={active === 1}
            onClick={() => setActive(1)}
          />
          <Chip
            title="All"
            count="2"
            isActive={active === 0}
            onClick={() => setActive(0)}
          />
        </div>
      </div>
      <div className="w-full grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5].map((_, index) => (
          <LibraryCard key={index} />
        ))}
      </div>
    </div>
  );
}
