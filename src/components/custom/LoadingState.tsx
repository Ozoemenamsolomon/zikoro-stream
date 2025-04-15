import { Loader2Icon } from "lucide-react";

export function LoadingState() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      <Loader2Icon className="animate-spin" size={30} />
    </div>
  );
}
