import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { UserCircle, Moon, Sun, SignOut } from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { CARD_SHADOW } from "../utils/statusStyles";
import { avatarColorFor } from "../utils/avatarColor";

function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    navigate(`/explorar${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  }

  function handleLogout() {
    setMenuOpen(false);
    clearAuth();
    navigate("/", { replace: true });
  }

  return (
    <nav className="w-full bg-paper-raised border-b border-rule px-8 py-3 flex items-center justify-between gap-8">
      <Link to="/inicio" className="flex items-center gap-2.5 shrink-0">
        <span className="relative w-[34px] h-[34px] rounded-full border-4 border-ink">
          <span className="absolute top-px -right-px w-2.5 h-2.5 rounded-full bg-paper-raised border-[1.8px] border-ink" />
        </span>
        <span className="font-heading text-[17px] font-bold text-ink">Praxis</span>
      </Link>

      <form onSubmit={handleSearch} className="flex-1 max-w-[420px]">
        <div className="flex items-center gap-2 border border-rule rounded-full bg-paper px-4 py-2.5">
          <svg width="16" height="16" viewBox="0 0 256 256" fill="none" className="text-ink-faint shrink-0">
            <circle cx="112" cy="112" r="80" stroke="currentColor" strokeWidth="16" />
            <line x1="168" y1="168" x2="224" y2="224" stroke="currentColor" strokeWidth="16" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar proyectos"
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-faint outline-none"
          />
        </div>
      </form>

      <div className="flex items-center gap-6 shrink-0">
        <NavLink
          to="/inicio"
          className={({ isActive }) =>
            `text-[13px] ${isActive ? "font-semibold text-ink" : "text-ink-soft hover:text-ink"}`
          }
        >
          Inicio
        </NavLink>
        <NavLink
          to="/explorar"
          className={({ isActive }) =>
            `text-[13px] ${isActive ? "font-semibold text-ink" : "text-ink-soft hover:text-ink"}`
          }
        >
          Explorar
        </NavLink>
        <NavLink
          to="/mis-proyectos"
          className={({ isActive }) =>
            `text-[13px] ${isActive ? "font-semibold text-ink" : "text-ink-soft hover:text-ink"}`
          }
        >
          Mis proyectos
        </NavLink>
        {isAuthenticated && user ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              title={user.name}
              onClick={() => setMenuOpen((v) => !v)}
              style={{ backgroundColor: avatarColorFor(user.id) }}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white text-[12px] font-bold cursor-pointer"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>

            {menuOpen && (
              <div
                className={`absolute right-0 top-[calc(100%+10px)] w-[220px] bg-paper-raised border border-rule rounded-xl py-2 z-50 ${CARD_SHADOW}`}
              >
                <div className="px-3.5 py-2 border-b border-rule mb-1">
                  <p className="text-[13px] font-semibold text-ink m-0 truncate">{user.name}</p>
                  <p className="text-[11.5px] text-ink-faint m-0 truncate">{user.email}</p>
                </div>

                <Link
                  to="/perfil"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-ink hover:bg-surface-ground"
                >
                  <UserCircle size={17} />
                  Editar perfil
                </Link>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] text-ink hover:bg-surface-ground cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
                    Modo oscuro
                  </span>
                  <span
                    className={`relative w-8 h-[18px] rounded-full transition-colors ${
                      theme === "dark" ? "bg-accent-primary" : "bg-rule"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-[14px] h-[14px] rounded-full bg-paper-raised transition-all ${
                        theme === "dark" ? "left-[17px]" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-ink hover:bg-surface-ground cursor-pointer"
                >
                  <SignOut size={17} />
                  Salir
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/" className="text-[13px] font-semibold text-ink">
            Iniciar sesión
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
