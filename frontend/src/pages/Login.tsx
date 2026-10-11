import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLogin } from "../hooks/useAuthMutations";
import { getErrorMessage } from "../services/api";
import PasswordInput from "../components/PasswordInput";
import FieldError from "../components/FieldError";
import { loginFormSchema, type LoginFormValues } from "../schemas/auth.schema";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";

function Login() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
  });

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values, {
      onSuccess: (data) => {
        toast.success(`Bienvenido, ${data.user.name}`);
        navigate("/inicio", { replace: true });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, "No se pudo iniciar sesión. Inténtalo de nuevo."));
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
          <h1 className="font-heading text-2xl font-bold text-ink m-0">Inicia sesión</h1>
          <p className="text-[13.5px] leading-relaxed text-ink-soft m-0">
            Continúa con tu correo institucional o el que usaste al registrarte.
          </p>
        </div>

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
            placeholder="••••••••"
            hasError={!!errors.password}
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </label>

        <a href="#" className="self-end -mt-1 text-xs text-ink-soft hover:text-accent-primary">
          ¿Olvidaste tu contraseña?
        </a>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className={`rounded-full text-[13.5px] font-bold py-3.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${PRIMARY_BUTTON}`}
        >
          {loginMutation.isPending ? "Ingresando…" : "Iniciar sesión"}
        </button>

        <p className="text-center text-[12.5px] text-ink-soft mt-2">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-accent-primary font-semibold">
            Regístrate
          </Link>
        </p>
      </form>
    </main>
  );
}

export default Login;
