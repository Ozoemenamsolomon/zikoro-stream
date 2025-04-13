import { Button } from "@/components/custom/Button";
import { useState } from "react";
import { IoMdNavigate } from "react-icons/io";
export function ChatSection() {
  const [value, setValue] = useState("");
  return (
    <>
      <div className="w-full overflow-y-auto vert-scroll h-[85%]">
        <div className="w-full flex p-4 flex-col gap-4">
          <OtherWidget />

          <MeWidget />
          <OtherWidget />
        </div>
      </div>
      <div className="w-full rounded-b-xl p-3 flex items-enter bg-white">
        <textarea
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          className="w-[90%] h-fit max-h-16 resize-none px-3 py-1"
          placeholder="Send a message ..."
        ></textarea>
        <Button
          disabled={value === ""}
          className="px-0 w-8 text-white relative h-8 rounded-full bg-basePrimary"
        >
          {value === "" && (
            <div className="absolute inset-0 w-full h-full bg-white/40" />
          )}
          <IoMdNavigate className="rotate-90" size={16} />
        </Button>
      </div>
    </>
  );
}

function OtherWidget() {
  return (
    <div className="w-full flex flex-col justify-end items-start">
      <div className="flex items-center gap-x-2">
        <p className="rounded-full flex items-center justify-center bg-basePrimary text-white w-6 h-6 font-semibold">
          JD
        </p>
        <p>
          1h. <span className="font-medium">John Doe</span>
        </p>
      </div>
      <div className="max-w-full w-fit p-3 rounded-xl bg-white border text-start   ml-7">
        How are you doing?
      </div>
    </div>
  );
}

function MeWidget() {
  return (
    <div className="w-full flex flex-col justify-end items-end">
      <div className="flex items-center gap-x-2">
        <p>
          1h. <span className="font-medium">John Doe</span>
        </p>

        <p className="rounded-full flex items-center justify-center bg-basePrimary text-white w-6 h-6 font-semibold">
          JD
        </p>
      </div>
      <div className="max-w-full w-fit p-3 rounded-xl bg-white border text-start   mr-7">
        How are you doing?
      </div>
    </div>
  );
}
