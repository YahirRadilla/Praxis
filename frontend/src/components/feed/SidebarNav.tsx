import { NavLink } from "react-router-dom";
import { CARD_SHADOW } from "../../utils/statusStyles";

const ITEMS = [
  { to: "/inicio", label: "Inicio" },
  { to: "/mis-proyectos", label: "Mis proyectos" },
  { to: "/solicitudes-recibidas", label: "Solicitudes recibidas" },
  { to: "/equipos", label: "Equipos" },
  { to: "/guardados", label: "Guardados" },
];

function SidebarNav() {
  return (
    <nav className={`flex flex-col bg-paper-raised border border-rule rounded-xl p-2 ${CARD_SHADOW}`}>
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2.5 text-[13px] border-l-[3px] ${
              isActive
                ? "bg-surface-ground font-semibold text-accent-primary border-accent-primary"
                : "text-ink-soft border-transparent hover:bg-surface-ground"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default SidebarNav;
