import { useState, type ChangeEvent, type FormEvent } from "react";
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
import { Lateral, LateralCard } from "../components/LayoutPrimitives";
import type { ProjectPersonRef } from "../types/project";
import type { DictamenVerdict } from "../types/dictamen";
import { useAuth } from "../context/AuthContext";
import {
  useArchiveProject,
  useProject,
  usePublishProject,
  useSavedProjects,
  useSaveProject,
  useSubmitForReview,
  useUnsaveProject,
} from "../hooks/useProjects";
import {
  useTeam,
  usePendingRequests,
  useRequestToJoin,
  useRespondToRequest,
  useInviteToTeam,
} from "../hooks/useTeam";
import { useActivities } from "../hooks/useActivities";
import { useProgressUpdates, useCreateProgressUpdate, useUploadFile } from "../hooks/useProgressUpdates";
import { useDictamenes, useCreateDictamen } from "../hooks/useDictamenes";
import { getErrorMessage } from "../services/api";
import StatusPill from "../components/StatusPill";
import { CARD_SHADOW, PRIMARY_BUTTON, PROJECT_STATUS, ACTIVITY_STATUS, DICTAMEN_VERDICT } from "../utils/statusStyles";
import { pluralize, timeAgo } from "../utils/text";
import { avatarColorFor } from "../utils/avatarColor";
import { CheckCircle, Circle, WarningCircle } from "@phosphor-icons/react";

type TabKey = "info" | "actividades" | "equipo";

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Información" },
  { key: "actividades", label: "Actividades" },
  { key: "equipo", label: "Equipo" },
];

function isTabKey(value: string | null): value is TabKey {
  return value === "info" || value === "actividades" || value === "avances" || value === "equipo";
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

  const { data: project, isLoading } = useProject(projectId);
  const { data: team } = useTeam(projectId);
  const { data: pending } = usePendingRequests(projectId);
  const { data: activities } = useActivities(projectId);
  const { data: progressUpdates } = useProgressUpdates(projectId);
  const { data: dictamenes } = useDictamenes(projectId);

  const publishProject = usePublishProject(projectId);
  const submitForReview = useSubmitForReview(projectId);
  const archiveProject = useArchiveProject(projectId);
  const requestToJoin = useRequestToJoin(projectId);
  const respondToRequest = useRespondToRequest(projectId);
  const inviteToTeam = useInviteToTeam(projectId);
  const createProgressUpdate = useCreateProgressUpdate(projectId);
  const uploadFile = useUploadFile();
  const createDictamen = useCreateDictamen(projectId);
  const { data: savedProjects } = useSavedProjects();
  const saveProject = useSaveProject();
  const unsaveProject = useUnsaveProject();

  const [progressText, setProgressText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceMode, setEvidenceMode] = useState<"link" | "file">("link");
  const [uploadedFile, setUploadedFile] = useState<{ url: string; fileName: string } | null>(null);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [inviteUser, setInviteUser] = useState<ProjectPersonRef | null>(null);
  const [dictamenVerdict, setDictamenVerdict] = useState<DictamenVerdict>("APPROVED");
  const [dictamenComment, setDictamenComment] = useState("");

  if (isLoading || !project) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <p className="flex-1 flex items-center justify-center text-ink-soft">Cargando…</p>
      </div>
    );
  }

  const isOwner = user?.id === project.ownerId;
  const isMember = isOwner || !!team?.some((m) => m.id === user?.id);
  const doneCount = activities?.filter((a) => a.status === "DONE").length ?? 0;
  const isSaved = !!savedProjects?.some((p) => p.id === project.id);
  const isEvaluator =
    !!user && (user.id === project.teacher?.id || user.id === project.organization?.id);
  const hasSubmittedDictamen = !!dictamenes?.some((d) => d.evaluator.id === user?.id);
  const canSubmitDictamen = project.status === "IN_REVIEW" && isEvaluator && !hasSubmittedDictamen;

  function handlePublish() {
    publishProject.mutate(undefined, {
      onSuccess: () => toast.success("Proyecto publicado"),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo publicar.")),
    });
  }

  function handleSubmitForReview() {
    submitForReview.mutate(undefined, {
      onSuccess: () => toast.success("Proyecto enviado a evaluación"),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo enviar a evaluación.")),
    });
  }

  function handleArchive() {
    archiveProject.mutate(undefined, {
      onSuccess: () => toast.success("Proyecto archivado"),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo archivar.")),
    });
  }

  function handleRequestToJoin() {
    requestToJoin.mutate(undefined, {
      onSuccess: () => toast.success("Solicitud enviada"),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo enviar la solicitud.")),
    });
  }

  function handleInvite() {
    if (!inviteUser) return;
    inviteToTeam.mutate(inviteUser.id, {
      onSuccess: () => {
        toast.success("Invitación enviada");
        setInviteUser(null);
      },
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo enviar la invitación.")),
    });
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
          toast.success("Avance registrado");
          setProgressText("");
          setEvidenceUrl("");
          setUploadedFile(null);
          setEvidenceMode("link");
          setShowProgressForm(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo registrar el avance.")),
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
      {isOwner && project.status === "DRAFT" && (
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishProject.isPending}
          className={`rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
        >
          {publishProject.isPending ? "Publicando…" : "Publicar proyecto"}
        </button>
      )}
      {isOwner && project.status === "PUBLISHED" && (
        <button
          type="button"
          onClick={handleSubmitForReview}
          disabled={submitForReview.isPending}
          className={`rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
        >
          {submitForReview.isPending ? "Enviando…" : "Enviar a evaluación"}
        </button>
      )}
      {isOwner && project.status === "IN_REVIEW" && (
        <button
          type="button"
          onClick={handleArchive}
          disabled={archiveProject.isPending}
          className={`rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
        >
          {archiveProject.isPending ? "Archivando…" : "Archivar"}
        </button>
      )}
      {isAuthenticated && !isOwner && !isMember && (
        <button
          type="button"
          onClick={handleRequestToJoin}
          disabled={requestToJoin.isPending}
          className={`rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
        >
          {requestToJoin.isPending ? "Enviando…" : "Solicitar participación"}
        </button>
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
        <StatusPill status={PROJECT_STATUS[project.status] ?? PROJECT_STATUS.DRAFT} />
        <h2 className="font-heading text-[18px] font-bold text-ink m-0">{project.name}</h2>
      </div>

      <nav className="bg-paper-raised border-b border-rule px-8 flex items-center gap-[26px] mt-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`py-3 text-[13.5px] cursor-pointer border-b-2 -mb-px ${
              tab === t.key ? "font-bold text-ink border-ink" : "text-ink-soft border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 flex gap-8 px-8 py-7 items-start">
        {tab === "info" && (
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

              <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-3 ${CARD_SHADOW}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-[16px] font-bold text-ink m-0">Avances generales</h2>
                    <p className="text-[12px] text-ink-faint mt-0.5 mb-0">
                      Actualizaciones del proyecto que no están ligadas a una actividad puntual.
                    </p>
                  </div>
                  {isMember && (
                    <button
                      type="button"
                      onClick={() => setShowProgressForm((v) => !v)}
                      className={`rounded-full text-[12.5px] font-bold py-2 px-4 cursor-pointer shrink-0 ${PRIMARY_BUTTON}`}
                    >
                      Registrar avance
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
                      placeholder="¿Qué avanzaste?"
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
                      {createProgressUpdate.isPending ? "Guardando…" : "Publicar avance"}
                    </button>
                  </form>
                )}

                <div className="flex flex-col gap-3">
                  {progressUpdates
                    ?.filter((u) => !u.activityId)
                    .map((update) => (
                      <ProgressUpdateCard key={update.id} update={update} />
                    ))}
                  {progressUpdates?.filter((u) => !u.activityId).length === 0 && (
                    <p className="text-[13px] text-ink-soft m-0">Todavía no hay avances generales registrados.</p>
                  )}
                </div>
              </div>
            </section>

            <Lateral>
              <LateralCard title="Estado del proyecto">
                <StatusPill status={PROJECT_STATUS[project.status] ?? PROJECT_STATUS.DRAFT} className="self-start" />
                <p className="text-[12.5px] text-ink-soft m-0">
                  {project.status === "DRAFT" && "Este proyecto todavía es un borrador."}
                  {project.status === "PUBLISHED" && "Este proyecto está publicado y visible en Explorar."}
                  {project.status === "IN_PROGRESS" && "Este proyecto está en desarrollo activo."}
                  {project.status === "IN_REVIEW" && "Este proyecto está en evaluación."}
                  {project.status === "COMPLETED" && "Este proyecto fue completado."}
                  {project.status === "ARCHIVED" && "Este proyecto está archivado."}
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
                    <p className="text-[11.5px] text-ink-faint m-0 truncate">{project.owner.email}</p>
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
                  <p className="text-[12.5px] text-ink-faint m-0">Todavía no hay un dictamen.</p>
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
                        Aprobado
                      </label>
                      <label className="flex items-center gap-1.5 text-[12px] text-ink cursor-pointer">
                        <input
                          type="radio"
                          name="dictamenVerdict"
                          checked={dictamenVerdict === "CHANGES_REQUESTED"}
                          onChange={() => setDictamenVerdict("CHANGES_REQUESTED")}
                        />
                        Requiere ajustes
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
                      {createDictamen.isPending ? "Enviando…" : "Enviar dictamen"}
                    </button>
                  </form>
                )}
              </LateralCard>

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

        {tab === "actividades" && (
          <ActivitiesTab
            projectId={projectId}
            activities={activities}
            team={team}
            progressUpdates={progressUpdates}
            isMember={isMember}
            doneCount={doneCount}
            projectStatus={project.status}
            isProjectOwner={isOwner}
          />
        )}

        {tab === "equipo" && (
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
                <h2 className="text-[13px] font-semibold text-ink mb-2">Integrantes</h2>
                <div className={`bg-paper-raised border border-rule rounded-xl overflow-hidden ${CARD_SHADOW}`}>
                  {team?.map((member) => (
                    <TeamMemberRow key={member.id} member={member} />
                  ))}
                  {team?.length === 0 && (
                    <p className="text-[13px] text-ink-soft p-4 m-0">Todavía sin integrantes.</p>
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
      </div>

      {activityId && (
        <ActivityDetailModal
          projectId={projectId}
          activityId={Number(activityId)}
          team={team ?? []}
          isMember={isMember}
          isProjectOwner={isOwner}
          projectStatus={project.status}
          onClose={() => navigate(`/proyectos/${projectId}?tab=actividades`)}
        />
      )}
    </div>
  );
}

export default ProjectDetail;
