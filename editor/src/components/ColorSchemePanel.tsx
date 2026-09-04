import { Copy, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { ColorScheme, ColorSchemeColors, PageSettings } from '../types';

const DEFAULT_COLORS: ColorSchemeColors = {
  background: '#ffffff',
  foreground: '#18181b',
  primary: '#18181b',
  primaryForeground: '#ffffff',
  secondary: '#f4f4f5',
  secondaryForeground: '#18181b',
  accent: '#f4f4f5',
  accentForeground: '#18181b',
  muted: '#f4f4f5',
  mutedForeground: '#71717a',
  border: '#e4e4e7',
};

const COLOR_LABELS: Array<[keyof ColorSchemeColors, string]> = [
  ['background', 'Background'],
  ['foreground', 'Text'],
  ['primary', 'Solid button background'],
  ['primaryForeground', 'Solid button label'],
  ['secondary', 'Secondary background'],
  ['secondaryForeground', 'Secondary text'],
  ['accent', 'Accent'],
  ['accentForeground', 'Accent text'],
  ['muted', 'Muted background'],
  ['mutedForeground', 'Muted text'],
  ['border', 'Border'],
];

function newScheme(name: string, colors: ColorSchemeColors = DEFAULT_COLORS): ColorScheme {
  return {
    id: `scheme-${crypto.randomUUID().slice(0, 8)}`,
    name,
    colors: { ...colors },
  };
}

export function ColorSchemeManager({
  settings,
  onChange,
}: {
  settings?: PageSettings;
  onChange: (patch: Partial<PageSettings>) => void;
}) {
  const schemes = settings?.colorSchemes ?? [];
  const defaultSchemeId = settings?.defaultColorSchemeId ?? schemes[0]?.id;
  const [editingId, setEditingId] = useState<string>('');

  useEffect(() => {
    if (schemes.length > 0) return;
    const first = newScheme('Scheme 1');
    onChange({ colorSchemes: [first], defaultColorSchemeId: first.id });
  }, [onChange, schemes.length]);

  useEffect(() => {
    if (!editingId && schemes[0]) setEditingId(schemes[0].id);
    if (editingId && !schemes.some(scheme => scheme.id === editingId)) setEditingId(schemes[0]?.id ?? '');
  }, [editingId, schemes]);

  const editing = useMemo(
    () => schemes.find(scheme => scheme.id === editingId) ?? schemes[0],
    [editingId, schemes],
  );

  const saveSchemes = (next: ColorScheme[], nextDefault = defaultSchemeId) => {
    onChange({
      colorSchemes: next,
      defaultColorSchemeId: next.some(scheme => scheme.id === nextDefault) ? nextDefault : next[0]?.id,
    });
  };

  const patchEditing = (patch: Partial<ColorScheme>) => {
    if (!editing) return;
    saveSchemes(schemes.map(scheme => scheme.id === editing.id ? { ...scheme, ...patch } : scheme));
  };

  const patchColor = (key: keyof ColorSchemeColors, value: string) => {
    if (!editing) return;
    patchEditing({ colors: { ...editing.colors, [key]: value } });
  };

  const addScheme = () => {
    const next = newScheme(`Scheme ${schemes.length + 1}`, editing?.colors ?? DEFAULT_COLORS);
    saveSchemes([...schemes, next], defaultSchemeId ?? next.id);
    setEditingId(next.id);
  };

  const duplicateScheme = () => {
    if (!editing) return;
    const next = newScheme(`${editing.name} copy`, editing.colors);
    saveSchemes([...schemes, next]);
    setEditingId(next.id);
  };

  const removeScheme = () => {
    if (!editing || schemes.length <= 1) return;
    const next = schemes.filter(scheme => scheme.id !== editing.id);
    saveSchemes(next);
    setEditingId(next[0]?.id ?? '');
  };

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-xs font-semibold">Color schemes</p>
        <p className="text-[10px] text-muted-foreground">
          Create reusable palettes and choose the default used by the page and its blocks.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          <Label className="text-xs">Schemes</Label>
          <Select value={editing?.id ?? ''} onValueChange={setEditingId}>
            <SelectTrigger size="sm" aria-label="Scheme to edit">
              <SelectValue placeholder="Choose scheme" />
            </SelectTrigger>
            <SelectContent>
              {schemes.map(scheme => (
                <SelectItem key={scheme.id} value={scheme.id}>{scheme.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="xs" onClick={addScheme}>
            <Plus /> Add scheme
          </Button>
          <Button type="button" variant="outline" size="xs" disabled={!editing} onClick={duplicateScheme}>
            <Copy /> Duplicate
          </Button>
          <Button type="button" variant="outline" size="xs" disabled={schemes.length <= 1} onClick={removeScheme}>
            <Trash2 /> Delete
          </Button>
        </div>

        {editing && (
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label className="text-xs">Name</Label>
              <Input
                className="h-8 text-xs"
                value={editing.name}
                onChange={event => patchEditing({ name: event.target.value })}
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-xs">Page default</Label>
              <Select
                value={defaultSchemeId ?? editing.id}
                onValueChange={value => onChange({ defaultColorSchemeId: value })}
              >
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {schemes.map(scheme => (
                    <SelectItem key={scheme.id} value={scheme.id}>{scheme.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid gap-2">
              {COLOR_LABELS.map(([key, label]) => (
                <div key={key} className="grid grid-cols-[1fr_42px] items-end gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[11px]">{label}</Label>
                    <Input
                      className="h-8 text-xs"
                      value={editing.colors[key]}
                      onChange={event => patchColor(key, event.target.value)}
                    />
                  </div>
                  <Input
                    type="color"
                    className="h-8 w-10 p-1"
                    value={editing.colors[key]}
                    aria-label={`${label} color`}
                    onChange={event => patchColor(key, event.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button type="button" variant="secondary" onClick={addScheme}>
        Add another scheme
      </Button>
    </div>
  );
}
