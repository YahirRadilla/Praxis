import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "../components/Navbar";
import { useSdgs } from "../hooks/useSdgs";
import { useCreateChallenge } from "../hooks/useChallenges";
import { getErrorMessage } from "../services/api";
import FieldError from "../components/FieldError";
import SdgPicker from "../components/SdgPicker";
import DatePicker from "../components/DatePicker";
import { createChallengeFormSchema, type CreateChallengeFormValues } from "../schemas/challenge.schema";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";

const FIELD_CLASS =
  "border rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-offset-1";

function CrearReto() {
  const navigate = useNavigate();
  const { data: sdgs, isLoading: loadingSdgs } = useSdgs();
  const createChallenge = useCreateChallenge();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateChallengeFormValues>({
    resolver: zodResolver(createChallengeFormSchema),
    defaultValues: { sdgIds: [] },
  });

  function onSubmit(values: CreateChallengeFormValues) {
    createChallenge.mutate(
      { ...values, deadline: values.deadline || undefined },
      {
        onSuccess: (challenge) => {
          toast.success("Reto publicado");
          navigate(`/retos/${challenge.id}`, { replace: true });
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, "No se pudo publicar el reto."));
        },
      },
    );
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
            <h2 className="font-heading text-[16px] font-bold text-ink m-0">Publicar un reto</h2>
            <p className="text-[12.5px] text-ink-faint m-0 -mt-2">
              Describe la problemática que tu organización quiere que resuelvan los equipos de Praxis.
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink">Título del reto</span>
              <input
                type="text"
                {...register("title")}
                className={`${FIELD_CLASS} ${
                  errors.title ? "border-red-400 focus:outline-red-400" : "border-rule focus:outline-accent-primary"
                }`}
              />
              <FieldError message={errors.title?.message} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink">Descripción</span>
              <textarea
                rows={4}
                {...register("description")}
                className={`${FIELD_CLASS} resize-none ${
                  errors.description
                    ? "border-red-400 focus:outline-red-400"
                    : "border-rule focus:outline-accent-primary"
                }`}
              />
              <FieldError message={errors.description?.message} />
            </label>

            <label className="flex flex-col gap-1.5 max-w-[220px]">
              <span className="text-[12.5px] font-semibold text-ink">Fecha límite (opcional)</span>
              <Controller
                name="deadline"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ?? null}
                    onChange={(value) => field.onChange(value ?? undefined)}
                  />
                )}
              />
            </label>
          </section>

          <section className={`flex flex-col gap-3 bg-paper-raised border border-rule rounded-xl p-6 ${CARD_SHADOW}`}>
            <div>
              <h2 className="font-heading text-[16px] font-bold text-ink m-0">Objetivos de Desarrollo Sostenible</h2>
              <p className="text-[12.5px] text-ink-faint mt-1 mb-0">Elige los ODS que atiende este reto.</p>
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

            <button
              type="submit"
              disabled={createChallenge.isPending}
              className={`self-end rounded-full text-[13.5px] font-bold py-3 px-6 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${PRIMARY_BUTTON}`}
            >
              {createChallenge.isPending ? "Publicando…" : "Publicar reto"}
            </button>
          </section>
        </form>
      </div>
    </div>
  );
}

export default CrearReto;
