import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Home() {
  const { user, clearAuth } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    navigate("/", { replace: true });
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2.5">
        <span className="relative w-[30px] h-[30px] rounded-full border-4 border-ink">
          <span className="absolute top-px -right-px w-2.5 h-2.5 rounded-full bg-paper-raised border-[1.6px] border-ink" />
        </span>
        <span className="font-heading text-[17px] font-bold text-ink">Praxis</span>
      </div>

      <div className="w-full max-w-[400px] flex flex-col items-center gap-1.5 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink m-0">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-[13.5px] leading-relaxed text-ink-soft m-0">
          Sesión iniciada como {user?.email} ({user?.accountType.toLowerCase()}).
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full border border-rule text-ink text-[13.5px] font-bold py-3 px-6 cursor-pointer hover:bg-surface-ground"
      >
        Cerrar sesión
      </button>
    </main>
  );
}

export default Home;
