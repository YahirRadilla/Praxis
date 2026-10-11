import { useMutation } from "@tanstack/react-query";
import { updateProfileRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useUpdateProfile() {
  const { token, setAuth } = useAuth();

  return useMutation({
    mutationFn: (payload: { name?: string; skills?: string[]; interests?: string[] }) =>
      updateProfileRequest(token!, payload),
    onSuccess: (updatedUser) => {
      setAuth({ user: updatedUser, token: token! });
    },
  });
}
