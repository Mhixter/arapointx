import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Upload,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileArchive,
  FileCode,
  Download,
  Share2,
  Trash2,
  Copy,
  Check,
  MoreVertical,
  Search,
  CloudUpload,
  Link2,
  Link2Off,
  FolderOpen,
  X,
} from 'lucide-react';

interface SharedFile {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  description: string | null;
  accessibleTo: string;
  shareToken: string | null;
  shareTokenExpiresAt: string | null;
  uploaderRole: string;
  uploadedByUserId: string;
  relatedRequestId: string | null;
  relatedRequestType: string | null;
  createdAt: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType === 'application/pdf' || mimeType.includes('word') || mimeType.includes('text')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar') || mimeType.includes('7z')) return FileArchive;
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) return FileCode;
  return File;
}

function getFileIconColor(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'text-purple-500';
  if (mimeType.startsWith('video/')) return 'text-blue-500';
  if (mimeType === 'application/pdf') return 'text-red-500';
  if (mimeType.includes('word') || mimeType.includes('text')) return 'text-blue-600';
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return 'text-yellow-600';
  return 'text-gray-500';
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isShareExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export default function FileStorage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [shareDialogFile, setShareDialogFile] = useState<SharedFile | null>(null);
  const [shareExpiryDays, setShareExpiryDays] = useState(7);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/files'],
    queryFn: () => apiRequest('GET', '/api/files').then(r => r.json()),
  });

  const files: SharedFile[] = data?.data?.files || [];

  const filteredFiles = files.filter(f =>
    !searchQuery ||
    f.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accessibleTo', 'user');
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/files/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({ title: 'File deleted' });
      setDeleteTargetId(null);
    },
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  const shareMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) =>
      apiRequest('POST', `/api/files/${id}/share`, { expiryDays: days }).then(r => r.json()),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      const token = data?.data?.shareToken;
      if (token) {
        const url = `${window.location.origin}/api/files/shared/${token}`;
        navigator.clipboard.writeText(url).then(() => {
          toast({ title: 'Share link copied!', description: `Expires in ${variables.days} days` });
        });
      }
      setShareDialogFile(null);
    },
    onError: () => toast({ title: 'Failed to generate share link', variant: 'destructive' }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/files/${id}/share`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({ title: 'Share link revoked' });
      setShareDialogFile(null);
    },
    onError: () => toast({ title: 'Failed to revoke link', variant: 'destructive' }),
  });

  const handleFiles = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    for (const file of Array.from(selectedFiles)) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: `${file.name} is too large`, description: 'Maximum file size is 20 MB', variant: 'destructive' });
        continue;
      }
      setUploadingFiles(prev => [...prev, file.name]);
      try {
        await uploadMutation.mutateAsync(file);
        toast({ title: `${file.name} uploaded` });
      } catch (e: any) {
        toast({ title: `Failed to upload ${file.name}`, description: e.message, variant: 'destructive' });
      } finally {
        setUploadingFiles(prev => prev.filter(n => n !== file.name));
      }
    }
  }, [uploadMutation, toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const copyShareLink = (file: SharedFile) => {
    if (!file.shareToken) return;
    const url = `${window.location.origin}/api/files/shared/${file.shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: 'Link copied to clipboard' });
    });
  };

  const handleDownload = (file: SharedFile) => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';
    const a = document.createElement('a');
    a.href = `/api/files/${file.id}/download`;
    const headers = new Headers({ Authorization: `Bearer ${token}` });
    fetch(`/api/files/${file.id}/download`, { headers })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = file.fileName;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast({ title: 'Download failed', variant: 'destructive' }));
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">File Storage</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload, manage, and share files securely using Replit Object Storage</p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors select-none
          ${isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <CloudUpload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="font-semibold text-gray-700 dark:text-gray-300">Drop files here or click to upload</p>
        <p className="text-sm text-muted-foreground mt-1">Supports any file type · Max 20 MB per file</p>

        {uploadingFiles.length > 0 && (
          <div className="mt-4 space-y-1">
            {uploadingFiles.map(name => (
              <div key={name} className="flex items-center justify-center gap-2 text-sm text-primary animate-pulse">
                <Upload className="h-4 w-4" />
                <span>Uploading {name}…</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* File list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{searchQuery ? 'No files match your search' : 'No files yet'}</p>
          <p className="text-sm mt-1">{!searchQuery && 'Upload a file above to get started'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}</p>
          {filteredFiles.map(file => {
            const Icon = getFileIcon(file.mimeType);
            const iconColor = getFileIconColor(file.mimeType);
            const hasShare = !!file.shareToken;
            const shareExpired = isShareExpired(file.shareTokenExpiresAt);
            const shareActive = hasShare && !shareExpired;

            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.fileName}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{formatDate(file.createdAt)}</span>
                    {shareActive && (
                      <Badge variant="outline" className="text-xs py-0 h-4 text-green-600 border-green-300">
                        <Link2 className="h-2.5 w-2.5 mr-1" />
                        Shared
                      </Badge>
                    )}
                    {hasShare && shareExpired && (
                      <Badge variant="outline" className="text-xs py-0 h-4 text-orange-500 border-orange-300">
                        Link expired
                      </Badge>
                    )}
                  </div>
                  {file.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{file.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {shareActive && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Copy share link"
                      onClick={() => copyShareLink(file)}
                    >
                      {copiedId === file.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShareDialogFile(file)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        {shareActive ? 'Manage Share Link' : 'Share File'}
                      </DropdownMenuItem>
                      {shareActive && (
                        <DropdownMenuItem onClick={() => copyShareLink(file)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Share Link
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeleteTargetId(file.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share dialog */}
      <Dialog open={!!shareDialogFile} onOpenChange={() => setShareDialogFile(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share File</DialogTitle>
            <DialogDescription className="truncate">{shareDialogFile?.fileName}</DialogDescription>
          </DialogHeader>
          {shareDialogFile && (
            <div className="space-y-4">
              {shareDialogFile.shareToken && !isShareExpired(shareDialogFile.shareTokenExpiresAt) ? (
                <>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                      <Link2 className="h-4 w-4" /> Active share link
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires: {shareDialogFile.shareTokenExpiresAt ? formatDate(shareDialogFile.shareTokenExpiresAt) : 'Never'}
                    </p>
                    <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border text-xs font-mono break-all text-muted-foreground">
                      {`${window.location.origin}/api/files/shared/${shareDialogFile.shareToken}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => copyShareLink(shareDialogFile)}>
                      <Copy className="h-4 w-4 mr-2" /> Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => revokeMutation.mutate(shareDialogFile.id)}
                      disabled={revokeMutation.isPending}
                    >
                      <Link2Off className="h-4 w-4 mr-2" /> Revoke
                    </Button>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Generate new link</p>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Expires in</Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={shareExpiryDays}
                        onChange={e => setShareExpiryDays(parseInt(e.target.value) || 7)}
                        className="w-20 text-center"
                      />
                      <Label className="text-xs">days</Label>
                      <Button
                        size="sm"
                        onClick={() => shareMutation.mutate({ id: shareDialogFile.id, days: shareExpiryDays })}
                        disabled={shareMutation.isPending}
                      >
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Generate a shareable link so anyone with it can download this file — no login needed.
                  </p>
                  {shareDialogFile.shareToken && isShareExpired(shareDialogFile.shareTokenExpiresAt) && (
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded text-xs text-orange-700">
                      Previous share link expired. Generate a new one below.
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Expires in</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={shareExpiryDays}
                      onChange={e => setShareExpiryDays(parseInt(e.target.value) || 7)}
                      className="w-20 text-center"
                    />
                    <Label className="text-xs">days (max 30)</Label>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => shareMutation.mutate({ id: shareDialogFile.id, days: shareExpiryDays })}
                    disabled={shareMutation.isPending}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    {shareMutation.isPending ? 'Generating…' : 'Generate Share Link'}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file and revoke any active share links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
