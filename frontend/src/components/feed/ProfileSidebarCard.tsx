import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useMyProjects } from "../../hooks/useProjects";
import { CARD_SHADOW } from "../../utils/statusStyles";
import { pluralize } from "../../utils/text";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  STUDENT: "Estudiante",
  TEACHER: "Docente",
  ORGANIZATION: "Organización",
  INDEPENDENT: "Independiente",
};

function ProfileSidebarCard() {
  const { user } = useAuth();
  const { data: myProjects } = useMyProjects();

  if (!user) return null;

  return (
    <Link
      to="/perfil"
      className={`flex flex-col bg-paper-raised border border-rule rounded-xl overflow-hidden hover:shadow-[0_1px_2px_rgba(20,22,26,0.04),0_16px_36px_-14px_rgba(20,22,26,0.28)] ${CARD_SHADOW}`}
    >
      <div className="h-14 bg-[linear-gradient(135deg,var(--color-accent-primary),#1b3a28)]" />
      <div className="flex flex-col items-center gap-1 px-4 pb-4 -mt-7">
        <span className="w-14 h-14 rounded-full bg-fg-muted border-4 border-paper-raised shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center text-white text-[18px] font-bold">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="font-heading text-[14px] font-bold text-ink text-center">{user.name}</span>
        <span className="text-[11.5px] text-ink-faint text-center">
          {ACCOUNT_TYPE_LABELS[user.accountType] ?? user.accountType}
        </span>
        <span className="text-[11.5px] text-ink-soft mt-1">
          {myProjects?.length ?? 0} {pluralize(myProjects?.length ?? 0, "proyecto activo", "proyectos activos")}
        </span>
      </div>
    </Link>
  );
}

export default ProfileSidebarCard;
