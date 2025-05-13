import { cn } from "@/lib/utils";

//> to replace user video when it is muted
export function PeerDefault({
  userName,
  className,
}: {
  userName: string;
  className: string;
}) {
  return (
    <div
      className={cn(
        "w-full flex bg-white items-center justify-center",
        className
      )}
    >
      <p className="rounded-full flex items-center uppercase justify-center bg-basePrimary text-white w-24 h-24 text-4xl font-semibold">
        {userName?.split(" ")[0].charAt(0)}
        {userName?.split(" ")[1].charAt(0)}
      </p>
    </div>
  );
}
