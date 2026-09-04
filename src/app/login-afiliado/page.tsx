"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { app } from "@/lib/firebase";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  

  useEffect(() => {
    if (user && !loading) {
      if (user.email === "jpmosqueiramo@gmail.com") {
        router.push("/admin");
      } else {
        // Si ya está logueado y entra a esta URL, forzamos el rol a afiliado
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
      if (isLogin) {
        // Modo Ingresar
        await signInWithEmailAndPassword(auth, email, password);
        try {
          localStorage.setItem("userRole", "afiliado");
        } catch (e) {
          console.error("LocalStorage error:", e);
        }
        // Force immediate routing to avoid useEffect race conditions
        router.push("/afiliado");
           return;
      } else {
        // Modo Registro
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        auth.languageCode = "es";
        await sendEmailVerification(userCredential.user);
        
        alert("¡Cuenta creada exitosamente! Por favor, debes revisar tu correo electrónico (incluyendo SPAM) y hacer clic en el enlace para validar tu cuenta para activar tu panel de comisiones.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Las credenciales son incorrectas.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Este correo ya está registrado. Intenta iniciar sesión.");
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else {
        setError("Error de sistema: " + err.message);
      }
    } finally {
      // Cargando(false) se maneja a veces después del redirect, pero limpiar el catch es útil.
      if (!user) setCargando(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] flex items-center justify-center font-sans">Cargando...</div>;

  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] flex items-center justify-center p-4 font-sans"> 
 <a href="/red-afiliados" className="absolute top-8 left-6 md:left-12 text-[#68706E] hover:text-[#173E3B] flex items-center gap-2 text-sm font-bold transition-colors z-50">← Volver a Red de Afiliados</a>

      <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-3xl w-full max-w-md shadow-xl">
        
        <div className="text-center mb-8">
          <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-24 w-auto mx-auto mb-6 object-contain shadow-2xl rounded-2xl" />
          <h1 className="text-3xl font-bold text-[#173E3B] mb-2 font-heading">Portal de Afiliados</h1>
          <p className="text-[#68706E]">{isLogin ? "Accede a tu cuenta" : "Únete al equipo de ventas hoy"}</p>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500 text-red-500 p-3 rounded mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-1 text-[#1F2928] font-bold">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#F7F3EC] border border-[#DED8CF] focus:border-[#173E3B] focus:bg-[#FFFDFC] rounded-xl p-3.5 text-[#1F2928] focus:outline-none"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-[#1F2928] font-bold">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#F7F3EC] border border-[#DED8CF] focus:border-[#173E3B] focus:bg-[#FFFDFC] rounded-xl p-3.5 text-[#1F2928] focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          

          <button 
            type="submit" 
            disabled={cargando}
            className="w-full bg-[#173E3B] hover:bg-[#123230] text-white py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-50 mt-4 shadow-md"
          >
            {cargando ? "Autenticando..." : (isLogin ? "Ingresar" : "Registrarme Ahora")}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#DED8CF] pt-6">
          <p className="text-sm text-[#68706E]">
            {isLogin ? "¿Eres un afiliado nuevo?" : "¿Ya tienes una cuenta validada?"}
          </p>
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(""); }} 
            className="text-[#173E3B] font-bold hover:underline mt-2 text-sm"
          >
            {isLogin ? "Crear una cuenta gratis" : "Iniciar Sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
