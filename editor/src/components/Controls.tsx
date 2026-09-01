import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { getControl } from '../registry';
import { defaults } from '../utils';
import type { ControlProps } from '../types';

function Help({ text }: { text?: string }) {
  return text ? <p className="text-xs text-muted-foreground">{text}</p> : null;
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
    return <Card><CardContent className="flex items-center justify-between gap-4 pt-6"><div className="grid gap-1"><Label htmlFor={id}>{label}</Label><Help text={schema.help} /></div><Checkbox id={id} checked={Boolean(value)} onCheckedChange={checked => onChange(checked === true)} /></CardContent></Card>;
  }

  if (schema.type === 'textarea') {
    return <Field label={label} htmlFor={id} help={schema.help}><Textarea id={id} value={String(value ?? '')} onChange={event => onChange(event.target.value)} /></Field>;
  }

  if (schema.type === 'number') {
    return <Field label={label} htmlFor={id} help={schema.help}><Input id={id} type="number" min={schema.min} max={schema.max} step={schema.step} value={Number(value ?? 0)} onChange={event => onChange(Number(event.target.value))} /></Field>;
  }

  if (schema.type === 'range') {
    const current = Number(value ?? 0);
    return <Field label={label} help={schema.help}><div className="grid gap-3"><Slider value={[current]} min={schema.min ?? 0} max={schema.max ?? 100} step={schema.step ?? 1} onValueChange={next => onChange(next[0] ?? current)} /><Badge variant="secondary" className="w-fit tabular-nums">{current}</Badge></div></Field>;
  }

  if (schema.type === 'repeater') {
    const items = Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
    return <div className="grid gap-3"><div className="flex items-center justify-between gap-3"><div className="grid gap-1"><Label>{label}</Label><Help text={schema.help} /></div><Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, defaults(schema.fields)])}><Plus />Add</Button></div>{items.length === 0 && <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">No items yet</CardContent></Card>}{items.map((item, index) => <Card key={index}><CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="text-sm">Item {index + 1}</CardTitle><Button type="button" size="icon-sm" variant="ghost" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove item ${index + 1}`}><Trash2 /></Button></div></CardHeader><Separator /><CardContent className="grid gap-4 pt-4">{Object.entries(schema.fields ?? {}).map(([field, fieldSchema]) => <Control key={field} name={field} path={[...path, String(index), field]} schema={fieldSchema} value={item[field]} onChange={next => onChange(items.map((current, itemIndex) => itemIndex === index ? { ...current, [field]: next } : current))} requestMedia={requestMedia} />)}</CardContent></Card>)}</div>;
  }

  if (schema.type === 'image') {
    const url = String(value ?? '');
    return <Field label={label} htmlFor={id} help={schema.help}><div className="grid gap-3">{url && <Card className="overflow-hidden p-0"><img src={url} alt="" className="h-32 w-full object-cover" /></Card>}<div className="flex gap-2"><Input id={id} type="url" value={url} onChange={event => onChange(event.target.value)} placeholder="https://…" />{requestMedia && <Button type="button" variant="outline" size="icon" onClick={() => requestMedia(path)} aria-label={`Browse ${label}`}><ImagePlus /></Button>}</div></div></Field>;
  }

  return <Field label={label} htmlFor={id} help={schema.help}><Input id={id} type={schema.type === 'url' ? 'url' : 'text'} value={String(value ?? '')} onChange={event => onChange(event.target.value)} /></Field>;
}

export function Control(props: ControlProps) {
  const Custom = getControl(props.schema.control ?? props.schema.type);
  return Custom ? <Custom {...props} /> : <BuiltInControl {...props} />;
}
