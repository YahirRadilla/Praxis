import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getErrorMessage,
  updateProfileRequest,
  verifyAccountWithGoogleRequest,
  type UpdateProfilePayload,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useUpdateProfile() {
  const { token, setAuth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfileRequest(token!, payload),
    onSuccess: (updatedUser) => {
      setAuth({ user: updatedUser, token: token! });
      queryClient.invalidateQueries({ queryKey: ["user-profile", updatedUser.id] });
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
