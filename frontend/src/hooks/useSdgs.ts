import { useQuery } from "@tanstack/react-query";
import { listSdgsRequest } from "../services/api";

export function useSdgs() {
  return useQuery({ queryKey: ["sdgs"], queryFn: listSdgsRequest, staleTime: Infinity });
}
