import { Blocks, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getCategoryTitle } from '../registry';
import type { BlockDefinition, BlockVariation } from '../types';

type Props = {
  definitions: BlockDefinition[];
  onAdd: (type: string, variation?: BlockVariation) => void;
  label?: string;
};

function fallbackCategoryTitle(category: string): string {
  return category.replace(/(^|-)(\w)/g, (_, separator: string, character: string) => `${separator ? ' ' : ''}${character.toUpperCase()}`);
}

export function Inserter({ definitions, onAdd, label = 'Add section' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeName, setActiveName] = useState<string | null>(definitions[0]?.name ?? null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return definitions;
    return definitions.filter(definition => [definition.title, definition.name, definition.category, definition.description]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(needle)));
  }, [definitions, query]);

  const groups = useMemo(() => filtered.reduce<Record<string, BlockDefinition[]>>((all, definition) => {
    (all[definition.category || 'other'] ??= []).push(definition);
    return all;
  }, {}), [filtered]);

  const active = definitions.find(definition => definition.name === activeName) ?? filtered[0] ?? definitions[0];

  const add = (definition: BlockDefinition, variation?: BlockVariation) => {
    onAdd(definition.name, variation);
    setOpen(false);
    setQuery('');
  };

  return <>
    <Button type="button" variant="ghost" className="h-8 w-full justify-start gap-2 px-2 text-[13px] font-normal text-[#005bd3] hover:bg-[#f1f2f3] hover:text-[#004299]" onClick={() => setOpen(true)}>
      <Plus className="size-4" /> {label}
    </Button>
    {open && <div className="pb-section-picker-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="pb-section-picker" role="dialog" aria-modal="true" aria-label="Add section">
        <div className="flex items-center gap-2 border-b p-2.5">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search sections" className="h-9 pl-8" /></div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close section picker"><X /></Button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)] max-sm:grid-cols-1">
          <div className="min-h-0 overflow-auto border-r max-sm:border-r-0 max-sm:border-b">
            <div className="grid grid-cols-2 gap-1 border-b p-2"><button className="rounded-md bg-[#f1f2f3] px-3 py-1.5 text-sm font-medium">Sections</button><button className="rounded-md px-3 py-1.5 text-sm text-muted-foreground" disabled>Apps</button></div>
            <div className="p-1.5">
              {Object.entries(groups).map(([category, categoryDefinitions]) => <div key={category} className="mb-2">
                <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{getCategoryTitle(category) ?? fallbackCategoryTitle(category)}</div>
                {categoryDefinitions.map(definition => <div key={definition.name}>
                  <button type="button" onMouseEnter={() => setActiveName(definition.name)} onFocus={() => setActiveName(definition.name)} onClick={() => add(definition)} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] hover:bg-[#f1f2f3]', active?.name === definition.name && 'bg-[#eaf4ff] text-[#005bd3]')}>
                    <Blocks className="size-4 shrink-0" /><span className="truncate">{definition.title}</span>
                  </button>
                  {definition.variations?.map(variation => <button key={variation.name} type="button" onClick={() => add(definition, variation)} className="w-full rounded-md py-1.5 pl-8 pr-2 text-left text-xs text-muted-foreground hover:bg-[#f1f2f3] hover:text-foreground">{variation.title}</button>)}
                </div>)}
              </div>)}
              {!filtered.length && <div className="p-6 text-center text-sm text-muted-foreground">No sections found.</div>}
            </div>
          </div>
          <div className="hidden min-h-0 items-center justify-center overflow-auto bg-[#f6f6f7] p-6 sm:flex">
            {active ? <div className="w-full max-w-sm overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="flex aspect-[16/10] items-center justify-center bg-[#f1f2f3] p-8"><div className="w-full rounded-md border bg-white p-5 text-center shadow-sm"><Blocks className="mx-auto mb-3 size-7 text-muted-foreground" /><p className="text-sm font-semibold">{active.title}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{active.description ?? 'Add this section to the page and configure it from the inspector.'}</p></div></div>
              <div className="border-t p-4"><p className="text-sm font-semibold">{active.title}</p><p className="mt-1 text-xs text-muted-foreground">{getCategoryTitle(active.category) ?? fallbackCategoryTitle(active.category)}</p><Button type="button" className="mt-4 w-full" size="sm" onClick={() => add(active)}><Plus /> Add section</Button></div>
            </div> : null}
          </div>
        </div>
      </div>
    </div>}
  </>;
}
