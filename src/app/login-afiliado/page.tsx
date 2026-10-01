"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      if (user.email === "jpmosqueiramo@gmail.com") {
        router.push("/admin");
      } else {
        try {
          localStorage.setItem("userRole", "afiliado");
        } catch (e) {
          console.error("LocalStorage error:", e);
        }
        router.push("/afiliado");
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    const auth = getAuth(app);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      try {
        localStorage.setItem("userRole", "afiliado");
      } catch (e) {
        console.error("LocalStorage error:", e);
      }
      router.push("/afiliado");
      return;
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Las credenciales son incorrectas.");
      } else {
        setError("Error de sistema: " + err.message);
      }
    } finally {
      if (!user) setCargando(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#111318] text-white flex items-center justify-center font-sans">Cargando...</div>;

  return (
    <div className="min-h-screen bg-[#111318] text-white flex items-center justify-center p-4 font-sans"> 
      <a href="/red-afiliados" className="absolute top-8 left-6 md:left-12 text-[#9CA3AF] hover:text-[#FFD21A] flex items-center gap-2 text-sm font-bold transition-colors z-50">← Volver a Red de Afiliados</a>

      <div className="bg-[#161922] border border-[#222530] p-8 sm:p-10 rounded-3xl w-full max-w-md shadow-xl">
        
        <div className="text-center mb-8">
          <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-24 w-auto mx-auto mb-6 object-contain shadow-2xl rounded-2xl" />
          <h1 className="text-3xl font-bold text-[#FFD21A] mb-2 font-heading">Portal de Afiliados</h1>
          <p className="text-[#9CA3AF]">Accede a tu cuenta corporativa</p>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500 text-red-500 p-3 rounded-xl mb-6 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm mb-1 text-white font-bold">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#111318] border border-[#222530] focus:border-[#173E3B] focus:bg-[#161922] rounded-xl p-3.5 text-white focus:outline-none"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-white font-bold">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#111318] border border-[#222530] focus:border-[#173E3B] focus:bg-[#161922] rounded-xl p-3.5 text-white focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            className="w-full bg-[#111318] hover:bg-[#123230] text-white py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-50 mt-4 shadow-md cursor-pointer"
          >
            {cargando ? "Autenticando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#222530] pt-6">
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            🔒 Las credenciales de acceso son otorgadas exclusivamente por la administración de Cuenta Hogar.
          </p>
        </div>
      </div>
    </div>
  );
}
