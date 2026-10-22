import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../types/http-error";

const uploadsDir = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx", ".mp4"];

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      callback(new Error("Tipo de archivo no permitido."), "");
      return;
    }
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(new Error("Tipo de archivo no permitido. Solo se aceptan imágenes, PDF, Word y video MP4."));
    return;
  }
  callback(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function uploadSingleFile(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new HttpError(400, "El archivo supera el tamaño máximo permitido (10MB)."));
        return;
      }
      next(new HttpError(400, error.message));
      return;
    }

    if (error instanceof Error) {
      next(new HttpError(400, error.message));
      return;
    }

    next(error);
  });
}
