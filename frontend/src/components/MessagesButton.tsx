import { Link } from "react-router-dom";
import { ChatCircleDots } from "@phosphor-icons/react";
import { useMessagesUnreadCount } from "../hooks/useConversations";

function MessagesButton() {
  const { data } = useMessagesUnreadCount();
  const count = (data?.count ?? 0) + (data?.pendingRequests ?? 0);

  return (
    <Link
      to="/mensajes"
      aria-label="Mensajes"
      className="relative w-9 h-9 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface-ground hover:text-ink"
    >
      <ChatCircleDots size={19} />
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-[3px] rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

export default MessagesButton;
