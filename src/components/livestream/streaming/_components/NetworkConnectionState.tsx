import { Button } from "@/components/custom/Button";
import React from "react";
import { LuLoaderCircle } from "react-icons/lu";
import { OfflineModal } from "./OfflineModal";

export function NetworkConnectionState({ state }: { state: string }) {


  
  if (!navigator.onLine) return <OfflineModal />;

  const renderContent = () => {
    switch (state) {
      case "checking":
        return (
          <>
            <LuLoaderCircle size={30} className="animate-spin text-baseColor" />
            <p className="font-semibold text-center">
              Waiting for connection to be established
            </p>
          </>
        );

      case "failed":

        return (
          <>
            <p className="font-semibold text-center">
              Connection yet to be established.
            </p>
            {/* <Button
              className="mt-4 bg-basePrimary text-white px-4 py-2 rounded-md"
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button> */}
          </>
        );

        case "socket-failed":
        
        return (
          <>
            <p className="font-semibold text-center">
              Something is wrong with the connection
            </p>
            <Button
              className="mt-4 bg-basePrimary text-white px-4 py-2 rounded-md"
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </>
        );

      default:
        return null;
    }
  };



  if (!state ) return null;

  return (
    <>
   {renderContent() && <div className="bg-white h-screen w-screen text-sm sm:text-base flex-col gap-5 fixed z-[200] flex items-center justify-center">
      {renderContent()}
    </div>}
    </>
  );
}
