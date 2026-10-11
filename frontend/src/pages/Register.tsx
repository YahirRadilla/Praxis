import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useRegister } from "../hooks/useAuthMutations";
import { getErrorMessage } from "../services/api";
import PasswordInput from "../components/PasswordInput";
import FieldError from "../components/FieldError";
import { registerFormSchema, type RegisterFormValues } from "../schemas/auth.schema";
import type { AccountType } from "../types/auth";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "STUDENT", label: "Estudiante" },
  { value: "TEACHER", label: "Docente" },
  { value: "ORGANIZATION", label: "Organización" },
  { value: "INDEPENDENT", label: "Independiente" },
];

function Register() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { accountType: "STUDENT" },
  });

  const selectedAccountType = watch("accountType");

  function onSubmit(values: RegisterFormValues) {
    registerMutation.mutate(values, {
      onSuccess: (data) => {
        toast.success(`Cuenta creada, bienvenido ${data.user.name}`);
        navigate("/inicio", { replace: true });
      },
      onError: (error) => {
        toast.error(
          getErrorMessage(error, "No se pudo completar el registro. Inténtalo de nuevo."),
        );
      },
    });
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
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className={`w-full max-w-[400px] flex flex-col gap-4 bg-paper-raised border border-rule rounded-2xl p-8 ${CARD_SHADOW}`}
      >
        <div className="flex flex-col gap-1.5 text-center mb-2">
          <h1 className="font-heading text-2xl font-bold text-ink m-0">Crea tu cuenta</h1>
          <p className="text-[13.5px] leading-relaxed text-ink-soft m-0">
            Estudiante, docente, organización o independiente: elige el tipo que corresponda.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink">Nombre completo</span>
          <input
            type="text"
            placeholder="Tu nombre"
            {...register("name")}
            className={`border rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-offset-1 ${
              errors.name
                ? "border-red-400 focus:outline-red-400"
                : "border-rule focus:outline-accent-primary"
            }`}
          />
          <FieldError message={errors.name?.message} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink">Correo electrónico</span>
          <input
            type="email"
            placeholder="tu@institucion.edu"
            {...register("email")}
            className={`border rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-offset-1 ${
              errors.email
                ? "border-red-400 focus:outline-red-400"
                : "border-rule focus:outline-accent-primary"
            }`}
          />
          <FieldError message={errors.email?.message} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink">Contraseña</span>
          <PasswordInput
            placeholder="Mínimo 8 caracteres"
            hasError={!!errors.password}
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </label>

        <fieldset className="flex flex-col gap-1.5 border-0 p-0 m-0">
          <span className="text-[12.5px] font-semibold text-ink">Tipo de cuenta</span>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPES.map((option) => (
              <label
                key={option.value}
                className={`text-center rounded-lg border px-3 py-2.5 text-[12.5px] cursor-pointer ${
                  selectedAccountType === option.value
                    ? "border-accent-primary bg-surface-accent text-ink font-semibold"
                    : "border-rule text-ink-soft"
                }`}
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register("accountType")}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className={`rounded-full text-[13.5px] font-bold py-3.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${PRIMARY_BUTTON}`}
        >
          {registerMutation.isPending ? "Creando cuenta…" : "Crear cuenta"}
        </button>

        <p className="text-center text-[12.5px] text-ink-soft mt-2">
          ¿Ya tienes cuenta?{" "}
          <Link to="/" className="text-accent-primary font-semibold">
            Inicia sesión
          </Link>
        </p>
      </form>
    </main>
  );
}

export default Register;
