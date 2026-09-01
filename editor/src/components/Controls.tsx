import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { getControl } from '../registry';
import { defaults } from '../utils';
import type { ControlProps } from '../types';

function Help({ text }: { text?: string }) {
  return text ? <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{text}</p> : null;
}

function Field({ label, htmlFor, help, children }: { label: string; htmlFor?: string; help?: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label htmlFor={htmlFor} className="text-xs font-medium text-[#303030]">{label}</Label>{children}<Help text={help} /></div>;
}

export function BuiltInControl({ name, path = [name], schema, value, onChange, requestMedia }: ControlProps) {
  const id = useId();
  const label = schema.label ?? name;

  if (schema.type === 'select') {
    return <Field label={label} help={schema.help}><Select value={String(value ?? '')} onValueChange={next => {
      const option = schema.options?.find(item => String(item) === next);
      onChange(option ?? next);
    }}><SelectTrigger aria-label={label} className="h-9"><SelectValue /></SelectTrigger><SelectContent>{schema.options?.map(option => <SelectItem key={String(option)} value={String(option)}>{String(option)}</SelectItem>)}</SelectContent></Select></Field>;
  }

  if (schema.type === 'boolean') {
    return <div className="flex items-center justify-between gap-3"><div className="grid gap-0.5"><Label htmlFor={id} className="text-xs font-medium text-[#303030]">{label}</Label><Help text={schema.help} /></div><Checkbox id={id} checked={Boolean(value)} onCheckedChange={checked => onChange(checked === true)} /></div>;
  }

  if (schema.type === 'textarea') {
    return <Field label={label} htmlFor={id} help={schema.help}><Textarea id={id} value={String(value ?? '')} onChange={event => onChange(event.target.value)} className="min-h-20 text-sm" /></Field>;
  }

  if (schema.type === 'number') {
    return <Field label={label} htmlFor={id} help={schema.help}><Input id={id} className="h-9" type="number" min={schema.min} max={schema.max} step={schema.step} value={Number(value ?? 0)} onChange={event => onChange(Number(event.target.value))} /></Field>;
  }

  if (schema.type === 'range') {
    return <Field label={label} htmlFor={id} help={schema.help}><div className="flex items-center gap-3"><input id={id} className="h-2 min-w-0 flex-1 accent-[#303030]" type="range" min={schema.min} max={schema.max} step={schema.step} value={Number(value ?? 0)} onChange={event => onChange(Number(event.target.value))} /><span className="min-w-12 rounded-md border bg-white px-2 py-1.5 text-center text-xs font-medium tabular-nums">{String(value ?? 0)}</span></div></Field>;
  }

  if (schema.type === 'repeater') {
    const items = Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
    return <div className="grid gap-3 border-t pt-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold">{label}</p><Help text={schema.help} /></div><Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, defaults(schema.fields)])}><Plus /> Add</Button></div>{items.length === 0 && <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">No items yet</div>}{items.map((item, index) => <div className="grid gap-3 rounded-lg border bg-[#fafafa] p-3" key={index}><div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Item {index + 1}</span><Button type="button" size="icon-sm" variant="ghost" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove item ${index + 1}`}><Trash2 /></Button></div><Separator />{Object.entries(schema.fields ?? {}).map(([field, fieldSchema]) => <Control key={field} name={field} path={[...path, String(index), field]} schema={fieldSchema} value={item[field]} onChange={next => onChange(items.map((current, itemIndex) => itemIndex === index ? { ...current, [field]: next } : current))} requestMedia={requestMedia} />)}</div>)}</div>;
  }

  if (schema.type === 'image') {
    const url = String(value ?? '');
    return <Field label={label} htmlFor={id} help={schema.help}><div className="grid gap-2">{url && <div className="overflow-hidden rounded-lg border bg-[#f1f2f3]"><img src={url} alt="" className="h-24 w-full object-cover" /></div>}<div className="flex gap-2"><Input id={id} className="h-9" type="url" value={url} onChange={event => onChange(event.target.value)} placeholder="https://…" />{requestMedia && <Button type="button" variant="outline" size="icon" className="size-9" onClick={() => requestMedia(path)} aria-label={`Browse ${label}`}><ImagePlus /></Button>}</div></div></Field>;
  }

  return <Field label={label} htmlFor={id} help={schema.help}><Input id={id} className="h-9" type={schema.type === 'url' ? 'url' : 'text'} value={String(value ?? '')} onChange={event => onChange(event.target.value)} /></Field>;
}

export function Control(props: ControlProps) {
  const Custom = getControl(props.schema.control ?? props.schema.type);
  return Custom ? <Custom {...props} /> : <BuiltInControl {...props} />;
}
