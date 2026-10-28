import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "../components/Navbar";
import ProjectHeaderBand from "../components/ProjectHeaderBand";
import ProgressUpdateCard from "../components/ProgressUpdateCard";
import TeamMemberRow from "../components/team/TeamMemberRow";
import TeamRequestRow from "../components/team/TeamRequestRow";
import UserPicker from "../components/UserPicker";
import AvatarStack from "../components/AvatarStack";
import ActivitiesTab from "../components/activities/ActivitiesTab";
import ActivityDetailModal from "../components/activities/ActivityDetailModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { Lateral, LateralCard } from "../components/LayoutPrimitives";
import type { ProjectPersonRef } from "../types/project";
import type { DictamenVerdict } from "../types/dictamen";
import { useAuth } from "../context/AuthContext";
import {
  useArchiveProject,
  useProject,
  useSavedProjects,
  useSaveProject,
  useUnarchiveProject,
  useUnsaveProject,
  useUpdateProject,
} from "../hooks/useProjects";
import {
  useCreateProjectResource,
  useDeleteProjectResource,
  useProjectResources,
} from "../hooks/useProjectResources";
import {
  useTeam,
  usePendingRequests,
  useRequestToJoin,
  useRespondToRequest,
  useInviteToTeam,
  useLeaveTeam,
  useRemoveTeamMember,
} from "../hooks/useTeam";
import { useActivities } from "../hooks/useActivities";
import { useProgressUpdates, useCreateProgressUpdate, useUploadFile } from "../hooks/useProgressUpdates";
import { useDictamenes, useCreateDictamen } from "../hooks/useDictamenes";
import { getErrorMessage } from "../services/api";
import StatusPill from "../components/StatusPill";
import {
  CARD_SHADOW,
  PRIMARY_BUTTON,
  PROJECT_VISIBILITY,
  PROJECT_ARCHIVED,
  ACTIVITY_STATUS,
  DICTAMEN_VERDICT,
} from "../utils/statusStyles";
import { pluralize, timeAgo } from "../utils/text";
import { avatarColorFor } from "../utils/avatarColor";
import { CheckCircle, Circle, FileText, LinkSimple, Trash, WarningCircle } from "@phosphor-icons/react";

type TabKey = "info" | "actividades" | "equipo" | "anexos";

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Información" },
  { key: "actividades", label: "Actividades" },
  { key: "equipo", label: "Equipo" },
  { key: "anexos", label: "Anexos" },
];

function isTabKey(value: string | null): value is TabKey {
  return value === "info" || value === "actividades" || value === "equipo" || value === "anexos";
}

function formatResourceSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProjectDetail() {
  const { id, activityId } = useParams();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTabState] = useState<TabKey>(isTabKey(initialTab) ? initialTab : "info");

  function setTab(next: TabKey) {
    setTabState(next);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params);
  }

  const { data: project, isLoading, isError, refetch } = useProject(projectId);
  const { data: team } = useTeam(projectId);
  // Only the owner ever gets a non-403 response here (WU-09): without
  // `enabled`, every non-owner visit fired this request anyway just to
  // receive a 403.
  const { data: pending } = usePendingRequests(projectId, project?.viewer?.isOwner ?? false);
  // WU-11: the activity board (and its "Progreso de actividades" summary on
  // Información) is team + evaluator only, even on a PUBLIC project
  // (decisión 10). Without `enabled`, every outsider visit fired this
  // request anyway just to receive a 404 from `assertProjectInsider`.
  const canSeeBoard = project?.viewer?.canSeeBoard ?? false;
  const { data: activities } = useActivities(projectId, { enabled: canSeeBoard });
  const { data: progressUpdates } = useProgressUpdates(projectId);
  const { data: dictamenes } = useDictamenes(projectId, { enabled: canSeeBoard });

  const archiveProject = useArchiveProject(projectId);
  const unarchiveProject = useUnarchiveProject(projectId);
  const requestToJoin = useRequestToJoin(projectId);
  const respondToRequest = useRespondToRequest(projectId);
  const inviteToTeam = useInviteToTeam(projectId);
  const leaveTeam = useLeaveTeam(projectId);
  const removeTeamMember = useRemoveTeamMember(projectId);
  const createProgressUpdate = useCreateProgressUpdate(projectId);
  const uploadFile = useUploadFile();
  const createDictamen = useCreateDictamen(projectId);
  const { data: savedProjects } = useSavedProjects();
  const saveProject = useSaveProject();
  const unsaveProject = useUnsaveProject();
  const updateProject = useUpdateProject(projectId);

  const [progressText, setProgressText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceMode, setEvidenceMode] = useState<"link" | "file">("link");
  const [uploadedFile, setUploadedFile] = useState<{ url: string; fileName: string } | null>(null);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [inviteUser, setInviteUser] = useState<ProjectPersonRef | null>(null);
  const [teacherInviteUser, setTeacherInviteUser] = useState<ProjectPersonRef | null>(null);
  const [organizationInviteUser, setOrganizationInviteUser] = useState<ProjectPersonRef | null>(null);
  const [dictamenVerdict, setDictamenVerdict] = useState<DictamenVerdict>("APPROVED");
  const [dictamenComment, setDictamenComment] = useState("");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  // WU-09: "Salir del equipo" (accepted member) / "Dejar de evaluar"
  // (confirmed evaluator) both call `DELETE /team/me`; only the dialog copy
  // differs, so one piece of state covers both.
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // Owner-only "Quitar": a member or an evaluator, identified by userId/name
  // for the confirm dialog's copy.
  const [removeTarget, setRemoveTarget] = useState<{ userId: number; name: string } | null>(null);

  // --- Anexos tab (extendedInfo writeup + resources list) --------------------
  const [extendedInfoDraft, setExtendedInfoDraft] = useState("");
  const { data: resources } = useProjectResources(projectId, tab === "anexos");
  const createResource = useCreateProjectResource(projectId);
  const deleteResource = useDeleteProjectResource(projectId);
  const [showAddResourceForm, setShowAddResourceForm] = useState(false);
  const [resourceMode, setResourceMode] = useState<"link" | "file">("link");
  const [resourceLabel, setResourceLabel] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceFile, setResourceFile] = useState<{
    url: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  } | null>(null);

  useEffect(() => {
    if (project) setExtendedInfoDraft(project.extendedInfo ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.extendedInfo]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <p className="flex-1 flex items-center justify-center text-ink-soft">Cargando…</p>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <p className="text-ink-soft">No se pudo cargar este proyecto. Es posible que no exista o que haya ocurrido un error.</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer border border-rule text-ink hover:bg-surface-ground"
            >
              Reintentar
            </button>
            <Link
              to="/explorar"
              className={`rounded-full text-[13px] font-bold py-2.5 px-5 ${PRIMARY_BUTTON}`}
            >
              Volver a explorar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // WU-09: permissions come from the backend-computed `viewer` object
  // (WU-07) instead of being re-derived locally. `viewer` is only absent for
  // an anonymous requester, in which case every permission below is false.
  const viewer = project.viewer;
  const isOwner = viewer?.isOwner ?? false;
  const isMember = viewer?.isMember ?? false;
  const isEvaluator = viewer?.isEvaluator ?? false;
  const canSubmitDictamen = viewer?.canSubmitDictamen ?? false;
  const doneCount = activities?.filter((a) => a.status === "DONE").length ?? 0;
  // WU-11: reused from the top-level `useActivities` gate; kept here so the
  // tab list, the Información summary card, and the deep-link modal all
  // agree on the same board-visibility rule (decisión 10).
  const isSaved = !!savedProjects?.some((p) => p.id === project.id);
  // WU-11: the "Actividades" tab doesn't exist at all for an outsider, even
  // on a PUBLIC project (decisión 10). If the active tab was "actividades"
  // (e.g. restored from `?tab=actividades`) and the viewer lost/never had
  // board access, fall back to "info" instead of rendering an empty panel.
  const visibleTabs = TABS.filter((t) => t.key !== "actividades" || canSeeBoard);
  const effectiveTab = tab === "actividades" && !canSeeBoard ? "info" : tab;

  function handleArchive() {
    archiveProject.mutate(undefined, {
      onSuccess: () => {
        toast.success("Proyecto archivado");
        setShowArchiveConfirm(false);
      },
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo archivar.")),
    });
  }

  function handleUnarchive() {
    unarchiveProject.mutate(undefined, {
      onSuccess: () => toast.success("Proyecto desarchivado"),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo desarchivar.")),
    });
  }

  function handleToggleVisibility() {
    if (!project) return;
    const next = project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    updateProject.mutate(
      { visibility: next },
      {
        onSuccess: () =>
          toast.success(next === "PUBLIC" ? "Proyecto ahora es público" : "Proyecto ahora es privado"),
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo cambiar la visibilidad.")),
      },
    );
  }

  function handleRequestToJoin() {
    requestToJoin.mutate(undefined, {
      onSuccess: () => toast.success("Solicitud enviada"),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo enviar la solicitud.")),
    });
  }

  function handleInvite() {
    if (!inviteUser) return;
    inviteToTeam.mutate(
      { userId: inviteUser.id },
      {
        onSuccess: () => {
          toast.success("Invitación enviada");
          setInviteUser(null);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo enviar la invitación.")),
      },
    );
  }

  function handleInviteEvaluator(slot: "teacher" | "organization") {
    const candidate = slot === "teacher" ? teacherInviteUser : organizationInviteUser;
    if (!candidate) return;
    inviteToTeam.mutate(
      { userId: candidate.id, purpose: "EVALUATOR" },
      {
        onSuccess: () => {
          toast.success("Invitación de evaluador enviada");
          // No local echo needed: useInviteToTeam invalidates the project
          // query, and `project.pendingEvaluatorInvites` (WU-08 gap fix)
          // reflects it on the next render, surviving a reload too.
          if (slot === "teacher") setTeacherInviteUser(null);
          else setOrganizationInviteUser(null);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo enviar la invitación.")),
      },
    );
  }

  function handleLeaveTeam() {
    leaveTeam.mutate(undefined, {
      onSuccess: () => {
        toast.success(isEvaluator ? "Dejaste de evaluar este proyecto" : "Saliste del equipo");
        setShowLeaveConfirm(false);
      },
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo completar la acción.")),
    });
  }

  function handleRemoveTeamMember() {
    if (!removeTarget) return;
    removeTeamMember.mutate(removeTarget.userId, {
      onSuccess: () => {
        toast.success(`${removeTarget.name} fue quitado del proyecto`);
        setRemoveTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo completar la acción.")),
    });
  }

  // One evaluator slot (docente/organización): linked / invitation pending /
  // empty (plan WU-08). The pending state now reads `project.pendingEvaluatorInvites`
  // (WU-08 gap fix: backend-computed, owner-only, survives a reload) instead
  // of session-only local state.
  function renderEvaluatorSlot(
    title: string,
    accountType: "TEACHER" | "ORGANIZATION",
    linked: ProjectPersonRef | null,
    slot: "teacher" | "organization",
    pickerValue: ProjectPersonRef | null,
    onPickerChange: (user: ProjectPersonRef | null) => void,
  ) {
    const pendingInvite = project?.pendingEvaluatorInvites?.[slot] ?? null;
    const isLinkedToMe = isEvaluator && linked?.id === user?.id;
    return (
      <div className={`bg-paper-raised border border-rule rounded-xl p-3.5 flex flex-col gap-2 ${CARD_SHADOW}`}>
        <span className="text-[11.5px] font-semibold text-ink-faint uppercase tracking-wide">{title}</span>
        {linked ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] text-ink m-0">
              Vinculado: <span className="font-semibold">{linked.name}</span>
            </p>
            {isLinkedToMe ? (
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(true)}
                className="text-[11.5px] font-semibold text-ink-faint hover:text-danger cursor-pointer shrink-0"
              >
                Dejar de evaluar
              </button>
            ) : (
              isOwner && (
                <button
                  type="button"
                  onClick={() => setRemoveTarget({ userId: linked.id, name: linked.name })}
                  className="text-[11.5px] font-semibold text-ink-faint hover:text-danger cursor-pointer shrink-0"
                >
                  Quitar
                </button>
              )
            )}
          </div>
        ) : pendingInvite ? (
          <p className="text-[13px] text-ink-soft m-0">
            Invitación pendiente: <span className="font-semibold">{pendingInvite.name}</span>
          </p>
        ) : (
          <p className="text-[13px] text-ink-faint m-0">Sin vincular todavía.</p>
        )}

        {isOwner && !linked && !pendingInvite && (
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <UserPicker
                accountType={accountType}
                label="Buscar persona"
                placeholder={accountType === "TEACHER" ? "Nombre o correo del docente" : "Nombre o correo de la organización"}
                value={pickerValue}
                onChange={onPickerChange}
              />
            </div>
            <button
              type="button"
              onClick={() => handleInviteEvaluator(slot)}
              disabled={!pickerValue || inviteToTeam.isPending}
              className={`rounded-full text-[12.5px] font-bold py-3 px-4 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
            >
              {inviteToTeam.isPending ? "Invitando…" : "Invitar"}
            </button>
          </div>
        )}
      </div>
    );
  }

  function handleRespond(requestId: number, status: "ACCEPTED" | "REJECTED") {
    respondToRequest.mutate(
      { requestId, status },
      {
        onSuccess: () => toast.success(status === "ACCEPTED" ? "Solicitud aceptada" : "Solicitud rechazada"),
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo resolver la solicitud.")),
      },
    );
  }

  function handleCreateProgressUpdate(e: FormEvent) {
    e.preventDefault();
    createProgressUpdate.mutate(
      {
        text: progressText,
        postedToFeed: true,
        evidence: uploadedFile
          ? [{ type: "FILE", url: uploadedFile.url, fileName: uploadedFile.fileName }]
          : evidenceUrl
            ? [{ type: "LINK", url: evidenceUrl }]
            : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Publicado");
          setProgressText("");
          setEvidenceUrl("");
          setUploadedFile(null);
          setEvidenceMode("link");
          setShowProgressForm(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo publicar.")),
      },
    );
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile.mutate(file, {
      onSuccess: (data) => setUploadedFile(data),
      onError: (error) => {
        toast.error(getErrorMessage(error, "No se pudo subir el archivo."));
        setUploadedFile(null);
        e.target.value = "";
      },
    });
  }

  function handleCreateDictamen(e: FormEvent) {
    e.preventDefault();
    createDictamen.mutate(
      { verdict: dictamenVerdict, comment: dictamenComment },
      {
        onSuccess: () => {
          toast.success("Dictamen enviado");
          setDictamenVerdict("APPROVED");
          setDictamenComment("");
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo enviar el dictamen.")),
      },
    );
  }

  function handleToggleSave() {
    if (isSaved) {
      unsaveProject.mutate(projectId, {
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo quitar de guardados.")),
      });
    } else {
      saveProject.mutate(projectId, {
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo guardar el proyecto.")),
      });
    }
  }

  function handleSaveExtendedInfo() {
    updateProject.mutate(
      { extendedInfo: extendedInfoDraft.trim() === "" ? null : extendedInfoDraft },
      {
        onSuccess: () => toast.success("Información guardada"),
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo guardar la información.")),
      },
    );
  }

  function handleResourceFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile.mutate(file, {
      onSuccess: (data) => setResourceFile(data),
      onError: (error) => {
        toast.error(getErrorMessage(error, "No se pudo subir el archivo."));
        setResourceFile(null);
        e.target.value = "";
      },
    });
  }

  function handleAddResource(e: FormEvent) {
    e.preventDefault();
    if (!resourceLabel.trim()) return;
    if (resourceMode === "file" && !resourceFile) return;

    const payload =
      resourceMode === "file" && resourceFile
        ? {
            type: "FILE" as const,
            url: resourceFile.url,
            fileName: resourceFile.fileName,
            mimeType: resourceFile.mimeType,
            sizeBytes: resourceFile.sizeBytes,
            label: resourceLabel.trim(),
            description: resourceDescription.trim() || undefined,
          }
        : {
            type: "LINK" as const,
            url: resourceUrl.trim(),
            label: resourceLabel.trim(),
            description: resourceDescription.trim() || undefined,
          };

    createResource.mutate(payload, {
      onSuccess: () => {
        toast.success("Anexo agregado");
        setResourceLabel("");
        setResourceDescription("");
        setResourceUrl("");
        setResourceFile(null);
        setResourceMode("link");
        setShowAddResourceForm(false);
      },
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo agregar el anexo.")),
    });
  }

  function handleDeleteResource(resourceId: number) {
    deleteResource.mutate(resourceId, {
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo eliminar el anexo.")),
    });
  }

  const headerActions = (
    <>
      {isOwner && (
        <button
          type="button"
          onClick={() => navigate(`/proyectos/${project.id}/editar`)}
          className="rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer border border-rule text-ink hover:bg-surface-ground"
        >
          Editar proyecto
        </button>
      )}
      {isOwner && (
        <button
          type="button"
          onClick={handleToggleVisibility}
          disabled={updateProject.isPending}
          className="rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer border border-rule text-ink hover:bg-surface-ground disabled:opacity-60"
        >
          {project.visibility === "PUBLIC" ? "Hacer privado" : "Hacer público"}
        </button>
      )}
      {isOwner && !project.archived && (
        <button
          type="button"
          onClick={() => setShowArchiveConfirm(true)}
          disabled={archiveProject.isPending}
          className={`rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
        >
          {archiveProject.isPending ? "Archivando…" : "Archivar"}
        </button>
      )}
      {isOwner && project.archived && (
        <button
          type="button"
          onClick={handleUnarchive}
          disabled={unarchiveProject.isPending}
          className={`rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
        >
          {unarchiveProject.isPending ? "Desarchivando…" : "Desarchivar"}
        </button>
      )}
      {/* WU-09: driven entirely by `viewer.canRequestToJoin`/`pendingRequest`
          instead of local `!isOwner && !isMember`. */}
      {viewer?.canRequestToJoin && (
        <button
          type="button"
          onClick={handleRequestToJoin}
          disabled={requestToJoin.isPending}
          className={`rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
        >
          {requestToJoin.isPending ? "Enviando…" : "Solicitar participación"}
        </button>
      )}
      {viewer?.pendingRequest?.initiatedBy === "REQUESTER" && (
        <button
          type="button"
          disabled
          className="rounded-full text-[13px] font-bold py-2.5 px-5 border border-rule text-ink-faint cursor-default"
        >
          Solicitud enviada
        </button>
      )}
      {viewer?.pendingRequest?.initiatedBy === "OWNER" && (
        <Link
          to="/solicitudes-recibidas"
          className={`rounded-full text-[13px] font-bold py-2.5 px-5 ${PRIMARY_BUTTON}`}
        >
          Tienes una invitación → Ver
        </Link>
      )}
      {isAuthenticated && !isOwner && (
        <button
          type="button"
          onClick={handleToggleSave}
          disabled={saveProject.isPending || unsaveProject.isPending}
          className="rounded-full bg-paper-raised border border-rule text-ink text-[13px] font-semibold py-2.5 px-5 cursor-pointer hover:bg-surface-ground disabled:opacity-60"
        >
          {isSaved ? "Guardado" : "Guardar"}
        </button>
      )}
    </>
  );

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />
      <ProjectHeaderBand project={project} actions={headerActions} />

      <div className="px-8 pt-4 pb-1 flex items-center gap-3">
        <StatusPill status={PROJECT_VISIBILITY[project.visibility]} />
        {project.archived && <StatusPill status={PROJECT_ARCHIVED} />}
        <h2 className="font-heading text-[18px] font-bold text-ink m-0">{project.name}</h2>
      </div>

      {project.archived && (
        <div className="px-8 pt-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rule bg-paper-raised px-4 py-3">
            <p className="text-[13px] text-ink-soft m-0">
              Este proyecto está archivado. Es de solo lectura.
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={handleUnarchive}
                disabled={unarchiveProject.isPending}
                className="rounded-full text-[12.5px] font-bold py-2 px-4 cursor-pointer border border-rule text-ink hover:bg-surface-ground disabled:opacity-60 shrink-0"
              >
                {unarchiveProject.isPending ? "Desarchivando…" : "Desarchivar"}
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="bg-paper-raised border-b border-rule px-8 flex items-center gap-[26px] mt-2">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`py-3 text-[13.5px] cursor-pointer border-b-2 -mb-px ${
              effectiveTab === t.key ? "font-bold text-ink border-ink" : "text-ink-soft border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 flex flex-col md:flex-row gap-8 px-8 py-7 items-stretch md:items-start">
        {effectiveTab === "info" && (
          <>
            <section className="flex-1 min-w-0 flex flex-col gap-6">
              <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-4 ${CARD_SHADOW}`}>
                <h2 className="font-heading text-[16px] font-bold text-ink m-0">Acerca del proyecto</h2>
                <p className="text-[14px] text-ink-soft leading-relaxed m-0">{project.description}</p>
                <div>
                  <h3 className="text-[12.5px] font-semibold text-ink mb-1">Problemática</h3>
                  <p className="text-[13.5px] text-ink-soft leading-relaxed m-0">{project.problemStatement}</p>
                </div>
                <div>
                  <h3 className="text-[12.5px] font-semibold text-ink mb-1">Objetivos</h3>
                  <p className="text-[13.5px] text-ink-soft leading-relaxed m-0">{project.objectives}</p>
                </div>
              </div>

              {canSeeBoard && (
                <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-3 ${CARD_SHADOW}`}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-[16px] font-bold text-ink m-0">Progreso de actividades</h2>
                    <span className="text-[13px] font-bold text-accent-primary">
                      {activities?.length ? Math.round((doneCount / activities.length) * 100) : 0}% completo
                    </span>
                  </div>

                  {activities?.length === 0 && (
                    <p className="text-[13px] text-ink-soft m-0">Todavía no hay actividades cargadas.</p>
                  )}

                  <div className="flex flex-col">
                    {activities?.map((activity) => {
                      const style = ACTIVITY_STATUS[activity.status] ?? ACTIVITY_STATUS.PENDING;
                      const subtitle =
                        activity.status === "DONE"
                          ? `Completada por ${activity.owner.name}`
                          : activity.status === "OVERDUE"
                            ? `Venció el ${new Date(activity.dueDate).toLocaleDateString("es-MX")}`
                            : activity.status === "TO_VALIDATE"
                              ? "Esperando validación"
                              : activity.status === "IN_PROGRESS"
                                ? `En curso · vence ${new Date(activity.dueDate).toLocaleDateString("es-MX")}`
                                : `Programada para ${new Date(activity.dueDate).toLocaleDateString("es-MX")}`;
                      return (
                        <div
                          key={activity.id}
                          className={`flex items-center gap-3 py-3 border-b border-rule last:border-0 ${
                            activity.status === "IN_PROGRESS" ? "bg-surface-ground -mx-2 px-2 rounded-lg" : ""
                          }`}
                        >
                          {activity.status === "DONE" ? (
                            <CheckCircle size={22} weight="fill" color={style.fg} className="shrink-0" />
                          ) : activity.status === "OVERDUE" ? (
                            <WarningCircle size={22} weight="fill" color={style.fg} className="shrink-0" />
                          ) : (
                            <Circle
                              size={22}
                              weight={activity.status === "IN_PROGRESS" ? "fill" : "regular"}
                              color={activity.status === "IN_PROGRESS" ? style.fg : "var(--color-ink-faint)"}
                              className="shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-semibold text-ink m-0 truncate">{activity.title}</p>
                            <p className="text-[11.5px] text-ink-faint m-0">{subtitle}</p>
                          </div>
                          <StatusPill status={style} className="shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-3 ${CARD_SHADOW}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-[16px] font-bold text-ink m-0">Feed del proyecto</h2>
                    <p className="text-[12px] text-ink-faint mt-0.5 mb-0">
                      Comparte fotos, enlaces o reflexiones con tu equipo. No es una validación formal.
                    </p>
                  </div>
                  {isMember && (
                    <button
                      type="button"
                      onClick={() => setShowProgressForm((v) => !v)}
                      className={`rounded-full text-[12.5px] font-bold py-2 px-4 cursor-pointer shrink-0 ${PRIMARY_BUTTON}`}
                    >
                      Compartir algo
                    </button>
                  )}
                </div>

                {showProgressForm && (
                  <form
                    onSubmit={handleCreateProgressUpdate}
                    className="flex flex-col gap-2 bg-paper border border-rule rounded-xl p-4"
                  >
                    <textarea
                      required
                      rows={2}
                      value={progressText}
                      onChange={(e) => setProgressText(e.target.value)}
                      placeholder="Comparte algo sobre el proyecto: una foto, un enlace, una reflexión."
                      className="border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink resize-none"
                    />
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1 self-start rounded-full bg-surface-ground p-1">
                        <button
                          type="button"
                          onClick={() => setEvidenceMode("link")}
                          className={`rounded-full text-[11.5px] font-semibold py-1 px-3 cursor-pointer ${
                            evidenceMode === "link" ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft"
                          }`}
                        >
                          Agregar un link
                        </button>
                        <button
                          type="button"
                          onClick={() => setEvidenceMode("file")}
                          className={`rounded-full text-[11.5px] font-semibold py-1 px-3 cursor-pointer ${
                            evidenceMode === "file" ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft"
                          }`}
                        >
                          Subir un archivo
                        </button>
                      </div>

                      {evidenceMode === "link" ? (
                        <input
                          type="url"
                          value={evidenceUrl}
                          onChange={(e) => setEvidenceUrl(e.target.value)}
                          placeholder="Enlace a evidencia (opcional)"
                          className="border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,video/mp4"
                            onChange={handleFileSelected}
                            className="flex-1 border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
                          />
                          {uploadFile.isPending && (
                            <span className="text-[11.5px] text-ink-faint shrink-0">Subiendo…</span>
                          )}
                          {uploadedFile && !uploadFile.isPending && (
                            <span className="text-[11.5px] text-accent-primary font-semibold shrink-0 truncate max-w-[160px]">
                              {uploadedFile.fileName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={createProgressUpdate.isPending || uploadFile.isPending}
                      className={`self-start rounded-full text-[12px] font-bold px-4 py-2 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
                    >
                      {createProgressUpdate.isPending ? "Guardando…" : "Publicar"}
                    </button>
                  </form>
                )}

                <div className="flex flex-col gap-3">
                  {progressUpdates
                    ?.filter((u) => !u.activityId)
                    .map((update) => (
                      <ProgressUpdateCard key={update.id} update={update} casual />
                    ))}
                  {progressUpdates?.filter((u) => !u.activityId).length === 0 && (
                    <p className="text-[13px] text-ink-soft m-0">Todavía no se ha compartido nada en este proyecto.</p>
                  )}
                </div>
              </div>
            </section>

            <Lateral>
              <LateralCard title="Visibilidad">
                <div className="flex items-center gap-1.5">
                  <StatusPill status={PROJECT_VISIBILITY[project.visibility]} className="self-start" />
                  {project.archived && <StatusPill status={PROJECT_ARCHIVED} className="self-start" />}
                </div>
                <p className="text-[12.5px] text-ink-soft m-0">
                  {project.visibility === "PUBLIC"
                    ? "Este proyecto es público: cualquier persona en Praxis puede verlo, incluido en Explorar."
                    : "Este proyecto es privado: solo tu equipo y tu evaluador lo ven."}
                  {project.archived && " Está archivado, así que es de solo lectura."}
                </p>
              </LateralCard>

              <LateralCard title="Responsable">
                <div className="flex items-center gap-2.5">
                  <span
                    style={{ backgroundColor: avatarColorFor(project.owner.id) }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
                  >
                    {project.owner.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink m-0 truncate">{project.owner.name}</p>
                    {project.owner.email && (
                      <p className="text-[11.5px] text-ink-faint m-0 truncate">{project.owner.email}</p>
                    )}
                  </div>
                </div>
                {project.teacher && (
                  <p className="text-[12.5px] m-0">
                    <span className="text-ink-faint">Docente: </span>
                    <span className="text-ink">{project.teacher.name}</span>
                  </p>
                )}
                {project.organization && (
                  <p className="text-[12.5px] m-0">
                    <span className="text-ink-faint">Organización: </span>
                    <span className="text-ink">{project.organization.name}</span>
                  </p>
                )}
                <p className="text-[12.5px] m-0">
                  <span className="text-ink-faint">Reto vinculado: </span>
                  {project.challenge ? (
                    <Link to={`/retos/${project.challenge.id}`} className="text-accent-primary font-semibold">
                      {project.challenge.title}
                    </Link>
                  ) : (
                    <span className="text-ink">Ninguno</span>
                  )}
                </p>
              </LateralCard>

              {canSeeBoard && (
                <LateralCard title="Dictamen">
                  {dictamenes && dictamenes.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {dictamenes.map((d) => (
                        <div
                          key={d.id}
                          className="flex flex-col gap-1.5 border-b border-rule pb-3 last:border-0 last:pb-0"
                        >
                          <StatusPill
                            status={DICTAMEN_VERDICT[d.verdict] ?? DICTAMEN_VERDICT.APPROVED}
                            className="self-start"
                          />
                          <p className="text-[12.5px] text-ink-soft leading-relaxed m-0">{d.comment}</p>
                          <p className="text-[11px] text-ink-faint m-0">
                            {d.evaluator.name} ·{" "}
                            {new Date(d.createdAt).toLocaleDateString("es-MX", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-ink-faint m-0">Todavía no hay retroalimentación.</p>
                  )}

                  {canSubmitDictamen && (
                    <form onSubmit={handleCreateDictamen} className="flex flex-col gap-2 pt-2 border-t border-rule">
                      <div className="flex gap-3">
                        <label className="flex items-center gap-1.5 text-[12px] text-ink cursor-pointer">
                          <input
                            type="radio"
                            name="dictamenVerdict"
                            checked={dictamenVerdict === "APPROVED"}
                            onChange={() => setDictamenVerdict("APPROVED")}
                          />
                          Va bien
                        </label>
                        <label className="flex items-center gap-1.5 text-[12px] text-ink cursor-pointer">
                          <input
                            type="radio"
                            name="dictamenVerdict"
                            checked={dictamenVerdict === "CHANGES_REQUESTED"}
                            onChange={() => setDictamenVerdict("CHANGES_REQUESTED")}
                          />
                          Sugiere cambios
                        </label>
                      </div>
                      <textarea
                        value={dictamenComment}
                        onChange={(e) => setDictamenComment(e.target.value)}
                        required
                        placeholder="Comentario"
                        rows={3}
                        className="border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink resize-none"
                      />
                      <button
                        type="submit"
                        disabled={createDictamen.isPending}
                        className={`self-start rounded-full text-[12px] font-bold px-4 py-2 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
                      >
                        {createDictamen.isPending ? "Enviando…" : "Enviar retroalimentación"}
                      </button>
                    </form>
                  )}
                </LateralCard>
              )}

              <LateralCard title="Equipo">
                <AvatarStack people={team ?? []} size="md" />
                <p className="text-[12.5px] text-ink-soft m-0">
                  {team?.length ?? 0} {pluralize(team?.length ?? 0, "integrante", "integrantes")}
                </p>
                <button
                  type="button"
                  onClick={() => setTab("equipo")}
                  className="self-start text-[12px] font-semibold text-accent-primary cursor-pointer"
                >
                  Ver equipo →
                </button>
              </LateralCard>

              <LateralCard title="Actividad reciente">
                {progressUpdates?.length === 0 && (
                  <p className="text-[12.5px] text-ink-faint m-0">Todavía no hay avances registrados.</p>
                )}
                <div className="flex flex-col gap-3">
                  {progressUpdates?.slice(0, 3).map((update) => (
                    <div key={update.id} className="flex gap-2.5">
                      <span
                        style={{ backgroundColor: avatarColorFor(update.author.id) }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9.5px] font-bold shrink-0 mt-0.5"
                      >
                        {update.author.name.charAt(0).toUpperCase()}
                      </span>
                      <p className="text-[12px] text-ink-soft leading-snug m-0">
                        <span className="font-semibold text-ink">{update.author.name}</span>{" "}
                        {update.text.length > 70 ? `${update.text.slice(0, 70)}…` : update.text}
                        <span className="block text-[11px] text-ink-faint mt-0.5">{timeAgo(update.createdAt)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </LateralCard>
            </Lateral>
          </>
        )}

        {effectiveTab === "actividades" && canSeeBoard && (
          <ActivitiesTab
            projectId={projectId}
            activities={activities}
            team={team}
            progressUpdates={progressUpdates}
            isMember={isMember}
            doneCount={doneCount}
            archived={project.archived}
            isProjectOwner={isOwner}
          />
        )}

        {effectiveTab === "equipo" && (
          <>
            <section className="flex-1 min-w-0 flex flex-col gap-6">
              {isOwner && (
                <div>
                  <h2 className="text-[13px] font-semibold text-ink mb-2">Invitar integrante</h2>
                  <div className={`flex items-end gap-2 bg-paper-raised border border-rule rounded-xl p-3.5 ${CARD_SHADOW}`}>
                    <div className="flex-1 min-w-0">
                      <UserPicker
                        label="Buscar persona"
                        placeholder="Nombre o correo"
                        value={inviteUser}
                        onChange={setInviteUser}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleInvite}
                      disabled={!inviteUser || inviteToTeam.isPending}
                      className={`rounded-full text-[12.5px] font-bold py-3 px-4 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
                    >
                      {inviteToTeam.isPending ? "Invitando…" : "Invitar"}
                    </button>
                  </div>
                </div>
              )}

              {isOwner && (
                <div>
                  <h2 className="text-[13px] font-semibold text-ink mb-2">Solicitudes</h2>
                  <div className="flex flex-col gap-2">
                    {pending?.map((req) => (
                      <TeamRequestRow
                        key={req.id}
                        request={req}
                        onAccept={() => handleRespond(req.id, "ACCEPTED")}
                        onReject={() => handleRespond(req.id, "REJECTED")}
                      />
                    ))}
                    {pending?.length === 0 && (
                      <p className="text-[12.5px] text-ink-faint m-0">No hay solicitudes pendientes.</p>
                    )}
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[13px] font-semibold text-ink m-0">Integrantes</h2>
                  {/* WU-09: an accepted member (not the owner) can leave on
                      their own; the owner can't leave their own project. */}
                  {isMember && !isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowLeaveConfirm(true)}
                      className="text-[12px] font-semibold text-ink-faint hover:text-danger cursor-pointer"
                    >
                      Salir del equipo
                    </button>
                  )}
                </div>
                <div className={`bg-paper-raised border border-rule rounded-xl overflow-hidden ${CARD_SHADOW}`}>
                  {team?.map((member) => (
                    <TeamMemberRow
                      key={member.id}
                      member={member}
                      onRemove={
                        isOwner && member.role !== "OWNER"
                          ? () => setRemoveTarget({ userId: member.id, name: member.name })
                          : undefined
                      }
                    />
                  ))}
                  {team?.length === 0 && (
                    <p className="text-[13px] text-ink-soft p-4 m-0">Todavía sin integrantes.</p>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-[13px] font-semibold text-ink mb-2">Evaluación</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {renderEvaluatorSlot(
                    "Docente",
                    "TEACHER",
                    project.teacher,
                    "teacher",
                    teacherInviteUser,
                    setTeacherInviteUser,
                  )}
                  {renderEvaluatorSlot(
                    "Organización",
                    "ORGANIZATION",
                    project.organization,
                    "organization",
                    organizationInviteUser,
                    setOrganizationInviteUser,
                  )}
                </div>
              </div>
            </section>
            <Lateral>
              <LateralCard title="Composición del equipo">
                <p className="text-[12.5px] text-ink-soft m-0">
                  {team?.length ?? 0} {pluralize(team?.length ?? 0, "integrante activo", "integrantes activos")}
                </p>
              </LateralCard>
            </Lateral>
          </>
        )}

        {effectiveTab === "anexos" && (
          <section className="flex-1 min-w-0 flex flex-col gap-6">
            <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-3 ${CARD_SHADOW}`}>
              <div>
                <h2 className="font-heading text-[16px] font-bold text-ink m-0">Información adicional</h2>
                <p className="text-[12px] text-ink-faint mt-0.5 mb-0">
                  Espacio libre para contar más del proyecto: metodología, agradecimientos, contexto que no cabe en los campos anteriores.
                </p>
              </div>

              {isMember && !project.archived ? (
                <>
                  <textarea
                    rows={6}
                    value={extendedInfoDraft}
                    onChange={(e) => setExtendedInfoDraft(e.target.value)}
                    placeholder="Cuéntanos más sobre este proyecto…"
                    className="border border-rule rounded-lg bg-paper px-3 py-2 text-[13px] text-ink resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveExtendedInfo}
                    disabled={updateProject.isPending || extendedInfoDraft === (project.extendedInfo ?? "")}
                    className={`self-start rounded-full text-[12px] font-bold px-4 py-2 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
                  >
                    {updateProject.isPending ? "Guardando…" : "Guardar"}
                  </button>
                </>
              ) : (
                <p className="text-[13.5px] text-ink-soft leading-relaxed m-0">
                  {project.extendedInfo || "Todavía no hay información adicional."}
                </p>
              )}
            </div>

            <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-3 ${CARD_SHADOW}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-[16px] font-bold text-ink m-0">Recursos</h2>
                {isMember && !project.archived && (
                  <button
                    type="button"
                    onClick={() => setShowAddResourceForm((v) => !v)}
                    className={`rounded-full text-[12.5px] font-bold py-2 px-4 cursor-pointer shrink-0 ${PRIMARY_BUTTON}`}
                  >
                    Agregar anexo
                  </button>
                )}
              </div>

              {showAddResourceForm && (
                <form
                  onSubmit={handleAddResource}
                  className="flex flex-col gap-2 bg-paper border border-rule rounded-xl p-4"
                >
                  <input
                    required
                    value={resourceLabel}
                    onChange={(e) => setResourceLabel(e.target.value)}
                    placeholder="Título (ej. Manual de usuario)"
                    className="border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
                  />
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
                      <input
                        required
                        type="url"
                        value={resourceUrl}
                        onChange={(e) => setResourceUrl(e.target.value)}
                        placeholder="https://…"
                        className="border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          onChange={handleResourceFileSelected}
                          className="flex-1 border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
                        />
                        {uploadFile.isPending && (
                          <span className="text-[11.5px] text-ink-faint shrink-0">Subiendo…</span>
                        )}
                        {resourceFile && !uploadFile.isPending && (
                          <span className="text-[11.5px] text-accent-primary font-semibold shrink-0 truncate max-w-[160px]">
                            {resourceFile.fileName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={
                      createResource.isPending ||
                      uploadFile.isPending ||
                      (resourceMode === "file" && !resourceFile)
                    }
                    className={`self-start rounded-full text-[12px] font-bold px-4 py-2 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
                  >
                    {createResource.isPending ? "Guardando…" : "Agregar"}
                  </button>
                </form>
              )}

              <div className="flex flex-col gap-2">
                {resources?.length === 0 && (
                  <p className="text-[13px] text-ink-soft m-0">Todavía no hay anexos.</p>
                )}
                {resources?.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center gap-2 border border-rule rounded-lg px-3 py-2"
                  >
                    {resource.type === "FILE" ? (
                      <FileText size={18} className="text-ink-faint shrink-0" />
                    ) : (
                      <LinkSimple size={18} className="text-ink-faint shrink-0" />
                    )}
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
                    {resource.sizeBytes != null && (
                      <span className="text-[11px] text-ink-faint shrink-0">
                        {formatResourceSize(resource.sizeBytes)}
                      </span>
                    )}
                    {isMember &&
                      !project.archived &&
                      (resource.creatorId === user?.id || isOwner) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteResource(resource.id)}
                          className="text-ink-faint hover:text-danger cursor-pointer shrink-0"
                          aria-label="Borrar anexo"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* WU-11: an outsider deep-linking to `/proyectos/:id/actividades/:activityId`
          would otherwise open a modal whose detail fetch is guaranteed to
          404 (`assertProjectInsider`, WU-10). Instead of surfacing that as
          an error dialog, just don't open it — the project page underneath
          renders normally. */}
      {activityId && canSeeBoard && (
        <ActivityDetailModal
          projectId={projectId}
          activityId={Number(activityId)}
          team={team ?? []}
          isMember={isMember}
          isEvaluator={isEvaluator}
          isProjectOwner={isOwner}
          archived={project.archived}
          onClose={() => navigate(`/proyectos/${projectId}?tab=actividades`)}
        />
      )}

      <ConfirmDialog
        open={showArchiveConfirm}
        title="Archivar proyecto"
        description="El proyecto quedará de solo lectura: nadie podrá editarlo, agregar actividades, avances, anexos ni dictámenes. Puedes desarchivarlo cuando quieras."
        confirmLabel={archiveProject.isPending ? "Archivando…" : "Archivar"}
        onConfirm={handleArchive}
        onClose={() => setShowArchiveConfirm(false)}
      />

      <ConfirmDialog
        open={showLeaveConfirm}
        danger
        title={isEvaluator ? "Dejar de evaluar" : "Salir del equipo"}
        description={
          isEvaluator
            ? "Dejarás de ser evaluador de este proyecto. Podrás volver a vincularte solo si te invitan de nuevo."
            : "Saldrás del equipo de este proyecto. Tus comentarios, adjuntos y avances se conservan, pero dejarás de ser responsable de sus actividades."
        }
        confirmLabel={leaveTeam.isPending ? "Procesando…" : "Confirmar"}
        onConfirm={handleLeaveTeam}
        onClose={() => setShowLeaveConfirm(false)}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        danger
        title="Quitar del proyecto"
        description={
          removeTarget
            ? `¿Quitar a "${removeTarget.name}" de este proyecto? Si es integrante, se le quita de sus actividades asignadas; si es evaluador, se desvincula.`
            : undefined
        }
        confirmLabel={removeTeamMember.isPending ? "Quitando…" : "Quitar"}
        onConfirm={handleRemoveTeamMember}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  );
}

export default ProjectDetail;
