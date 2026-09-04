import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { PageSettings, TextStyle, TypographySettings, TypographyStyleName } from '../types';

const SYSTEM_FONTS = [
  { value: 'Inter, ui-sans-serif, system-ui, sans-serif', label: 'Inter / System' },
  { value: 'ui-sans-serif, system-ui, sans-serif', label: 'System Sans' },
  { value: 'Georgia, Cambria, Times New Roman, serif', label: 'Serif' },
  { value: 'ui-monospace, SFMono-Regular, Menlo, monospace', label: 'Monospace' },
];

const STYLE_NAMES: Array<{ key: TypographyStyleName; label: string }> = [
  { key: 'h1', label: 'Heading 1' },
  { key: 'h2', label: 'Heading 2' },
  { key: 'h3', label: 'Heading 3' },
  { key: 'h4', label: 'Heading 4' },
  { key: 'h5', label: 'Heading 5' },
  { key: 'h6', label: 'Heading 6' },
  { key: 'body', label: 'Body' },
  { key: 'bodySmall', label: 'Body small' },
  { key: 'caption', label: 'Caption' },
  { key: 'label', label: 'Label' },
  { key: 'button', label: 'Button' },
];

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  families: {
    primary: 'Inter, ui-sans-serif, system-ui, sans-serif',
    secondary: 'Georgia, Cambria, Times New Roman, serif',
    monospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  styles: {
    h1: { family: 'primary', size: '3.5rem', weight: '700', lineHeight: '1.05', letterSpacing: '-0.03em', textTransform: 'none' },
    h2: { family: 'primary', size: '2.75rem', weight: '700', lineHeight: '1.1', letterSpacing: '-0.025em', textTransform: 'none' },
    h3: { family: 'primary', size: '2rem', weight: '650', lineHeight: '1.15', letterSpacing: '-0.02em', textTransform: 'none' },
    h4: { family: 'primary', size: '1.5rem', weight: '650', lineHeight: '1.2', letterSpacing: '-0.015em', textTransform: 'none' },
    h5: { family: 'primary', size: '1.25rem', weight: '600', lineHeight: '1.25', letterSpacing: '-0.01em', textTransform: 'none' },
    h6: { family: 'primary', size: '1rem', weight: '600', lineHeight: '1.3', letterSpacing: '0', textTransform: 'none' },
    body: { family: 'primary', size: '1rem', weight: '400', lineHeight: '1.6', letterSpacing: '0', textTransform: 'none' },
    bodySmall: { family: 'primary', size: '0.875rem', weight: '400', lineHeight: '1.5', letterSpacing: '0', textTransform: 'none' },
    caption: { family: 'primary', size: '0.75rem', weight: '400', lineHeight: '1.4', letterSpacing: '0.01em', textTransform: 'none' },
    label: { family: 'primary', size: '0.75rem', weight: '600', lineHeight: '1.2', letterSpacing: '0.04em', textTransform: 'uppercase' },
    button: { family: 'primary', size: '0.875rem', weight: '600', lineHeight: '1.2', letterSpacing: '0.01em', textTransform: 'none' },
  },
};

function mergeTypography(value?: TypographySettings): TypographySettings {
  return {
    families: { ...DEFAULT_TYPOGRAPHY.families, ...value?.families },
    styles: Object.fromEntries(
      STYLE_NAMES.map(({ key }) => [key, { ...DEFAULT_TYPOGRAPHY.styles[key], ...value?.styles?.[key] }]),
    ) as TypographySettings['styles'],
  };
}

function FamilyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-1">
      <Label className="text-[11px]">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SYSTEM_FONTS.map(font => <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input className="h-7 text-xs" value={value} onChange={event => onChange(event.target.value)} aria-label={`${label} font family`} />
    </div>
  );
}

function StyleEditor({ name, style, onChange }: { name: string; style: TextStyle; onChange: (patch: Partial<TextStyle>) => void }) {
  return (
    <div className="grid gap-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-semibold">{name}</Label>
        <span className="truncate text-[10px] text-muted-foreground" style={{ fontSize: style.size, fontWeight: Number(style.weight) || 400 }}>Aa</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Select value={style.family ?? 'primary'} onValueChange={value => onChange({ family: value as TextStyle['family'] })}>
          <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="monospace">Monospace</SelectItem>
          </SelectContent>
        </Select>
        <Input className="h-7 text-xs" value={style.size ?? ''} onChange={event => onChange({ size: event.target.value })} placeholder="Size" />
        <Input className="h-7 text-xs" value={style.weight ?? ''} onChange={event => onChange({ weight: event.target.value })} placeholder="Weight" />
        <Input className="h-7 text-xs" value={style.lineHeight ?? ''} onChange={event => onChange({ lineHeight: event.target.value })} placeholder="Line height" />
        <Input className="h-7 text-xs" value={style.letterSpacing ?? ''} onChange={event => onChange({ letterSpacing: event.target.value })} placeholder="Letter spacing" />
        <Select value={style.textTransform ?? 'none'} onValueChange={value => onChange({ textTransform: value as TextStyle['textTransform'] })}>
          <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No transform</SelectItem>
            <SelectItem value="uppercase">Uppercase</SelectItem>
            <SelectItem value="lowercase">Lowercase</SelectItem>
            <SelectItem value="capitalize">Capitalize</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function TypographyPanel({ settings, onChange }: { settings?: PageSettings; onChange: (patch: Partial<PageSettings>) => void }) {
  const typography = mergeTypography(settings?.typography);
  const setTypography = (next: TypographySettings) => onChange({ typography: next });

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-xs font-semibold">Typography</p>
        <p className="text-[10px] text-muted-foreground">Global type system used by editor preview and frontend render.</p>
      </div>
      <div className="grid gap-2">
        <FamilyField label="Primary" value={typography.families.primary} onChange={value => setTypography({ ...typography, families: { ...typography.families, primary: value } })} />
        <FamilyField label="Secondary" value={typography.families.secondary} onChange={value => setTypography({ ...typography, families: { ...typography.families, secondary: value } })} />
        <FamilyField label="Monospace" value={typography.families.monospace} onChange={value => setTypography({ ...typography, families: { ...typography.families, monospace: value } })} />
      </div>
      <Separator />
      <div className="divide-y">
        {STYLE_NAMES.map(({ key, label }) => (
          <StyleEditor key={key} name={label} style={typography.styles[key]} onChange={patch => setTypography({ ...typography, styles: { ...typography.styles, [key]: { ...typography.styles[key], ...patch } } })} />
        ))}
      </div>
    </div>
  );
}
