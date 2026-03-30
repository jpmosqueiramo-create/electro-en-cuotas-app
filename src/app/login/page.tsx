"use client";

import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (typeof window === "undefined") return;
      
      const auth = getAuth(app);
      await signInWithEmailAndPassword(auth, email, password);
      
      if (email.toLowerCase() === "jpmosqueiramo@gmail.com") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError("Error al iniciar sesión. Verifica tus credenciales.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-md p-8 space-y-8 bg-zinc-900 rounded-xl border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-yellow-500">
            Ingreso a la Plataforma
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="sr-only">Email</label>
              <input
                type="email"
                required
                className="relative block w-full appearance-none rounded-md border border-gray-700 bg-zinc-800 px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-yellow-500 focus:outline-none focus:ring-yellow-500 sm:text-sm"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="sr-only">Contraseña</label>
              <input
                type="password"
                required
                className="relative block w-full appearance-none rounded-md border border-gray-700 bg-zinc-800 px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-yellow-500 focus:outline-none focus:ring-yellow-500 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-yellow-500 py-2 px-4 text-sm font-medium text-black hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-black"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
