import { S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 speaks the S3 API, so the AWS SDK's S3Client works against it
// unmodified once pointed at the account's R2 endpoint (`region: "auto"` is
// R2's required value, not a real AWS region).
export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "";

// Public base URL for the bucket (its r2.dev dev URL, or a custom domain
// mapped to it) — object keys are appended directly to this to build the
// URL returned to clients.
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
