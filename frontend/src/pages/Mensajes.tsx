import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SidebarNav from "../components/feed/SidebarNav";
import UserPicker from "../components/UserPicker";
import { useConversations, useMessagesUnreadCount } from "../hooks/useConversations";
import { ACCOUNT_TYPE_LABELS } from "../utils/accountTypes";
import { timeAgo } from "../utils/text";
import { avatarColorFor } from "../utils/avatarColor";
import { CARD_SHADOW } from "../utils/statusStyles";
import type { ConversationSummary } from "../types/conversation";
import type { ProjectPersonRef } from "../types/project";

function ConversationRow({ conversation }: { conversation: ConversationSummary }) {
  const { otherUser, lastMessage, lastMessageAt, unreadCount, status, viewerIsInitiator } = conversation;

  return (
    <Link
      to={`/mensajes/${otherUser.id}`}
      className={`flex items-center gap-3 bg-paper-raised border border-rule rounded-xl p-3.5 ${CARD_SHADOW} hover:bg-surface-ground`}
    >
      <span
        style={{ backgroundColor: avatarColorFor(otherUser.id) }}
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0"
      >
        {otherUser.name.charAt(0).toUpperCase()}
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-heading text-[13.5px] font-bold text-ink">{otherUser.name}</span>
          <span className="text-[11px] text-ink-faint">
            {ACCOUNT_TYPE_LABELS[otherUser.accountType] ?? otherUser.accountType}
          </span>
        </div>
        {lastMessage && (
          <p className="text-[12.5px] text-ink-soft m-0 line-clamp-1">{lastMessage.text}</p>
        )}
        {viewerIsInitiator && status === "PENDING" && (
          <span className="self-start text-[10.5px] font-semibold text-accent-primary bg-surface-accent rounded-full px-2 py-0.5 mt-0.5">
            Solicitud enviada
          </span>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[11px] text-ink-faint">{timeAgo(lastMessageAt)}</span>
        {unreadCount > 0 && (
          <span className="min-w-[16px] h-4 px-1 rounded-full bg-accent-primary text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
}

function Mensajes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const navigate = useNavigate();

  const tab = searchParams.get("tab") === "solicitudes" ? "solicitudes" : "mensajes";
  const box = tab === "solicitudes" ? "requests" : "inbox";

  const { data: conversations, isLoading } = useConversations(box);
  const { data: unreadData } = useMessagesUnreadCount();
  const pendingRequests = unreadData?.pendingRequests ?? 0;

  function goToTab(nextTab: "mensajes" | "solicitudes") {
    if (nextTab === "mensajes") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: "solicitudes" });
    }
  }

  function handlePickUser(user: ProjectPersonRef | null) {
    if (user) navigate(`/mensajes/${user.id}`);
  }

  const emptyMessage =
    tab === "solicitudes" ? "No tienes solicitudes de mensaje." : "No tienes conversaciones.";

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row gap-6 px-4 md:px-8 py-7 items-stretch md:items-start max-w-[1200px] mx-auto w-full">
        <aside className="w-full md:w-[240px] md:shrink-0">
          <SidebarNav />
        </aside>

        <section className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="font-heading text-[22px] font-bold text-ink m-0">Mensajes</h1>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="rounded-full bg-paper-raised border border-rule text-ink text-[12.5px] font-semibold py-2 px-4 cursor-pointer hover:bg-surface-ground"
            >
              Nuevo mensaje
            </button>
          </div>

          {pickerOpen && (
            <div className="max-w-[320px]">
              <UserPicker
                label="Buscar persona"
                placeholder="Nombre o correo"
                value={null}
                onChange={handlePickUser}
              />
            </div>
          )}

          <div className="flex items-center gap-2 border-b border-rule">
            <button
              type="button"
              onClick={() => goToTab("mensajes")}
              className={`px-3 py-2 text-[13px] font-semibold cursor-pointer border-b-2 -mb-px ${
                tab === "mensajes" ? "text-ink border-accent-primary" : "text-ink-soft border-transparent"
              }`}
            >
              Mensajes
            </button>
            <button
              type="button"
              onClick={() => goToTab("solicitudes")}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold cursor-pointer border-b-2 -mb-px ${
                tab === "solicitudes" ? "text-ink border-accent-primary" : "text-ink-soft border-transparent"
              }`}
            >
              Solicitudes
              {pendingRequests > 0 && (
                <span className="min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingRequests > 9 ? "9+" : pendingRequests}
                </span>
              )}
            </button>
          </div>

          {isLoading && <p className="text-[13px] text-ink-soft">Cargando…</p>}
          {!isLoading && conversations?.length === 0 && (
            <p className="text-[13px] text-ink-soft">{emptyMessage}</p>
          )}

          <div className="flex flex-col gap-2">
            {conversations?.map((conversation) => (
              <ConversationRow key={conversation.id} conversation={conversation} />
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

export default Mensajes;
