import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText, X } from "lucide-react";

interface FileUploaderProps {
  onFileUploaded: (objectPath: string, fileName: string) => void;
  accept?: string;
  maxSize?: number;
  label?: string;
  currentFile?: { name: string; path: string } | null;
  getUploadUrl: () => Promise<{ uploadURL: string; objectPath: string }>;
}

export function FileUploader({
  onFileUploaded,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  maxSize = 10 * 1024 * 1024,
  label = "Upload File",
  currentFile,
  getUploadUrl,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; path: string } | null>(currentFile || null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize) {
      setError(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const { uploadURL, objectPath } = await getUploadUrl();

      const response = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setUploadedFile({ name: file.name, path: objectPath });
      onFileUploaded(objectPath, file.name);
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    onFileUploaded("", "");
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      
      {uploadedFile ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">{uploadedFile.name}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {label}
            </>
          )}
        </Button>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
