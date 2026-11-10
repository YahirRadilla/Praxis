import type { Request, Response, NextFunction } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { HttpError } from "../types/http-error";
import { generateStorageKey } from "../middleware/upload.middleware";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "../lib/r2-client";

export async function uploadFileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new HttpError(400, "No se recibió ningún archivo.");
    }

    const key = generateStorageKey(req.file.originalname);
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }),
    );

    const url = `${R2_PUBLIC_URL}/${key}`;
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
