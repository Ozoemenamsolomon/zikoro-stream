import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TStreamAttendee } from "@/types";

// Define the user state interface
interface attendeeState {
  user: TStreamAttendee | null;
  loading: boolean;
  setAttendee: (user: TStreamAttendee | null) => void;
}

// Create the user store
const useAttendeeStore = create<attendeeState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      setAttendee: (user: TStreamAttendee | null) =>
        set({ user, loading: false }),
    }),
    {
      name: "attendee", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // specify the storage mechanism
    }
  )
);

export { useAttendeeStore };
