import { Client } from "@replit/object-storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private client: Client;

  constructor() {
    this.client = new Client();
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  parseObjectPath(path: string): { bucketName: string; objectName: string } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new Error("Invalid path: must contain at least a bucket name");
    }
    const bucketName = pathParts[1];
    const objectName = pathParts.slice(2).join("/");
    return { bucketName, objectName };
  }

  /**
   * Upload a Buffer directly from the server to object storage.
   * Returns the canonical /objects/… path, or null if object storage is not configured.
   */
  async uploadBuffer(
    buffer: Buffer,
    mimeType: string,
    prefix: string = "uploads",
    extension: string = ""
  ): Promise<string | null> {
    try {
      this.getPrivateObjectDir();
      const objectId = randomUUID();
      const ext = extension ? (extension.startsWith('.') ? extension : `.${extension}`) : '';
      const objectKey = `${prefix}/${objectId}${ext}`;

      const result = await this.client.uploadFromBytes(objectKey, buffer);
      if (!result.ok) {
        throw new Error(`Upload failed: ${result.error}`);
      }

      return `/objects/${objectKey}`;
    } catch (err: any) {
      logger.warn("uploadBuffer: failed", { error: err.message });
      return null;
    }
  }

  async getObjectEntityUploadURL(prefix: string = "uploads"): Promise<{ uploadURL: string; objectPath: string }> {
    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/${prefix}/${objectId}`;
    const { bucketName, objectName } = this.parseObjectPath(fullPath);

    const uploadURL = await this.signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    return { uploadURL, objectPath: `/objects/${prefix}/${objectId}` };
  }

  async getObjectEntityFile(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const objectKey = parts.slice(1).join("/");
    const result = await this.client.exists(objectKey);
    if (!result.ok || !result.value) {
      throw new ObjectNotFoundError();
    }
    return objectKey;
  }

  async downloadObject(objectKey: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      res.set({
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      });

      const stream = this.client.downloadAsStream(objectKey);
      stream.on("error", (err) => {
        logger.error("Stream error:", { error: err.message });
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error: any) {
      logger.error("Error downloading file:", { error: error.message });
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async signObjectURL({
    bucketName,
    objectName,
    method,
    ttlSec,
  }: {
    bucketName: string;
    objectName: string;
    method: "GET" | "PUT" | "DELETE" | "HEAD";
    ttlSec: number;
  }): Promise<string> {
    const request = {
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    };
    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to sign object URL, errorcode: ${response.status}`);
    }
    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }
}

export const objectStorageService = new ObjectStorageService();

// Keep backward-compat export for any code that used objectStorageClient directly
export const objectStorageClient = null;
