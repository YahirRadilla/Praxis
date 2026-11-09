import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { FileText, LinkSimple, Trash } from "@phosphor-icons/react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProjectRow from "../components/ProjectRow";
import ConfirmDialog from "../components/ConfirmDialog";
import BannerUploader from "../components/BannerUploader";
import FileDropzone from "../components/FileDropzone";
import FieldValidationHint from "../components/FieldValidationHint";
import AttachmentPreviewGrid from "../components/evidence/AttachmentPreviewGrid";
import ImageLightbox from "../components/evidence/ImageLightbox";
import PdfViewerDialog from "../components/evidence/PdfViewerDialog";
import { useAuth } from "../context/AuthContext";
import {
  useAddClassGroupResource,
  useClassGroup,
  useClassGroupMembers,
  useDeleteClassGroupResource,
  useJoinClassGroup,
  useLeaveClassGroup,
  useRemoveClassGroupMember,
  useUpdateClassGroup,
} from "../hooks/useClassGroups";
import { useRequiredFieldHint } from "../hooks/useRequiredFieldHint";
import { getErrorMessage, uploadFileRequest } from "../services/api";
import type { Evidence } from "../types/activity";
import { classGroupCounts, CLASS_GROUP_BAND_COLOR } from "../utils/classGroup";
import { isPreviewableImage, isPreviewablePdf, toPreviewEvidence } from "../utils/mimePreview";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";
import { pluralize } from "../utils/text";

function formatResourceSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX");
}

// Same concurrency-safe pattern as ProjectDetail.tsx's EvidenceAttachment: each
// file gets its own direct `uploadFileRequest` call instead of sharing one
// `useUploadFile()` mutation hook instance, so concurrent uploads don't drop
// earlier files' callbacks.
type ResourceAttachment = {
  localId: string;
  file: File;
  status: "uploading" | "done" | "error";
  result?: { url: string; fileName: string; mimeType: string; sizeBytes: number };
};

let resourceLocalIdSeq = 0;
function nextResourceLocalId(): string {
  resourceLocalIdSeq += 1;
  return `resource-attachment-${resourceLocalIdSeq}`;
}

function GrupoClaseDetalle() {
  const { id } = useParams();
  const classGroupId = Number(id);
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();

  const { data: classGroup, isLoading, isError, refetch } = useClassGroup(classGroupId);
  const updateClassGroup = useUpdateClassGroup(classGroupId);
  const createResource = useAddClassGroupResource(classGroupId);
  const deleteResource = useDeleteClassGroupResource(classGroupId);
  const joinClassGroup = useJoinClassGroup(classGroupId);
  const leaveClassGroup = useLeaveClassGroup(classGroupId);
  const removeMember = useRemoveClassGroupMember(classGroupId);
  const { hintMessage, validateRequired, dismissHint, isHintVisible } = useRequiredFieldHint();

  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [showAddResourceForm, setShowAddResourceForm] = useState(false);
  const [resourceMode, setResourceMode] = useState<"link" | "file">("link");
  const [resourceLabel, setResourceLabel] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceFiles, setResourceFiles] = useState<ResourceAttachment[]>([]);
  const [resourceLightboxIndex, setResourceLightboxIndex] = useState<number | null>(null);
  const [resourcePdfPreview, setResourcePdfPreview] = useState<Evidence | null>(null);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ userId: number; name: string } | null>(null);

  const isOwner = classGroup?.viewer?.isOwner ?? false;
  const isMember = classGroup?.viewer?.isMember ?? false;
  const canJoin = classGroup?.viewer?.canJoin ?? false;

  const { data: members } = useClassGroupMembers(isOwner ? classGroupId : NaN);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <p className="flex-1 flex items-center justify-center text-ink-soft">Cargando…</p>
      </div>
    );
  }

  if (isError || !classGroup) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <p className="text-ink-soft">
            No se pudo cargar este grupo de clase. Es posible que no exista o que haya ocurrido un error.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer border border-rule text-ink hover:bg-surface-ground"
            >
              Reintentar
            </button>
            <Link
              to="/grupos-clase"
              className={`rounded-full text-[13px] font-bold py-2.5 px-5 ${PRIMARY_BUTTON}`}
            >
              Volver a grupos de clase
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const counts = classGroupCounts(classGroup);
  const imageResources = (classGroup.resources ?? []).filter(
    (r) => r.type === "FILE" && isPreviewableImage(r.mimeType),
  );

  function handleStartEdit() {
    setEditName(classGroup!.name);
    setEditDescription(classGroup!.description);
    setShowEditForm(true);
  }

  function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (
      !validateRequired([
        { key: "editName", value: editName },
        { key: "editDescription", value: editDescription },
      ])
    )
      return;
    updateClassGroup.mutate(
      { name: editName.trim(), description: editDescription.trim() },
      {
        onSuccess: () => {
          toast.success("Grupo de clase actualizado");
          setShowEditForm(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo actualizar el grupo.")),
      },
    );
  }

  function uploadResourceFile(localId: string, file: File) {
    uploadFileRequest(token!, file).then(
      (result) => {
        setResourceFiles((prev) =>
          prev.map((a) => (a.localId === localId ? { ...a, status: "done", result } : a)),
        );
      },
      (error) => {
        setResourceFiles((prev) =>
          prev.map((a) => (a.localId === localId ? { ...a, status: "error" } : a)),
        );
        toast.error(getErrorMessage(error, `No se pudo subir "${file.name}".`));
      },
    );
  }

  function handleResourceFilesSelected(files: File[]) {
    const accepted = files.map((file) => ({
      localId: nextResourceLocalId(),
      file,
      status: "uploading" as const,
    }));
    setResourceFiles((prev) => [...prev, ...accepted]);
    accepted.forEach((a) => uploadResourceFile(a.localId, a.file));
  }

  function removeResourceFile(localId: string) {
    setResourceFiles((prev) => prev.filter((a) => a.localId !== localId));
  }

  function retryResourceFile(localId: string) {
    const attachment = resourceFiles.find((a) => a.localId === localId);
    if (!attachment) return;
    setResourceFiles((prev) =>
      prev.map((a) => (a.localId === localId ? { ...a, status: "uploading" } : a)),
    );
    uploadResourceFile(localId, attachment.file);
  }

  function handleAddResource(e: FormEvent) {
    e.preventDefault();
    const doneFiles = resourceFiles.filter((a) => a.status === "done" && a.result);
    if (resourceMode === "link") {
      if (
        !validateRequired([
          { key: "resourceLabel", value: resourceLabel },
          { key: "resourceUrl", value: resourceUrl },
        ])
      )
        return;
    } else if (doneFiles.length === 0) {
      return;
    }

    if (resourceMode === "file") {
      const requests = doneFiles.map((a) => {
        const label =
          doneFiles.length === 1
            ? resourceLabel.trim() || a.result!.fileName
            : resourceLabel.trim()
              ? `${resourceLabel.trim()} — ${a.result!.fileName}`
              : a.result!.fileName;
        return new Promise<void>((resolve) => {
          createResource.mutate(
            {
              type: "FILE",
              url: a.result!.url,
              fileName: a.result!.fileName,
              mimeType: a.result!.mimeType,
              sizeBytes: a.result!.sizeBytes,
              label,
              description: resourceDescription.trim() || undefined,
            },
            {
              onError: (error) => toast.error(getErrorMessage(error, `No se pudo agregar "${a.result!.fileName}".`)),
              onSettled: () => resolve(),
            },
          );
        });
      });
      Promise.all(requests).then(() => {
        toast.success(doneFiles.length > 1 ? "Documentos agregados" : "Documento agregado");
        setResourceLabel("");
        setResourceDescription("");
        setResourceUrl("");
        setResourceFiles([]);
        setResourceMode("link");
        setShowAddResourceForm(false);
      });
      return;
    }

    createResource.mutate(
      {
        type: "LINK",
        url: resourceUrl.trim(),
        label: resourceLabel.trim(),
        description: resourceDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Documento agregado");
          setResourceLabel("");
          setResourceDescription("");
          setResourceUrl("");
          setResourceFiles([]);
          setResourceMode("link");
          setShowAddResourceForm(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo agregar el documento.")),
      },
    );
  }

  function handleDeleteResource(resourceId: number) {
    deleteResource.mutate(resourceId, {
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo eliminar el documento.")),
    });
  }

  function handleJoin() {
    joinClassGroup.mutate(undefined, {
      onSuccess: () => toast.success("Te uniste al grupo de clase"),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo unir al grupo de clase.")),
    });
  }

  function handleLeave() {
    leaveClassGroup.mutate(undefined, {
      onSuccess: () => {
        toast.success("Saliste del grupo de clase");
        setShowLeaveConfirm(false);
      },
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo salir del grupo de clase.")),
    });
  }

  function handleRemoveMember() {
    if (!removeTarget) return;
    removeMember.mutate(removeTarget.userId, {
      onSuccess: () => {
        toast.success("Miembro eliminado del grupo");
        setRemoveTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo quitar al miembro.")),
    });
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="px-4 md:px-8 pt-6 max-w-[1100px] mx-auto w-full">
        <div
          style={{ background: `linear-gradient(135deg, ${CLASS_GROUP_BAND_COLOR}, ${CLASS_GROUP_BAND_COLOR}CC)` }}
          className="relative rounded-2xl overflow-hidden h-[180px] shadow-[0_1px_2px_rgba(20,22,26,0.04),0_20px_44px_-20px_rgba(20,22,26,0.35)]"
        >
          {classGroup.bannerUrl && (
            <img src={classGroup.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {isOwner && (
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <BannerUploader
                hasBanner={!!classGroup.bannerUrl}
                onSave={(bannerUrl) => updateClassGroup.mutateAsync({ bannerUrl })}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8 px-4 md:px-8 py-7 items-stretch md:items-start max-w-[1100px] mx-auto w-full">
        <section className="flex-1 min-w-0 flex flex-col gap-6">
          <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-4 ${CARD_SHADOW}`}>
            {showEditForm ? (
              <form onSubmit={handleSaveEdit} noValidate className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-semibold text-ink">Nombre del grupo</span>
                  <div className="relative">
                    <input
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value);
                        if (isHintVisible("editName")) dismissHint();
                      }}
                      className="w-full border border-rule rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-accent-primary focus:outline-offset-1"
                    />
                    <FieldValidationHint message={hintMessage} show={isHintVisible("editName")} />
                  </div>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-semibold text-ink">Descripción</span>
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={editDescription}
                      onChange={(e) => {
                        setEditDescription(e.target.value);
                        if (isHintVisible("editDescription")) dismissHint();
                      }}
                      className="w-full border border-rule rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink resize-none focus:outline-2 focus:outline-accent-primary focus:outline-offset-1"
                    />
                    <FieldValidationHint message={hintMessage} show={isHintVisible("editDescription")} />
                  </div>
                </label>
                <div className="flex items-center gap-2 self-end">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="rounded-full text-[12.5px] font-bold py-2.5 px-4 cursor-pointer border border-rule text-ink hover:bg-surface-ground"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updateClassGroup.isPending}
                    className={`rounded-full text-[12.5px] font-bold py-2.5 px-4 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
                  >
                    {updateClassGroup.isPending ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h1 className="font-heading text-[22px] font-bold text-ink m-0">{classGroup.name}</h1>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-[12.5px] font-semibold text-accent-primary cursor-pointer shrink-0"
                    >
                      Editar
                    </button>
                  )}
                </div>
                <p className="text-[14px] text-ink-soft leading-relaxed m-0 whitespace-pre-line">
                  {classGroup.description}
                </p>
                {!isOwner && !isMember && (
                  <p className="text-[12.5px] text-ink-faint m-0">
                    {counts.resources} {pluralize(counts.resources, "documento", "documentos")} ·{" "}
                    {counts.members} {pluralize(counts.members, "alumno", "alumnos")} ·{" "}
                    {counts.projects} {pluralize(counts.projects, "proyecto", "proyectos")}
                  </p>
                )}
              </>
            )}
          </div>

          {!isOwner && !isMember ? (
            <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-3 items-start ${CARD_SHADOW}`}>
              <p className="text-[13px] text-ink-soft m-0">
                Únete a este grupo para ver los documentos y proyectos.
              </p>
              {canJoin && (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={joinClassGroup.isPending}
                  className={`rounded-full text-[12.5px] font-bold py-2.5 px-5 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
                >
                  {joinClassGroup.isPending ? "Uniéndote…" : "Unirme"}
                </button>
              )}
              {!isAuthenticated && (
                <p className="text-[12px] text-ink-faint m-0">Inicia sesión para unirte a este grupo.</p>
              )}
            </div>
          ) : (
            <>
              <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-3 ${CARD_SHADOW}`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-[16px] font-bold text-ink m-0">Documentos</h2>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowAddResourceForm((v) => !v)}
                      className={`rounded-full text-[12.5px] font-bold py-2 px-4 cursor-pointer shrink-0 ${PRIMARY_BUTTON}`}
                    >
                      Agregar documento
                    </button>
                  )}
                </div>

                {showAddResourceForm && (
                  <form
                    onSubmit={handleAddResource}
                    noValidate
                    className="flex flex-col gap-2 bg-paper border border-rule rounded-xl p-4"
                  >
                    <div className="relative">
                      <input
                        value={resourceLabel}
                        onChange={(e) => {
                          setResourceLabel(e.target.value);
                          if (isHintVisible("resourceLabel")) dismissHint();
                        }}
                        placeholder="Título (ej. Rúbrica de evaluación)"
                        className="w-full border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
                      />
                      <FieldValidationHint message={hintMessage} show={isHintVisible("resourceLabel")} />
                    </div>
                    <textarea
                      rows={2}
                      value={resourceDescription}
                      onChange={(e) => setResourceDescription(e.target.value)}
                      placeholder="Descripción (opcional)"
                      className="border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink resize-none"
                    />
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1 self-start rounded-full bg-surface-ground p-1">
                        <button
                          type="button"
                          onClick={() => setResourceMode("link")}
                          className={`rounded-full text-[11.5px] font-semibold py-1 px-3 cursor-pointer ${
                            resourceMode === "link" ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft"
                          }`}
                        >
                          Agregar enlace
                        </button>
                        <button
                          type="button"
                          onClick={() => setResourceMode("file")}
                          className={`rounded-full text-[11.5px] font-semibold py-1 px-3 cursor-pointer ${
                            resourceMode === "file" ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft"
                          }`}
                        >
                          Subir archivo
                        </button>
                      </div>

                      {resourceMode === "link" ? (
                        <div className="relative">
                          <input
                            type="url"
                            value={resourceUrl}
                            onChange={(e) => {
                              setResourceUrl(e.target.value);
                              if (isHintVisible("resourceUrl")) dismissHint();
                            }}
                            placeholder="https://…"
                            className="w-full border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
                          />
                          <FieldValidationHint message={hintMessage} show={isHintVisible("resourceUrl")} />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <FileDropzone
                            multiple
                            hint="Cualquier tipo de archivo · Máximo 10MB"
                            onFilesSelected={handleResourceFilesSelected}
                          />
                          <AttachmentPreviewGrid
                            attachments={resourceFiles}
                            onRemove={removeResourceFile}
                            onRetry={retryResourceFile}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={
                        createResource.isPending ||
                        resourceFiles.some((a) => a.status === "uploading") ||
                        (resourceMode === "file" && resourceFiles.filter((a) => a.status === "done").length === 0)
                      }
                      className={`self-start rounded-full text-[12px] font-bold px-4 py-2 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
                    >
                      {createResource.isPending ? "Guardando…" : "Agregar"}
                    </button>
                  </form>
                )}

                <div className="flex flex-col gap-2">
                  {classGroup.resources?.length === 0 && (
                    <p className="text-[13px] text-ink-soft m-0">Todavía no hay documentos.</p>
                  )}
                  {classGroup.resources?.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center gap-2 border border-rule rounded-lg px-3 py-2"
                    >
                      {resource.type === "FILE" ? (
                        <FileText size={18} className="text-ink-faint shrink-0" />
                      ) : (
                        <LinkSimple size={18} className="text-ink-faint shrink-0" />
                      )}
                      {resource.type === "FILE" && isPreviewableImage(resource.mimeType) ? (
                        <button
                          type="button"
                          onClick={() =>
                            setResourceLightboxIndex(imageResources.findIndex((r) => r.id === resource.id))
                          }
                          className="flex-1 min-w-0 text-left hover:underline"
                        >
                          <p className="text-[12.5px] font-semibold text-ink m-0 truncate">{resource.label}</p>
                          {resource.description && (
                            <p className="text-[11px] text-ink-faint m-0 truncate">{resource.description}</p>
                          )}
                        </button>
                      ) : resource.type === "FILE" && isPreviewablePdf(resource.mimeType) ? (
                        <button
                          type="button"
                          onClick={() => setResourcePdfPreview(toPreviewEvidence(resource))}
                          className="flex-1 min-w-0 text-left hover:underline"
                        >
                          <p className="text-[12.5px] font-semibold text-ink m-0 truncate">{resource.label}</p>
                          {resource.description && (
                            <p className="text-[11px] text-ink-faint m-0 truncate">{resource.description}</p>
                          )}
                        </button>
                      ) : (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 min-w-0 hover:underline"
                        >
                          <p className="text-[12.5px] font-semibold text-ink m-0 truncate">{resource.label}</p>
                          {resource.description && (
                            <p className="text-[11px] text-ink-faint m-0 truncate">{resource.description}</p>
                          )}
                        </a>
                      )}
                      {resource.sizeBytes != null && (
                        <span className="text-[11px] text-ink-faint shrink-0">
                          {formatResourceSize(resource.sizeBytes)}
                        </span>
                      )}
                      {/* Only the owning teacher can add/delete documents — a
                          plain member sees a read-only list. */}
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeleteResource(resource.id)}
                          className="text-ink-faint hover:text-danger cursor-pointer shrink-0"
                          aria-label="Borrar documento"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-4 ${CARD_SHADOW}`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-[16px] font-bold text-ink m-0">Proyectos de este grupo</h2>
                  <button
                    type="button"
                    onClick={() => navigate(`/proyectos/nuevo?classGroupId=${classGroup.id}`)}
                    className={`rounded-full text-[12.5px] font-bold py-2 px-4 cursor-pointer shrink-0 ${PRIMARY_BUTTON}`}
                  >
                    Crear proyecto para este grupo
                  </button>
                </div>
                {classGroup.projects?.length === 0 ? (
                  <p className="text-[13px] text-ink-soft m-0">
                    Todavía no hay proyectos vinculados a este grupo.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {classGroup.projects?.map((project) => (
                      <ProjectRow key={project.id} project={project} />
                    ))}
                  </div>
                )}
              </div>

              {isOwner && (
                <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-3 ${CARD_SHADOW}`}>
                  <h2 className="font-heading text-[16px] font-bold text-ink m-0">Miembros</h2>
                  <div className="flex flex-col gap-2">
                    {members?.length === 0 && (
                      <p className="text-[13px] text-ink-soft m-0">Todavía no hay miembros.</p>
                    )}
                    {members?.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 border border-rule rounded-lg px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-semibold text-ink m-0 truncate">{member.user.name}</p>
                          <p className="text-[11px] text-ink-faint m-0 truncate">
                            {member.user.email} · se unió el {formatDate(member.joinedAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRemoveTarget({ userId: member.userId, name: member.user.name })}
                          className="text-[12px] font-semibold text-ink-faint hover:text-danger cursor-pointer shrink-0"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isMember && !isOwner && (
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="self-start text-[12.5px] font-semibold text-ink-faint hover:text-danger cursor-pointer"
                >
                  Salir del grupo
                </button>
              )}
            </>
          )}
        </section>

        <aside className="w-full md:w-[260px] md:shrink-0 flex flex-col gap-5">
          <div className={`bg-paper-raised border border-rule rounded-xl p-4 flex flex-col gap-3 ${CARD_SHADOW}`}>
            <h3 className="text-[12.5px] font-semibold text-ink m-0">Docente</h3>
            <p className="text-[13px] font-semibold text-ink m-0">{classGroup.teacher.name}</p>
            {classGroup.teacher.email && (
              <p className="text-[11.5px] text-ink-faint m-0 truncate">{classGroup.teacher.email}</p>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        danger
        title="Salir del grupo"
        description="Dejarás de ver los documentos y proyectos de este grupo. Puedes volver a unirte después."
        confirmLabel={leaveClassGroup.isPending ? "Procesando…" : "Confirmar"}
        onConfirm={handleLeave}
        onClose={() => setShowLeaveConfirm(false)}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        danger
        title="Quitar del grupo"
        description={removeTarget ? `¿Quitar a "${removeTarget.name}" de este grupo de clase?` : undefined}
        confirmLabel={removeMember.isPending ? "Quitando…" : "Quitar"}
        onConfirm={handleRemoveMember}
        onClose={() => setRemoveTarget(null)}
      />

      <ImageLightbox
        images={imageResources.map(toPreviewEvidence)}
        index={resourceLightboxIndex}
        onClose={() => setResourceLightboxIndex(null)}
        onIndexChange={setResourceLightboxIndex}
      />
      <PdfViewerDialog pdf={resourcePdfPreview} onClose={() => setResourcePdfPreview(null)} />

      <Footer />
    </div>
  );
}

export default GrupoClaseDetalle;
