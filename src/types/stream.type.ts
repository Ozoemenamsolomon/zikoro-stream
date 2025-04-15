export interface TStream {
  id: number;
  title: string;
  image: string;
  workspace: string;
  registeration: boolean;
  createdBy: number;
  settings: {
    registration: boolean;
  };
  recordLink: string;
  invitees: JSON;
  streamAlias: string;
  banner: TSreamBanner[];
  startDateTime: string;
  endDateTime: string;
}

export interface TSreamBanner {
  content: string;
  bannerId: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
}

export interface TStreamAttendee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  workspaceAlias: string;
  streamAlias: string;
  raisedHand: boolean;
  isActive: boolean;
  attendanceHistory: JSON;
  userId: number;
  streamRating: number;
}

export interface TStreamChat {
  id: number;
  streamAttendeName: string;
  chat: string;
  streamAttendeeId: number;
}
