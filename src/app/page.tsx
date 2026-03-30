import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-black text-yellow-500 content-center">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm flex mb-8">
        <h1 className="sr-only">Electro en Cuotas</h1>
        {/* Usamos el logo proporcionado asumiendo que estará en la carpeta public */}
        <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
          <Image 
            src="/logo.png" 
            alt="Electro en Cuotas Logo" 
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-8 mt-4">
        <p className="text-xl max-w-2xl text-center text-yellow-200/80">
          Esta es la página principal de tu MVP. Haz clic en los siguientes módulos para explorar.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full mt-8">
          <a href="/admin" className="group rounded-lg border border-yellow-500/30 px-5 py-4 transition-colors hover:border-yellow-400 hover:bg-yellow-500/10">
            <h2 className="mb-3 text-2xl font-semibold text-yellow-300">Admin <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none text-yellow-500">-&gt;</span></h2>
            <p className="m-0 text-sm text-yellow-200/60">Validaciones y Pagos</p>
          </a>

          <a href="/vendedor" className="group rounded-lg border border-yellow-500/30 px-5 py-4 transition-colors hover:border-yellow-400 hover:bg-yellow-500/10">
            <h2 className="mb-3 text-2xl font-semibold text-yellow-300">Vendedor <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none text-yellow-500">-&gt;</span></h2>
            <p className="m-0 text-sm text-yellow-200/60">Gestión de Ventas</p>
          </a>

          <a href="/cliente" className="group rounded-lg border border-yellow-500/30 px-5 py-4 transition-colors hover:border-yellow-400 hover:bg-yellow-500/10">
            <h2 className="mb-3 text-2xl font-semibold text-yellow-300">Cliente <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none text-yellow-500">-&gt;</span></h2>
            <p className="m-0 text-sm text-yellow-200/60">Recibos de Sueldo</p>
          </a>

          <a href="/productos" className="group rounded-lg border border-yellow-500/30 px-5 py-4 transition-colors hover:border-yellow-400 hover:bg-yellow-500/10">
            <h2 className="mb-3 text-2xl font-semibold text-yellow-300">Productos <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none text-yellow-500">-&gt;</span></h2>
            <p className="m-0 text-sm text-yellow-200/60">Catálogo General</p>
          </a>
        </div>
      </div>
    </main>
  )
}
