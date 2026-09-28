import { db } from "./firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

export interface Vendedor {
  id?: string;
  nombre: string;
  email: string;
  localidad: string;
  porcentajeComision: number; // e.g. 15 for 15%
  telefono?: string;
  activo?: boolean;
  fechaCreacion?: any;
}

const DEFAULT_VENDEDORES: Vendedor[] = [
  { nombre: "Ventas Directas CABA", email: "ventas.caba@cuentahogar.com", localidad: "CABA", porcentajeComision: 15, activo: true },
  { nombre: "Sucursal Junín", email: "junin@cuentahogar.com", localidad: "Junín", porcentajeComision: 15, activo: true },
  { nombre: "Sucursal Lincoln", email: "lincoln@cuentahogar.com", localidad: "Lincoln", porcentajeComision: 15, activo: true },
  { nombre: "Sucursal Chivilcoy", email: "chivilcoy@cuentahogar.com", localidad: "Chivilcoy", porcentajeComision: 15, activo: true },
  { nombre: "Sucursal Nueve de Julio", email: "9dejulio@cuentahogar.com", localidad: "9 de Julio", porcentajeComision: 15, activo: true }
];

export const obtenerVendedores = async (): Promise<Vendedor[]> => {
  try {
    const snap = await getDocs(collection(db, "vendedores"));
    const list: Vendedor[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Vendedor);
    });

    if (list.length === 0) {
      // Check if we already seeded previously to avoid re-seeding if user intentionally deleted all
      const hasSeeded = typeof window !== "undefined" && localStorage.getItem("vendedores_initial_seeded");
      if (!hasSeeded) {
        if (typeof window !== "undefined") localStorage.setItem("vendedores_initial_seeded", "true");
        for (const v of DEFAULT_VENDEDORES) {
          try {
            const docRef = await addDoc(collection(db, "vendedores"), {
              ...v,
              fechaCreacion: serverTimestamp()
            });
            list.push({ id: docRef.id, ...v });
          } catch (e) {}
        }
      }
    }
    return list.filter(v => v.activo !== false);
  } catch (e) {
    console.error("Error al obtener vendedores:", e);
    return DEFAULT_VENDEDORES;
  }
};

export const crearVendedor = async (vendedor: Omit<Vendedor, "id">): Promise<Vendedor> => {
  const payload = {
    ...vendedor,
    porcentajeComision: Number(vendedor.porcentajeComision) || 15,
    activo: true,
    fechaCreacion: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, "vendedores"), payload);
  return { id: docRef.id, ...payload };
};

export const actualizarVendedor = async (id: string, updates: Partial<Vendedor>): Promise<void> => {
  const docRef = doc(db, "vendedores", id);
  await updateDoc(docRef, updates);
};

export const eliminarVendedor = async (id: string): Promise<void> => {
  const docRef = doc(db, "vendedores", id);
  await deleteDoc(docRef);
};
