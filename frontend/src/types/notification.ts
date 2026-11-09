export type NotificationType =
  | "TEAM_REQUEST_RECEIVED"
  | "TEAM_REQUEST_ACCEPTED"
  | "TEAM_INVITE_RECEIVED"
  | "ACTIVITY_ASSIGNED"
  | "DICTAMEN_SUBMITTED"
  | "POST_LIKED"
  | "NEW_FOLLOWER"
  | "MESSAGE_REQUEST_RECEIVED"
  | "MESSAGE_REQUEST_ACCEPTED";

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}
