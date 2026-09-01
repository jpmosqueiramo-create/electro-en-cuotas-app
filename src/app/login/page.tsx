"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import Link from "next/link";
import { app } from "@/lib/firebase";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [dni, setDni] = useState("");
  

  useEffect(() => {
    if (user && !loading) {
      if (user.email === "jpmosqueiramo@gmail.com") {
        router.push("/admin");
      } else {
        // Si ya está logueado y entra a esta URL, forzamos el rol a cliente
        try {
          localStorage.setItem("userRole", "cliente");
        } catch (e) {
          console.error("LocalStorage error:", e);
        }
        router.push("/cliente");
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
          localStorage.setItem("userRole", "cliente");
        } catch (e) {
          console.error("LocalStorage error:", e);
        }
        // Force immediate routing to avoid useEffect race conditions
        router.push("/cliente");
           return;
      } else {
        // Modo Registro
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        auth.languageCode = "es";
        await sendEmailVerification(userCredential.user);
        
        // Auto-link solicitudes where email and DNI match
        try {
          const { collection, getDocs, query, where, updateDoc, doc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          
          const q = query(collection(db, "solicitudes"), where("clienteEmail", "==", email));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
             const data = d.data();
             const requestDni = (data.datosPersonales?.numeroDni || data.numeroDni || "").toString().replace(/\D/g, "");
             const inputDniClean = dni.replace(/\D/g, "");
             if (requestDni === inputDniClean) {
                await updateDoc(doc(db, "solicitudes", d.id), {
                   clienteId: userCredential.user.uid
                });
             }
          }
        } catch (linkErr) {
          console.error("Error auto-linking requests on signup:", linkErr);
        }
        
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

  if (loading) return <div className="min-h-screen bg-slate-100 text-zinc-900 flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-100 text-zinc-900 flex items-center justify-center p-4 font-sans"> 
 <Link href="/" className="absolute top-8 left-6 md:left-12 text-zinc-600 hover:text-[#fe5000] flex items-center gap-2 text-sm font-bold transition-colors z-50">← Volver al Catálogo</Link>

      <div className="bg-white border border-zinc-200/90 p-8 sm:p-10 rounded-3xl w-full max-w-md shadow-2xl">
        
        <div className="text-center mb-8">
          <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-24 w-auto mx-auto mb-6 object-contain shadow-2xl rounded-2xl" />
          <h1 className="text-3xl font-black text-[#fe5000] mb-2">Portal de Clientes</h1>
          <p className="text-zinc-600 font-medium">{isLogin ? "Accede a tu cuenta" : "Únete y solicita tu crédito hoy"}</p>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500 text-red-500 p-3 rounded mb-6 text-sm text-center">
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
              className="w-full bg-slate-50 border border-zinc-300 focus:bg-white focus:border-[#fe5000] focus:ring-2 focus:ring-[#fe5000]/20 rounded-xl p-3.5 text-zinc-900 placeholder-zinc-400 focus:outline-none font-medium text-base shadow-sm transition-all"
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
              className="w-full bg-slate-50 border border-zinc-300 focus:bg-white focus:border-[#fe5000] focus:ring-2 focus:ring-[#fe5000]/20 rounded-xl p-3.5 text-zinc-900 placeholder-zinc-400 focus:outline-none font-medium text-base shadow-sm transition-all"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm mb-1 text-zinc-700 font-bold">DNI del Cliente</label>
              <input 
                type="text" 
                required
                value={dni}
                onChange={e => setDni(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-slate-50 border border-zinc-300 focus:bg-white focus:border-[#fe5000] focus:ring-2 focus:ring-[#fe5000]/20 rounded-xl p-3.5 text-zinc-900 placeholder-zinc-400 focus:outline-none font-mono font-medium text-base shadow-sm transition-all"
                placeholder="Solo números"
              />
            </div>
          )}

          

          <button 
            type="submit" 
            disabled={cargando}
            className="w-full bg-gradient-to-r from-[#ff5e14] via-[#fe5000] to-[#e04600] text-white py-4 rounded-xl font-black text-base uppercase tracking-wider transition-all disabled:opacity-50 mt-4 shadow-xl shadow-orange-500/25 active:scale-95"
          >
            {cargando ? "Autenticando..." : (isLogin ? "Ingresar" : "Registrarme Ahora")}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-zinc-800 pt-6">
          <p className="text-sm text-zinc-400">
            {isLogin ? "¿Eres un cliente nuevo?" : "¿Ya tienes una cuenta validada?"}
          </p>
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(""); }} 
            className="text-[#fe5000] font-bold hover:underline mt-2 text-sm"
          >
            {isLogin ? "Crear una cuenta gratis" : "Iniciar Sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
