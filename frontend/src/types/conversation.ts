export type ConversationStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface ChatUser {
  id: number;
  name: string;
  accountType: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface ConversationSummary {
  id: number;
  status: ConversationStatus;
  initiatorId: number;
  viewerIsInitiator: boolean;
  otherUser: ChatUser;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
}

// ASC order, newest 100
export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[];
}

// null = never messaged
export interface ConversationWithUser {
  otherUser: ChatUser;
  conversation: ConversationDetail | null;
}

export interface MessagesUnreadCount {
  count: number;
  pendingRequests: number;
}

export interface SendMessagePayload {
  recipientId: number;
  text: string;
}

export interface SendMessageResponse {
  conversation: ConversationSummary;
  message: ChatMessage;
}
