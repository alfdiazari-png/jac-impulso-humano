import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Car,
  Upload,
  Download,
  BookOpen,
  Users,
  Target,
  Sparkles,
  Search,
  FileText,
  ShieldCheck,
  Quote,
  Menu,
  X,
  Star,
  CalendarDays,
  UserRoundCheck,
  LogIn,
  LogOut,
  LayoutDashboard,
  Lock,
  BarChart3,
  FolderOpen,
  Eye,
  Trash2,
  PlusCircle,
  UserCog,
  MessageCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import jacLogo from "./assets/JAC.png";
import jacAuto from "./assets/jac-auto.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchConRetry = async (url, options = {}, intentos = 4, espera = 10000) => {
  let ultimoError;

  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      ultimoError = error;
      console.warn(`Intento ${intento} fallido. Reintentando conexión con backend...`, error);

      if (intento < intentos) {
        await sleep(espera);
      }
    }
  }

  throw ultimoError;
};

const categorias = ["Todos", "Reflexión", "Superación", "Coaching", "Liderazgo"];

const materialesBase = [
  {
    id: 1,
    titulo: "Guía de liderazgo positivo en equipos comerciales",
    categoria: "Liderazgo",
    tipo: "PDF",
    fecha: "2026-04-20",
    descargas: 42,
    vistas: 118,
    descripcion: "Material para fortalecer la comunicación, confianza y dirección de equipos de ventas.",
  },
  {
    id: 2,
    titulo: "Reflexión semanal: actitud ante el cambio",
    categoria: "Reflexión",
    tipo: "DOCX",
    fecha: "2026-04-18",
    descargas: 28,
    vistas: 91,
    descripcion: "Lectura breve para iniciar juntas matutinas con enfoque humano y motivacional.",
  },
  {
    id: 3,
    titulo: "Plan personal de metas y hábitos",
    categoria: "Superación",
    tipo: "XLSX",
    fecha: "2026-04-15",
    descargas: 35,
    vistas: 76,
    descripcion: "Plantilla para definir metas, avances y compromisos personales del colaborador.",
  },
  {
    id: 4,
    titulo: "Coaching para atención al cliente automotriz",
    categoria: "Coaching",
    tipo: "PPTX",
    fecha: "2026-04-10",
    descargas: 51,
    vistas: 143,
    descripcion: "Presentación para mejorar empatía, escucha activa y cierre de conversaciones.",
  },
];

const reflexiones = [
  {
    icon: Target,
    titulo: "Propósito",
    texto: "Cada venta, servicio o entrega representa una oportunidad para impactar positivamente a una persona.",
  },
  {
    icon: Users,
    titulo: "Trabajo en equipo",
    texto: "Un equipo alineado no solo cumple objetivos: construye confianza, cultura y resultados sostenibles.",
  },
  {
    icon: Sparkles,
    titulo: "Actitud",
    texto: "La actitud correcta convierte los retos diarios en oportunidades de crecimiento profesional.",
  },
];

export default function JacLiderazgoEmpresarial() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoria, setCategoria] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [materiales, setMateriales] = useState(materialesBase);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [cargando, setCargando] = useState(false);
  const [backendActivo, setBackendActivo] = useState(false);
  const [archivoNombre, setArchivoNombre] = useState("");
  const [vista, setVista] = useState("inicio");
  const [usuario, setUsuario] = useState(null);
  const [login, setLogin] = useState({ correo: "admin@jac.com", password: "admin123" });
  const [errorLogin, setErrorLogin] = useState("");
  const [nuevoMaterial, setNuevoMaterial] = useState({ titulo: "", categoria: "Reflexión", descripcion: "" });

  const esAdmin = usuario?.rol === "admin";

  const cargarMateriales = async () => {
    try {
      const res = await fetchConRetry(`${API_URL}/materiales`);
      if (!res.ok) throw new Error("No se pudo consultar el backend");
      const data = await res.json();
      setMateriales(data);
      setBackendActivo(true);
    } catch (error) {
      console.warn("Backend no disponible o despertando en Render, se muestran datos demo.", error);
      setBackendActivo(false);
    }
  };

  useEffect(() => {
    cargarMateriales();
  }, []);

  const estadisticas = useMemo(() => {
    const totalDescargas = materiales.reduce((acc, item) => acc + item.descargas, 0);
    const totalVistas = materiales.reduce((acc, item) => acc + item.vistas, 0);
    return {
      documentos: materiales.length,
      descargas: totalDescargas,
      vistas: totalVistas,
      usuarios: 2,
    };
  }, [materiales]);

  const materialesFiltrados = useMemo(() => {
    return materiales.filter((item) => {
      const coincideCategoria = categoria === "Todos" || item.categoria === categoria;
      const coincideBusqueda = `${item.titulo} ${item.descripcion} ${item.tipo}`
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      return coincideCategoria && coincideBusqueda;
    });
  }, [categoria, busqueda, materiales]);

  const iniciarSesion = async (e) => {
    e.preventDefault();
    setErrorLogin("");
    setCargando(true);

    try {
      const res = await fetchConRetry(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(login),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorLogin(data.message || "Usuario o contraseña incorrectos.");
        return;
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUsuario(data.usuario);
      setVista("dashboard");
      setBackendActivo(true);
    } catch (error) {
      setErrorLogin("No se pudo conectar con el servidor backend. Si Render estaba dormido, espera unos segundos e intenta nuevamente.");
      setBackendActivo(false);
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    setToken("");
    setUsuario(null);
    setVista("inicio");
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!token) {
      alert("Debes iniciar sesión como administrador para subir archivos.");
      return;
    }

    const formData = new FormData();
    formData.append("archivo", file);
    formData.append("titulo", nuevoMaterial.titulo || file.name.replace(/\.[^/.]+$/, ""));
    formData.append("categoria", nuevoMaterial.categoria);
    formData.append("descripcion", nuevoMaterial.descripcion || "Archivo cargado desde panel administrativo.");

    try {
      const res = await fetchConRetry(`${API_URL}/materiales`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Error al subir archivo");

      setArchivoNombre(file.name);
      setNuevoMaterial({ titulo: "", categoria: "Reflexión", descripcion: "" });
      await cargarMateriales();
      alert("Archivo subido correctamente.");
    } catch (error) {
      console.error(error);
      alert("No se pudo subir el archivo. Verifica que el backend esté activo y que seas administrador.");
    }
  };

  const descargar = async (id) => {
    window.open(`${API_URL}/materiales/${id}/descargar`, "_blank");
    setTimeout(cargarMateriales, 600);
  };

  const eliminarMaterial = async (id) => {
    if (!token) {
      alert("Debes iniciar sesión como administrador.");
      return;
    }

    try {
      const res = await fetchConRetry(`${API_URL}/materiales/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Error al eliminar material");

      await cargarMateriales();
    } catch (error) {
      console.error(error);
      alert("No se pudo eliminar el material.");
    }
  };

  const navButton = (id, label) => (
    <button
      onClick={() => setVista(id)}
      className={`rounded-2xl px-4 py-2 text-sm transition ${
        vista === id ? "bg-red-600 text-white" : "text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white">
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden">
        <img
          src={jacAuto}
          alt="Auto JAC fondo"
          className="w-[95%] max-w-7xl opacity-30 drop-shadow-2xl"
        />
      </div>
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-white/10 via-neutral-950/45 to-neutral-950/90" />
      <div className="relative z-10">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 text-neutral-950 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-neutral-200">
              <img src={jacLogo} alt="JAC" className="h-full w-full object-contain p-1" />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">JAC Impulso Humano</p>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-red-600">Hecho para crecer</p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {navButton("inicio", "Inicio")}
            {navButton("biblioteca", "Biblioteca")}
            {usuario && navButton("dashboard", "Dashboard")}
            {esAdmin && navButton("admin", "Administrador")}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {usuario ? (
              <>
                <div className="text-right text-xs">
                  <p className="font-bold text-white">{usuario.nombre}</p>
                  <p className="text-slate-400">Rol: {usuario.rol}</p>
                </div>
                <Button onClick={cerrarSesion} className="rounded-xl bg-neutral-950 text-white hover:bg-neutral-800">
                  <LogOut className="mr-2 h-4 w-4" /> Salir
                </Button>
              </>
            ) : (
              <Button onClick={() => setVista("login")} className="rounded-2xl bg-red-600 hover:bg-red-700">
                <LogIn className="mr-2 h-4 w-4" /> Iniciar sesión
              </Button>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 px-5 py-4 md:hidden">
            <div className="grid gap-2 text-sm text-slate-200">
              {navButton("inicio", "Inicio")}
              {navButton("biblioteca", "Biblioteca")}
              {usuario && navButton("dashboard", "Dashboard")}
              {esAdmin && navButton("admin", "Administrador")}
              {!usuario && (
                <Button onClick={() => setVista("login")} className="rounded-2xl bg-red-600 hover:bg-red-700">
                  Iniciar sesión
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {vista === "inicio" && (
        <>
          <section className="relative overflow-hidden bg-white/80 text-neutral-950 backdrop-blur-[1px]">
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.72)_45%,rgba(220,38,38,0.18)_100%)]" />
            <img
              src={jacAuto}
              alt="Auto JAC fondo principal"
              className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[88%] max-w-6xl -translate-x-1/2 -translate-y-1/2 opacity-25 drop-shadow-2xl"
            />
            <div className="absolute bottom-0 right-0 z-0 hidden h-72 w-72 rounded-full bg-red-600/20 blur-3xl md:block" />
            <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 md:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                  <Star className="h-4 w-4" /> Cultura, coaching y liderazgo para equipos JAC
                </div>
                <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Desarrolla líderes con la misma energía con la que se mueve JAC.
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
                  Portal independiente para compartir reflexiones, coaching, liderazgo y superación personal, con biblioteca documental conectada a backend real.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => setVista("biblioteca")} className="rounded-xl bg-red-600 px-6 py-6 text-base font-bold hover:bg-red-700">
                    Ver biblioteca
                  </Button>
                  <Button onClick={() => setVista(usuario ? "dashboard" : "login")} variant="outline" className="rounded-xl border border-neutral-300 bg-white px-6 py-6 text-base font-bold text-neutral-950 hover:bg-neutral-100">
                    Acceso empresarial
                  </Button>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}>
                <Card className="rounded-[2rem] border border-neutral-200 bg-neutral-950 shadow-2xl shadow-red-900/10">
                  <CardContent className="p-7">
                    <div className="rounded-[1.5rem] bg-gradient-to-br from-slate-900 to-slate-800 p-6">
                      <Quote className="mb-5 h-10 w-10 text-red-400" />
                      <p className="text-2xl font-bold leading-snug text-white">
                        “Innovación, seguridad y liderazgo también se construyen desde las personas.”
                      </p>
                      <div className="mt-8 grid grid-cols-2 gap-3 text-center md:grid-cols-4">
                        <div className="rounded-2xl bg-white/10 p-4">
                          <p className="text-2xl font-black">MX</p>
                          <p className="text-xs text-slate-300">Hecho en México</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4">
                          <p className="text-2xl font-black">5</p>
                          <p className="text-xs text-slate-300">Años garantía</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4">
                          <p className="text-2xl font-black">360°</p>
                          <p className="text-xs text-slate-300">Seguridad</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4">
                          <p className="text-2xl font-black">IA</p>
                          <p className="text-xs text-slate-300">Innovación</p>
                        </div>
                      </div>
                      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                        Estado backend: <b className={backendActivo ? "text-emerald-300" : "text-yellow-300"}>{backendActivo ? "Conectado" : "Modo demo / sin conexión"}</b>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-5 py-16">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="font-semibold uppercase tracking-[0.22em] text-red-500">Programas principales</p>
                <h2 className="mt-2 text-3xl font-black md:text-4xl">Desarrollo humano con enfoque institucional</h2>
              </div>
              <p className="max-w-2xl text-slate-300">Secciones diseñadas para juntas, capacitaciones internas, campañas motivacionales y liderazgo operativo en una agencia JAC.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {reflexiones.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div key={item.titulo} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                    <Card className="h-full rounded-3xl border border-white/10 bg-white/10 text-white transition hover:-translate-y-1 hover:border-red-500/40 hover:bg-white/15">
                      <CardContent className="p-6">
                        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/90">
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold">{item.titulo}</h3>
                        <p className="mt-3 leading-7 text-slate-300">{item.texto}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {vista === "login" && (
        <section className="mx-auto grid min-h-[calc(100vh-90px)] max-w-7xl items-center gap-8 px-5 py-12 md:grid-cols-2">
          <div>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-600">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-4xl font-black">Acceso empresarial</h1>
            <p className="mt-4 max-w-xl leading-8 text-slate-300">
              Control de acceso para colaboradores y administradores. Esta versión incluye usuarios demo para validar flujo visual.
            </p>
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-300">
              <p><b>Admin:</b> admin@jac.com / admin123</p>
              <p><b>Usuario:</b> usuario@jac.com / usuario123</p>
              <p className="mt-2 text-xs text-slate-400">El acceso se valida contra el backend productivo en Render.</p>
            </div>
          </div>

          <Card className="rounded-[2rem] border-white/10 bg-white text-slate-950 shadow-2xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-black">Iniciar sesión</h2>
              <form onSubmit={iniciarSesion} className="mt-6 grid gap-4">
                <input
                  value={login.correo}
                  onChange={(e) => setLogin({ ...login, correo: e.target.value })}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none focus:border-red-400"
                  placeholder="Correo electrónico"
                />
                <input
                  type="password"
                  value={login.password}
                  onChange={(e) => setLogin({ ...login, password: e.target.value })}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none focus:border-red-400"
                  placeholder="Contraseña"
                />
                {errorLogin && <p className="text-sm font-semibold text-red-600">{errorLogin}</p>}
                <Button disabled={cargando} className="rounded-xl bg-red-600 py-6 text-base font-bold hover:bg-red-700 disabled:opacity-60">
                  <LogIn className="mr-2 h-4 w-4" /> {cargando ? "Despertando servidor..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      )}

      {vista === "dashboard" && usuario && (
        <section className="mx-auto max-w-7xl px-5 py-12">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-semibold text-red-400">Dashboard ejecutivo</p>
              <h1 className="text-4xl font-black">Bienvenido, {usuario.nombre}</h1>
              <p className="mt-2 text-slate-300">Resumen de uso del portal JAC Impulso Humano.</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-4">
            <KpiCard icon={FolderOpen} title="Documentos" value={estadisticas.documentos} />
            <KpiCard icon={Download} title="Descargas" value={estadisticas.descargas} />
            <KpiCard icon={Eye} title="Vistas" value={estadisticas.vistas} />
            <KpiCard icon={Users} title="Usuarios" value={estadisticas.usuarios} />
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-[1fr_380px]">
            <Card className="rounded-3xl border-white/10 bg-white/10 text-white">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <BarChart3 className="text-red-400" />
                  <h2 className="text-2xl font-bold">Materiales con mayor actividad</h2>
                </div>
                <div className="grid gap-3">
                  {[...materiales]
                    .sort((a, b) => b.descargas - a.descargas)
                    .slice(0, 5)
                    .map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white/10 p-4">
                        <div className="flex justify-between gap-4">
                          <p className="font-bold">{item.titulo}</p>
                          <span className="text-red-300">{item.descargas} descargas</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/10">
                          <div className="h-2 rounded-full bg-red-500" style={{ width: `${Math.min(item.descargas * 2, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-white/10 bg-red-600 text-white">
              <CardContent className="p-6">
                <MessageCircle className="mb-4 h-9 w-9" />
                <h2 className="text-2xl font-bold">Siguiente fase IA</h2>
                <p className="mt-3 leading-7 text-red-50">
                  Este portal puede integrarse con RAG para crear un asistente interno que responda con base en documentos cargados.
                </p>
                <Button className="mt-5 rounded-2xl bg-white text-red-700 hover:bg-red-50">
                  Preparado para IA
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {vista === "dashboard" && !usuario && (
        <ProtectedNotice setVista={setVista} />
      )}

      {vista === "biblioteca" && (
        <section className="bg-white/85 py-16 text-neutral-950 backdrop-blur-[1px]">
          <div className="mx-auto max-w-7xl px-5">
            <div className="mb-8 grid gap-6 md:grid-cols-[1fr_420px] md:items-end">
              <div>
                <p className="font-semibold uppercase tracking-[0.22em] text-red-600">Biblioteca digital</p>
                <h2 className="mt-2 text-3xl font-black md:text-4xl">Materiales para impulsar cultura y liderazgo</h2>
                <p className="mt-3 text-slate-600">Documentos de reflexión, coaching, liderazgo y superación personal.</p>
              </div>

              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="font-bold">Acceso controlado</p>
                    <p className="mt-2 text-sm text-slate-600">Los usuarios pueden descargar. Los administradores pueden subir, clasificar y eliminar materiales.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por título, descripción o tipo de archivo..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 outline-none focus:border-red-400"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categorias.map((cat) => (
                  <Button
                    key={cat}
                    onClick={() => setCategoria(cat)}
                    className={`rounded-2xl ${categoria === cat ? "bg-red-600 hover:bg-red-700" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            <MaterialList materiales={materialesFiltrados} descargar={descargar} esAdmin={esAdmin} eliminarMaterial={eliminarMaterial} />
          </div>
        </section>
      )}

      {vista === "admin" && esAdmin && (
        <section className="mx-auto max-w-7xl px-5 py-12">
          <div className="mb-8">
            <p className="font-semibold text-red-400">Panel administrador</p>
            <h1 className="text-4xl font-black">Administración de contenido</h1>
            <p className="mt-2 text-slate-300">Alta, clasificación y control de materiales del portal.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-[420px_1fr]">
            <Card className="rounded-3xl border-white/10 bg-white text-slate-950">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <PlusCircle className="text-red-600" />
                  <h2 className="text-2xl font-black">Nuevo material</h2>
                </div>
                <div className="grid gap-4">
                  <input
                    value={nuevoMaterial.titulo}
                    onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, titulo: e.target.value })}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-red-400"
                    placeholder="Título del material"
                  />
                  <select
                    value={nuevoMaterial.categoria}
                    onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, categoria: e.target.value })}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-red-400"
                  >
                    {categorias.filter((c) => c !== "Todos").map((cat) => <option key={cat}>{cat}</option>)}
                  </select>
                  <textarea
                    value={nuevoMaterial.descripcion}
                    onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, descripcion: e.target.value })}
                    className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-red-400"
                    placeholder="Descripción"
                  />
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-red-300 bg-red-50 p-6 text-center hover:bg-red-100">
                    <Upload className="mb-3 h-8 w-8 text-red-600" />
                    <span className="font-bold text-slate-900">Seleccionar archivo</span>
                    <span className="text-sm text-slate-600">PDF, Word, Excel, PowerPoint o imagen</span>
                    <input type="file" className="hidden" onChange={handleUpload} />
                  </label>
                  {archivoNombre && <p className="text-sm text-slate-600">Último archivo: <b>{archivoNombre}</b></p>}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-white/10 bg-white/10 text-white">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <UserCog className="text-red-400" />
                  <h2 className="text-2xl font-black">Control administrativo</h2>
                </div>
                <MaterialList materiales={materiales} descargar={descargar} esAdmin={esAdmin} eliminarMaterial={eliminarMaterial} dark />
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {vista === "admin" && !esAdmin && (
        <ProtectedNotice setVista={setVista} />
      )}

      <footer className="border-t border-white/10 bg-slate-900 px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-xl font-bold">JAC Impulso Humano</p>
            <p className="text-sm text-slate-400">Sitio independiente para cultura, coaching, liderazgo y desarrollo personal.</p>
          </div>
          <p className="text-sm text-slate-400">© 2026 Agencia Automotriz JAC · Desarrollo Web Corporativo</p>
        </div>
      </footer>
          </div>
    </div>
  );
}

function KpiCard({ icon: Icon, title, value }) {
  return (
    <Card className="rounded-3xl border-white/10 bg-white/10 text-white">
      <CardContent className="p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600">
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-sm text-slate-300">{title}</p>
        <p className="mt-1 text-4xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}

function MaterialList({ materiales, descargar, esAdmin, eliminarMaterial, dark = false }) {
  return (
    <div className="grid gap-4">
      {materiales.map((item) => (
        <Card key={item.id} className={`rounded-3xl shadow-sm transition hover:shadow-md ${dark ? "border-white/10 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
          <CardContent className="grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${dark ? "bg-white/10" : "bg-slate-100"}`}>
              <FileText className="h-7 w-7 text-red-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold">{item.titulo}</h3>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">{item.categoria}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${dark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`}>{item.tipo}</span>
              </div>
              <p className={`mt-2 text-sm leading-6 ${dark ? "text-slate-300" : "text-slate-600"}`}>{item.descripcion}</p>
              <div className={`mt-2 flex flex-wrap gap-4 text-xs ${dark ? "text-slate-300" : "text-slate-500"}`}>
                <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {item.fecha}</span>
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {item.vistas} vistas</span>
                <span className="flex items-center gap-1"><Download className="h-4 w-4" /> {item.descargas} descargas</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => descargar(item.id)} className="rounded-2xl bg-slate-950 hover:bg-slate-800">
                <Download className="mr-2 h-4 w-4" /> Descargar
              </Button>
              {esAdmin && (
                <Button onClick={() => eliminarMaterial(item.id)} className="rounded-2xl bg-red-600 hover:bg-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProtectedNotice({ setVista }) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-90px)] max-w-3xl items-center px-5 py-12">
      <Card className="w-full rounded-[2rem] border-white/10 bg-white text-slate-950 shadow-2xl">
        <CardContent className="p-8 text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-red-600" />
          <h1 className="text-3xl font-black">Acceso restringido</h1>
          <p className="mt-3 text-slate-600">Necesitas iniciar sesión con un usuario autorizado para consultar esta sección.</p>
          <Button onClick={() => setVista("login")} className="mt-6 rounded-2xl bg-red-600 px-6 py-6 hover:bg-red-700">
            Iniciar sesión
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
