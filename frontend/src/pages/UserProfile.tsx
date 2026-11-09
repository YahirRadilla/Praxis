import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SidebarNav from "../components/feed/SidebarNav";
import ProjectRow from "../components/ProjectRow";
import CvUploader from "../components/CvUploader";
import PdfViewerDialog from "../components/evidence/PdfViewerDialog";
import { useAuth } from "../context/AuthContext";
import { usePublicProfile, useUserPublicProjects, useFollowUser, useUnfollowUser } from "../hooks/useUserProfile";
import { useUpdateProfile } from "../hooks/useProfile";
import { getErrorMessage } from "../services/api";
import { ACCOUNT_TYPE_LABELS } from "../utils/accountTypes";
import { toPreviewEvidence } from "../utils/mimePreview";
import { pluralize } from "../utils/text";
import { CARD_SHADOW } from "../utils/statusStyles";

function UserProfile() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const { user, isAuthenticated } = useAuth();
  const isMe = user?.id === id;
  const [showCv, setShowCv] = useState(false);

  const { data: profile, isLoading, isError } = usePublicProfile(id);
  const { data: projects } = useUserPublicProjects(id);
  const followUser = useFollowUser(id);
  const unfollowUser = useUnfollowUser(id);
  const updateProfile = useUpdateProfile();

  function handleToggleFollow() {
    if (profile?.followedByMe) {
      unfollowUser.mutate(undefined, {
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo dejar de seguir a este usuario.")),
      });
    } else {
      followUser.mutate(undefined, {
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo seguir a este usuario.")),
      });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col bg-surface-ground">
        <Navbar />
        <p className="flex-1 flex items-center justify-center text-ink-soft">Cargando…</p>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-dvh flex flex-col bg-surface-ground">
        <Navbar />
        <p className="flex-1 flex items-center justify-center text-ink-soft">Usuario no encontrado.</p>
      </div>
    );
  }

  const togglingFollow = followUser.isPending || unfollowUser.isPending;

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row gap-6 px-4 md:px-8 py-7 items-stretch md:items-start max-w-[1200px] mx-auto w-full">
        <aside className="w-full md:w-[240px] md:shrink-0">
          <SidebarNav />
        </aside>

        <section className="flex-1 min-w-0 flex flex-col gap-4">
          <div className={`flex flex-col gap-3 bg-paper-raised border border-rule rounded-xl p-5 ${CARD_SHADOW}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-14 h-14 rounded-full bg-fg-muted text-white text-[18px] font-bold flex items-center justify-center shrink-0">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex flex-col gap-0.5">
                  <h1 className="font-heading text-[19px] font-bold text-ink m-0">{profile.name}</h1>
                  <span className="text-[12.5px] text-ink-faint">
                    {ACCOUNT_TYPE_LABELS[profile.accountType] ?? profile.accountType}
                  </span>
                  {profile.academicProgram && (
                    <span className="text-[12.5px] text-ink-soft">{profile.academicProgram}</span>
                  )}
                  {profile.accountType === "STUDENT" && profile.semester && (
                    <span className="text-[12.5px] text-ink-soft">{profile.semester}° semestre</span>
                  )}
                  <span className="text-[12px] text-ink-faint mt-1">
                    {profile.followerCount} {pluralize(profile.followerCount, "seguidor", "seguidores")} ·{" "}
                    {profile.followingCount} siguiendo
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isMe && (
                  <Link
                    to="/perfil"
                    className="flex items-center gap-1.5 rounded-full bg-paper-raised border border-rule text-ink text-[13px] font-semibold py-2.5 px-5 cursor-pointer hover:bg-surface-ground"
                  >
                    Editar perfil
                  </Link>
                )}
                {isAuthenticated && !isMe && (
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={togglingFollow}
                    className="flex items-center gap-1.5 rounded-full bg-paper-raised border border-rule text-ink text-[13px] font-semibold py-2.5 px-5 cursor-pointer hover:bg-surface-ground disabled:opacity-60"
                  >
                    {profile.followedByMe ? "Siguiendo" : "Seguir"}
                  </button>
                )}
                {isAuthenticated && !isMe && (
                  <Link
                    to={`/mensajes/${profile.id}`}
                    className="flex items-center gap-1.5 rounded-full bg-paper-raised border border-rule text-ink text-[13px] font-semibold py-2.5 px-5 cursor-pointer hover:bg-surface-ground"
                  >
                    Enviar mensaje
                  </Link>
                )}
              </div>
            </div>

            {isMe && (
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-rule">
                <CvUploader
                  cvUrl={profile.cvUrl}
                  onSave={(cvUrl) => updateProfile.mutateAsync({ cvUrl })}
                />
              </div>
            )}

            {profile.cvUrl && (
              <button
                type="button"
                onClick={() => setShowCv(true)}
                className="text-[12.5px] font-semibold text-accent-primary hover:underline self-start cursor-pointer"
              >
                Ver CV
              </button>
            )}
          </div>

          {profile.skills.length > 0 && (
            <div className={`flex flex-col gap-2 bg-paper-raised border border-rule rounded-xl p-5 ${CARD_SHADOW}`}>
              <h2 className="font-heading text-[14px] font-bold text-ink m-0">Habilidades</h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="bg-paper border border-rule rounded-lg px-2.5 py-1 text-[11.5px] text-ink-soft"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.interests.length > 0 && (
            <div className={`flex flex-col gap-2 bg-paper-raised border border-rule rounded-xl p-5 ${CARD_SHADOW}`}>
              <h2 className="font-heading text-[14px] font-bold text-ink m-0">Intereses</h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="bg-paper border border-rule rounded-lg px-2.5 py-1 text-[11.5px] text-ink-soft"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <h2 className="font-heading text-[14px] font-bold text-ink m-0">Proyectos</h2>
            {projects?.length === 0 && (
              <p className="text-[13px] text-ink-soft">Todavía no participa en proyectos públicos.</p>
            )}
            {projects?.map((project) => <ProjectRow key={project.id} project={project} />)}
          </div>
        </section>
      </div>

      <Footer />

      {showCv && profile.cvUrl && (
        <PdfViewerDialog
          pdf={toPreviewEvidence({ id: profile.id, url: profile.cvUrl, fileName: `CV de ${profile.name}` })}
          onClose={() => setShowCv(false)}
        />
      )}
    </div>
  );
}

export default UserProfile;
