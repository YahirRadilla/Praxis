import { useMutation } from "@tanstack/react-query";
import { loginRequest, registerRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useLogin() {
  const { setAuth } = useAuth();
  return useMutation({
    mutationFn: loginRequest,
    onSuccess: setAuth,
  });
}

export function useRegister() {
  const { setAuth } = useAuth();
  return useMutation({
    mutationFn: registerRequest,
    onSuccess: setAuth,
  });
}
