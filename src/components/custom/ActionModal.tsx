"use client";

import { Button } from "@/components";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineIcon } from "@iconify/react/dist/iconify.js";

export function ActionModal({
  close,
  asynAction,
  loading,
  buttonText,
  buttonColor,
  modalTitle,
  modalText,
  titleColor,
  title,
}: {
  close: () => void;
  asynAction: () => Promise<any>;
  loading?: boolean;
  buttonText: string;
  buttonColor?: string;
  modalText?: string;
  modalTitle?: string;
  titleColor?: string;
  title?: string;
}) {
  return (
    <div
      onClick={close}
      role="button"
      className="w-full h-full inset-0 fixed z-[300] bg-black/50"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="w-[95%] max-w-md rounded-xl animate-float-in bg-white absolute inset-0 m-auto h-fit px-4 py-6 flex flex-col items-center justify-center gap-y-14"
      >
        <div className="w-full flex items-center justify-between pb-3 border-b">
          {title ? (
            <p className="font-medium text-base sm:text-lg">{title}</p>
          ) : (
            <></>
          )}
          <Button
            onClick={close}
            className="h-8 w-8 px-0  flex items-center justify-center self-end rounded-full bg-zinc-700"
          >
            <InlineIcon
              icon={"mingcute:close-line"}
              fontSize={20}
              color="#ffffff"
            />
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center gap-y-4">
          {modalTitle && (
            <p className={cn("text-base text-center sm:text-xl font-semibold", titleColor)}>
              {modalTitle}
            </p>
          )}
          <p className="text-center w-full">{modalText || "Are you sure you want to continue?"}</p>

          <Button
            disabled={loading}
            onClick={asynAction}
            className={cn(
              "text-gray-50 mt-6 bg-basePrimary w-[120px] gap-x-2",
              buttonColor
            )}
          >
            {loading && <Loader2Icon className="animate-spin" size={22} />}
            <p>{buttonText}</p>
          </Button>
        </div>
      </div>
    </div>
  );
}
