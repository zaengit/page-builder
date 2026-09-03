import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { getControl } from '../registry';
import { builderStoreBridge } from '../store';
import { defaults } from '../utils';
import type { ControlProps, ResponsiveValue, TypographyStyleName, VisibilityRule } from '../types';

const TYPOGRAPHY_STYLES: Array<{ value: TypographyStyleName; label: string }> = [
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
  { value: 'body', label: 'Body' },
  { value: 'bodySmall', label: 'Body small' },
  { value: 'caption', label: 'Caption' },
  { value: 'label', label: 'Label' },
  { value: 'button', label: 'Button' },
];

function Help({ text }: { text?: string }) { return text ? <p className="text-[11px] leading-snug text-muted-foreground">{text}</p> : null; }
function Field({ label, htmlFor, help, children }: { label: string; htmlFor?: string; help?: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label htmlFor={htmlFor} className="text-xs">{label}</Label>{children}<Help text={help} /></div>; }

function ruleMatches(rule: VisibilityRule, attrs: Record<string, unknown>) {
  const value = attrs[rule.attribute];
  if ('equals' in rule && value !== rule.equals) return false;
  if ('notEquals' in rule && value === rule.notEquals) return false;
  if ('truthy' in rule && Boolean(value) !== rule.truthy) return false;
  return true;
}

export function isControlVisible(props: ControlProps) {
  if (!props.schema.visibleWhen) return true;
  const rules = Array.isArray(props.schema.visibleWhen) ? props.schema.visibleWhen : [props.schema.visibleWhen];
  return rules.every(rule => ruleMatches(rule, props.attrs ?? {}));
}

function GlobalColorSchemeControl({ name, schema, value, onChange }: ControlProps) {
  const useBuilder = builderStoreBridge.current;
  const settings = useBuilder?.(state => state.content.settings);
  const schemes = settings?.colorSchemes ?? [];
  const label = schema.label ?? name;

  return <Field label={label} help={schema.help}>
    <Select value={String(value ?? '__default')} onValueChange={next => onChange(next === '__default' ? '' : next)}>
      <SelectTrigger aria-label={label} size="sm" className="w-full"><SelectValue placeholder="Page default" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__default">Page default</SelectItem>
        {schemes.map(scheme => <SelectItem key={scheme.id} value={scheme.id}>{scheme.name}</SelectItem>)}
      </SelectContent>
    </Select>
    {schemes.length === 0 && <p className="text-[10px] text-muted-foreground">Create a color scheme from the global color scheme manager first.</p>}
  </Field>;
}

function TypographyPresetControl({ name, schema, value, onChange }: ControlProps) {
  const label = schema.label ?? name;
  return <Field label={label} help={schema.help}>
    <Select value={String(value ?? 'body')} onValueChange={onChange}>
      <SelectTrigger aria-label={label} size="sm" className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        {TYPOGRAPHY_STYLES.map(style => <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </Field>;
}

function SpacingControl({ name, schema, value, onChange }: ControlProps) {
  const label = schema.label ?? name;
  const parts = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  const current = {
    top: parts[0] ?? '0',
    right: parts[1] ?? parts[0] ?? '0',
    bottom: parts[2] ?? parts[0] ?? '0',
    left: parts[3] ?? parts[1] ?? parts[0] ?? '0',
  };
  const set = (key: keyof typeof current, next: string) => {
    const merged = { ...current, [key]: next };
    onChange(`${merged.top} ${merged.right} ${merged.bottom} ${merged.left}`);
  };

  return <Field label={label} help={schema.help}>
    <div className="grid grid-cols-2 gap-1.5">
      {(['top', 'right', 'bottom', 'left'] as const).map(side => (
        <Input key={side} className="h-8 text-xs" aria-label={`${label} ${side}`} value={current[side]} onChange={event => set(side, event.target.value)} placeholder={side} />
      ))}
    </div>
  </Field>;
}

function BorderControl({ name, schema, value, onChange }: ControlProps) {
  const label = schema.label ?? name;
  const [width = '1px', style = 'solid', color = 'currentColor', radius = '0'] = String(value ?? '').split('|');
  const emit = (nextWidth: string, nextStyle: string, nextColor: string, nextRadius: string) => onChange([nextWidth, nextStyle, nextColor, nextRadius].join('|'));

  return <Field label={label} help={schema.help}>
    <div className="grid grid-cols-2 gap-1.5">
      <Input className="h-8 text-xs" value={width} onChange={event => emit(event.target.value, style, color, radius)} placeholder="1px" aria-label={`${label} width`} />
      <Select value={style} onValueChange={next => emit(width, next, color, radius)}>
        <SelectTrigger size="sm" aria-label={`${label} style`}><SelectValue /></SelectTrigger>
        <SelectContent>
          {['none', 'solid', 'dashed', 'dotted', 'double'].map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input className="h-8 text-xs" value={color} onChange={event => emit(width, style, event.target.value, radius)} placeholder="currentColor" aria-label={`${label} color`} />
      <Input className="h-8 text-xs" value={radius} onChange={event => emit(width, style, color, event.target.value)} placeholder="0" aria-label={`${label} radius`} />
    </div>
  </Field>;
}

function EffectsControl({ name, schema, value, onChange }: ControlProps) {
  const label = schema.label ?? name;
  const [shadow = 'none', opacity = '1'] = String(value ?? '').split('|');
  return <Field label={label} help={schema.help}>
    <div className="grid gap-1.5">
      <Input className="h-8 text-xs" value={shadow} onChange={event => onChange(`${event.target.value}|${opacity}`)} placeholder="0 8px 24px rgba(0,0,0,.12)" aria-label={`${label} shadow`} />
      <Input className="h-8 text-xs" type="number" min={0} max={1} step={0.05} value={opacity} onChange={event => onChange(`${shadow}|${event.target.value}`)} aria-label={`${label} opacity`} />
    </div>
  </Field>;
}

function BasicControl({ name, path = [name], schema, value, onChange, requestMedia }: ControlProps) {
  const id = useId(); const label = schema.label ?? name;
  if (schema.control === 'color_scheme') return <GlobalColorSchemeControl name={name} path={path} schema={schema} value={value} onChange={onChange} requestMedia={requestMedia} />;
  if (schema.control === 'typography') return <TypographyPresetControl name={name} path={path} schema={schema} value={value} onChange={onChange} requestMedia={requestMedia} />;
  if (schema.control === 'spacing') return <SpacingControl name={name} path={path} schema={schema} value={value} onChange={onChange} requestMedia={requestMedia} />;
  if (schema.control === 'border') return <BorderControl name={name} path={path} schema={schema} value={value} onChange={onChange} requestMedia={requestMedia} />;
  if (schema.control === 'effects') return <EffectsControl name={name} path={path} schema={schema} value={value} onChange={onChange} requestMedia={requestMedia} />;
  if (schema.type === 'select') return <Field label={label} help={schema.help}><Select value={String(value ?? '')} onValueChange={next => onChange(schema.options?.find(item => String(item) === next) ?? next)}><SelectTrigger aria-label={label} size="sm" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{schema.options?.map(option => <SelectItem key={String(option)} value={String(option)}>{String(option)}</SelectItem>)}</SelectContent></Select></Field>;
  if (schema.type === 'boolean') return <div className="flex items-center justify-between gap-3"><div className="grid gap-1"><Label htmlFor={id} className="text-xs">{label}</Label><Help text={schema.help} /></div><Switch id={id} size="sm" checked={Boolean(value)} onCheckedChange={onChange} /></div>;
  if (schema.type === 'textarea' || schema.type === 'code') return <Field label={label} htmlFor={id} help={schema.help}><Textarea id={id} value={String(value ?? '')} onChange={event => onChange(event.target.value)} className={schema.type === 'code' ? 'min-h-24 font-mono text-xs' : 'min-h-14 text-sm'} /></Field>;
  if (schema.type === 'number') return <Field label={label} htmlFor={id} help={schema.help}><Input id={id} className="h-8 text-sm" type="number" min={schema.min} max={schema.max} step={schema.step} value={Number(value ?? 0)} onChange={event => onChange(Number(event.target.value))} /></Field>;
  if (schema.type === 'range') { const current = Number(value ?? 0); return <Field label={label} help={schema.help}><div className="flex items-center gap-2"><Slider value={[current]} min={schema.min ?? 0} max={schema.max ?? 100} step={schema.step ?? 1} onValueChange={next => onChange(next[0] ?? current)} /><Badge variant="secondary" className="min-w-9 justify-center px-1.5 text-[11px] tabular-nums">{current}</Badge></div></Field>; }
  if (schema.type === 'repeater') {
    const items = Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
    return <div className="grid gap-2.5"><div className="flex items-center justify-between gap-2"><div className="grid gap-1"><Label className="text-xs">{label}</Label><Help text={schema.help} /></div><Button type="button" size="xs" variant="outline" onClick={() => onChange([...items, defaults(schema.fields)])}><Plus />Add</Button></div>{items.length === 0 && <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">No items yet</div>}{items.map((item, index) => <Card key={index} className="gap-2 py-3"><CardHeader className="px-3"><div className="flex items-center justify-between gap-2"><CardTitle className="text-xs">Item {index + 1}</CardTitle><Button type="button" size="icon-xs" variant="ghost" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove item ${index + 1}`}><Trash2 /></Button></div></CardHeader><Separator /><CardContent className="grid gap-3 px-3">{Object.entries(schema.fields ?? {}).map(([field, fieldSchema]) => <Control key={field} name={field} path={[...path, String(index), field]} schema={fieldSchema} value={item[field]} attrs={item} onChange={next => onChange(items.map((current, itemIndex) => itemIndex === index ? { ...current, [field]: next } : current))} requestMedia={requestMedia} />)}</CardContent></Card>)}</div>;
  }
  if (schema.type === 'image') { const url = String(value ?? ''); return <Field label={label} htmlFor={id} help={schema.help}><div className="grid gap-2">{url && <Card className="overflow-hidden p-0"><img src={url} alt="" className="h-24 w-full object-cover" /></Card>}<div className="flex gap-2"><Input id={id} className="h-8 text-sm" type="url" value={url} onChange={event => onChange(event.target.value)} placeholder="https://…" />{requestMedia && <Button type="button" variant="outline" size="icon-sm" onClick={() => requestMedia(path)} aria-label={`Browse ${label}`}><ImagePlus /></Button>}</div></div></Field>; }
  if (schema.type === 'color') return <Field label={label} htmlFor={id} help={schema.help}><div className="flex gap-2"><Input id={id} className="h-8 w-12 p-1" type="color" value={String(value ?? '#000000')} onChange={event => onChange(event.target.value)} /><Input className="h-8 text-sm" value={String(value ?? '')} onChange={event => onChange(event.target.value)} /></div></Field>;
  return <Field label={label} htmlFor={id} help={schema.help}><Input id={id} className="h-8 text-sm" type={schema.type === 'url' ? 'url' : schema.type === 'date' ? 'date' : 'text'} value={String(value ?? '')} onChange={event => onChange(event.target.value)} /></Field>;
}

export function BuiltInControl(props: ControlProps) {
  if (!isControlVisible(props)) return null;
  if (props.schema.responsive && props.breakpoint) {
    const current = (props.value && typeof props.value === 'object' ? props.value : {}) as ResponsiveValue;
    return <BasicControl {...props} schema={{ ...props.schema, responsive: false }} value={current[props.breakpoint]} onChange={next => props.onChange({ ...current, [props.breakpoint!]: next })} />;
  }
  return <BasicControl {...props} />;
}

export function Control(props: ControlProps) {
  if (!isControlVisible(props)) return null;
  const Custom = getControl(props.schema.control ?? props.schema.type);
  const control = Custom ? <Custom {...props} /> : <BuiltInControl {...props} />;
  if (!props.schema.group) return control;

  return <div className="grid gap-2 pt-1">
    <div className="flex items-center gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{props.schema.group}</p>
      <Separator className="flex-1" />
    </div>
    {control}
  </div>;
}
