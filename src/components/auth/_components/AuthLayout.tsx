"use client"

import { cn } from "@/lib/utils";
import Image from "next/image";

export function AuthLayout({ children, className, containerClassName }: { children: React.ReactNode, className?:string, containerClassName?:string }) {
  return (
    <div className={cn("bg-baseColor-100  p-4 sm:p-6 fixed inset-0 w-full h-full", containerClassName)}>
      <div className={cn("w-full max-w-xl h-fit max-h-[85%] m-auto inset-0 absolute ", className)}>
        <div className="w-full flex items-center justify-center mb-4">
          <Image
            src={"/logo.png"}
            alt="logo"
            width={300}
            height={200}
            className="w-[150px] h-[40px]"
          />
        </div>

        <div className="flex flex-col w-full bg-white rounded-lg h-fit  shadow py-7 px-3 sm:px-4">
          {children}
        </div>
      </div>
    </div>
  );
}
