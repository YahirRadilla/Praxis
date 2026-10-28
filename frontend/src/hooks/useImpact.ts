import { useQuery } from "@tanstack/react-query";
import { getImpactRequest } from "../services/api";

export function useImpact() {
  return useQuery({
    queryKey: ["impact"],
    queryFn: getImpactRequest,
  });
}
