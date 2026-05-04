import express from "express";
import cors from "cors";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "jac_super_seguro_2026";

// 🌐 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🌐 CORS
const corsOptions = {
  origin: [
    "https://y-seven-rouge-31.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
  ],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

// ☁️ Upload Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "jac-materiales",
    resource_type: "auto",
  },
});

const upload = multer({ storage });

// 🔐 Middlewares
function validarToken(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth) return res.status(401).json({ message: "Token requerido" });

  const token = auth.split(" ")[1];

  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}

function validarAdmin(req, res, next) {
  if (req.usuario.rol !== "admin") {
    return res.status(403).json({ message: "Acceso solo para administrador" });
  }
  next();
}

// 🔥 ROOT
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "JAC Backend activo",
    port: PORT,
  });
});

// 🔥 HEALTH (PARA CRON-JOB)
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// 🔐 LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { correo, password } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { correo },
    });

    if (!usuario) {
      return res.status(401).json({
        message: "Usuario o contraseña incorrectos",
      });
    }

    const match = await bcrypt.compare(password, usuario.password);

    if (!match) {
      return res.status(401).json({
        message: "Usuario o contraseña incorrectos",
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 📁 MATERIALES
app.get("/api/materiales", async (req, res) => {
  try {
    const materiales = await prisma.material.findMany({
      orderBy: { id: "desc" },
    });

    res.json(materiales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error materiales" });
  }
});

// 📤 SUBIR MATERIAL
app.post(
  "/api/materiales",
  validarToken,
  validarAdmin,
  upload.single("archivo"),
  async (req, res) => {
    try {
      const { titulo, categoria, descripcion } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Archivo requerido" });
      }

      const extension = req.file.originalname
        .split(".")
        .pop()
        .toUpperCase();

      const material = await prisma.material.create({
        data: {
          titulo,
          categoria,
          descripcion,
          tipo: extension,
          fecha: new Date().toISOString().slice(0, 10),
          descargas: 0,
          vistas: 0,
          archivo: req.file.path,
        },
      });

      res.status(201).json(material);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al subir" });
    }
  }
);

// 📥 DESCARGAR
app.get("/api/materiales/:id/descargar", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const material = await prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      return res.status(404).json({ message: "No encontrado" });
    }

    await prisma.material.update({
      where: { id },
      data: { descargas: material.descargas + 1 },
    });

    res.redirect(material.archivo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error descarga" });
  }
});

// 🗑️ ELIMINAR
app.delete(
  "/api/materiales/:id",
  validarToken,
  validarAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      await prisma.material.delete({ where: { id } });

      res.json({ message: "Eliminado" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error eliminar" });
    }
  }
);

// 📊 DASHBOARD PRO
app.get("/api/dashboard", async (req, res) => {
  try {
    const totalMateriales = await prisma.material.count();
    const totalUsuarios = await prisma.usuario.count();

    const descargas = await prisma.material.aggregate({
      _sum: { descargas: true },
    });

    const topMateriales = await prisma.material.findMany({
      orderBy: { descargas: "desc" },
      take: 5,
    });

    const recientes = await prisma.material.findMany({
      orderBy: { id: "desc" },
      take: 5,
    });

    res.json({
      totalMateriales,
      totalUsuarios,
      totalDescargas: descargas._sum.descargas || 0,
      topMateriales,
      recientes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error dashboard" });
  }
});

// ❌ 404
app.use((req, res) => {
  res.status(404).json({
    message: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

// 🚀 START
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend JAC corriendo en puerto ${PORT}`);
});

// =========================
// USUARIOS PRO API
// =========================

// Obtener usuarios
app.get("/api/usuarios", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: "desc" },
    });

    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
});

// Crear usuario
app.post("/api/usuarios", async (req, res) => {
  try {
    const { nombre, correo, password, rol, activo } = req.body;

    const nuevo = await prisma.usuario.create({
      data: {
        nombre,
        correo,
        password,
        rol,
        activo,
      },
    });

    res.json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear usuario" });
  }
});

// Actualizar usuario
app.put("/api/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, rol, activo } = req.body;

    const actualizado = await prisma.usuario.update({
      where: { id: Number(id) },
      data: { nombre, correo, rol, activo },
    });

    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar usuario" });
  }
});

// Eliminar usuario
app.delete("/api/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.usuario.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar usuario" });
  }
});