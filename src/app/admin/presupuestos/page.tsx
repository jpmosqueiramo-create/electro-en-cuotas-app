"use client";

import { Suspense } from "react";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { BudgetV2Workspace } from "@/components/admin/budgets/BudgetV2Workspace";

export default function PresupuestosPage() {
  return (
    <AdminProtectedRoute>
      <Suspense fallback={<p className="p-8 text-center">Cargando presupuestos V2...</p>}>
        <BudgetV2Workspace />
      </Suspense>
    </AdminProtectedRoute>
  );
}
