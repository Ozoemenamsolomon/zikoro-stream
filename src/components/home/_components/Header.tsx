"use client";

import { useUserStore } from "@/store";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
import Link from "next/link";

export function Header() {
  const { user } = useUserStore();

  return (
    <header className="w-full sticky z-10 top-0 px-3 py-2 bg-white">
      <div className="w-full mx-auto max-w-7xl flex items-center justify-between">
        <Image
          src="/logo.png"
          alt="zikoro-logo"
          width={200}
          height={100}
          className="w-[100px] h-[40px]"
        />

        <div className="flex items-center gap-x-3">
          <Link href="" className="hidden sm:flex items-center gap-x-2">
            <InlineIcon icon="ant-design:gift-twotone" fontSize={20} />
            Refer and Earn
          </Link>
          <Link href="" className="hidden sm:flex items-center gap-x-2">
            <InlineIcon icon="ant-design:star-twotone" fontSize={20} />
            Feedback
          </Link>
          <div className="w-10 text-base uppercase font-semibold text-white h-10 rounded-lg bg-basePrimary flex items-center justify-center">
            {user ? `${user?.firstName?.charAt(0)}${user?.lastName?.charAt(0)}` : "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
