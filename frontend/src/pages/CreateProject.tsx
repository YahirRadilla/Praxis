import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "../components/Navbar";
import { useSdgs } from "../hooks/useSdgs";
import { useCategories } from "../hooks/useCategories";
import { useCreateProject } from "../hooks/useProjects";
import { useChallenge } from "../hooks/useChallenges";
import { useClassGroup } from "../hooks/useClassGroups";
import { getErrorMessage } from "../services/api";
import FieldError from "../components/FieldError";
import SdgPicker from "../components/SdgPicker";
import CategoryPicker from "../components/CategoryPicker";
import UserPicker from "../components/UserPicker";
import type { ProjectPersonRef } from "../types/project";
import { createProjectFormSchema, type CreateProjectFormValues } from "../schemas/project.schema";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";

const SECTIONS = [
  { id: "info", label: "Información del proyecto" },
  { id: "categorias", label: "Categorías" },
  { id: "sdgs", label: "Objetivos de Desarrollo Sostenible" },
  { id: "reto", label: "Reto" },
  { id: "grupo-clase", label: "Grupo de clase" },
  { id: "visibilidad", label: "Visibilidad" },
];

const FIELD_CLASS =
  "border rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-offset-1";

function CreateProject() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: sdgs, isLoading: loadingSdgs } = useSdgs();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const createProject = useCreateProject();
  const [activeSection, setActiveSection] = useState("info");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [teacher, setTeacher] = useState<ProjectPersonRef | null>(null);
  const [organization, setOrganization] = useState<ProjectPersonRef | null>(null);

  const queryChallengeId = Number(searchParams.get("challengeId"));
  const [linkedChallengeId, setLinkedChallengeId] = useState<number | null>(
    Number.isFinite(queryChallengeId) && queryChallengeId > 0 ? queryChallengeId : null,
  );
  const { data: linkedChallenge } = useChallenge(linkedChallengeId ?? NaN);
  const sdgsPrefilledFromChallenge = useRef(false);

  const queryClassGroupId = Number(searchParams.get("classGroupId"));
  const [linkedClassGroupId, setLinkedClassGroupId] = useState<number | null>(
    Number.isFinite(queryClassGroupId) && queryClassGroupId > 0 ? queryClassGroupId : null,
  );
  const { data: linkedClassGroup } = useClassGroup(linkedClassGroupId ?? NaN);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: {
      sdgIds: [],
      categoryIds: [],
      visibility: "PRIVATE",
      challengeId: linkedChallengeId,
      classGroupId: linkedClassGroupId,
    },
  });

  useEffect(() => {
    setValue("challengeId", linkedChallengeId);
  }, [linkedChallengeId, setValue]);

  useEffect(() => {
    setValue("classGroupId", linkedClassGroupId);
  }, [linkedClassGroupId, setValue]);

  // Pre-fill the ODS multi-select with the linked Reto's own ODS as a sensible
  // default, once, so the student doesn't have to re-pick goals the Reto
  // already declared. They can still change/add/remove them afterward.
  useEffect(() => {
    if (!linkedChallenge || sdgsPrefilledFromChallenge.current) return;
    sdgsPrefilledFromChallenge.current = true;
    setValue(
      "sdgIds",
      linkedChallenge.sdgs.map(({ sdgId }) => sdgId),
    );
  }, [linkedChallenge, setValue]);

  // An IntersectionObserver with a narrow trigger band near the top of the
  // viewport can't highlight short trailing sections ("Grupo de clase",
  // "Visibilidad"): once scrolled near the document's bottom, there's no
  // more room below them to push them up into that band, so the nav never
  // updates and clicking those tabs looks broken. The scroll-position
  // heuristic below still shares that limitation when several short
  // sections land fully on screen at once, so an explicit tab click (see
  // the nav `onClick` below) sets the section directly; `suppressScrollRef`
  // stops the scroll handler fired by that same click's jump from
  // immediately re-deriving (and overriding) a different section.
  const suppressScrollRef = useRef(false);

  useEffect(() => {
    function updateActiveSection() {
      if (suppressScrollRef.current) return;
      const threshold = window.innerHeight * 0.3;
      let current = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const el = sectionRefs.current[id];
        if (el && el.getBoundingClientRect().top <= threshold) current = id;
      }
      setActiveSection(current);
    }
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  function onSubmit(values: CreateProjectFormValues) {
    // Teacher/organization picks never travel as teacherId/organizationId
    // (plan §2 decision #6): they become pending EVALUATOR invites the
    // target accepts later, not immediate links (WU-08).
    const evaluatorInviteIds = [teacher?.id, organization?.id].filter(
      (value): value is number => typeof value === "number",
    );
    createProject.mutate(
      {
        ...values,
        evaluatorInviteIds: evaluatorInviteIds.length ? evaluatorInviteIds : undefined,
        challengeId: values.challengeId ?? undefined,
        classGroupId: values.classGroupId ?? undefined,
      },
      {
        onSuccess: (project) => {
          toast.success("Proyecto creado");
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

      <div className="flex-1 flex flex-col md:flex-row gap-8 px-4 md:px-8 py-8 max-w-[1100px] mx-auto w-full items-stretch md:items-start">
        <aside className="w-full md:w-[220px] md:shrink-0 md:sticky md:top-8 flex flex-col gap-4">
          <div className={`bg-paper-raised border border-rule rounded-xl p-4 flex flex-col gap-2 ${CARD_SHADOW}`}>
            <h2 className="font-heading text-[14px] font-bold text-ink m-0">Crear proyecto</h2>
          </div>

          <nav className={`bg-paper-raised border border-rule rounded-xl p-2 flex flex-col ${CARD_SHADOW}`}>
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => {
                  setActiveSection(section.id);
                  suppressScrollRef.current = true;
                  window.setTimeout(() => {
                    suppressScrollRef.current = false;
                  }, 600);
                }}
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
                  errors.name ? "border-danger focus:outline-danger" : "border-rule focus:outline-accent-primary"
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
                    ? "border-danger focus:outline-danger"
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
                    ? "border-danger focus:outline-danger"
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
                    ? "border-danger focus:outline-danger"
                    : "border-rule focus:outline-accent-primary"
                }`}
              />
              <FieldError message={errors.objectives?.message} />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {linkedClassGroupId ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-semibold text-ink">Docente</span>
                  <p className="text-[12.5px] text-ink-faint m-0 rounded-lg border border-rule bg-surface-ground px-3.5 py-3">
                    {linkedClassGroup
                      ? `${linkedClassGroup.teacher.name} quedará vinculado como evaluador, sin invitación, por ser el docente de este grupo de clase.`
                      : "El docente del grupo de clase quedará vinculado como evaluador automáticamente."}
                  </p>
                </div>
              ) : (
                <UserPicker
                  accountType="TEACHER"
                  label="Docente (opcional)"
                  placeholder="Buscar un docente"
                  value={teacher}
                  onChange={setTeacher}
                />
              )}
              <UserPicker
                accountType="ORGANIZATION"
                label="Organización (opcional)"
                placeholder="Buscar una organización"
                value={organization}
                onChange={setOrganization}
              />
            </div>
            {/* Scoped to the moment a pick is made, instead of a permanent
                disclaimer under empty pickers. */}
            {(teacher || organization) && (
              <p className="text-[12px] text-ink-faint m-0">
                Le enviaremos una invitación; quedará vinculado cuando acepte.
              </p>
            )}
          </section>

          <section
            id="categorias"
            ref={(el) => {
              sectionRefs.current.categorias = el;
            }}
            className={`flex flex-col gap-3 bg-paper-raised border border-rule rounded-xl p-6 scroll-mt-8 ${CARD_SHADOW}`}
          >
            <div>
              <h2 className="font-heading text-[16px] font-bold text-ink m-0">Categorías</h2>
              <p className="text-[12.5px] text-ink-faint mt-1 mb-0">
                Elige de 1 a 3 categorías que describan la disciplina de tu proyecto.
              </p>
            </div>
            {loadingCategories ? (
              <p className="text-[12.5px] text-ink-soft">Cargando catálogo…</p>
            ) : (
              <Controller
                name="categoryIds"
                control={control}
                render={({ field }) => (
                  <CategoryPicker categories={categories ?? []} value={field.value} onChange={field.onChange} />
                )}
              />
            )}
            <FieldError message={errors.categoryIds?.message as string | undefined} />
          </section>

          <section
            id="sdgs"
            ref={(el) => {
              sectionRefs.current.sdgs = el;
            }}
            className={`flex flex-col gap-3 bg-paper-raised border border-rule rounded-xl p-6 scroll-mt-8 ${CARD_SHADOW}`}
          >
            <div>
              <h2 className="font-heading text-[16px] font-bold text-ink m-0">
                Objetivos de Desarrollo Sostenible (opcional)
              </h2>
              <p className="text-[12.5px] text-ink-faint mt-1 mb-0">
                Si tu proyecto atiende algún ODS, selecciónalo aquí.
              </p>
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
            id="reto"
            ref={(el) => {
              sectionRefs.current.reto = el;
            }}
            className={`flex flex-col gap-3 bg-paper-raised border border-rule rounded-xl p-6 scroll-mt-8 ${CARD_SHADOW}`}
          >
            <div>
              <h2 className="font-heading text-[16px] font-bold text-ink m-0">Vincular a un reto (opcional)</h2>
              <p className="text-[12.5px] text-ink-faint mt-1 mb-0">
                Si tu proyecto responde a un reto publicado por una organización, puedes vincularlo aquí.
              </p>
            </div>

            {linkedChallengeId ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-rule bg-surface-ground px-3.5 py-3">
                <span className="text-[13px] text-ink">
                  {linkedChallenge ? linkedChallenge.title : "Cargando reto…"}
                </span>
                <button
                  type="button"
                  onClick={() => setLinkedChallengeId(null)}
                  className="text-[12px] font-semibold text-accent-primary cursor-pointer shrink-0"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <Link to="/retos" className="self-start text-[12.5px] font-semibold text-accent-primary">
                Elegir un reto existente →
              </Link>
            )}
          </section>

          <section
            id="grupo-clase"
            ref={(el) => {
              sectionRefs.current["grupo-clase"] = el;
            }}
            className={`flex flex-col gap-3 bg-paper-raised border border-rule rounded-xl p-6 scroll-mt-8 ${CARD_SHADOW}`}
          >
            <div>
              <h2 className="font-heading text-[16px] font-bold text-ink m-0">Grupo de clase (opcional)</h2>
              <p className="text-[12.5px] text-ink-faint mt-1 mb-0">
                Si este proyecto es para un grupo de clase, puedes vincularlo aquí.
              </p>
            </div>

            {linkedClassGroupId ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-rule bg-surface-ground px-3.5 py-3">
                <span className="text-[13px] text-ink">
                  {linkedClassGroup ? linkedClassGroup.name : "Cargando grupo de clase…"}
                </span>
                <button
                  type="button"
                  onClick={() => setLinkedClassGroupId(null)}
                  className="text-[12px] font-semibold text-accent-primary cursor-pointer shrink-0"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <Link to="/grupos-clase" className="self-start text-[12.5px] font-semibold text-accent-primary">
                Elegir un grupo de clase existente →
              </Link>
            )}
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
                      <span className="text-[13px] font-semibold text-ink">Público</span>
                      <span className="text-[12px] text-ink-faint">
                        Cualquier persona en Praxis puede verlo, incluido en Explorar.
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
                      <span className="text-[13px] font-semibold text-ink">Privado</span>
                      <span className="text-[12px] text-ink-faint">
                        Solo tu equipo y tu evaluador lo ven. Puedes hacerlo público cuando quieras.
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
