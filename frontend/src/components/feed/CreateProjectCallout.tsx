import { Link } from "react-router-dom";

function CreateProjectCallout() {
  return (
    <div className="flex flex-col gap-2.5 bg-[linear-gradient(135deg,var(--color-accent-primary),#1b3a28)] text-white rounded-xl p-4 shadow-[0_10px_28px_-12px_rgba(27,58,40,0.55)]">
      <h3 className="font-heading text-[13.5px] font-bold m-0">¿Tienes una idea y no tienes equipo?</h3>
      <p className="text-[12px] leading-relaxed m-0 opacity-90">
        Publica tu proyecto y deja que otras personas te encuentren. No necesitas docente ni convocatoria previa.
      </p>
      <Link
        to="/proyectos/nuevo"
        className="self-start rounded-full bg-paper-raised text-accent-primary text-[12.5px] font-bold py-2 px-4 hover:bg-surface-ground shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
      >
        Crear proyecto
      </Link>
    </div>
  );
}

export default CreateProjectCallout;
