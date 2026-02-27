// hooks/useUser.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { getUser, type User } from "@/utils/authClient";

/**
 * Hook de récupération de l’utilisateur courant.
 */
export function useUser() {
  return useQuery<User | null>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const user = await getUser();
      if (!user) throw new Error("Non authentifié");
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // 1 seul retry si échec (token expiré, réseau)
  });
}