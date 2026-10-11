import { toast } from "sonner";
import Navbar from "../components/Navbar";
import SidebarNav from "../components/feed/SidebarNav";
import TeamRequestRow from "../components/team/TeamRequestRow";
import { useReceivedRequests, useRespondToReceivedRequest } from "../hooks/useTeam";
import { getErrorMessage } from "../services/api";

function SolicitudesRecibidas() {
  const { data: requests, isLoading } = useReceivedRequests();
  const respond = useRespondToReceivedRequest();

  function handleRespond(requestId: number, status: "ACCEPTED" | "REJECTED") {
    respond.mutate(
      { requestId, status },
      {
        onSuccess: () => toast.success(status === "ACCEPTED" ? "Solicitud aceptada" : "Solicitud rechazada"),
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo resolver la solicitud.")),
      },
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="flex-1 flex gap-6 px-8 py-7 items-start max-w-[1200px] mx-auto w-full">
        <aside className="w-[240px] shrink-0">
          <SidebarNav />
        </aside>

        <section className="flex-1 min-w-0 flex flex-col gap-3">
          <h1 className="font-heading text-[22px] font-bold text-ink m-0">Solicitudes recibidas</h1>

          {isLoading && <p className="text-[13px] text-ink-soft">Cargando…</p>}
          {!isLoading && requests?.length === 0 && (
            <p className="text-[13px] text-ink-soft">No tienes solicitudes pendientes en tus proyectos.</p>
          )}

          <div className="flex flex-col gap-2">
            {requests?.map((req) => (
              <TeamRequestRow
                key={req.id}
                request={req}
                projectName={req.project.name}
                onAccept={() => handleRespond(req.id, "ACCEPTED")}
                onReject={() => handleRespond(req.id, "REJECTED")}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default SolicitudesRecibidas;
