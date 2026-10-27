import { useQuery } from "@tanstack/react-query";
import { listCategoriesRequest } from "../services/api";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: listCategoriesRequest, staleTime: Infinity });
}
