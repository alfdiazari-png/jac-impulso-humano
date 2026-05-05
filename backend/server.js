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

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const corsOptions = {
  origin: [
    "https://y-seven-rouge-31.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "jac-materiales",
    resource_type: "auto",
  },
});

const upload = multer({ storage });

function validarToken(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ message: "Token requerido" });
  }

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

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "JAC Backend activo",
    port: PORT,
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

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

    if (usuario.activo === false) {
      return res.status(403).json({
        message: "Usuario inactivo. Contacta al administrador.",
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

app.get("/api/materiales", async (req, res) => {
  try {
    const materiales = await prisma.material.findMany({
      orderBy: { id: "desc" },
    });

    res.json(materiales);
  } catch (error) {
    console.error("Error materiales:", error);
    res.status(500).json({ message: "Error materiales" });
  }
});

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
      console.error("Error al subir material:", error);
      res.status(500).json({ message: "Error al subir material" });
    }
  }
);

app.get("/api/materiales/:id/descargar", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const material = await prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      return res.status(404).json({ message: "Material no encontrado" });
    }

    await prisma.material.update({
      where: { id },
      data: {
        descargas: (material.descargas || 0) + 1,
      },
    });

    res.redirect(material.archivo);
  } catch (error) {
    console.error("Error descarga:", error);
    res.status(500).json({ message: "Error descarga" });
  }
});

app.delete(
  "/api/materiales/:id",
  validarToken,
  validarAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      await prisma.material.delete({
        where: { id },
      });

      res.json({ message: "Material eliminado correctamente" });
    } catch (error) {
      console.error("Error eliminar:", error);
      res.status(500).json({ message: "Error eliminar" });
    }
  }
);

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
    console.error("Error dashboard:", error);
    res.status(500).json({ message: "Error dashboard" });
  }
});

app.get("/api/usuarios", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(usuarios);
  } catch (error) {
    console.error("Error usuarios:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
});

app.post("/api/usuarios", async (req, res) => {
  try {
    const { nombre, correo, password, rol, activo } = req.body;

    if (!nombre || !correo || !password || !rol) {
      return res.status(400).json({
        message: "Nombre, correo, contraseña y rol son obligatorios",
      });
    }

    const existe = await prisma.usuario.findUnique({
      where: { correo },
    });

    if (existe) {
      return res.status(400).json({ message: "El correo ya existe" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        correo,
        password: passwordHash,
        rol,
        activo: activo ?? true,
      },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(usuario);
  } catch (error) {
    console.error("Error crear usuario:", error);
    res.status(500).json({ message: "Error al crear usuario" });
  }
});

app.put("/api/usuarios/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nombre, correo, password, rol, activo } = req.body;

    const data = {
      nombre,
      correo,
      rol,
      activo,
    };

    if (password && password.trim() !== "") {
      data.password = await bcrypt.hash(password, 10);
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(usuario);
  } catch (error) {
    console.error("Error actualizar usuario:", error);
    res.status(500).json({ message: "Error al actualizar usuario" });
  }
});

app.delete("/api/usuarios/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const usuario = await prisma.usuario.update({
      where: { id },
      data: { activo: false },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: "Usuario dado de baja correctamente",
      usuario,
    });
  } catch (error) {
    console.error("Error baja usuario:", error);
    res.status(500).json({ message: "Error al dar de baja usuario" });
  }
});

app.use((req, res) => {
  res.status(404).json({
    message: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend JAC corriendo en puerto ${PORT}`);
});