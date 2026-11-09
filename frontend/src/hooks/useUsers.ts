import { useQuery } from "@tanstack/react-query";
import { searchUsersRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useSearchUsers(accountType: string | undefined, q: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["users", accountType, q],
    queryFn: () => searchUsersRequest(token!, { accountType, q: q || undefined }),
    // Only search once the viewer has actually typed something — without
    // this, opening the picker fires a query with an empty `q`, and the
    // backend returns its first 20 users with no filter at all.
    enabled: !!token && q.trim().length > 0,
  });
}
