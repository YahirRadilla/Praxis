import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import {
  useConversationWithUser,
  useMarkConversationRead,
  useRespondConversation,
  useSendMessage,
} from "../hooks/useConversations";
import { getErrorMessage } from "../services/api";
import { timeAgo } from "../utils/text";
import { PRIMARY_BUTTON } from "../utils/statusStyles";

const MAX_MESSAGE_LENGTH = 2000;

function Conversacion() {
  const { userId } = useParams();
  const otherUserId = Number(userId);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useConversationWithUser(otherUserId);
  const sendMessage = useSendMessage();
  const respond = useRespondConversation();
  const markRead = useMarkConversationRead();

  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversation = data?.conversation ?? null;
  const otherUser = data?.otherUser;
  const messages = conversation?.messages ?? [];
  const newestMessageId = messages[messages.length - 1]?.id ?? null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [newestMessageId]);

  useEffect(() => {
    if (!conversation) return;
    const hasUnreadFromOther = conversation.messages.some(
      (message) => message.senderId !== user?.id && !message.read,
    );
    if (hasUnreadFromOther) {
      markRead.mutate(conversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestMessageId]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate(
      { recipientId: otherUserId, text: trimmed },
      {
        onSuccess: () => setText(""),
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo enviar el mensaje.")),
      },
    );
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleRespond(status: "ACCEPTED" | "REJECTED") {
    if (!conversation) return;
    respond.mutate(
      { id: conversation.id, status },
      {
        onSuccess: () => {
          if (status === "REJECTED") navigate("/mensajes?tab=solicitudes");
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo resolver la solicitud.")),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col bg-surface-ground">
        <Navbar />
        <p className="flex-1 flex items-center justify-center text-ink-soft">Cargando…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-dvh flex flex-col bg-surface-ground">
        <Navbar />
        <p className="flex-1 flex items-center justify-center text-ink-soft">Usuario no encontrado.</p>
      </div>
    );
  }

  const isPendingAsRecipient = conversation?.status === "PENDING" && !conversation.viewerIsInitiator;
  const showCompose = !isPendingAsRecipient;
  const composeDisabled = conversation?.status === "REJECTED" && conversation.viewerIsInitiator;

  let note: string | null = null;
  if (conversation?.status === "PENDING" && conversation.viewerIsInitiator) {
    note = `Solicitud enviada. ${otherUser?.name} verá tus mensajes cuando la acepte.`;
  } else if (conversation?.status === "REJECTED" && conversation.viewerIsInitiator) {
    note = "Esta persona no aceptó tu solicitud de mensaje.";
  } else if (conversation?.status === "REJECTED" && !conversation.viewerIsInitiator) {
    note = "Rechazaste esta solicitud; si respondes, la conversación se abrirá.";
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-[760px] mx-auto w-full px-4 md:px-0 py-6 gap-3 min-h-0">
        <div className="flex items-center gap-3 pb-3 border-b border-rule">
          <Link to="/mensajes" className="text-[13px] font-semibold text-ink-soft hover:text-ink">
            ← Mensajes
          </Link>
          <Link
            to={`/usuarios/${otherUser?.id}`}
            className="font-heading text-[15px] font-bold text-ink hover:underline"
          >
            {otherUser?.name}
          </Link>
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scroll-thin flex flex-col gap-2 py-2">
          {messages.map((message) => {
            const isMine = message.senderId === user?.id;
            return (
              <div
                key={message.id}
                className={`max-w-[75%] flex flex-col gap-0.5 ${isMine ? "self-end items-end" : "self-start items-start"}`}
              >
                <p
                  className={`m-0 rounded-2xl px-3.5 py-2 text-[13px] leading-snug whitespace-pre-wrap break-words ${
                    isMine
                      ? "bg-accent-primary text-paper rounded-br-md"
                      : "bg-paper border border-rule text-ink rounded-bl-md"
                  }`}
                >
                  {message.text}
                </p>
                <span className="text-[10.5px] text-ink-faint px-1">{timeAgo(message.createdAt)}</span>
              </div>
            );
          })}
        </div>

        {isPendingAsRecipient && (
          <div className="flex flex-col gap-2.5 bg-paper-raised border border-rule rounded-xl p-3.5">
            <p className="text-[13px] text-ink m-0">{otherUser?.name} quiere enviarte un mensaje</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRespond("REJECTED")}
                disabled={respond.isPending}
                className="bg-paper border border-rule rounded-full px-3.5 py-2 text-[12px] font-semibold text-ink-soft hover:bg-surface-ground disabled:opacity-60"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => handleRespond("ACCEPTED")}
                disabled={respond.isPending}
                className={`rounded-full px-3.5 py-2 text-[12px] font-bold disabled:opacity-60 ${PRIMARY_BUTTON}`}
              >
                Aceptar
              </button>
            </div>
          </div>
        )}

        {note && <p className="text-[12px] text-ink-faint m-0">{note}</p>}

        {showCompose && (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={composeDisabled || sendMessage.isPending}
              placeholder="Escribe un mensaje…"
              rows={1}
              className="flex-1 resize-none border border-rule rounded-xl bg-paper px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-offset-1 focus:outline-accent-primary disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={composeDisabled || sendMessage.isPending || !text.trim()}
              className={`rounded-full px-4 py-2.5 text-[12.5px] font-bold disabled:opacity-60 ${PRIMARY_BUTTON}`}
            >
              Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Conversacion;
