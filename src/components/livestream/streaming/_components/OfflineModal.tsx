import { InlineIcon } from "@iconify/react/dist/iconify.js";

export function OfflineModal() {
  return (
    <div className="bg-white bg-opacity-80 backdrop-blur-2xl h-screen w-sreen flex-col gap-5 fixed z-[200] flex items-center justify-center">
      <InlineIcon
        icon="mdi:network-strength-off"
        fontSize={36}
        color="#001fcc"
      />
      <p className="font-semibold text-center">
        No Network. Please check your internet connection
      </p>
    </div>
  );
}
