import { useState, type FormEvent } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-8 p-6">
      <div className="flex items-center gap-2.5">
        <span className="relative w-[30px] h-[30px] rounded-full border-4 border-ink">
          <span className="absolute top-px -right-px w-2.5 h-2.5 rounded-full bg-paper-raised border-[1.6px] border-ink" />
        </span>
        <span className="font-heading text-[17px] font-bold text-ink">Praxis</span>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-[400px] flex flex-col gap-4">
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
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@institucion.edu"
            className="border border-rule rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-accent-primary focus:outline-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink">Contraseña</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="border border-rule rounded-lg bg-paper px-3.5 py-3 text-[13px] text-ink focus:outline-2 focus:outline-accent-primary focus:outline-offset-1"
          />
        </label>

        <a href="#" className="self-end -mt-1 text-xs text-ink-soft hover:text-accent-primary">
          ¿Olvidaste tu contraseña?
        </a>

        <button
          type="submit"
          className="rounded-full bg-ink text-paper text-[13.5px] font-bold py-3.5 cursor-pointer hover:bg-accent-primary"
        >
          Iniciar sesión
        </button>

        {submitted && (
          <p className="text-center text-[11.5px] text-ink-faint m-0">
            Pantalla de interfaz únicamente — la autenticación real llega en la Revisión 5.
          </p>
        )}

        <p className="text-center text-[12.5px] text-ink-soft mt-2">
          ¿No tenés cuenta?{" "}
          <a href="#" className="text-accent-primary font-semibold">
            Regístrate
          </a>
        </p>
      </form>
    </main>
  );
}

export default Login;
