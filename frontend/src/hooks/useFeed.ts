import { useQuery } from "@tanstack/react-query";
import { listFeedRequest } from "../services/api";

export function useFeed() {
  return useQuery({
    queryKey: ["feed"],
    queryFn: listFeedRequest,
  });
}
