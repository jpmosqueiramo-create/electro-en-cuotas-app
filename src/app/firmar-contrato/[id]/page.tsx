"use client";

import { use, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { generarContratoModelo, generarNumeroContratoEstructurado } from "@/lib/pdfGenerator";
import { 
  FileText, ShieldCheck, CheckCircle2, AlertCircle, 
  Download, ExternalLink, Lock, CheckSquare, User, MapPin, 
  Phone, Mail, Calendar, Package, DollarSign
} from "lucide-react";
import Link from "next/link";

export default function FirmarContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [solicitud, setSolicitud] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Identity Validation State
  const [dniIngresado, setDniIngresado] = useState("");
  const [identidadValidada, setIdentidadValidada] = useState(false);
  const [errorIdentidad, setErrorIdentidad] = useState<string | null>(null);

  // Contract Signature State
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [firmadoExitoso, setFirmadoExitoso] = useState(false);

  useEffect(() => {
    const fetchSolicitud = async () => {
      setLoading(true);
      try {
        // Try solicitudes collection
        let docRef = doc(db, "solicitudes", id);
        let snap = await getDoc(docRef);

        let collectionType = "solicitudes";

        // Fallback to solicitudes_cuenta if not found
        if (!snap.exists()) {
          docRef = doc(db, "solicitudes_cuenta", id);
          snap = await getDoc(docRef);
          collectionType = "solicitudes_cuenta";
        }

        if (snap.exists()) {
          const data = snap.data();
          const obj = { id: snap.id, _collection: collectionType, ...data };
          setSolicitud(obj);

          // If already signed, set state
          if (data.contratoFirmado || data.estadoContrato === "AUTORIZADO") {
            setIdentidadValidada(true);
            setFirmadoExitoso(true);
          }
        } else {
          setError("No se encontró el contrato o la solicitud especificada.");
        }
      } catch (err: any) {
        console.error("Error al cargar contrato:", err);
        setError("Error al cargar la información del contrato.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSolicitud();
    }
  }, [id]);

  const handleValidarIdentidad = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorIdentidad(null);

    const dniReal = (
      solicitud?.numeroDni || 
      solicitud?.dni || 
      solicitud?.datosPersonales?.numeroDni || 
      ""
    ).toString().replace(/\D/g, "");

    const inputClean = dniIngresado.replace(/\D/g, "");

    if (!inputClean) {
      setErrorIdentidad("Por favor, ingresá tu número de DNI.");
      return;
    }

    if (dniReal && inputClean !== dniReal) {
      setErrorIdentidad("El número de DNI no coincide con el titular del contrato.");
      return;
    }

    setIdentidadValidada(true);
  };

  const handleFirmarContrato = async () => {
    if (!aceptoTerminos || !solicitud) return;
    setFirmando(true);

    try {
      // Get Client IP address for legal audit trail
      let publicIp = "Sin IP detectable";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        if (ipData.ip) publicIp = ipData.ip;
      } catch(e) {}

      const nroContratoEst = generarNumeroContratoEstructurado(solicitud);
      const fechaFirma = new Date().toISOString();

      const updatePayload = {
        contratoFirmado: true,
        estadoContrato: "AUTORIZADO",
        fechaFirmaDigital: fechaFirma,
        ipFirmaDigital: publicIp,
        metodoFirma: "LINK_DIRECTO_WHATSAPP_EMAIL",
        dispositivoFirma: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
        nroContrato: nroContratoEst
      };

      const docRef = doc(db, solicitud._collection || "solicitudes", solicitud.id);
      await updateDoc(docRef, updatePayload);

      setSolicitud((prev: any) => ({ ...prev, ...updatePayload }));
      setFirmadoExitoso(true);
    } catch (err: any) {
      console.error("Error firmando contrato:", err);
      alert("Ocurrió un error al registrar la firma digital. Por favor, reintentá.");
    } finally {
      setFirmando(false);
    }
  };

  const handleDescargarPdf = () => {
    if (!solicitud) return;

    const nombre = solicitud.nombreCompleto || solicitud.nombre || solicitud.datosPersonales?.nombreCompleto || "Cliente";
    const dni = (solicitud.numeroDni || solicitud.dni || solicitud.datosPersonales?.numeroDni || "-").toString();
    const cuil = solicitud.cuil || solicitud.datosPersonales?.cuil || dni;
    const domicilio = solicitud.direccion || solicitud.datosPersonales?.direccion || "-";
    const localidad = solicitud.localidad || solicitud.datosPersonales?.localidad || "CABA";
    const producto = solicitud.productoDeseado || solicitud.productoNombre || solicitud.necesidad || "Electrodoméstico / Producto";
    const nroContrato = generarNumeroContratoEstructurado(solicitud);

    const cProd = Number(solicitud.precioContado || solicitud.precioContadoVal || 0);
    const nCuotas = Number(solicitud.cuotas || solicitud.planElegido || 12);
    const mCuota = Number(solicitud.montoCuota || solicitud.montoCuotaVal || 0);
    const totalFin = cProd > 0 ? cProd : (mCuota * nCuotas);

    generarContratoModelo({
      nroContrato: nroContrato,
      nombreComprador: nombre,
      dni: dni,
      cuil: cuil,
      domicilio: domicilio,
      localidad: localidad,
      email: solicitud.email || solicitud.clienteEmail || "-",
      whatsapp: solicitud.whatsapp || solicitud.telefono || "-",
      producto: producto,
      cantidad: 1,
      estadoBien: "Nuevo",
      nserie: solicitud.numeroSerie || "S/D",
      precioContado: `$ ${cProd.toLocaleString("es-AR")}`,
      totalFinanciado: `$ ${totalFin.toLocaleString("es-AR")}`,
      cuotas: String(nCuotas),
      importeCuota: `$ ${mCuota.toLocaleString("es-AR")}`,
      primeraCuota: new Date().toLocaleDateString("es-AR"),
      tnaComp: "0%",
      tnaPun: "0%",
      lugarFecha: `CABA, ${new Date().toLocaleDateString("es-AR")}`,
      cuotasPlan: []
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F3EC] flex items-center justify-center p-4">
        <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl shadow-xs text-center space-y-3 max-w-md w-full">
          <div className="w-10 h-10 border-4 border-[#173E3B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-heading font-bold text-[#173E3B]">Cargando documento digital de Cuenta Hogar...</p>
        </div>
      </div>
    );
  }

  if (error || !solicitud) {
    return (
      <div className="min-h-screen bg-[#F7F3EC] flex items-center justify-center p-4">
        <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl shadow-xs text-center space-y-4 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-[#B44E2A] mx-auto" />
          <h1 className="text-xl font-heading font-bold text-[#173E3B]">Enlace No Disponible</h1>
          <p className="text-xs text-[#68706E] font-sans">{error || "No se pudo acceder a la información del contrato."}</p>
          <Link href="/" className="inline-block bg-[#173E3B] text-white text-xs font-heading font-bold px-4 py-2.5 rounded-xl">
            Volver a la Portada
          </Link>
        </div>
      </div>
    );
  }

  const nombreCliente = solicitud.nombreCompleto || solicitud.nombre || solicitud.datosPersonales?.nombreCompleto || "Cliente";
  const dniCliente = solicitud.numeroDni || solicitud.dni || solicitud.datosPersonales?.numeroDni || "S/D";
  const domicilioCliente = solicitud.direccion || solicitud.datosPersonales?.direccion || "S/D";
  const localidadCliente = solicitud.localidad || solicitud.datosPersonales?.localidad || "S/D";
  const productoNombre = solicitud.productoDeseado || solicitud.productoNombre || solicitud.necesidad || "Producto Seleccionado";
  const planCuotas = solicitud.cuotas || solicitud.planElegido || "12";
  const cuotaValor = solicitud.montoCuota || 0;
  const nroContratoFinal = generarNumeroContratoEstructurado(solicitud);

  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] font-sans p-4 sm:p-8 selection:bg-[#173E3B] selection:text-white">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ENCABEZADO OFICIAL CUENTA HOGAR */}
        <header className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <img 
              src="/logo-cuenta-hogar-oficial.png" 
              alt="Cuenta Hogar Logo" 
              className="h-12 w-auto object-contain bg-[#173E3B] p-1.5 rounded-xl shadow-xs" 
            />
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-heading font-bold uppercase tracking-widest text-[#B44E2A]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B44E2A]" /> Portal de Firma Digital SSL
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-[#173E3B]">
                Contrato de Mandato Comercial
              </h1>
              <p className="text-xs text-[#68706E] font-sans mt-0.5">LOOP GESTIÓN INTEGRAL S.R.L. · CUIT 30-71829384-9</p>
            </div>
          </div>

          <div className="bg-[#F7F3EC] px-4 py-2 rounded-xl border border-[#DED8CF] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#173E3B]" />
            <span className="text-xs font-mono font-bold text-[#173E3B]">{nroContratoFinal}</span>
          </div>
        </header>

        {/* PASO 1: VALIDACIÓN DE IDENTIDAD POR DNI (SI NO ESTÁ VALIDADA Y NO ESTÁ FIRMADO) */}
        {!identidadValidada && !firmadoExitoso && (
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 sm:p-8 rounded-2xl shadow-xs max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-[#F7F3EC] border border-[#DED8CF] rounded-2xl flex items-center justify-center text-[#173E3B] mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-heading font-bold text-[#173E3B]">Validación de Identidad del Titular</h2>
              <p className="text-xs text-[#68706E] font-sans">
                Por razones de seguridad jurídica, ingresá tu número de DNI para acceder a las cláusulas de tu contrato.
              </p>
            </div>

            <form onSubmit={handleValidarIdentidad} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold text-[#173E3B] mb-1.5 uppercase">
                  Número de DNI (Sin puntos)
                </label>
                <input 
                  type="text"
                  required
                  value={dniIngresado}
                  onChange={(e) => setDniIngresado(e.target.value)}
                  placeholder="Ej: 35948201"
                  className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3 rounded-xl text-sm font-mono font-bold text-[#1F2928] focus:border-[#173E3B] focus:ring-1 focus:ring-[#173E3B] outline-none"
                />
              </div>

              {errorIdentidad && (
                <p className="text-xs text-red-600 font-bold bg-red-50 border border-red-200 p-2.5 rounded-xl text-center">
                  {errorIdentidad}
                </p>
              )}

              <button 
                type="submit"
                className="w-full bg-[#173E3B] hover:bg-[#123230] text-white font-heading font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-xs"
              >
                🔒 Acceder al Contrato
              </button>
            </form>
          </div>
        )}

        {/* PASO 2: CONTRATO AUTORIZADO Y FIRMADO (ESTADO COMPLETADO) */}
        {firmadoExitoso && (
          <div className="bg-[#FFFDFC] border border-[#2F7D5C]/40 p-6 sm:p-8 rounded-2xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#2F7D5C]/10 border border-[#2F7D5C]/30 p-6 rounded-2xl text-center sm:text-left">
              <CheckCircle2 className="w-12 h-12 text-[#2F7D5C] shrink-0" />
              <div>
                <span className="text-[10px] bg-[#2F7D5C] text-white font-heading font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  CONTRATO AUTORIZADO Y CONSOLIDADO
                </span>
                <h2 className="text-xl font-heading font-extrabold text-[#173E3B] mt-1">
                  ¡Firma Digital Registrada Exitosamente!
                </h2>
                <p className="text-xs text-[#68706E] font-sans mt-0.5">
                  El Contrato N° <strong className="text-[#1F2928] font-mono">{nroContratoFinal}</strong> fue conformado legalmente por <strong className="text-[#173E3B]">{nombreCliente}</strong> el {new Date(solicitud.fechaFirmaDigital || Date.now()).toLocaleString("es-AR")}.
                </p>
              </div>
            </div>

            <div className="bg-[#F7F3EC] p-4 rounded-xl border border-[#DED8CF] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#68706E] block font-sans">Titular / Mandante:</span>
                <strong className="text-[#173E3B] font-heading font-bold">{nombreCliente} (DNI: {dniCliente})</strong>
              </div>
              <div>
                <span className="text-[#68706E] block font-sans">Fecha y Hora de Firma:</span>
                <strong className="text-[#1F2928] font-mono">{new Date(solicitud.fechaFirmaDigital || Date.now()).toLocaleString("es-AR")}</strong>
              </div>
              <div>
                <span className="text-[#68706E] block font-sans">Dirección IP Auditada:</span>
                <strong className="text-[#1F2928] font-mono">{solicitud.ipFirmaDigital || "Registrada en servidor SSL"}</strong>
              </div>
              <div>
                <span className="text-[#68706E] block font-sans">Estado de Operación:</span>
                <strong className="text-[#2F7D5C] font-heading font-bold uppercase">AUTORIZADO PARA DESPACHO CABA</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleDescargarPdf}
                className="flex-1 bg-[#173E3B] hover:bg-[#123230] text-white font-heading font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Descargar PDF de Contrato Firmado
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: REVISIÓN Y FIRMA DIGITAL DEL CONTRATO */}
        {identidadValidada && !firmadoExitoso && (
          <div className="space-y-6">

            {/* TARJETA RESUMEN OPERACIÓN */}
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl shadow-xs space-y-4">
              <h2 className="text-base font-heading font-bold text-[#173E3B] flex items-center gap-2 border-b border-[#DED8CF] pb-2">
                <Package className="w-5 h-5 text-[#B44E2A]" /> Resumen del Mandato de Compra
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#F7F3EC] p-3 rounded-xl border border-[#DED8CF]">
                  <span className="text-[#68706E] block font-sans">Mandante (Cliente):</span>
                  <strong className="text-[#173E3B] font-heading font-bold text-sm block mt-0.5">{nombreCliente}</strong>
                  <span className="text-[#68706E] font-mono">DNI: {dniCliente}</span>
                </div>

                <div className="bg-[#F7F3EC] p-3 rounded-xl border border-[#DED8CF]">
                  <span className="text-[#68706E] block font-sans">Domicilio Registrado:</span>
                  <strong className="text-[#1F2928] font-sans font-semibold block mt-0.5">{domicilioCliente}</strong>
                  <span className="text-[#68706E]">{localidadCliente}</span>
                </div>

                <div className="bg-[#F7F3EC] p-3 rounded-xl border border-[#DED8CF]">
                  <span className="text-[#68706E] block font-sans">Producto a Adquirir:</span>
                  <strong className="text-[#173E3B] font-heading font-bold text-sm block mt-0.5">{productoNombre}</strong>
                  <span className="text-[#2F7D5C] font-heading font-bold">{planCuotas} Cuotas de ${cuotaValor.toLocaleString("es-AR")}</span>
                </div>
              </div>
            </div>

            {/* VISOR DE CLÁUSULAS Y CONDICIONES LEGALES */}
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-[#DED8CF] pb-3">
                <h2 className="text-base font-heading font-bold text-[#173E3B] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#B44E2A]" /> Términos del Contrato de Mandato Comercial
                </h2>

                <button
                  onClick={handleDescargarPdf}
                  className="bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#B44E2A] border border-[#DED8CF] hover:border-[#B44E2A] px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar PDF
                </button>
              </div>

              {/* CONTENIDO LEGAL COMPLETO DEL MANDATO */}
              <div className="bg-[#F7F3EC] border border-[#DED8CF] p-5 rounded-xl max-h-[320px] overflow-y-auto space-y-4 text-xs font-sans text-[#1F2928] leading-relaxed custom-scrollbar">
                <p className="font-bold text-[#173E3B]">
                  ENTRE LOOP GESTIÓN INTEGRAL S.R.L. (en adelante "Cuenta Hogar" o el "Mandatario"), CUIT 30-71829384-9, con domicilio en Caracas 1101, CABA, por una parte; y por la otra {nombreCliente.toUpperCase()}, DNI N° {dniCliente} (el "Mandante"), se acuerda celebrar el presente Contrato de Mandato Comercial conforme a las siguientes cláusulas:
                </p>

                <div>
                  <h4 className="font-heading font-bold text-[#173E3B] mb-1">PRIMERA: OBJETO DEL MANDATO COMERCIAL</h4>
                  <p>
                    El Mandante encomienda e imparte mandato expreso a Cuenta Hogar para la gestión, adquisición y pago por su cuenta y orden del bien mueble seleccionado ({productoNombre}), a ser recepcionado en el centro logístico de la sucursal CABA (Caracas 1101) para su posterior entrega al Mandante.
                  </p>
                </div>

                <div>
                  <h4 className="font-heading font-bold text-[#173E3B] mb-1">SEGUNDA: CONDICIONES DE PAGO Y PLAN DE CUOTAS</h4>
                  <p>
                    El costo total de la adquisición y honorarios de gestión comercial se abonan en {planCuotas} cuotas mensuales consecutivas de ${cuotaValor.toLocaleString("es-AR")} cada una, comprometiéndose el Mandante a abonar puntualmente cada periodo.
                  </p>
                </div>

                <div>
                  <h4 className="font-heading font-bold text-[#173E3B] mb-1">TERCERA: RECEPCIÓN Y LOGÍSTICA DE ENTREGA</h4>
                  <p>
                    La mercadería adquirida por mandato se recibe en Caracas 1101, CABA, previa coordinación operativa, haciéndose cargo el transporte propio de Cuenta Hogar del traslado final al domicilio acordado ({domicilioCliente}).
                  </p>
                </div>

                <div>
                  <h4 className="font-heading font-bold text-[#173E3B] mb-1">CUARTA: CONFORMIDAD Y FIRMA DIGITAL DE LEY</h4>
                  <p>
                    La aceptación y conformidad digital mediante la interacción en este sitio web posee plena validez legal y eficacia probatoria de acuerdo a la Ley N° 25.506 de Firma Digital y el Código Civil y Comercial de la Nación.
                  </p>
                </div>
              </div>

              {/* CHECKBOX DE CONFORMIDAD Y BOTÓN DE FIRMA */}
              <div className="pt-3 space-y-4 border-t border-[#DED8CF]">
                <label className="flex items-start gap-3 p-3 bg-[#F7F3EC] rounded-xl border border-[#DED8CF] cursor-pointer hover:border-[#173E3B] transition-colors">
                  <input 
                    type="checkbox"
                    checked={aceptoTerminos}
                    onChange={(e) => setAceptoTerminos(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-[#173E3B] shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-[#1F2928] font-sans font-medium">
                    Declaro bajo juramento que he leído y acepto en su totalidad los términos, condiciones y cláusulas del <strong className="text-[#173E3B] font-heading font-bold">Contrato N° {nroContratoFinal}</strong> para la adquisición de {productoNombre}.
                  </span>
                </label>

                <button
                  disabled={!aceptoTerminos || firmando}
                  onClick={handleFirmarContrato}
                  className="w-full bg-[#173E3B] hover:bg-[#123230] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-heading font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {firmando ? (
                    "Registrando Firma Digital SSL..."
                  ) : (
                    <>✍️ Autorizar y Firmar Contrato Digitalmente</>
                  )}
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
