import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { UserCircle, Moon, Sun, SignOut, List, MagnifyingGlass } from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { CARD_SHADOW } from "../utils/statusStyles";
import { avatarColorFor } from "../utils/avatarColor";
import NotificationBell from "./NotificationBell";

function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
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

  function handleMobileSearch(e: FormEvent) {
    handleSearch(e);
    setMobileSearchOpen(false);
  }

  function handleLogout() {
    setMenuOpen(false);
    clearAuth();
    navigate("/", { replace: true });
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-[13px] ${isActive ? "font-semibold text-ink" : "text-ink-soft hover:text-ink"}`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3.5 py-2.5 text-[13px] ${isActive ? "font-semibold text-ink" : "text-ink-soft"} data-[focus]:bg-surface-ground`;

  return (
    <>
      <nav className="w-full bg-paper-raised border-b border-rule px-4 md:px-8 py-3 flex items-center justify-between gap-4 md:gap-8">
        <Link to="/inicio" className="flex items-center gap-2.5 shrink-0">
          <span className="relative w-[34px] h-[34px] rounded-full border-4 border-ink">
            <span className="absolute top-px -right-px w-2.5 h-2.5 rounded-full bg-paper-raised border-[1.8px] border-ink" />
          </span>
          <span className="font-heading text-[17px] font-bold text-ink">Praxis</span>
        </Link>

        <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-[420px]">
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

        <div className="hidden md:flex items-center gap-6 shrink-0">
          <NavLink to="/inicio" className={navLinkClass}>
            Inicio
          </NavLink>
          <NavLink to="/explorar" className={navLinkClass}>
            Explorar
          </NavLink>
          {/* Impacto: desactivado por ahora, la página sigue construida en pages/Impacto.tsx */}
          <NavLink to="/mis-proyectos" className={navLinkClass}>
            Mis proyectos
          </NavLink>
          <NavLink to="/retos" className={navLinkClass}>
            Retos
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/mis-tareas" className={navLinkClass}>
              Mis tareas
            </NavLink>
          )}
          {isAuthenticated && <NotificationBell />}
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

        <div className="flex md:hidden items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Buscar"
            className="w-9 h-9 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface-ground hover:text-ink cursor-pointer"
          >
            <MagnifyingGlass size={19} />
          </button>

          {isAuthenticated && <NotificationBell />}

          <Menu as="div" className="relative">
            <MenuButton
              aria-label="Abrir menú"
              className="w-9 h-9 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface-ground hover:text-ink cursor-pointer"
            >
              <List size={20} weight="bold" />
            </MenuButton>
            <MenuItems
              anchor="bottom end"
              className={`z-50 w-[240px] bg-paper-raised border border-rule rounded-xl py-2 focus:outline-none ${CARD_SHADOW}`}
            >
              {isAuthenticated && user && (
                <div className="px-3.5 py-2 border-b border-rule mb-1">
                  <p className="text-[13px] font-semibold text-ink m-0 truncate">{user.name}</p>
                  <p className="text-[11.5px] text-ink-faint m-0 truncate">{user.email}</p>
                </div>
              )}

              <MenuItem>
                <NavLink to="/inicio" className={mobileNavLinkClass}>
                  Inicio
                </NavLink>
              </MenuItem>
              <MenuItem>
                <NavLink to="/explorar" className={mobileNavLinkClass}>
                  Explorar
                </NavLink>
              </MenuItem>
              <MenuItem>
                <NavLink to="/mis-proyectos" className={mobileNavLinkClass}>
                  Mis proyectos
                </NavLink>
              </MenuItem>
              <MenuItem>
                <NavLink to="/retos" className={mobileNavLinkClass}>
                  Retos
                </NavLink>
              </MenuItem>
              {isAuthenticated && (
                <MenuItem>
                  <NavLink to="/mis-tareas" className={mobileNavLinkClass}>
                    Mis tareas
                  </NavLink>
                </MenuItem>
              )}

              <div className="my-1 border-t border-rule" />

              {isAuthenticated && user ? (
                <>
                  <MenuItem>
                    <Link
                      to="/perfil"
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-ink data-[focus]:bg-surface-ground"
                    >
                      <UserCircle size={17} />
                      Editar perfil
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] text-ink data-[focus]:bg-surface-ground cursor-pointer"
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
                  </MenuItem>
                  <MenuItem>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-ink data-[focus]:bg-surface-ground cursor-pointer"
                    >
                      <SignOut size={17} />
                      Salir
                    </button>
                  </MenuItem>
                </>
              ) : (
                <MenuItem>
                  <Link
                    to="/"
                    className="block px-3.5 py-2.5 text-[13px] font-semibold text-ink data-[focus]:bg-surface-ground"
                  >
                    Iniciar sesión
                  </Link>
                </MenuItem>
              )}
            </MenuItems>
          </Menu>
        </div>
      </nav>

      {mobileSearchOpen && (
        <form
          onSubmit={handleMobileSearch}
          className="md:hidden w-full bg-paper-raised border-b border-rule px-4 py-2.5"
        >
          <div className="flex items-center gap-2 border border-rule rounded-full bg-paper px-4 py-2.5">
            <svg width="16" height="16" viewBox="0 0 256 256" fill="none" className="text-ink-faint shrink-0">
              <circle cx="112" cy="112" r="80" stroke="currentColor" strokeWidth="16" />
              <line x1="168" y1="168" x2="224" y2="224" stroke="currentColor" strokeWidth="16" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar proyectos"
              className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-faint outline-none"
            />
          </div>
        </form>
      )}
    </>
  );
}

export default Navbar;
