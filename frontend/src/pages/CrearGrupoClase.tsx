import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "../components/Navbar";
import { useCreateClassGroup } from "../hooks/useClassGroups";
import { getErrorMessage } from "../services/api";
import FieldError from "../components/FieldError";
import {
  createClassGroupFormSchema,
  type CreateClassGroupFormValues,
} from "../schemas/class-group.schema";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";

const FIELD_CLASS =
  "border rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-offset-1";

function CrearGrupoClase() {
  const navigate = useNavigate();
  const createClassGroup = useCreateClassGroup();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateClassGroupFormValues>({
    resolver: zodResolver(createClassGroupFormSchema),
  });

  function onSubmit(values: CreateClassGroupFormValues) {
    createClassGroup.mutate(values, {
      onSuccess: (classGroup) => {
        toast.success("Grupo de clase creado");
        navigate(`/grupos-clase/${classGroup.id}`, { replace: true });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, "No se pudo crear el grupo de clase."));
      },
    });
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="flex-1 flex justify-center px-8 py-8">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-6 w-full max-w-[700px]"
        >
          <section className={`flex flex-col gap-4 bg-paper-raised border border-rule rounded-xl p-6 ${CARD_SHADOW}`}>
            <h2 className="font-heading text-[16px] font-bold text-ink m-0">Crear grupo de clase</h2>
            <p className="text-[12.5px] text-ink-faint m-0 -mt-2">
              Organiza a tus estudiantes y comparte documentos y proyectos con ellos.
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink">Nombre del grupo</span>
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
                rows={4}
                {...register("description")}
                className={`${FIELD_CLASS} resize-none ${
                  errors.description
                    ? "border-danger focus:outline-danger"
                    : "border-rule focus:outline-accent-primary"
                }`}
              />
              <FieldError message={errors.description?.message} />
            </label>

            <button
              type="submit"
              disabled={createClassGroup.isPending}
              className={`self-end rounded-full text-[13.5px] font-bold py-3 px-6 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${PRIMARY_BUTTON}`}
            >
              {createClassGroup.isPending ? "Creando…" : "Crear grupo"}
            </button>
          </section>
        </form>
      </div>
    </div>
  );
}

export default CrearGrupoClase;
