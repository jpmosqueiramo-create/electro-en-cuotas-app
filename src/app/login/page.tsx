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
        // En lugar de depender del checkbox actual, revisamos si ya tenía un rol guardado
        const savedRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
        if (savedRole === "afiliado") {
          router.push("/afiliado");
        } else {
          router.push("/cliente");
        }
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
        if (typeof window !== "undefined") {
          localStorage.setItem("userRole", "cliente");
        }
        // Force immediate routing to avoid useEffect race conditions
        router.push("/cliente");
           return;
      } else {
        // Modo Registro
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        auth.languageCode = "es";
        await sendEmailVerification(userCredential.user);
        
        alert("¡Cuenta creada exitosamente! Por favor, debes revisar tu correo electrónico (incluyendo SPAM) y hacer clic en el enlace para validar tu cuenta antes de solicitar un crédito.");
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

  if (loading) return <div className="min-h-screen bg-[#FAFAFA] text-yellow-500 flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4"> 
 <a href="/" className="absolute top-8 left-6 md:left-12 text-zinc-500 hover:text-yellow-500 flex items-center gap-2 text-sm font-bold transition-colors z-50">← Volver al Catálogo</a>

      <div className="bg-white border border-yellow-500/30 p-8 rounded-lg w-full max-w-md shadow-[0_0_20px_rgba(234,179,8,0.2)]">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-yellow-500 mb-2">Portal de Clientes</h1>
          <p className="text-gray-500">{isLogin ? "Accede a tu cuenta" : "Únete y solicita tu crédito hoy"}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-1 text-zinc-700 font-bold">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-yellow-500 rounded p-3 text-zinc-900 focus:outline-none"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-zinc-700 font-bold">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-yellow-500 rounded p-3 text-zinc-900 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          

          <button 
            type="submit" 
            disabled={cargando}
            className="w-full bg-yellow-500 text-black py-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 mt-4"
          >
            {cargando ? "Autenticando..." : (isLogin ? "Ingresar" : "Registrarme Ahora")}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-yellow-500/10 pt-6">
          <p className="text-sm text-gray-600">
            {isLogin ? "¿Eres un cliente nuevo?" : "¿Ya tienes una cuenta validada?"}
          </p>
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(""); }} 
            className="text-yellow-500 font-bold hover:underline mt-2 text-sm"
          >
            {isLogin ? "Crear una cuenta gratis" : "Iniciar Sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
