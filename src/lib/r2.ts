import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Settings = {
  bucket: string;
  client: S3Client;
};

function settings(): R2Settings | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function presignAvatarPut(key: string, mimeType: string): Promise<string | null> {
  const config = settings();
  if (!config) {
    return null;
  }

  return getSignedUrl(
    config.client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: mimeType,
    }),
    { expiresIn: 300 },
  );
}

export async function presignAvatarGet(key: string): Promise<string | null> {
  const config = settings();
  if (!config) {
    return null;
  }

  return getSignedUrl(
    config.client,
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    { expiresIn: 60 * 15 },
  );
}

export async function inspectAvatarObject(
  key: string,
): Promise<{ size: number; mimeType: string } | null> {
  const config = settings();
  if (!config) {
    return null;
  }

  const head = await config.client.send(
    new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
  );
  return {
    size: head.ContentLength ?? 0,
    mimeType: (head.ContentType ?? "").split(";")[0]?.trim() ?? "",
  };
}

export async function deleteAvatarObject(key: string): Promise<void> {
  const config = settings();
  if (!config) {
    return;
  }

  await config.client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
