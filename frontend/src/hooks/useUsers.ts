import { useQuery } from "@tanstack/react-query";
import { searchUsersRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useSearchUsers(accountType: string | undefined, q: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["users", accountType, q],
    queryFn: () => searchUsersRequest(token!, { accountType, q: q || undefined }),
    enabled: !!token,
  });
}
