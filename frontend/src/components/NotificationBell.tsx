import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useNavigate } from "react-router-dom";
import { Bell } from "@phosphor-icons/react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "../hooks/useNotifications";
import { CARD_SHADOW } from "../utils/statusStyles";
import { timeAgo } from "../utils/text";
import type { Notification } from "../types/notification";

interface NotificationBellProps {
  className?: string;
}

function NotificationBell({ className }: NotificationBellProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { data: unreadCount } = useUnreadNotificationCount();
  // Only fetched once the dropdown has been opened, per scope: no point
  // loading the full list just because the badge is visible.
  const { data: notifications, isLoading } = useNotifications(isOpen);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const count = unreadCount?.count ?? 0;

  function handleSelect(notification: Notification) {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    navigate(notification.link);
  }

  return (
    <Menu as="div" className={`relative ${className ?? ""}`}>
      <MenuButton
        aria-label="Notificaciones"
        onClick={() => setIsOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface-ground hover:text-ink cursor-pointer"
      >
        <Bell size={19} />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-[3px] rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className={`z-50 w-[320px] max-h-[420px] overflow-y-auto bg-paper-raised border border-rule rounded-xl py-2 focus:outline-none ${CARD_SHADOW}`}
      >
        <div className="flex items-center justify-between px-3.5 py-1.5">
          <span className="text-[12px] font-semibold text-ink">Notificaciones</span>
          {count > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              className="text-[11px] font-semibold text-accent-primary hover:underline cursor-pointer"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>
        <div className="my-1 border-t border-rule" />

        {isLoading && <p className="px-3.5 py-3 text-[12.5px] text-ink-faint m-0">Cargando…</p>}

        {!isLoading && notifications?.length === 0 && (
          <p className="px-3.5 py-3 text-[12.5px] text-ink-faint m-0">No tienes notificaciones.</p>
        )}

        {notifications?.map((notification) => (
          <MenuItem key={notification.id}>
            <button
              type="button"
              onClick={() => handleSelect(notification)}
              className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left cursor-pointer data-[focus]:bg-surface-ground"
            >
              <span
                className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                  notification.read ? "bg-transparent" : "bg-accent-primary"
                }`}
              />
              <span className="flex-1 min-w-0">
                <span
                  className={`block text-[12.5px] leading-snug ${
                    notification.read ? "text-ink-soft" : "text-ink font-medium"
                  }`}
                >
                  {notification.message}
                </span>
                <span className="block text-[11px] text-ink-faint mt-0.5">
                  {timeAgo(notification.createdAt)}
                </span>
              </span>
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

export default NotificationBell;
