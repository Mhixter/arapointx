import type { Express, Request, Response } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Check if cloud storage is configured
function isCloudStorageConfigured(): boolean {
  return !!(process.env.PRIVATE_OBJECT_DIR || process.env.PUBLIC_OBJECT_SEARCH_PATHS);
}

/**
 * Register object storage routes for file uploads.
 * Uses cloud storage if configured, otherwise falls back to local file storage.
 */
export function registerObjectStorageRoutes(app: Express): void {
  const useCloudStorage = isCloudStorageConfigured();
  let objectStorageService: ObjectStorageService | null = null;
  
  if (useCloudStorage) {
    objectStorageService = new ObjectStorageService();
  }

  /**
   * Request an upload URL for file upload.
   * Returns either a presigned URL (cloud) or a local upload endpoint.
   */
  app.post("/api/uploads/request-url", async (req: Request, res: Response) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      if (useCloudStorage && objectStorageService) {
        // Use cloud storage
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

        res.json({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        });
      } else {
        // Use local file storage
        const fileId = randomUUID();
        const ext = path.extname(name) || '';
        const fileName = `${fileId}${ext}`;
        const objectPath = `/uploads/${fileName}`;
        
        // For local storage, client will upload to our endpoint
        const uploadURL = `/api/uploads/local/${fileName}`;

        res.json({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
          isLocal: true,
        });
      }
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Local file upload endpoint (fallback when cloud storage is not configured)
   */
  app.put("/api/uploads/local/:fileName", async (req: Request, res: Response) => {
    try {
      const { fileName } = req.params;
      const filePath = path.join(UPLOADS_DIR, fileName);
      
      // Collect the raw body data
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(filePath, buffer);
        res.status(200).json({ success: true, path: `/uploads/${fileName}` });
      });
      req.on('error', (err) => {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Failed to upload file" });
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  /**
   * Serve uploaded files (local storage)
   */
  app.get("/uploads/:fileName", async (req: Request, res: Response) => {
    try {
      const { fileName } = req.params;
      const filePath = path.join(UPLOADS_DIR, fileName);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  });

  /**
   * Serve uploaded objects (cloud storage).
   */
  app.get("/objects/:objectPath(*)", async (req: Request, res: Response) => {
    if (!useCloudStorage || !objectStorageService) {
      return res.status(404).json({ error: "Cloud storage not configured" });
    }
    
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

