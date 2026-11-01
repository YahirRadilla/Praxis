import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage, updateProfileRequest, verifyAccountWithGoogleRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useUpdateProfile() {
  const { token, setAuth } = useAuth();

  return useMutation({
    mutationFn: (payload: { name?: string; skills?: string[]; interests?: string[]; academicProgram?: string }) =>
      updateProfileRequest(token!, payload),
    onSuccess: (updatedUser) => {
      setAuth({ user: updatedUser, token: token! });
    },
  });
}

export function useVerifyAccountWithGoogle() {
  const { token, setAuth } = useAuth();

  return useMutation({
    mutationFn: (idToken: string) => verifyAccountWithGoogleRequest(token!, idToken),
    onSuccess: (updatedUser) => {
      setAuth({ user: updatedUser, token: token! });
      toast.success("Tu cuenta quedó verificada.");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "No se pudo verificar tu cuenta con Google."));
    },
  });
}
