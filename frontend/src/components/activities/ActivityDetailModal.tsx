import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  CaretDown,
  CaretRight,
  CheckCircle,
  ChatCircle,
  ClockCounterClockwise,
  DownloadSimple,
  File,
  FilePdf,
  Image,
  Paperclip,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import type { ActivityPriority, ChecklistItem, ChecklistSection } from "../../types/activity";
import type { TeamMember } from "../../types/team";
import { useAuth } from "../../context/AuthContext";
import DatePicker from "../DatePicker";
import ConfirmDialog from "../ConfirmDialog";
import Skeleton from "../Skeleton";
import {
  useActivityDetail,
  useCreateActivityAttachment,
  useCreateActivityComment,
  useCreateChecklistItem,
  useCreateChecklistSection,
  useDeleteActivity,
  useDeleteActivityAttachment,
  useDeleteActivityComment,
  useDeleteChecklistItem,
  useDeleteChecklistSection,
  useUpdateActivity,
  useUpdateChecklistItem,
  useUpdateChecklistSection,
} from "../../hooks/useActivities";
import { useUploadFile } from "../../hooks/useProgressUpdates";
import { getErrorMessage } from "../../services/api";
import { ACTIVITY_PRIORITY, ACTIVITY_STATUS, CARD_SHADOW, PRIMARY_BUTTON } from "../../utils/statusStyles";
import { avatarColorFor } from "../../utils/avatarColor";
import AssigneeSelect from "./AssigneeSelect";
import LabelPicker from "./LabelPicker";

const PRIORITY_OPTIONS: ActivityPriority[] = ["BAJA", "MEDIA", "ALTA"];

type DeleteTarget =
  | { kind: "activity" }
  | { kind: "section"; id: number; name: string }
  | { kind: "attachment"; id: number; fileName: string };

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image size={18} className="text-ink-faint shrink-0" />;
  if (mimeType === "application/pdf") return <FilePdf size={18} className="text-ink-faint shrink-0" />;
  return <File size={18} className="text-ink-faint shrink-0" />;
}

interface ActivityDetailModalProps {
  projectId: number;
  activityId: number;
  team: TeamMember[];
  isMember: boolean;
  isEvaluator: boolean;
  isProjectOwner: boolean;
  archived: boolean;
  onClose: () => void;
}

function ActivityDetailModal({
  projectId,
  activityId,
  team,
  isMember,
  isEvaluator,
  isProjectOwner,
  archived,
  onClose,
}: ActivityDetailModalProps) {
  const { user } = useAuth();
  const { data: activity, isLoading, isError } = useActivityDetail(projectId, activityId);
  const updateActivity = useUpdateActivity(projectId, activityId);
  const deleteActivity = useDeleteActivity(projectId);
  const createSection = useCreateChecklistSection(projectId, activityId);
  const updateSection = useUpdateChecklistSection(projectId, activityId);
  const deleteSection = useDeleteChecklistSection(projectId, activityId);
  const createItem = useCreateChecklistItem(projectId, activityId);
  const updateItem = useUpdateChecklistItem(projectId, activityId);
  const deleteItem = useDeleteChecklistItem(projectId, activityId);
  const createComment = useCreateActivityComment(projectId, activityId);
  const deleteComment = useDeleteActivityComment(projectId, activityId);
  const createAttachment = useCreateActivityAttachment(projectId, activityId);
  const deleteAttachment = useDeleteActivityAttachment(projectId, activityId);
  const uploadFile = useUploadFile();

  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [commentText, setCommentText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [addingItemFor, setAddingItemFor] = useState<number | "none" | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    if (!activity) return;
    setTitleDraft(activity.title);
    setDescriptionDraft(activity.description ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id]);

  // WU-11 / decisión 10-8: `readOnly` locks every board field (title,
  // description, checklist, due date, assignees, labels, attachments,
  // delete) for anyone who isn't an accepted member, and for everyone once
  // the project is archived — this includes a confirmed evaluator, who is
  // never a member.
  const readOnly = !isMember || archived;
  // A confirmed evaluator who isn't a member can still comment while the
  // project isn't archived (they can read everything, post their own
  // comment, but never move/edit/attach/check). Archiving locks comments
  // for everyone, members and evaluators alike.
  const canComment = !archived && (isMember || isEvaluator);
  const canDelete = !readOnly && (isProjectOwner || activity?.ownerId === user?.id);

  function handleClose() {
    onClose();
  }

  function commit(payload: Parameters<typeof updateActivity.mutate>[0]) {
    updateActivity.mutate(payload, {
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo guardar el cambio.")),
    });
  }

  function handleTitleBlur() {
    if (!activity) return;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === activity.title) {
      setTitleDraft(activity.title);
      return;
    }
    commit({ title: trimmed });
  }

  function handleDescriptionBlur() {
    if (!activity) return;
    if (descriptionDraft === (activity.description ?? "")) return;
    commit({ description: descriptionDraft });
  }

  function handleDeleteActivity() {
    if (!activity) return;
    setDeleteTarget({ kind: "activity" });
  }

  function handleConfirmDelete() {
    if (!deleteTarget || !activity) return;
    if (deleteTarget.kind === "activity") {
      deleteActivity.mutate(activity.id, {
        onSuccess: () => {
          toast.success("Actividad eliminada");
          onClose();
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo eliminar la actividad.")),
      });
    } else if (deleteTarget.kind === "section") {
      deleteSection.mutate(deleteTarget.id, {
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo borrar la sección.")),
      });
    } else if (deleteTarget.kind === "attachment") {
      deleteAttachment.mutate(deleteTarget.id, {
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo borrar el adjunto.")),
      });
    }
    setDeleteTarget(null);
  }

  function handleAddSection(e: FormEvent) {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    createSection.mutate(
      { name: newSectionName.trim() },
      {
        onSuccess: () => {
          setNewSectionName("");
          setAddingSection(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo crear la sección.")),
      },
    );
  }

  function handleAddItem(e: FormEvent, sectionId: number | undefined) {
    e.preventDefault();
    if (!newItemText.trim()) return;
    createItem.mutate(
      { text: newItemText.trim(), sectionId },
      {
        onSuccess: () => {
          setNewItemText("");
          setAddingItemFor(null);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo crear el pendiente.")),
      },
    );
  }

  function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    createComment.mutate(
      { text: commentText.trim() },
      {
        onSuccess: () => setCommentText(""),
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo publicar el comentario.")),
      },
    );
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile.mutate(file, {
      onSuccess: (uploaded) =>
        createAttachment.mutate(
          {
            url: uploaded.url,
            fileName: uploaded.fileName,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
          },
          { onError: (error) => toast.error(getErrorMessage(error, "No se pudo adjuntar el archivo.")) },
        ),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo subir el archivo.")),
    });
    e.target.value = "";
  }

  const checklistTotal =
    (activity?.checklistItems.length ?? 0) +
    (activity?.checklistSections.reduce((sum, s) => sum + s.items.length, 0) ?? 0);
  const checklistDone =
    (activity?.checklistItems.filter((i) => i.done).length ?? 0) +
    (activity?.checklistSections.reduce((sum, s) => sum + s.items.filter((i) => i.done).length, 0) ?? 0);

  return (
    <>
    <Dialog open onClose={handleClose} transition className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-ink/40 transition-opacity duration-150 motion-reduce:transition-none data-closed:opacity-0"
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className={`w-full max-w-[720px] max-h-[88vh] bg-paper-raised rounded-2xl border border-rule flex flex-col overflow-hidden transition duration-150 motion-reduce:transition-none data-closed:opacity-0 data-closed:scale-95 ${CARD_SHADOW}`}
          >
            {isLoading && (
              <div className="flex flex-col gap-6 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 flex flex-col gap-2.5">
                    <Skeleton height={20} width="55%" />
                    <div className="flex items-center gap-2">
                      <Skeleton height={22} width={76} shape="text" />
                      <Skeleton height={22} width={64} shape="text" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton height={11} width={88} />
                  <Skeleton height={56} />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton height={34} width={140} />
                  <Skeleton height={28} width={28} shape="circle" />
                  <Skeleton height={28} width={28} shape="circle" />
                  <Skeleton height={34} width={110} />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton height={11} width={100} />
                  <Skeleton height={16} width="92%" />
                  <Skeleton height={16} width="78%" />
                  <Skeleton height={16} width="85%" />
                </div>
              </div>
            )}

            {isError && (
              <div className="p-8 flex flex-col items-center gap-3 text-center">
                <p className="text-[13px] text-ink-soft m-0">No se pudo cargar esta actividad.</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className={`rounded-full text-[12.5px] font-bold px-4 py-2 cursor-pointer ${PRIMARY_BUTTON}`}
                >
                  Cerrar
                </button>
              </div>
            )}

            {activity && (
              <>
                {/* Header */}
                <div className="flex items-start gap-3 p-5 border-b border-rule shrink-0">
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <DialogTitle as="div" className="sr-only">
                      {activity.title}
                    </DialogTitle>
                    <input
                      type="text"
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={handleTitleBlur}
                      disabled={readOnly}
                      className="font-heading text-[18px] font-bold text-ink bg-transparent border-none p-0 w-full focus:outline-none disabled:cursor-default"
                      aria-label="Título de la actividad"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        style={{ backgroundColor: ACTIVITY_STATUS[activity.status]?.bg, color: ACTIVITY_STATUS[activity.status]?.fg }}
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      >
                        {ACTIVITY_STATUS[activity.status]?.label ?? activity.status}
                      </span>
                      <select
                        value={activity.priority}
                        onChange={(e) => commit({ priority: e.target.value as ActivityPriority })}
                        disabled={readOnly}
                        aria-label="Prioridad"
                        style={{ color: ACTIVITY_PRIORITY[activity.priority]?.fg }}
                        className="border border-rule rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold disabled:opacity-70"
                      >
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {ACTIVITY_PRIORITY[p]?.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Cerrar"
                    className="text-ink-faint hover:text-ink cursor-pointer shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
                  {/* Description */}
                  <section className="flex flex-col gap-1.5">
                    <h3 className="text-[11.5px] font-semibold text-ink-faint uppercase m-0">Descripción</h3>
                    <textarea
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      onBlur={handleDescriptionBlur}
                      disabled={readOnly}
                      rows={3}
                      placeholder={readOnly ? "Sin descripción." : "Agrega una descripción…"}
                      className="border border-rule rounded-lg bg-paper px-3 py-2 text-[13px] text-ink resize-none disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default"
                    />
                  </section>

                  {/* Metadata */}
                  <section className="flex items-center gap-2 flex-wrap">
                    <DatePicker
                      value={toDateInputValue(activity.dueDate)}
                      onChange={(value) => value && commit({ dueDate: value })}
                      disabled={readOnly}
                      aria-label="Fecha límite"
                      className="text-[12.5px]"
                    />
                    {readOnly ? (
                      <AvatarListReadOnly team={team} assignees={activity.assignees} />
                    ) : (
                      <AssigneeSelect
                        team={team}
                        value={activity.assignees.map((a) => a.userId)}
                        onChange={(ids) => commit({ assigneeIds: ids })}
                      />
                    )}
                    <LabelPicker
                      projectId={projectId}
                      value={activity.labels.map((l) => l.labelId)}
                      onChange={(ids) => commit({ labelIds: ids })}
                      disabled={readOnly}
                    />
                  </section>

                  {/* Checklist */}
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11.5px] font-semibold text-ink-faint uppercase m-0">
                        Pendientes {checklistTotal > 0 && `(${checklistDone}/${checklistTotal})`}
                      </h3>
                    </div>

                    {checklistTotal === 0 && (
                      <p className="text-[12.5px] text-ink-faint m-0">Sin pendientes.</p>
                    )}

                    {activity.checklistSections.map((section) => (
                      <ChecklistSectionBlock
                        key={section.id}
                        section={section}
                        readOnly={readOnly}
                        onRename={(name) => updateSection.mutate({ sectionId: section.id, name })}
                        onDeleteSection={() => setDeleteTarget({ kind: "section", id: section.id, name: section.name })}
                        onToggleItem={(itemId, done) => updateItem.mutate({ itemId, done })}
                        onUpdateItem={(itemId, payload) => updateItem.mutate({ itemId, ...payload })}
                        onDeleteItem={(itemId) => deleteItem.mutate(itemId)}
                        adding={addingItemFor === section.id}
                        onStartAdd={() => setAddingItemFor(section.id)}
                        onCancelAdd={() => {
                          setAddingItemFor(null);
                          setNewItemText("");
                        }}
                        newItemText={newItemText}
                        onNewItemTextChange={setNewItemText}
                        onSubmitAdd={(e) => handleAddItem(e, section.id)}
                      />
                    ))}

                    <UnsectionedChecklistBlock
                      items={activity.checklistItems}
                      readOnly={readOnly}
                      onToggleItem={(itemId, done) => updateItem.mutate({ itemId, done })}
                      onUpdateItem={(itemId, payload) => updateItem.mutate({ itemId, ...payload })}
                      onDeleteItem={(itemId) => deleteItem.mutate(itemId)}
                      adding={addingItemFor === "none"}
                      onStartAdd={() => setAddingItemFor("none")}
                      onCancelAdd={() => {
                        setAddingItemFor(null);
                        setNewItemText("");
                      }}
                      newItemText={newItemText}
                      onNewItemTextChange={setNewItemText}
                      onSubmitAdd={(e) => handleAddItem(e, undefined)}
                    />

                    {!readOnly &&
                      (addingSection ? (
                        <form onSubmit={handleAddSection} className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            required
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            placeholder="Nombre de la sección"
                            className="flex-1 border border-rule rounded-lg bg-paper px-3 py-1.5 text-[12.5px] text-ink"
                          />
                          <button
                            type="submit"
                            className="text-[12px] font-bold text-accent-primary cursor-pointer shrink-0"
                          >
                            Crear
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingSection(false)}
                            aria-label="Cancelar"
                            className="text-ink-faint hover:text-ink cursor-pointer shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddingSection(true)}
                          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft hover:text-ink cursor-pointer self-start"
                        >
                          <Plus size={14} />
                          Nueva sección
                        </button>
                      ))}
                  </section>

                  {/* Attachments */}
                  <section className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11.5px] font-semibold text-ink-faint uppercase m-0 flex items-center gap-1.5">
                        <Paperclip size={13} /> Adjuntos
                      </h3>
                      {!readOnly && (
                        <label className="text-[12px] font-semibold text-accent-primary cursor-pointer">
                          {uploadFile.isPending ? "Subiendo…" : "Subir archivo"}
                          <input
                            type="file"
                            onChange={handleFileSelected}
                            disabled={uploadFile.isPending}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                    {activity.attachments.length === 0 && (
                      <p className="text-[12.5px] text-ink-faint m-0">Sin adjuntos.</p>
                    )}
                    <div className="flex flex-col gap-1.5">
                      {activity.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 border border-rule rounded-lg px-3 py-2"
                        >
                          <AttachmentIcon mimeType={att.mimeType} />
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 min-w-0 text-[12.5px] text-ink font-medium truncate hover:underline"
                          >
                            {att.fileName}
                          </a>
                          <span className="text-[11px] text-ink-faint shrink-0">{formatSize(att.sizeBytes)}</span>
                          <a href={att.url} target="_blank" rel="noreferrer" className="text-ink-faint hover:text-ink shrink-0">
                            <DownloadSimple size={14} />
                          </a>
                          {/* Matches the backend's exact rule
                              (activity.service.ts's deleteActivityAttachment):
                              only the uploader or the project owner can
                              delete, never any team member (WU-09). */}
                          {!readOnly && (att.uploaderId === user?.id || isProjectOwner) && (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({ kind: "attachment", id: att.id, fileName: att.fileName })
                              }
                              className="text-ink-faint hover:text-danger cursor-pointer shrink-0"
                              aria-label="Borrar adjunto"
                            >
                              <Trash size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Comments */}
                  <section className="flex flex-col gap-2">
                    <h3 className="text-[11.5px] font-semibold text-ink-faint uppercase m-0 flex items-center gap-1.5">
                      <ChatCircle size={13} /> Comentarios
                    </h3>
                    <div className="flex flex-col gap-3">
                      {activity.comments.map((c) => (
                        <div key={c.id} className="flex gap-2.5">
                          <span
                            style={{ backgroundColor: avatarColorFor(c.author.id) }}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9.5px] font-bold shrink-0 mt-0.5"
                          >
                            {c.author.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] text-ink-soft leading-snug m-0">
                              <span className="font-semibold text-ink">{c.author.name}</span> {c.text}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-ink-faint">{formatDateTime(c.createdAt)}</span>
                              {c.authorId === user?.id && canComment && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteComment.mutate(c.id, {
                                      onError: (error) =>
                                        toast.error(getErrorMessage(error, "No se pudo borrar el comentario.")),
                                    })
                                  }
                                  className="text-[11px] text-ink-faint hover:text-danger cursor-pointer"
                                >
                                  Borrar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {activity.comments.length === 0 && (
                        <p className="text-[12.5px] text-ink-faint m-0">Todavía no hay comentarios.</p>
                      )}
                    </div>
                    {canComment && (
                      <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Escribe un comentario…"
                          className="flex-1 border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
                        />
                        <button
                          type="submit"
                          disabled={createComment.isPending || !commentText.trim()}
                          className={`rounded-full text-[12px] font-bold px-4 py-2 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
                        >
                          Comentar
                        </button>
                      </form>
                    )}
                  </section>

                  {/* History */}
                  <section className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowHistory((v) => !v)}
                      className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-faint uppercase cursor-pointer"
                    >
                      {showHistory ? <CaretDown size={13} /> : <CaretRight size={13} />}
                      <ClockCounterClockwise size={13} /> Historial
                    </button>
                    {showHistory && (
                      <div className="flex flex-col gap-2">
                        {activity.events.map((ev) => (
                          <div key={ev.id} className="flex items-center gap-2 text-[12px] text-ink-soft">
                            <CheckCircle size={13} className="text-ink-faint shrink-0" />
                            <span>
                              <span className="font-semibold text-ink">{ev.actor.name}</span>{" "}
                              {ev.fromStatus
                                ? `movió de ${ACTIVITY_STATUS[ev.fromStatus]?.label ?? ev.fromStatus} a ${ACTIVITY_STATUS[ev.toStatus]?.label ?? ev.toStatus}`
                                : `creó la actividad en ${ACTIVITY_STATUS[ev.toStatus]?.label ?? ev.toStatus}`}
                            </span>
                            <span className="text-ink-faint">· {formatDateTime(ev.createdAt)}</span>
                          </div>
                        ))}
                        {activity.events.length === 0 && (
                          <p className="text-[12px] text-ink-faint m-0">Sin historial todavía.</p>
                        )}
                      </div>
                    )}
                  </section>
                </div>

                {/* Footer */}
                {canDelete && (
                  <div className="flex items-center justify-end p-4 border-t border-rule shrink-0">
                    <button
                      type="button"
                      onClick={handleDeleteActivity}
                      className="flex items-center gap-1.5 text-[12.5px] font-semibold cursor-pointer text-danger"
                    >
                      <Trash size={14} />
                      Borrar actividad
                    </button>
                  </div>
                )}
              </>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
    <ConfirmDialog
      open={deleteTarget !== null}
      danger
      title={
        deleteTarget?.kind === "activity"
          ? "Borrar actividad"
          : deleteTarget?.kind === "section"
            ? "Borrar sección"
            : "Borrar adjunto"
      }
      description={
        deleteTarget?.kind === "activity"
          ? "¿Borrar esta actividad? Esta acción no se puede deshacer."
          : deleteTarget?.kind === "section"
            ? `¿Borrar la sección "${deleteTarget.name}" y todos sus pendientes? Esta acción no se puede deshacer.`
            : deleteTarget?.kind === "attachment"
              ? `¿Borrar "${deleteTarget.fileName}"? Esta acción no se puede deshacer.`
              : undefined
      }
      confirmLabel="Borrar"
      onConfirm={handleConfirmDelete}
      onClose={() => setDeleteTarget(null)}
    />
    </>
  );
}

function AvatarListReadOnly({
  team,
  assignees,
}: {
  team: TeamMember[];
  assignees: { userId: number }[];
}) {
  const names = assignees
    .map((a) => team.find((m) => m.id === a.userId)?.name)
    .filter((n): n is string => !!n);
  if (names.length === 0) return <span className="text-[12.5px] text-ink-faint">Sin responsables</span>;
  return <span className="text-[12.5px] text-ink-soft">{names.join(", ")}</span>;
}

interface ChecklistSectionBlockProps {
  section: ChecklistSection;
  readOnly: boolean;
  onRename: (name: string) => void;
  onDeleteSection: () => void;
  onToggleItem: (itemId: number, done: boolean) => void;
  onUpdateItem: (itemId: number, payload: { text?: string; note?: string }) => void;
  onDeleteItem: (itemId: number) => void;
  adding: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  newItemText: string;
  onNewItemTextChange: (value: string) => void;
  onSubmitAdd: (e: FormEvent) => void;
}

function ChecklistSectionBlock({
  section,
  readOnly,
  onRename,
  onDeleteSection,
  onToggleItem,
  onUpdateItem,
  onDeleteItem,
  adding,
  onStartAdd,
  onCancelAdd,
  newItemText,
  onNewItemTextChange,
  onSubmitAdd,
}: ChecklistSectionBlockProps) {
  const [nameDraft, setNameDraft] = useState(section.name);

  useEffect(() => {
    setNameDraft(section.name);
  }, [section.id, section.name]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => nameDraft.trim() && nameDraft !== section.name && onRename(nameDraft.trim())}
          disabled={readOnly}
          className="flex-1 min-w-0 text-[12.5px] font-semibold text-ink bg-transparent border-none p-0 focus:outline-none disabled:cursor-default"
        />
        {!readOnly && (
          <button
            type="button"
            onClick={onDeleteSection}
            className="text-ink-faint hover:text-danger cursor-pointer shrink-0"
            aria-label="Borrar sección"
          >
            <Trash size={13} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1 pl-1">
        {section.items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            readOnly={readOnly}
            onToggle={(done) => onToggleItem(item.id, done)}
            onUpdate={(payload) => onUpdateItem(item.id, payload)}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
      </div>
      {!readOnly && <AddItemControl adding={adding} onStart={onStartAdd} onCancel={onCancelAdd} text={newItemText} onTextChange={onNewItemTextChange} onSubmit={onSubmitAdd} />}
    </div>
  );
}

function UnsectionedChecklistBlock({
  items,
  readOnly,
  onToggleItem,
  onUpdateItem,
  onDeleteItem,
  adding,
  onStartAdd,
  onCancelAdd,
  newItemText,
  onNewItemTextChange,
  onSubmitAdd,
}: {
  items: ChecklistItem[];
  readOnly: boolean;
  onToggleItem: (itemId: number, done: boolean) => void;
  onUpdateItem: (itemId: number, payload: { text?: string; note?: string }) => void;
  onDeleteItem: (itemId: number) => void;
  adding: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  newItemText: string;
  onNewItemTextChange: (value: string) => void;
  onSubmitAdd: (e: FormEvent) => void;
}) {
  if (items.length === 0 && readOnly) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {items.length > 0 && (
        <span className="text-[12.5px] font-semibold text-ink-faint">Sin sección</span>
      )}
      <div className="flex flex-col gap-1 pl-1">
        {items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            readOnly={readOnly}
            onToggle={(done) => onToggleItem(item.id, done)}
            onUpdate={(payload) => onUpdateItem(item.id, payload)}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
      </div>
      {!readOnly && <AddItemControl adding={adding} onStart={onStartAdd} onCancel={onCancelAdd} text={newItemText} onTextChange={onNewItemTextChange} onSubmit={onSubmitAdd} />}
    </div>
  );
}

function AddItemControl({
  adding,
  onStart,
  onCancel,
  text,
  onTextChange,
  onSubmit,
}: {
  adding: boolean;
  onStart: () => void;
  onCancel: () => void;
  text: string;
  onTextChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  if (!adding) {
    return (
      <button
        type="button"
        onClick={onStart}
        className="flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink cursor-pointer self-start pl-1"
      >
        <Plus size={13} />
        Agregar pendiente
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 pl-1">
      <input
        type="text"
        autoFocus
        required
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Nuevo pendiente"
        className="flex-1 border border-rule rounded-lg bg-paper px-2.5 py-1.5 text-[12px] text-ink"
      />
      <button type="submit" className="text-[11.5px] font-bold text-accent-primary cursor-pointer shrink-0">
        Agregar
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancelar"
        className="text-ink-faint hover:text-ink cursor-pointer shrink-0"
      >
        <X size={13} />
      </button>
    </form>
  );
}

function ChecklistItemRow({
  item,
  readOnly,
  onToggle,
  onUpdate,
  onDelete,
}: {
  item: ChecklistItem;
  readOnly: boolean;
  onToggle: (done: boolean) => void;
  onUpdate: (payload: { text?: string; note?: string }) => void;
  onDelete: () => void;
}) {
  const [textDraft, setTextDraft] = useState(item.text);
  const [noteDraft, setNoteDraft] = useState(item.note ?? "");

  useEffect(() => {
    setTextDraft(item.text);
    setNoteDraft(item.note ?? "");
  }, [item.id, item.text, item.note]);

  return (
    <div className="flex items-start gap-2 py-0.5">
      <input
        type="checkbox"
        checked={item.done}
        onChange={(e) => onToggle(e.target.checked)}
        disabled={readOnly}
        aria-label={item.done ? `Marcar "${item.text}" como pendiente` : `Marcar "${item.text}" como completado`}
        className="accent-accent-primary w-[14px] h-[14px] mt-[3px] cursor-pointer shrink-0 disabled:cursor-default"
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <input
          type="text"
          value={textDraft}
          onChange={(e) => setTextDraft(e.target.value)}
          onBlur={() => textDraft.trim() && textDraft !== item.text && onUpdate({ text: textDraft.trim() })}
          disabled={readOnly}
          className={`text-[12.5px] text-ink bg-transparent border-none p-0 w-full focus:outline-none disabled:cursor-default ${item.done ? "line-through text-ink-faint" : ""}`}
        />
        {(noteDraft || !readOnly) && (
          <input
            type="text"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => noteDraft !== (item.note ?? "") && onUpdate({ note: noteDraft })}
            disabled={readOnly}
            placeholder={readOnly ? "" : "Nota (opcional)"}
            className="text-[11px] text-ink-faint bg-transparent border-none p-0 w-full focus:outline-none disabled:cursor-default"
          />
        )}
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={onDelete}
          className="text-ink-faint hover:text-danger cursor-pointer shrink-0 mt-0.5"
          aria-label="Borrar pendiente"
        >
          <Trash size={12} />
        </button>
      )}
    </div>
  );
}

export default ActivityDetailModal;
