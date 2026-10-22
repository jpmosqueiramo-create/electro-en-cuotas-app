"use client";
import { CuentaHogarLogo } from "@/components/CuentaHogarLogo";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  ShieldCheck, CheckCircle2, AlertCircle, Package, KeyRound, User, MapPin, FileText
} from "lucide-react";

function PropuestaClientContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datosPropuesta, setDatosPropuesta] = useState<any>(null);

  // Identity & OTP State
  const [dniIngresado, setDniIngresado] = useState("");
  const [identidadValidada, setIdentidadValidada] = useState(false);
  const [errorIdentidad, setErrorIdentidad] = useState<string | null>(null);

  const [opcionSeleccionadaId, setOpcionSeleccionadaId] = useState<string | null>(null);
  const [versionSeleccionada, setVersionSeleccionada] = useState<number>(1);
  const [solicitandoOtp, setSolicitandoOtp] = useState(false);
  const [otpEnviado, setOtpEnviado] = useState(false);
  const [codigoOtpIngresado, setCodigoOtpIngresado] = useState("");
  const [procesandoAceptacion, setProcesandoAceptacion] = useState(false);
  const [aceptadoExitoso, setAceptadoExitoso] = useState(false);
  const [datosAudit, setDatosAudit] = useState<any>(null);
  const [deshabilitadoClienteMsg, setDeshabilitadoClienteMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchPropuesta = async () => {
      if (!token) {
        setError("Enlace de propuesta no válido o ausente.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/propuesta/consultar?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "No se pudo cargar la propuesta.");
        }

        setDatosPropuesta(data);
        if (data.propuestas && data.propuestas.length > 0) {
          setOpcionSeleccionadaId(data.propuestas[0].id);
          setVersionSeleccionada(data.propuestas[0].version);
        }

        if (data.propuestaAceptada) {
          setAceptadoExitoso(true);
          setDatosAudit(data.propuestaAceptada.auditoria || null);
          setIdentidadValidada(true);
        }
      } catch (err: any) {
        setError(err.message || "Error al cargar la propuesta comercial.");
      } finally {
        setLoading(false);
      }
    };

    fetchPropuesta();
  }, [token]);

  const handleValidarIdentidad = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorIdentidad(null);

    const inputClean = dniIngresado.replace(/\D/g, "");
    if (!inputClean || inputClean.length < 7) {
      setErrorIdentidad("Por favor, ingresá tu número de DNI válido.");
      return;
    }

    setIdentidadValidada(true);
  };

  const handleSolicitarOtp = async () => {
    if (!token) return;
    setSolicitandoOtp(true);
    setErrorIdentidad(null);

    try {
      const res = await fetch("/api/otp/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          clienteDni: dniIngresado.replace(/\D/g, ""),
          propuestaId: opcionSeleccionadaId,
          version: versionSeleccionada
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.deshabilitadoCliente) {
          setDeshabilitadoClienteMsg(data.error);
        }
        throw new Error(data.error || "No se pudo generar el código OTP.");
      }

      setOtpEnviado(true);
    } catch (err: any) {
      setErrorIdentidad(err.message || "Error al solicitar OTP.");
    } finally {
      setSolicitandoOtp(false);
    }
  };

  const handleAceptarPropuestaOtp = async () => {
    if (!token || !opcionSeleccionadaId || !codigoOtpIngresado) return;
    setProcesandoAceptacion(true);
    setErrorIdentidad(null);

    try {
      const res = await fetch("/api/propuesta/aceptar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          propuestaId: opcionSeleccionadaId,
          version: versionSeleccionada,
          clienteDni: dniIngresado.replace(/\D/g, ""),
          codigoOtp: codigoOtpIngresado.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo procesar la aceptación.");
      }

      setAceptadoExitoso(true);
      setDatosAudit(data.auditTrail);
      setDatosPropuesta((prev: any) => ({
        ...(prev as any),
        propuestaAceptada: data.propuestaAceptada,
        estadoPropuesta: "PROPUESTA_ACEPTADA"
      }));
    } catch (err: any) {
      setErrorIdentidad(err.message || "Error al registrar la aceptación.");
    } finally {
      setProcesandoAceptacion(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F3EC] flex items-center justify-center p-4">
        <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl shadow-xs text-center space-y-3 max-w-md w-full">
          <div className="w-10 h-10 border-4 border-[#173E3B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-heading font-bold text-[#173E3B]">Cargando propuesta comercial...</p>
        </div>
      </div>
    );
  }

  if (error || !datosPropuesta) {
    return (
      <div className="min-h-screen bg-[#F7F3EC] flex items-center justify-center p-4">
        <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl shadow-xs text-center space-y-4 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-[#B44E2A] mx-auto" />
          <h1 className="text-xl font-heading font-bold text-[#173E3B]">Enlace No Disponible</h1>
          <p className="text-xs text-[#68706E] font-sans">{error || "El enlace ingresado es inválido o ha expirado."}</p>
        </div>
      </div>
    );
  }

  const propuestasList: any[] = datosPropuesta.propuestas || [];
  const estaAceptado = aceptadoExitoso || datosPropuesta.estadoPropuesta === "PROPUESTA_ACEPTADA" || datosPropuesta.propuestaAceptada;

  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] font-sans p-4 sm:p-8 selection:bg-[#173E3B] selection:text-white">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ENCABEZADO INSTITUCIONAL */}
        <header className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#173E3B] text-white font-extrabold text-sm px-3 py-2 rounded-xl">CH</div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-heading font-bold uppercase tracking-widest text-[#B44E2A]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B44E2A]" /> Portal de Aceptación Electrónica Registrada
              </div>
              <CuentaHogarLogo className="h-14 mb-3"/><h1 className="text-xl sm:text-2xl font-heading font-extrabold text-[#173E3B]">
                Propuesta Comercial Cuenta Hogar
              </h1>
              <p className="text-xs text-[#68706E] font-sans mt-0.5">LOOP GESTIÓN INTEGRAL S.R.L. · CUIT 30-71829384-9</p>
            </div>
          </div>
        </header>

        {/* PASO 1: VALIDACIÓN DE IDENTIDAD */}
        {!identidadValidada && !estaAceptado && (
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 sm:p-8 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#173E3B]/10 flex items-center justify-center text-[#173E3B]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-heading font-bold text-[#173E3B]">Validación de Titularidad</h2>
                <p className="text-xs text-[#68706E]">Ingresá tu número de DNI para consultar las alternativas preparadas para {datosPropuesta.clienteNombre}.</p>
              </div>
            </div>

            <form onSubmit={handleValidarIdentidad} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-heading font-bold text-[#173E3B] mb-1">
                  Número de DNI (sin puntos ni espacios)
                </label>
                <input
                  type="text"
                  value={dniIngresado}
                  onChange={(e) => setDniIngresado(e.target.value)}
                  placeholder="Ej: 35123456"
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] px-4 py-3 rounded-xl text-sm font-mono text-[#1F2928] outline-none focus:border-[#173E3B]"
                />
              </div>

              {errorIdentidad && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorIdentidad}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#173E3B] hover:bg-[#123230] text-white font-heading font-bold py-3 rounded-xl text-sm transition-all shadow-xs"
              >
                Verificar DNI y Ver Alternativas
              </button>
            </form>
          </div>
        )}

        {/* PASO 2: ALTERNATIVAS DE COTIZACIÓN */}
        {(identidadValidada || estaAceptado) && (
          <div className="space-y-6">

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DED8CF] pb-3">
                <div>
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#68706E]">Titular Solicitante</span>
                  <h2 className="text-base font-heading font-bold text-[#173E3B]">{datosPropuesta.clienteNombre}</h2>
                  {datosPropuesta.clienteLocalidad && <p className="text-xs text-[#68706E]">Destino: {datosPropuesta.clienteLocalidad}</p>}
                </div>

                <div>
                  <span className={`text-xs font-heading font-bold px-3 py-1.5 rounded-full border ${
                    estaAceptado
                      ? "bg-[#2F7D5C]/15 text-[#2F7D5C] border-[#2F7D5C]/30"
                      : "bg-[#E7B86A]/20 text-[#8F6211] border-[#E7B86A]/50"
                  }`}>
                    {estaAceptado ? "🟢 ACEPTACIÓN ELECTRÓNICA REGISTRADA" : "🟡 PENDIENTE DE ACEPTACIÓN"}
                  </span>
                </div>
              </div>

              {/* LISTADO DE OPCIONES */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-heading font-bold text-[#173E3B] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#B44E2A]" /> Alternativas Disponibles:
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {propuestasList.map((op, idx) => {
                    const isSelected = (opcionSeleccionadaId === op.id) || (propuestasList.length === 1);
                    const isAceptadaEsta = estaAceptado && (datosPropuesta.propuestaAceptada?.id === op.id || propuestasList.length === 1);

                    return (
                      <div
                        key={op.id || idx}
                        onClick={() => {
                          if (!estaAceptado) {
                            setOpcionSeleccionadaId(op.id);
                            setVersionSeleccionada(op.version || 1);
                          }
                        }}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                          isAceptadaEsta
                            ? "bg-[#2F7D5C]/10 border-[#2F7D5C] shadow-md"
                            : isSelected
                            ? "bg-[#173E3B]/5 border-[#173E3B] ring-2 ring-[#173E3B]/20"
                            : "bg-[#FFFDFC] border-[#DED8CF] hover:border-[#173E3B]/50"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-heading font-bold uppercase px-2.5 py-0.5 rounded-md bg-[#B44E2A]/10 text-[#B44E2A] border border-[#B44E2A]/20">
                            Opción {op.version || idx + 1}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#173E3B]">
                            {op.moneda || "ARS"}
                          </span>
                        </div>

                        <h4 className="text-base font-heading font-extrabold text-[#173E3B]">{op.producto}</h4>
                        {op.marca && <p className="text-xs text-[#68706E]">{op.marca} {op.modelo}</p>}

                        <div className="mt-4 pt-3 border-t border-[#DED8CF]/60 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[#68706E]">Plan de Pago:</span>
                            <span className="font-heading font-bold text-[#173E3B]">{op.cantidadCuotas || 12} cuotas</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#68706E]">Monto por Cuota:</span>
                            <span className="font-heading font-extrabold text-[#2F7D5C] font-mono">$ {(op.montoCuota || 0).toLocaleString("es-AR")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#68706E]">Valor Total Operación:</span>
                            <span className="font-mono text-[#1F2928]">$ {(op.valorTotalOperacion || 0).toLocaleString("es-AR")}</span>
                          </div>
                          {op.sena > 0 && (
                            <div className="flex justify-between text-[#B44E2A] font-bold">
                              <span>Seña Inicial (10%):</span>
                              <span>$ {op.sena.toLocaleString("es-AR")}</span>
                            </div>
                          )}
                          {op.plazoEstimado && (
                            <div className="flex justify-between text-[#68706E]">
                              <span>Plazo Estimado:</span>
                              <span>{op.plazoEstimado}</span>
                            </div>
                          )}
                        </div>

                        {isAceptadaEsta && (
                          <div className="mt-3 p-2 bg-[#2F7D5C] text-white text-[11px] font-heading font-bold rounded-xl text-center flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Opción Registrada
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BLOQUE DE ACEPTACIÓN OTP */}
              {!estaAceptado && (
                <div className="mt-6 p-6 bg-[#F7F3EC] border border-[#DED8CF] rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-[#B44E2A]" />
                    <div>
                      <h4 className="text-sm font-heading font-bold text-[#173E3B]">Aceptación Electrónica Registrada</h4>
                      <p className="text-xs text-[#68706E]">Confirmá la alternativa seleccionada mediante la verificación por WhatsApp OTP.</p>
                    </div>
                  </div>

                  {deshabilitadoClienteMsg && (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-700 mt-0.5" />
                      <div>
                        <strong>Servicio OTP no disponible:</strong> {deshabilitadoClienteMsg}
                      </div>
                    </div>
                  )}

                  {!deshabilitadoClienteMsg && (
                    <>
                      {!otpEnviado ? (
                        <button
                          onClick={handleSolicitarOtp}
                          disabled={solicitandoOtp}
                          className="w-full bg-[#B44E2A] hover:bg-[#963e20] text-white font-heading font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2"
                        >
                          {solicitandoOtp ? "Generando Código OTP..." : "📱 Solicitar Código OTP por WhatsApp"}
                        </button>
                      ) : (
                        <div className="space-y-3 pt-2">
                          <div className="p-3 bg-[#173E3B]/10 border border-[#173E3B]/20 text-[#173E3B] text-xs rounded-xl">
                            Código OTP enviado a tu WhatsApp verificado (Válido por 5 minutos).
                          </div>

                          <div>
                            <label className="block text-xs font-heading font-bold text-[#173E3B] mb-1">
                              Ingresá el Código OTP de 6 dígitos
                            </label>
                            <input
                              type="text"
                              value={codigoOtpIngresado}
                              onChange={(e) => setCodigoOtpIngresado(e.target.value)}
                              placeholder="Ej: 123456"
                              maxLength={6}
                              className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-4 py-3 rounded-xl text-center text-lg font-mono font-extrabold tracking-widest text-[#173E3B] outline-none focus:border-[#173E3B]"
                            />
                          </div>

                          {errorIdentidad && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorIdentidad}
                            </div>
                          )}

                          <button
                            onClick={handleAceptarPropuestaOtp}
                            disabled={procesandoAceptacion || codigoOtpIngresado.length < 6}
                            className="w-full bg-[#173E3B] hover:bg-[#123230] text-white font-heading font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {procesandoAceptacion ? "Registrando Aceptación..." : "🔒 Registrar Aceptación Electrónica"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TRAZA DE AUDITORÍA REGISTRADA */}
              {estaAceptado && (
                <div className="mt-6 p-5 bg-[#2F7D5C]/10 border border-[#2F7D5C]/30 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-[#2F7D5C] font-heading font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" /> Aceptación Electrónica Registrada
                  </div>

                  <p className="text-xs text-[#68706E] font-sans">
                    Su conformidad con la propuesta fue registrada correctamente y el expediente ha pasado a revisión administrativa.
                  </p>

                  {datosAudit && (
                    <div className="text-[11px] font-mono text-[#173E3B] bg-[#FFFDFC] p-3 rounded-xl border border-[#DED8CF] space-y-1">
                      <div>• Registro: {datosAudit.timestamp}</div>
                      <div>• Dirección IP: {datosAudit.ip}</div>
                      <div>• Producto Seleccionado: {datosAudit.producto}</div>
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default function PropuestaClientPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F3EC] flex items-center justify-center p-4">
        <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl shadow-xs text-center space-y-3 max-w-md w-full">
          <div className="w-10 h-10 border-4 border-[#173E3B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-heading font-bold text-[#173E3B]">Cargando portal de propuesta...</p>
        </div>
      </div>
    }>
      <PropuestaClientContent />
    </Suspense>
  );
}
