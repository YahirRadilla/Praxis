import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "../components/Navbar";
import ProjectHeaderBand from "../components/ProjectHeaderBand";
import ActivityRow from "../components/ActivityRow";
import ProgressUpdateCard from "../components/ProgressUpdateCard";
import TeamMemberRow from "../components/team/TeamMemberRow";
import TeamRequestRow from "../components/team/TeamRequestRow";
import { useAuth } from "../context/AuthContext";
import {
  useProject,
  usePublishProject,
  useSavedProjects,
  useSaveProject,
  useUnsaveProject,
} from "../hooks/useProjects";
import { useTeam, usePendingRequests, useRequestToJoin, useRespondToRequest } from "../hooks/useTeam";
import { useActivities, useCreateActivity } from "../hooks/useActivities";
import { useProgressUpdates, useCreateProgressUpdate } from "../hooks/useProgressUpdates";
import { getErrorMessage } from "../services/api";
import StatusPill from "../components/StatusPill";
import { CARD_SHADOW, PRIMARY_BUTTON, PROJECT_STATUS, ACTIVITY_STATUS } from "../utils/statusStyles";
import { pluralize, timeAgo } from "../utils/text";
import { avatarColorFor } from "../utils/avatarColor";
import { CheckCircle, Circle, WarningCircle } from "@phosphor-icons/react";

type TabKey = "info" | "actividades" | "avances" | "equipo";

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Información" },
  { key: "actividades", label: "Actividades" },
  { key: "avances", label: "Avances" },
  { key: "equipo", label: "Equipo" },
];

function Lateral({ children }: { children: ReactNode }) {
  return <aside className="w-[260px] shrink-0 flex flex-col gap-5">{children}</aside>;
}

function LateralCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={`bg-paper-raised border border-rule rounded-xl p-4 flex flex-col gap-3 ${CARD_SHADOW}`}>
      <h3 className="text-[12.5px] font-semibold text-ink m-0">{title}</h3>
      {children}
    </div>
  );
}

function ProjectDetail() {
  const { id } = useParams();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<TabKey>("info");

  const { data: project, isLoading } = useProject(projectId);
  const { data: team } = useTeam(projectId);
  const { data: pending } = usePendingRequests(projectId);
  const { data: activities } = useActivities(projectId);
  const { data: progressUpdates } = useProgressUpdates(projectId);

  const publishProject = usePublishProject(projectId);
  const requestToJoin = useRequestToJoin(projectId);
  const respondToRequest = useRespondToRequest(projectId);
  const createActivity = useCreateActivity(projectId);
  const createProgressUpdate = useCreateProgressUpdate(projectId);
  const { data: savedProjects } = useSavedProjects();
  const saveProject = useSaveProject();
  const unsaveProject = useUnsaveProject();

  const [activityTitle, setActivityTitle] = useState("");
  const [activityDueDate, setActivityDueDate] = useState("");
  const [progressText, setProgressText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [showProgressForm, setShowProgressForm] = useState(false);

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
  const totalEvidence = progressUpdates?.reduce((acc, u) => acc + u.evidence.length, 0) ?? 0;
  const isSaved = !!savedProjects?.some((p) => p.id === project.id);

  function handlePublish() {
    publishProject.mutate(undefined, {
      onSuccess: () => toast.success("Proyecto publicado"),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo publicar.")),
    });
  }

  function handleRequestToJoin() {
    requestToJoin.mutate(undefined, {
      onSuccess: () => toast.success("Solicitud enviada"),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo enviar la solicitud.")),
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

  function handleCreateActivity(e: FormEvent) {
    e.preventDefault();
    createActivity.mutate(
      { title: activityTitle, dueDate: activityDueDate },
      {
        onSuccess: () => {
          toast.success("Actividad creada");
          setActivityTitle("");
          setActivityDueDate("");
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo crear la actividad.")),
      },
    );
  }

  function handleCreateProgressUpdate(e: FormEvent) {
    e.preventDefault();
    createProgressUpdate.mutate(
      {
        text: progressText,
        postedToFeed: true,
        evidence: evidenceUrl ? [{ type: "LINK", url: evidenceUrl }] : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Avance registrado");
          setProgressText("");
          setEvidenceUrl("");
          setShowProgressForm(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo registrar el avance.")),
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
              </LateralCard>

              <LateralCard title="Equipo">
                <div className="flex items-center -space-x-2">
                  {team?.slice(0, 5).map((m) => (
                    <span
                      key={m.id}
                      title={m.name}
                      style={{ backgroundColor: avatarColorFor(m.id) }}
                      className="w-8 h-8 rounded-full border-2 border-paper-raised flex items-center justify-center text-white text-[11px] font-bold"
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                  ))}
                  {(team?.length ?? 0) > 5 && (
                    <span className="w-8 h-8 rounded-full border-2 border-paper-raised bg-surface-ground flex items-center justify-center text-ink-soft text-[10.5px] font-bold">
                      +{(team?.length ?? 0) - 5}
                    </span>
                  )}
                </div>
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
          <>
            <section className="flex-1 min-w-0 flex flex-col gap-2">
              <div className={`bg-paper-raised border border-rule rounded-xl overflow-hidden ${CARD_SHADOW}`}>
                {activities?.map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))}
                {activities?.length === 0 && (
                  <p className="text-[13px] text-ink-soft p-4 m-0">Todavía no hay actividades.</p>
                )}
              </div>

              {isMember && (
                <form onSubmit={handleCreateActivity} className={`flex gap-2 bg-paper-raised border border-rule rounded-xl p-3 ${CARD_SHADOW}`}>
                  <input
                    type="text"
                    required
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                    placeholder="Nueva actividad"
                    className="flex-1 border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
                  />
                  <input
                    type="date"
                    required
                    value={activityDueDate}
                    onChange={(e) => setActivityDueDate(e.target.value)}
                    className="border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
                  />
                  <button
                    type="submit"
                    disabled={createActivity.isPending}
                    className={`rounded-full text-[12px] font-bold px-4 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
                  >
                    Agregar
                  </button>
                </form>
              )}
            </section>
            <Lateral>
              <LateralCard title="Progreso del semestre">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] text-ink-soft m-0">
                    {doneCount} de {activities?.length ?? 0} actividades
                  </p>
                  <span className="text-[12.5px] font-bold text-accent-primary">
                    {activities?.length ? Math.round((doneCount / activities.length) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-ground overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-primary transition-[width] duration-300"
                    style={{ width: `${activities?.length ? (doneCount / activities.length) * 100 : 0}%` }}
                  />
                </div>
              </LateralCard>
            </Lateral>
          </>
        )}

        {tab === "avances" && (
          <>
            <section className="flex-1 min-w-0 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] text-ink-faint m-0">
                  {progressUpdates?.length ?? 0}{" "}
                  {pluralize(progressUpdates?.length ?? 0, "avance registrado", "avances registrados")}
                </p>
                {isMember && (
                  <button
                    type="button"
                    onClick={() => setShowProgressForm((v) => !v)}
                    className={`rounded-full text-[12.5px] font-bold py-2 px-4 cursor-pointer ${PRIMARY_BUTTON}`}
                  >
                    Registrar avance
                  </button>
                )}
              </div>

              {showProgressForm && (
                <form onSubmit={handleCreateProgressUpdate} className={`flex flex-col gap-2 bg-paper-raised border border-rule rounded-xl p-4 ${CARD_SHADOW}`}>
                  <textarea
                    required
                    rows={2}
                    value={progressText}
                    onChange={(e) => setProgressText(e.target.value)}
                    placeholder="¿Qué avanzaste?"
                    className="border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink resize-none"
                  />
                  <input
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="Enlace a evidencia (opcional)"
                    className="border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
                  />
                  <button
                    type="submit"
                    disabled={createProgressUpdate.isPending}
                    className={`self-start rounded-full text-[12px] font-bold px-4 py-2 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
                  >
                    {createProgressUpdate.isPending ? "Guardando…" : "Publicar avance"}
                  </button>
                </form>
              )}

              <div className="flex flex-col gap-3">
                {progressUpdates?.map((update) => (
                  <ProgressUpdateCard key={update.id} update={update} />
                ))}
                {progressUpdates?.length === 0 && (
                  <p className="text-[13px] text-ink-soft m-0">Todavía no hay avances registrados.</p>
                )}
              </div>
            </section>
            <Lateral>
              <LateralCard title="Evidencias del proyecto">
                <p className="text-[12.5px] text-ink-soft m-0">
                  {totalEvidence} {pluralize(totalEvidence, "evidencia compartida", "evidencias compartidas")}
                </p>
              </LateralCard>
            </Lateral>
          </>
        )}

        {tab === "equipo" && (
          <>
            <section className="flex-1 min-w-0 flex flex-col gap-6">
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
    </div>
  );
}

export default ProjectDetail;
