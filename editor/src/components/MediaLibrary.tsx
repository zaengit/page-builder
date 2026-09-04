import { ImagePlus, Loader2, Search, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EditorRuntime } from '../types';

type MediaItem = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  updatedAt: number;
};

type MediaRequestDetail = {
  blockId: string;
  path: string[];
  value?: unknown;
};

function csrfHeaders(): Record<string, string> {
  const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
  return token ? { 'X-CSRF-TOKEN': token } : {};
}

function readableSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaLibrary({ root, runtime }: { root: HTMLElement; runtime: EditorRuntime }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<MediaRequestDetail | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const enabled = Boolean(runtime.mediaPicker && runtime.mediaListUrl && runtime.mediaUploadUrl && runtime.mediaDeleteUrl);

  const load = async (search = '') => {
    if (!enabled || !runtime.mediaListUrl) return;
    setLoading(true);
    setError('');
    try {
      const url = new URL(runtime.mediaListUrl, location.href);
      if (search.trim()) url.searchParams.set('q', search.trim());
      const response = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to load media library');
      setItems(Array.isArray(result.data) ? result.data : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load media library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<MediaRequestDetail>).detail;
      if (!detail?.blockId || !Array.isArray(detail.path)) return;
      request.current = detail;
      setQuery('');
      setSelectedId(null);
      setOpen(true);
      void load('');
    };
    root.addEventListener('page-builder:media-request', listener);
    return () => root.removeEventListener('page-builder:media-request', listener);
  }, [enabled, root]);

  useEffect(() => {
    if (!open || !enabled) return;
    const timer = setTimeout(() => void load(query), 220);
    return () => clearTimeout(timer);
  }, [query, open, enabled]);

  const selected = useMemo(() => items.find(item => item.id === selectedId) ?? null, [items, selectedId]);

  const choose = () => {
    if (!selected) return;
    window.postMessage({ type: 'PAGE_BUILDER_MEDIA_SELECTED', url: selected.url }, location.origin);
    setOpen(false);
    request.current = null;
  };

  const upload = async (file?: File) => {
    if (!file || !runtime.mediaUploadUrl) return;
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(runtime.mediaUploadUrl, {
        method: 'POST',
        headers: { Accept: 'application/json', ...csrfHeaders() },
        credentials: 'same-origin',
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || Object.values(result.errors ?? {}).flat().join(' ') || 'Upload failed');
      const item = result.data as MediaItem;
      setItems(current => [item, ...current.filter(existing => existing.id !== item.id)]);
      setSelectedId(item.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const remove = async (item: MediaItem) => {
    if (!runtime.mediaDeleteUrl) return;
    setError('');
    try {
      const url = runtime.mediaDeleteUrl.replace('__MEDIA__', encodeURIComponent(item.id));
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Accept: 'application/json', ...csrfHeaders() },
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Delete failed');
      setItems(current => current.filter(existing => existing.id !== item.id));
      if (selectedId === item.id) setSelectedId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Delete failed');
    }
  };

  if (!enabled) return null;

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-w-4xl gap-0 overflow-hidden rounded-2xl border-border/50 p-0 shadow-2xl sm:max-w-4xl">
      <DialogHeader className="border-b border-border/45 bg-card/90 px-5 py-4">
        <DialogTitle>Media library</DialogTitle>
        <DialogDescription>Upload, search, reuse, or remove images stored by Page Builder.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 border-b border-border/40 bg-muted/20 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search images…" className="h-9 rounded-lg pl-8" />
        </div>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={event => void upload(event.target.files?.[0])} />
        <Button type="button" variant="secondary" className="rounded-lg" disabled={uploading} onClick={() => fileInput.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload image
        </Button>
      </div>

      {error && <div className="bg-destructive/10 px-4 py-2 text-xs text-destructive">{error}</div>}

      <ScrollArea className="h-[52vh] min-h-80">
        {loading ? <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" />Loading media…</div> : items.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center gap-2 text-center text-muted-foreground"><ImagePlus className="size-8" /><p className="text-sm">No images found.</p><p className="text-xs">Upload an image to start your media library.</p></div> : <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 md:grid-cols-4">
          {items.map(item => <div key={item.id} className="group grid gap-1.5">
            <button type="button" onClick={() => setSelectedId(item.id)} className={`relative aspect-square overflow-hidden rounded-xl border border-border/40 bg-muted text-left ring-offset-background transition ${selectedId === item.id ? 'ring-2 ring-ring/60 ring-offset-2' : 'hover:border-foreground/20'}`}>
              <img src={item.url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
              {selectedId === item.id && <Badge className="absolute left-2 top-2 rounded-md shadow-sm">Selected</Badge>}
            </button>
            <div className="flex min-w-0 items-center gap-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium" title={item.name}>{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{readableSize(item.size)}</p>
              </div>
              <Button type="button" size="icon-xs" variant="ghost" aria-label={`Delete ${item.name}`} onClick={() => void remove(item)}><Trash2 /></Button>
            </div>
          </div>)}
        </div>}
      </ScrollArea>

      <DialogFooter className="border-t border-border/40 px-5 py-3 sm:justify-between">
        <div className="mr-auto min-w-0 text-xs text-muted-foreground">{selected ? <span className="truncate">{selected.name}</span> : 'Select an image to use it.'}</div>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="button" className="rounded-lg" disabled={!selected} onClick={choose}>Use image</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
