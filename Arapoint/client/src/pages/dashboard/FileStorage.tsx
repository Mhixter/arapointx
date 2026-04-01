import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  File,
  FileText,
  FileImage,
  FileVideo,
  FileArchive,
  FileCode,
  Download,
  Search,
  FolderOpen,
  X,
  Building2,
  GraduationCap,
  ShieldCheck,
  BookOpen,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

interface SharedFile {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  description: string | null;
  accessibleTo: string;
  uploaderRole: string;
  uploadedByUserId: string;
  relatedRequestId: string | null;
  relatedRequestType: string | null;
  shareToken: string | null;
  shareTokenExpiresAt: string | null;
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

function getServiceIcon(type: string | null) {
  switch (type) {
    case 'cac': return Building2;
    case 'education': return GraduationCap;
    case 'identity': return ShieldCheck;
    case 'jamb': return BookOpen;
    default: return UserCheck;
  }
}

function getServiceLabel(type: string | null) {
  switch (type) {
    case 'cac': return 'CAC Registration';
    case 'education': return 'Education Result';
    case 'identity': return 'NIN / Identity';
    case 'jamb': return 'JAMB Service';
    default: return 'Agent Result';
  }
}

function getServiceColor(type: string | null) {
  switch (type) {
    case 'cac': return 'text-blue-700 bg-blue-50 dark:bg-blue-900/20';
    case 'education': return 'text-green-700 bg-green-50 dark:bg-green-900/20';
    case 'identity': return 'text-purple-700 bg-purple-50 dark:bg-purple-900/20';
    case 'jamb': return 'text-orange-700 bg-orange-50 dark:bg-orange-900/20';
    default: return 'text-teal-700 bg-teal-50 dark:bg-teal-900/20';
  }
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

export default function FileStorage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['/api/files'],
    queryFn: () => apiRequest('GET', '/api/files').then(r => r.json()),
  });

  // Deduplicate: keep only the latest entry per (relatedRequestId + description) pair
  // The API returns files newest-first, so first occurrence is always the latest
  const allFiles: SharedFile[] = (() => {
    const raw: SharedFile[] = (data?.data?.files || []).filter(
      (f: SharedFile) => f.uploaderRole === 'agent'
    );
    const seen = new Set<string>();
    return raw.filter(f => {
      const key = `${f.relatedRequestId ?? ''}::${f.description ?? f.fileName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const filteredFiles = !searchQuery
    ? allFiles
    : allFiles.filter(f =>
        f.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        getServiceLabel(f.relatedRequestType).toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleDownload = (file: SharedFile) => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';
    fetch(`/api/files/${file.id}/download`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.redirected) { window.open(res.url, '_blank'); return; }
        return res.blob().then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.fileName;
          a.click();
          URL.revokeObjectURL(url);
        });
      })
      .catch(() => toast({ title: 'Download failed', variant: 'destructive' }));
  };

  const FileRow = ({ file }: { file: SharedFile }) => {
    const Icon = getFileIcon(file.mimeType);
    const iconColor = getFileIconColor(file.mimeType);
    const ServiceIcon = getServiceIcon(file.relatedRequestType);
    const serviceColor = getServiceColor(file.relatedRequestType);

    return (
      <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{file.fileName}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${serviceColor}`}>
              <ServiceIcon className="h-3 w-3" />
              {getServiceLabel(file.relatedRequestType)}
            </span>
            <span className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{formatDate(file.createdAt)}</span>
          </div>
          {file.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{file.description}</p>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 shrink-0"
          onClick={() => handleDownload(file)}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Download</span>
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Documents and results delivered by your agents
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="shrink-0 mt-1">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search */}
      {allFiles.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

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
          <p className="font-medium">
            {searchQuery ? 'No documents match your search' : 'No documents yet'}
          </p>
          <p className="text-sm mt-1 max-w-xs mx-auto">
            {!searchQuery && 'Once an agent completes your request, your documents will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {filteredFiles.length} document{filteredFiles.length !== 1 ? 's' : ''}
          </p>
          {filteredFiles.map(file => (
            <FileRow key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
