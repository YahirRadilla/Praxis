import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { PRIMARY_BUTTON } from "../utils/statusStyles";

function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <h1 className="font-heading text-[22px] font-bold text-ink m-0">Página no encontrada</h1>
        <p className="text-ink-soft m-0">La dirección a la que intentaste acceder no existe.</p>
        <Link to="/inicio" className={`rounded-full text-[13px] font-bold py-2.5 px-5 ${PRIMARY_BUTTON}`}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
