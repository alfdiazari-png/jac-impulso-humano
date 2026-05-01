import express from "express";
import cors from "cors";
import multer from "multer";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "jac_impulso_humano_secret";

app.use(cors({
  origin: "https://benevolent-torte-ff278c.netlify.app"
}));
app.use(express.json());

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

let materiales = [];
let nextId = 1;

const usuarios = [
  {
    correo: "admin@jac.com",
    password: "admin123",
    nombre: "Administrador JAC",
    rol: "admin",
  },
  {
    correo: "usuario@jac.com",
    password: "usuario123",
    nombre: "Colaborador JAC",
    rol: "usuario",
  },
];

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
    res.status(401).json({ message: "Token inválido" });
  }
}

function validarAdmin(req, res, next) {
  if (req.usuario.rol !== "admin") {
    return res.status(403).json({ message: "Acceso solo para administrador" });
  }

  next();
}

app.post("/api/auth/login", (req, res) => {
  const { correo, password } = req.body;

  const usuario = usuarios.find(
    (u) => u.correo === correo && u.password === password
  );

  if (!usuario) {
    return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
  }

  const token = jwt.sign(
    {
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    token,
    usuario: {
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
    },
  });
});

app.get("/api/materiales", (req, res) => {
  res.json(materiales);
});

app.post(
  "/api/materiales",
  validarToken,
  validarAdmin,
  upload.single("archivo"),
  (req, res) => {
    const { titulo, categoria, descripcion } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Archivo requerido" });
    }

    const extension = path.extname(req.file.originalname).replace(".", "").toUpperCase();

    const material = {
      id: nextId++,
      titulo,
      categoria,
      descripcion,
      tipo: extension,
      fecha: new Date().toISOString().slice(0, 10),
      descargas: 0,
      vistas: 0,
      archivoOriginal: req.file.originalname,
      archivoServidor: req.file.filename,
    };

    materiales.unshift(material);

    res.status(201).json(material);
  }
);

app.get("/api/materiales/:id/descargar", (req, res) => {
  const id = Number(req.params.id);
  const material = materiales.find((m) => m.id === id);

  if (!material) {
    return res.status(404).json({ message: "Material no encontrado" });
  }

  material.descargas += 1;

  const filePath = path.join(uploadsDir, material.archivoServidor);
  res.download(filePath, material.archivoOriginal);
});

app.delete("/api/materiales/:id", validarToken, validarAdmin, (req, res) => {
  const id = Number(req.params.id);
  const material = materiales.find((m) => m.id === id);

  if (!material) {
    return res.status(404).json({ message: "Material no encontrado" });
  }

  const filePath = path.join(uploadsDir, material.archivoServidor);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  materiales = materiales.filter((m) => m.id !== id);

  res.json({ message: "Material eliminado correctamente" });
});

app.listen(PORT, () => {
  console.log(`Backend JAC corriendo en http://localhost:${PORT}`);
});