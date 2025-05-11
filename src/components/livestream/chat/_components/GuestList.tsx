export function GuestList({
  peers,
}: {
  peers: Record<
    string,
    {
      name: string;
      isHost: boolean;
      isInvitee: boolean;
    }
  >;
}) {
  return (
    <div className="py-4 bg-white h-[90%]">
      {Object.entries(peers).map(([peerKey, peerValue]) => {
        if (peerValue.isHost || peerValue.isInvitee) return null;
        return (
          <div key={peerKey} className="w-full p-3 flex items-center gap-x-3">
            <p className="rounded-full flex items-center uppercase justify-center bg-basePrimary text-white w-10 h-10 font-semibold">
              {peerValue?.name?.split(" ")[0]?.charAt(0)}
              {peerValue?.name?.split(" ")[1]?.charAt(0)}
            </p>
            <p>{peerValue.name}</p>
          </div>
        );
      })}
    </div>
  );
}
