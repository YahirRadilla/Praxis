import { useQuery } from "@tanstack/react-query";
import { listFeedRequest } from "../services/api";

export function useFeed(categoryId?: number) {
  return useQuery({
    queryKey: ["feed", categoryId],
    queryFn: () => listFeedRequest({ categoryId }),
  });
}
