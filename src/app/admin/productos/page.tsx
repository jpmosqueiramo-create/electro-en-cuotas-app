"use client";

import { useState, useEffect } from "react";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Producto = {
  id: string;
  nombre: string;
  precioAnterior: number | null;
  cuota12: number;
  cuota8: number;
  costoProducto: number | null;
  precioContado: number | null;
  proveedor: string;
  descripcion: string;
  imagenUrl: string;
};

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [precioAnterior, setPrecioAnterior] = useState("");
  const [cuota12, setCuota12] = useState("");
  const [cuota8, setCuota8] = useState("");
  const [costoProducto, setCostoProducto] = useState("");
  const [precioContado, setPrecioContado] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProductos = async () => {
    const querySnapshot = await getDocs(collection(db, "productos"));
    const prods: Producto[] = [];
    querySnapshot.forEach((doc) => {
      prods.push({ id: doc.id, ...doc.data() } as Producto);
    });
    setProductos(prods);
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleEditar = (p: Producto) => {
    setEditandoId(p.id);
    setNombre(p.nombre);
    setPrecioAnterior(p.precioAnterior?.toString() || "");
    setCuota12(p.cuota12.toString());
    setCuota8(p.cuota8.toString());
    setCostoProducto(p.costoProducto?.toString() || "");
    setPrecioContado(p.precioContado?.toString() || "");
    setProveedor(p.proveedor || "");
    setDescripcion(p.descripcion);
    setImagen(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelarEdicion = () => {
    setEditandoId(null);
    setNombre("");
    setPrecioAnterior("");
    setCuota12("");
    setCuota8("");
    setCostoProducto("");
    setPrecioContado("");
    setProveedor("");
    setDescripcion("");
    setImagen(null);
  };

  const handleSubirProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editandoId && !imagen) return alert("Por favor selecciona una imagen para el nuevo producto");
    setLoading(true);

    try {
      let imagenUrl = "";
      // Si el usuario subió una imagen nueva (sea creando o editando), la subimos a Storage
      if (imagen) {
        const pathStr = "productos/" + Date.now() + "_" + imagen.name;
        const imageRef = ref(storage, pathStr);
        await uploadBytes(imageRef, imagen);
        imagenUrl = await getDownloadURL(imageRef);
      }

      const payload: any = {
        nombre,
        precioAnterior: precioAnterior ? Number(precioAnterior) : null,
        cuota12: Number(cuota12),
        cuota8: Number(cuota8),
        costoProducto: costoProducto ? Number(costoProducto) : null,
        precioContado: precioContado ? Number(precioContado) : null,
        proveedor,
        descripcion,
      };

      if (imagenUrl) {
         payload.imagenUrl = imagenUrl;
      }

      if (editandoId) {
        await updateDoc(doc(db, "productos", editandoId), payload);
        alert("¡Producto actualizado con éxito!");
      } else {
        payload.fechaCreacion = new Date();
        if (!payload.imagenUrl) throw new Error("Falta URL imagen");
        await addDoc(collection(db, "productos"), payload);
        alert("¡Producto creado con éxito!");
      }

      handleCancelarEdicion();
      await fetchProductos();
    } catch (error) {
      console.error(error);
      alert("Error al guardar producto");
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar permanentemente este producto?")) return;
    try {
      await deleteDoc(doc(db, "productos", id));
      if (editandoId === id) handleCancelarEdicion(); // Si borra lo que está editando
      await fetchProductos();
    } catch (error) {
      console.error(error);
      alert("Error eliminando producto");
    }
  };

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#FAFAFA] text-yellow-500 p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-8 border-b border-yellow-500/30 pb-4">
            <div className="flex items-center gap-4">
  <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Electro en Cuotas Logo" className="h-10 w-auto object-contain" />
  <h1 className="text-2xl font-bold text-yellow-400">Gestión de Productos e Inventario</h1>
</div>
            <a href="/admin" className="text-sm border border-yellow-500/50 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded transition-colors">
              Volver al Panel Admin
            </a>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 bg-[#FAFAFA] border border-yellow-500/20 rounded-lg p-6 h-fit transition-all duration-300" style={editandoId ? {boxShadow: "0 0 30px rgba(234,179,8,0.15)", borderColor: "#eab308"} : {}}>
              <h2 className="text-xl mb-6 font-semibold border-b border-yellow-500/20 pb-2 flex items-center gap-2">
                {editandoId ? "✏️ Modificando Producto" : "Añadir Nuevo Producto"}
              </h2>
              
              <form onSubmit={handleSubirProducto} className="space-y-5">
                <div>
                  <label className="block text-sm mb-1 text-yellow-200">Nombre del equipo</label>
                  <input required value={nombre} onChange={e=>setNombre(e.target.value)} type="text" className="w-full bg-gray-100 border border-gray-700 rounded p-2 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
                
                {/* BLOQUE DATOS INTERNOS ADMINISTRATIVOS */}
                <div className="p-4 bg-[#FAFAFA] border border-t border-gray-700 rounded-lg space-y-4">
                   <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 border-b border-gray-800 pb-2">Datos Internos (Ocultos)</h3>
                   <div>
                     <label className="block text-xs mb-1 text-gray-500">Costo Base del Producto</label>
                     <input value={costoProducto} onChange={e=>setCostoProducto(e.target.value)} type="number" placeholder="Ej: 80000" className="w-full bg-gray-100 border border-gray-700 rounded p-2 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                   </div>
                   <div>
                     <label className="block text-xs mb-1 text-gray-500">Precio Venta (Contado / Efectivo)</label>
                     <input value={precioContado} onChange={e=>setPrecioContado(e.target.value)} type="number" placeholder="Ej: 110000" className="w-full bg-gray-100 border border-gray-700 rounded p-2 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                   </div>
                   <div>
                     <label className="block text-xs mb-1 text-gray-500">Nombre del Proveedor</label>
                     <input value={proveedor} onChange={e=>setProveedor(e.target.value)} type="text" placeholder="Ej: Distribuidora ElectroSur" className="w-full bg-gray-100 border border-gray-700 rounded p-2 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                   </div>
                </div>

                {/* BLOQUE PRECIOS PUBLICOS DE OFERTA */}
                <div className="p-4 bg-white border border-yellow-500/20 rounded-lg space-y-4">
                   <h3 className="text-xs text-yellow-500 font-bold uppercase tracking-wider mb-2 border-b border-yellow-500/20 pb-2">Estrategia Pública (App y Web)</h3>
                   <div>
                     <label className="block text-xs mb-1 text-gray-500">Precio Lista (Para mostrar tachado)</label>
                     <input value={precioAnterior} onChange={e=>setPrecioAnterior(e.target.value)} type="number" placeholder="Ej: 150000" className="w-full bg-gray-100 border border-gray-700 rounded p-2 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold mb-1 text-yellow-400">Valor Cuota (12 Meses)</label>
                     <input required value={cuota12} onChange={e=>setCuota12(e.target.value)} type="number" placeholder="Ej: 12500" className="w-full bg-gray-100 border border-yellow-500/50 rounded p-2 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold mb-1 text-yellow-600">Valor Cuota (8 Meses)</label>
                     <input required value={cuota8} onChange={e=>setCuota8(e.target.value)} type="number" placeholder="Ej: 18000" className="w-full bg-gray-100 border border-yellow-500/30 rounded p-2 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                   </div>
                </div>

                <div>
                  <label className="block text-sm mb-1 text-yellow-200">Descripción corta</label>
                  <textarea required value={descripcion} onChange={e=>setDescripcion(e.target.value)} className="w-full bg-gray-100 border border-gray-700 rounded p-2 text-zinc-900 focus:border-yellow-500 focus:outline-none" rows={3} />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-yellow-200">
                    Imagen / Foto {editandoId && <span className="text-gray-500 text-xs ml-1">(Dejar vacío para no cambiar la foto actual)</span>}
                  </label>
                  <input required={!editandoId} type="file" accept="image/*" onChange={e => {if (e.target.files) setImagen(e.target.files[0])}} className="w-full bg-gray-100 border border-gray-700 rounded p-2 text-zinc-900 file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:bg-yellow-500 file:text-black hover:file:bg-yellow-400 transition-colors" />
                </div>
                
                <div className="pt-4 flex flex-col gap-3">
                  <button disabled={loading} type="submit" className={`w-full text-black py-4 rounded font-bold transition-colors shadow-lg \${editandoId ? 'bg-blue-500 hover:bg-blue-400' : 'bg-yellow-500 hover:bg-yellow-400'} disabled:opacity-50`}>
                    {loading ? "Guardando..." : (editandoId ? "💾 Guardar Cambios" : "Crear Producto")}
                  </button>
                  
                  {editandoId && (
                    <button type="button" onClick={handleCancelarEdicion} className="w-full bg-transparent border border-gray-600 text-gray-500 py-2 rounded hover:text-zinc-900 hover:bg-gray-800 transition-colors text-sm">
                      Cancelar Edición
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-8 bg-[#FAFAFA] border border-yellow-500/20 rounded-lg p-6">
              <h2 className="text-xl mb-6 font-semibold border-b border-yellow-500/20 pb-2">Inventario General ({productos.length})</h2>
              {productos.length === 0 ? (
                <p className="text-yellow-200/50 italic">No hay productos en tu base de datos todavía.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {productos.map(p => (
                    <div key={p.id} className={`border rounded-xl bg-white flex flex-col shadow-lg overflow-hidden transition-all \${editandoId === p.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-yellow-500/20'}`}>
                      <div className="h-40 relative bg-[#f8f8f8] p-2 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imagenUrl} alt={p.nombre} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                        {editandoId === p.id && <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] flex items-center justify-center z-10"><span className="bg-blue-600 text-white font-bold px-3 py-1 rounded-full text-xs shadow-xl">EDITANDO</span></div>}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-md mb-4 line-clamp-2 leading-tight">{p.nombre}</h3>
                        
                        {/* Datos Internos Admin */}
                        <div className="bg-[#FAFAFA] border border-gray-200 p-3 rounded-lg mb-3 text-xs flex flex-col gap-1">
                          <p className="text-gray-500 font-bold uppercase mb-1 border-b border-gray-200 pb-1">Administrativo</p>
                          <p className="text-gray-600">Costo: <span className="font-mono">${p.costoProducto || 0}</span></p>
                          <p className="text-gray-600">Contado: <span className="text-green-400 font-mono font-bold">${p.precioContado || 0}</span></p>
                          <p className="text-gray-600 line-clamp-1">Provee: <span className="text-yellow-100">{p.proveedor || "No indicado"}</span></p>
                        </div>

                        {/* Datos Publicos Cuotas */}
                        <div className="bg-white border border-yellow-500/20 p-3 rounded-lg mb-5 text-xs">
                          <p className="text-yellow-500 font-bold uppercase mb-1 border-b border-yellow-500/20 pb-1">Público</p>
                          {p.precioAnterior && <p className="text-gray-500 line-through mb-1">Antes: ${p.precioAnterior}</p>}
                          <p className="text-yellow-400 font-bold text-sm mb-1">12 x ${p.cuota12}</p>
                          <p className="text-yellow-600 font-bold text-sm">8 x ${p.cuota8}</p>
                        </div>
                        
                        <div className="mt-auto flex gap-2 w-full">
                          <button onClick={() => handleEditar(p)} className="flex-1 text-sm bg-gray-100 text-blue-400 border border-gray-300 hover:bg-gray-200 hover:text-blue-300 hover:border-blue-500 py-2.5 rounded-lg text-center transition-all font-bold tracking-widest uppercase">
                            Editar
                          </button>
                          <button onClick={() => handleEliminar(p.id)} className="flex-1 text-sm bg-gray-100 text-red-500/80 border border-gray-300 hover:bg-red-900/50 hover:text-red-400 hover:border-red-900 py-2.5 rounded-lg text-center transition-all font-bold tracking-widest uppercase">
                            Borrar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
