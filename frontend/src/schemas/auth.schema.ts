import { z } from "zod";

export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, "Completa este campo")
    .email("Ingresa un correo válido"),
  password: z.string().min(1, "Completa este campo"),
});

export const registerFormSchema = z.object({
  name: z.string().min(1, "Completa este campo"),
  email: z
    .string()
    .min(1, "Completa este campo")
    .email("Ingresa un correo válido"),
  password: z
    .string()
    .min(1, "Completa este campo")
    .min(8, "Debe tener al menos 8 caracteres"),
  accountType: z.enum(["STUDENT", "TEACHER", "ORGANIZATION", "INDEPENDENT"]),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
