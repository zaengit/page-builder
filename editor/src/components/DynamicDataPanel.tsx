import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BlockDefinition, DynamicBinding, DynamicFilter, DynamicOrder, EditorRuntime, PageBlock } from '../types';

const operators = ['=', '!=', '>', '>=', '<', '<=', 'like', 'not like', 'in', 'not in', 'null', 'not null'];

export function DynamicDataPanel({ selected, definition, runtime, onBindings }: {
  selected: PageBlock;
  definition: BlockDefinition;
  runtime: EditorRuntime;
  onBindings: (id: string, bindings: PageBlock['bindings']) => void;
}) {
  const entry = Object.entries(selected.bindings ?? {})[0];
  const attribute = entry?.[0] ?? Object.keys(definition.attributes)[0] ?? 'value';
  const binding: DynamicBinding = entry?.[1] ?? { source: 'static' };
  const query = binding.query ?? {};

  const commit = (next: DynamicBinding, nextAttribute = attribute) => {
    if (next.source === 'static') onBindings(selected.id, {});
    else onBindings(selected.id, { [nextAttribute]: next });
  };
  const patch = (next: Partial<DynamicBinding>) => commit({ ...binding, ...next });
  const patchQuery = (next: Partial<NonNullable<DynamicBinding['query']>>) => patch({ query: { ...query, ...next } });

  const setFilter = (index: number, next: Partial<DynamicFilter>) => {
    const where = [...(query.where ?? [])];
    where[index] = { ...(where[index] ?? { column: '', operator: '=' }), ...next };
    patchQuery({ where });
  };
  const setOrder = (index: number, next: Partial<DynamicOrder>) => {
    const orderBy = [...(query.orderBy ?? [])];
    orderBy[index] = { ...(orderBy[index] ?? { column: '', direction: 'asc' }), ...next };
    patchQuery({ orderBy });
  };

  return <div className="space-y-3 p-3">
    <p className="text-[11px] font-semibold">Dynamic data</p>

    <div className="grid gap-1">
      <Label className="text-[11px]">Attribute</Label>
      <Select value={attribute} onValueChange={value => commit(binding, value)}>
        <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.keys(definition.attributes).map(name => <SelectItem key={name} value={name}>{definition.attributes[name].label ?? name}</SelectItem>)}</SelectContent>
      </Select>
    </div>

    <div className="grid gap-1">
      <Label className="text-[11px]">Source</Label>
      <Select value={binding.source ?? 'static'} onValueChange={source => commit(source === 'static' ? { source: 'static' } : { ...binding, source })}>
        <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="static">Static</SelectItem>{runtime.dataSources?.map(source => <SelectItem key={source.name} value={source.name}>{source.title}</SelectItem>)}</SelectContent>
      </Select>
    </div>

    {binding.source === 'database' && <>
      <div className="grid gap-1"><Label className="text-[11px]">Resource</Label><Select value={binding.resource ?? ''} onValueChange={resource => patch({ resource })}><SelectTrigger size="sm"><SelectValue placeholder="Select resource" /></SelectTrigger><SelectContent>{runtime.dataResources?.map(resource => <SelectItem key={resource.name} value={resource.name}>{resource.title}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1"><Label className="text-[11px]">Mode</Label><Select value={binding.mode ?? 'single'} onValueChange={mode => patch({ mode: mode as 'single' | 'collection' })}><SelectTrigger size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">Single record</SelectItem><SelectItem value="collection">Collection</SelectItem></SelectContent></Select></div>
        {binding.mode !== 'collection' && <div className="grid gap-1"><Label className="text-[11px]">Record ID</Label><Input className="h-7 text-xs" value={String(binding.recordId ?? '')} onChange={event => patch({ recordId: event.target.value })} placeholder="Optional" /></div>}
      </div>
      {binding.mode !== 'collection' && <div className="grid gap-1"><Label className="text-[11px]">Current context key</Label><Input className="h-7 text-xs" value={binding.contextKey ?? ''} onChange={event => patch({ contextKey: event.target.value })} placeholder="product / post / id" /></div>}
      <div className="grid gap-1"><Label className="text-[11px]">Relations</Label><Input className="h-7 text-xs" value={(query.with ?? []).join(', ')} onChange={event => patchQuery({ with: event.target.value.split(',').map(value => value.trim()).filter(Boolean) })} placeholder="category, images" /></div>

      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label className="text-[11px]">Where</Label><Button type="button" variant="ghost" size="icon-xs" onClick={() => patchQuery({ where: [...(query.where ?? []), { column: '', operator: '=', value: '' }] })}><Plus /></Button></div>
        {(query.where ?? []).map((filter, index) => <div key={index} className="grid grid-cols-[1fr_86px_1fr_auto] gap-1">
          <Input className="h-7 text-xs" value={filter.column} onChange={event => setFilter(index, { column: event.target.value })} placeholder="column" />
          <Select value={filter.operator} onValueChange={operator => setFilter(index, { operator })}><SelectTrigger size="sm"><SelectValue /></SelectTrigger><SelectContent>{operators.map(operator => <SelectItem key={operator} value={operator}>{operator}</SelectItem>)}</SelectContent></Select>
          <Input className="h-7 text-xs" disabled={filter.operator === 'null' || filter.operator === 'not null'} value={String(filter.value ?? '')} onChange={event => setFilter(index, { value: event.target.value })} placeholder="value" />
          <Button type="button" variant="ghost" size="icon-xs" onClick={() => patchQuery({ where: (query.where ?? []).filter((_, itemIndex) => itemIndex !== index) })}><Trash2 /></Button>
        </div>)}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label className="text-[11px]">Order by</Label><Button type="button" variant="ghost" size="icon-xs" onClick={() => patchQuery({ orderBy: [...(query.orderBy ?? []), { column: '', direction: 'asc' }] })}><Plus /></Button></div>
        {(query.orderBy ?? []).map((order, index) => <div key={index} className="grid grid-cols-[1fr_90px_auto] gap-1"><Input className="h-7 text-xs" value={order.column} onChange={event => setOrder(index, { column: event.target.value })} placeholder="column" /><Select value={order.direction} onValueChange={direction => setOrder(index, { direction: direction as 'asc' | 'desc' })}><SelectTrigger size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="asc">ASC</SelectItem><SelectItem value="desc">DESC</SelectItem></SelectContent></Select><Button type="button" variant="ghost" size="icon-xs" onClick={() => patchQuery({ orderBy: (query.orderBy ?? []).filter((_, itemIndex) => itemIndex !== index) })}><Trash2 /></Button></div>)}
      </div>

      {binding.mode === 'collection' && <div className="grid grid-cols-3 gap-2"><div className="grid gap-1"><Label className="text-[11px]">Limit</Label><Input type="number" min={1} className="h-7 text-xs" value={query.limit ?? 12} onChange={event => patchQuery({ limit: Number(event.target.value) || 1 })} /></div><div className="grid gap-1"><Label className="text-[11px]">Per page</Label><Input type="number" min={0} className="h-7 text-xs" value={query.perPage ?? 0} onChange={event => patchQuery({ perPage: Number(event.target.value) || 0 })} /></div><div className="grid gap-1"><Label className="text-[11px]">Page</Label><Input type="number" min={1} className="h-7 text-xs" value={query.page ?? 1} onChange={event => patchQuery({ page: Number(event.target.value) || 1 })} /></div></div>}
    </>}

    {binding.source !== 'static' && <>
      <div className="grid gap-1"><Label className="text-[11px]">Data path</Label><Input className="h-7 text-xs" value={binding.path ?? ''} onChange={event => patch({ path: event.target.value })} placeholder={binding.mode === 'collection' ? 'items or items.0.title' : 'title / relation.name'} /></div>
      <div className="grid gap-1"><Label className="text-[11px]">Fallback</Label><Input className="h-7 text-xs" value={String(binding.fallback ?? '')} onChange={event => patch({ fallback: event.target.value })} placeholder="Optional fallback" /></div>
    </>}
  </div>;
}
