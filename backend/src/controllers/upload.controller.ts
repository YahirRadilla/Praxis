import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../types/http-error";

export async function uploadFileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new HttpError(400, "No se recibió ningún archivo.");
    }

    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(201).json({
      url,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });
  } catch (error) {
    next(error);
  }
}
