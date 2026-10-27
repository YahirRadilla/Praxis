import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useUpdateProfile } from "../hooks/useProfile";
import { getErrorMessage } from "../services/api";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";
import { INSTITUTION_NAME } from "../config/institution";

function toCsv(items: string[]): string {
  return items.join(", ");
}

function fromCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState(user?.name ?? "");
  const [skills, setSkills] = useState(toCsv(user?.skills ?? []));
  const [interests, setInterests] = useState(toCsv(user?.interests ?? []));
  const [academicProgram, setAcademicProgram] = useState(user?.academicProgram ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateProfile.mutate(
      { name, skills: fromCsv(skills), interests: fromCsv(interests), academicProgram },
      {
        onSuccess: () => {
          toast.success("Perfil actualizado");
          navigate("/inicio", { replace: true });
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, "No se pudo actualizar el perfil."));
        },
      },
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-8 p-6 bg-surface-ground">
      <div className="flex items-center gap-2.5">
        <span className="relative w-[30px] h-[30px] rounded-full border-4 border-ink">
          <span className="absolute top-px -right-px w-2.5 h-2.5 rounded-full bg-paper-raised border-[1.6px] border-ink" />
        </span>
        <span className="font-heading text-[17px] font-bold text-ink">Praxis</span>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-[420px] flex flex-col gap-4 bg-paper-raised border border-rule rounded-2xl p-8 ${CARD_SHADOW}`}
      >
        <div className="flex flex-col gap-1.5 text-center mb-2">
          <h1 className="font-heading text-2xl font-bold text-ink m-0">Completa tu perfil</h1>
          <p className="text-[13.5px] leading-relaxed text-ink-soft m-0">
            Tus habilidades e intereses ayudan a que otros te encuentren.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink">Nombre completo</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-rule rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-accent-primary focus:outline-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink">Programa académico</span>
          <input
            type="text"
            value={academicProgram}
            onChange={(e) => setAcademicProgram(e.target.value)}
            placeholder={`Ingeniería en Sistemas Computacionales, ${INSTITUTION_NAME}`}
            className="border border-rule rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-accent-primary focus:outline-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink">Habilidades</span>
          <input
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="React, Node.js, Diseño UX"
            className="border border-rule rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-accent-primary focus:outline-offset-1"
          />
          <span className="text-[11px] text-ink-faint">Separadas por coma.</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink">Intereses</span>
          <input
            type="text"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="Educación, Sostenibilidad"
            className="border border-rule rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-accent-primary focus:outline-offset-1"
          />
          <span className="text-[11px] text-ink-faint">Separados por coma.</span>
        </label>

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className={`rounded-full text-[13.5px] font-bold py-3.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${PRIMARY_BUTTON}`}
        >
          {updateProfile.isPending ? "Guardando…" : "Guardar perfil"}
        </button>

        <Link to="/inicio" className="text-center text-[12.5px] text-ink-soft mt-1">
          Saltar por ahora
        </Link>
      </form>
    </main>
  );
}

export default EditProfile;
