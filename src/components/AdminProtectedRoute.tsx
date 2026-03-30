"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/login?error=unauthorized");
    }
  }, [user, isAdmin, loading, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-yellow-500">Verificando credenciales...</div>;
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
