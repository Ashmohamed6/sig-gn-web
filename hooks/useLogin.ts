// hooks/useLogin.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login, selectProject, type User, type RefProject } from "@/utils/authClient";

type LoginPayload = { email: string; password: string };

function isAdmin(u?: User | null) {
  return !!u?.is_superuser || (u?.role || "").toLowerCase() === "admin";
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      return login(payload.email, payload.password);
    },
    onSuccess: (user) => {
      // Purger le cache react-query pour éviter des données user périmées
      queryClient.clear();
      if (!user) {
        router.replace("/login");
        return;
      }

      const projects: RefProject[] = user.projects ?? [];

      if (isAdmin(user)) {
        router.replace("/project-selection?change=true");
        return;
      }

      if (!projects.length) {
        router.replace("/no-project");
        return;
      }

      // user normal => auto
      selectProject(projects[0]);
      router.replace("/dashboard");
    },
  });
}