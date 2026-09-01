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
  return text ? <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{text}</p> : null;
}

function Field({ label, htmlFor, help, children }: { label: string; htmlFor?: string; help?: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label htmlFor={htmlFor}>{label}</Label>{children}<Help text={help} /></div>;
}

export function BuiltInControl({ name, path = [name], schema, value, onChange, requestMedia }: ControlProps) {
  const id = useId();
  const label = schema.label ?? name;

  if (schema.type === 'select') {
    return <Field label={label} help={schema.help}><Select value={String(value ?? '')} onValueChange={next => {
      const option = schema.options?.find(item => String(item) === next);
      onChange(option ?? next);
    }}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{schema.options?.map(option => <SelectItem key={String(option)} value={String(option)}>{String(option)}</SelectItem>)}</SelectContent></Select></Field>;
  }

  if (schema.type === 'boolean') {
    return <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"><Checkbox id={id} checked={Boolean(value)} onCheckedChange={checked => onChange(checked === true)} /><div className="grid gap-1"><Label htmlFor={id}>{label}</Label><Help text={schema.help} /></div></div>;
  }

  if (schema.type === 'textarea') {
    return <Field label={label} htmlFor={id} help={schema.help}><Textarea id={id} value={String(value ?? '')} onChange={event => onChange(event.target.value)} /></Field>;
  }

  if (schema.type === 'number') {
    return <Field label={label} htmlFor={id} help={schema.help}><Input id={id} type="number" min={schema.min} max={schema.max} step={schema.step} value={Number(value ?? 0)} onChange={event => onChange(Number(event.target.value))} /></Field>;
  }

  if (schema.type === 'range') {
    return <Field label={label} htmlFor={id} help={schema.help}><div className="flex items-center gap-3"><input id={id} className="accent-primary h-2 min-w-0 flex-1" type="range" min={schema.min} max={schema.max} step={schema.step} value={Number(value ?? 0)} onChange={event => onChange(Number(event.target.value))} /><span className="bg-muted min-w-10 rounded-md px-2 py-1 text-center text-xs font-medium tabular-nums">{String(value ?? 0)}</span></div></Field>;
  }

  if (schema.type === 'repeater') {
    const items = Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
    return <div className="grid gap-3 rounded-xl border bg-muted/20 p-3"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">{label}</p><Help text={schema.help} /></div><Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, defaults(schema.fields)])}><Plus /> Add</Button></div>{items.length === 0 && <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">No items yet</div>}{items.map((item, index) => <div className="grid gap-4 rounded-lg border bg-background p-3 shadow-xs" key={index}><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item {index + 1}</span><Button type="button" size="icon-sm" variant="ghost" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove item ${index + 1}`}><Trash2 /></Button></div><Separator />{Object.entries(schema.fields ?? {}).map(([field, fieldSchema]) => <Control key={field} name={field} path={[...path, String(index), field]} schema={fieldSchema} value={item[field]} onChange={next => onChange(items.map((current, itemIndex) => itemIndex === index ? { ...current, [field]: next } : current))} requestMedia={requestMedia} />)}</div>)}</div>;
  }

  if (schema.type === 'image') {
    return <Field label={label} htmlFor={id} help={schema.help}><div className="flex gap-2"><Input id={id} type="url" value={String(value ?? '')} onChange={event => onChange(event.target.value)} placeholder="https://…" />{requestMedia && <Button type="button" variant="outline" size="icon" onClick={() => requestMedia(path)} aria-label={`Browse ${label}`}><ImagePlus /></Button>}</div></Field>;
  }

  return <Field label={label} htmlFor={id} help={schema.help}><Input id={id} type={schema.type === 'url' ? 'url' : 'text'} value={String(value ?? '')} onChange={event => onChange(event.target.value)} /></Field>;
}

export function Control(props: ControlProps) {
  const Custom = getControl(props.schema.control ?? props.schema.type);
  return Custom ? <Custom {...props} /> : <BuiltInControl {...props} />;
}
