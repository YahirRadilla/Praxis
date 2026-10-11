import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "../components/Navbar";
import StatusPill from "../components/StatusPill";
import { useSdgs } from "../hooks/useSdgs";
import { useCreateProject } from "../hooks/useProjects";
import { getErrorMessage } from "../services/api";
import FieldError from "../components/FieldError";
import SdgPicker from "../components/SdgPicker";
import UserPicker from "../components/UserPicker";
import type { ProjectPersonRef } from "../types/project";
import { createProjectFormSchema, type CreateProjectFormValues } from "../schemas/project.schema";
import { CARD_SHADOW, PRIMARY_BUTTON, PROJECT_STATUS } from "../utils/statusStyles";

const SECTIONS = [
  { id: "info", label: "Información del proyecto" },
  { id: "sdgs", label: "Objetivos de Desarrollo Sostenible" },
  { id: "visibilidad", label: "Visibilidad" },
];

const FIELD_CLASS =
  "border rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-offset-1";

function CreateProject() {
  const navigate = useNavigate();
  const { data: sdgs, isLoading: loadingSdgs } = useSdgs();
  const createProject = useCreateProject();
  const [activeSection, setActiveSection] = useState("info");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [teacher, setTeacher] = useState<ProjectPersonRef | null>(null);
  const [organization, setOrganization] = useState<ProjectPersonRef | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: { sdgIds: [], visibility: "PUBLIC" },
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function onSubmit(values: CreateProjectFormValues) {
    createProject.mutate(
      {
        ...values,
        teacherId: values.teacherId ?? undefined,
        organizationId: values.organizationId ?? undefined,
      },
      {
        onSuccess: (project) => {
          toast.success("Proyecto creado como borrador");
          navigate(`/proyectos/${project.id}`, { replace: true });
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, "No se pudo crear el proyecto."));
        },
      },
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="flex-1 flex gap-8 px-8 py-8 max-w-[1100px] mx-auto w-full items-start">
        <aside className="w-[220px] shrink-0 sticky top-8 flex flex-col gap-4">
          <div className={`bg-paper-raised border border-rule rounded-xl p-4 flex flex-col gap-2 ${CARD_SHADOW}`}>
            <h2 className="font-heading text-[14px] font-bold text-ink m-0">Crear proyecto</h2>
            <StatusPill status={PROJECT_STATUS.DRAFT} className="self-start" />
          </div>

          <nav className={`bg-paper-raised border border-rule rounded-xl p-2 flex flex-col ${CARD_SHADOW}`}>
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`rounded-lg px-3 py-2.5 text-[12.5px] border-l-[3px] ${
                  activeSection === section.id
                    ? "bg-surface-ground font-semibold text-accent-primary border-accent-primary"
                    : "text-ink-soft border-transparent hover:bg-surface-ground"
                }`}
              >
                {section.label}
              </a>
            ))}
          </nav>
        </aside>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex-1 min-w-0 flex flex-col gap-6">
          <section
            id="info"
            ref={(el) => {
              sectionRefs.current.info = el;
            }}
            className={`flex flex-col gap-4 bg-paper-raised border border-rule rounded-xl p-6 scroll-mt-8 ${CARD_SHADOW}`}
          >
            <h2 className="font-heading text-[16px] font-bold text-ink m-0">Información del proyecto</h2>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink">Nombre del proyecto</span>
              <input
                type="text"
                {...register("name")}
                className={`${FIELD_CLASS} ${
                  errors.name ? "border-red-400 focus:outline-red-400" : "border-rule focus:outline-accent-primary"
                }`}
              />
              <FieldError message={errors.name?.message} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink">Descripción</span>
              <textarea
                rows={3}
                {...register("description")}
                className={`${FIELD_CLASS} resize-none ${
                  errors.description
                    ? "border-red-400 focus:outline-red-400"
                    : "border-rule focus:outline-accent-primary"
                }`}
              />
              <FieldError message={errors.description?.message} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink">Problemática que atiende</span>
              <textarea
                rows={2}
                {...register("problemStatement")}
                className={`${FIELD_CLASS} resize-none ${
                  errors.problemStatement
                    ? "border-red-400 focus:outline-red-400"
                    : "border-rule focus:outline-accent-primary"
                }`}
              />
              <FieldError message={errors.problemStatement?.message} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink">Objetivos</span>
              <textarea
                rows={2}
                {...register("objectives")}
                className={`${FIELD_CLASS} resize-none ${
                  errors.objectives
                    ? "border-red-400 focus:outline-red-400"
                    : "border-rule focus:outline-accent-primary"
                }`}
              />
              <FieldError message={errors.objectives?.message} />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UserPicker
                accountType="TEACHER"
                label="Docente (opcional)"
                placeholder="Buscar un docente"
                value={teacher}
                onChange={(user) => {
                  setTeacher(user);
                  setValue("teacherId", user?.id ?? null);
                }}
              />
              <UserPicker
                accountType="ORGANIZATION"
                label="Organización (opcional)"
                placeholder="Buscar una organización"
                value={organization}
                onChange={(user) => {
                  setOrganization(user);
                  setValue("organizationId", user?.id ?? null);
                }}
              />
            </div>
          </section>

          <section
            id="sdgs"
            ref={(el) => {
              sectionRefs.current.sdgs = el;
            }}
            className={`flex flex-col gap-3 bg-paper-raised border border-rule rounded-xl p-6 scroll-mt-8 ${CARD_SHADOW}`}
          >
            <div>
              <h2 className="font-heading text-[16px] font-bold text-ink m-0">Objetivos de Desarrollo Sostenible</h2>
              <p className="text-[12.5px] text-ink-faint mt-1 mb-0">Elige los ODS que impacta tu proyecto.</p>
            </div>
            {loadingSdgs ? (
              <p className="text-[12.5px] text-ink-soft">Cargando catálogo…</p>
            ) : (
              <Controller
                name="sdgIds"
                control={control}
                render={({ field }) => (
                  <SdgPicker sdgs={sdgs ?? []} value={field.value} onChange={field.onChange} />
                )}
              />
            )}
            <FieldError message={errors.sdgIds?.message as string | undefined} />
          </section>

          <section
            id="visibilidad"
            ref={(el) => {
              sectionRefs.current.visibilidad = el;
            }}
            className={`flex flex-col gap-4 bg-paper-raised border border-rule rounded-xl p-6 scroll-mt-8 ${CARD_SHADOW}`}
          >
            <h2 className="font-heading text-[16px] font-bold text-ink m-0">Visibilidad</h2>

            <Controller
              name="visibility"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-2.5">
                  <label
                    className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer ${
                      field.value === "PUBLIC" ? "border-accent-primary bg-surface-ground" : "border-rule"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={field.value === "PUBLIC"}
                      onChange={() => field.onChange("PUBLIC")}
                      className="mt-1 accent-accent-primary"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-ink">Proyecto público</span>
                      <span className="text-[12px] text-ink-faint">
                        Visible para cualquier persona en Praxis, incluido en Explorar.
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer ${
                      field.value === "PRIVATE" ? "border-accent-primary bg-surface-ground" : "border-rule"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={field.value === "PRIVATE"}
                      onChange={() => field.onChange("PRIVATE")}
                      className="mt-1 accent-accent-primary"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-ink">Borrador privado</span>
                      <span className="text-[12px] text-ink-faint">
                        Solo tú puedes verlo, hasta que decidas publicarlo.
                      </span>
                    </span>
                  </label>
                </div>
              )}
            />

            <button
              type="submit"
              disabled={createProject.isPending}
              className={`self-end rounded-full text-[13.5px] font-bold py-3 px-6 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${PRIMARY_BUTTON}`}
            >
              {createProject.isPending ? "Creando…" : "Crear proyecto"}
            </button>
          </section>
        </form>
      </div>
    </div>
  );
}

export default CreateProject;
