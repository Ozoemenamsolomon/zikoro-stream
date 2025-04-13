import { cn } from "@/lib/utils";

export function Streaming({ className }: { className: string }) {
  return (
    <div
      className={cn(
        "w-full h-full transition-all animate-fade-in-out bg-white rounded-xl border col-span-6",
        className
      )}
    ></div>
  );
}
