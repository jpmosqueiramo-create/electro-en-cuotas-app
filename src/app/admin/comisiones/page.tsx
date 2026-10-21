"use client";
import {AdminNav} from '@/components/AdminNav';
import {AdminProtectedRoute} from '@/components/AdminProtectedRoute';
import {AffiliateRegistryWorkspace} from '@/components/admin/AffiliateRegistryWorkspace';
import {AffiliateCommissionWorkspace} from '@/components/admin/AffiliateCommissionWorkspace';
import {AffiliateAdminHistory} from '@/components/admin/AffiliateAdminHistory';
export default function AdminComisionesPage(){return <AdminProtectedRoute><main className="min-h-screen bg-[#F5F1EA] text-[#3D342B]"><AdminNav/><div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6"><h1 className="text-2xl font-bold">Vendedores afiliados y comisiones</h1><p>Un único registro y una cuenta por vendedor afiliado independiente. Las asignaciones se realizan desde la Ficha Única de cada operación.</p><AffiliateRegistryWorkspace/><AffiliateCommissionWorkspace/><AffiliateAdminHistory/></div></main></AdminProtectedRoute>;}
