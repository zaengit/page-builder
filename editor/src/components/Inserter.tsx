import { Blocks, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCategoryTitle } from '../registry';
import type { BlockDefinition, BlockVariation } from '../types';

type Props = {
  definitions: BlockDefinition[];
  onAdd: (type: string, variation?: BlockVariation) => void;
};

function fallbackCategoryTitle(category: string): string {
  return category.replace(/(^|-)(\w)/g, (_, separator: string, character: string) => `${separator ? ' ' : ''}${character.toUpperCase()}`);
}

export function Inserter({ definitions, onAdd }: Props) {
  const groups = useMemo(() => definitions.reduce<Record<string, BlockDefinition[]>>((all, definition) => {
    (all[definition.category || 'other'] ??= []).push(definition);
    return all;
  }, {}), [definitions]);

  const add = (value: string) => {
    const [type, variationName] = value.split('::');
    const definition = definitions.find(item => item.name === type);
    onAdd(type, definition?.variations?.find(variation => variation.name === variationName));
  };

  return <div className="grid gap-2"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Blocks className="size-3.5" /> Insert block</div><Select onValueChange={add}><SelectTrigger aria-label="Add block" className="bg-background"><span className="flex min-w-0 items-center gap-2"><Plus className="size-4" /><SelectValue placeholder="Add block" /></span></SelectTrigger><SelectContent>{Object.entries(groups).map(([category, categoryDefinitions]) => <SelectGroup key={category}><div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{getCategoryTitle(category) ?? fallbackCategoryTitle(category)}</div>{categoryDefinitions.flatMap(definition => [<SelectItem value={definition.name} key={definition.name}>{definition.title}</SelectItem>, ...(definition.variations ?? []).map(variation => <SelectItem value={`${definition.name}::${variation.name}`} key={`${definition.name}:${variation.name}`}>{definition.title} · {variation.title}</SelectItem>)])}</SelectGroup>)}</SelectContent></Select></div>;
}
