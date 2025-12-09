import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN",
    isOperator: user?.role === "OPERATOR",
    isViewer: user?.role === "VIEWER",
    canEdit: user?.role === "ADMIN" || user?.role === "OPERATOR",
    canManageUsers: user?.role === "ADMIN",
  };
}
