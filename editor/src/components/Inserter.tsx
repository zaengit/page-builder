import { Blocks, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button type="button" variant="ghost" className="w-full justify-start"><Plus />{label}</Button>
    </DialogTrigger>
    <DialogContent className="max-h-[80vh] overflow-hidden p-0 sm:max-w-4xl">
      <DialogHeader className="border-b p-6 pb-4">
        <DialogTitle>Add section</DialogTitle>
        <DialogDescription>Choose a section to add to the page.</DialogDescription>
        <div className="relative pt-2">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 translate-y-0" />
          <Input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search sections" className="pl-9" />
        </div>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
        <ScrollArea className="h-[52vh] border-r">
          <div className="space-y-4 p-4">
            {Object.entries(groups).map(([category, categoryDefinitions]) => <div key={category} className="space-y-2">
              <Badge variant="secondary">{getCategoryTitle(category) ?? fallbackCategoryTitle(category)}</Badge>
              <div className="space-y-1">
                {categoryDefinitions.map(definition => <div key={definition.name} className="space-y-1">
                  <Button type="button" variant={active?.name === definition.name ? 'secondary' : 'ghost'} className="w-full justify-start" onMouseEnter={() => setActiveName(definition.name)} onFocus={() => setActiveName(definition.name)} onClick={() => add(definition)}>
                    <Blocks />
                    <span className="truncate">{definition.title}</span>
                  </Button>
                  {definition.variations?.map(variation => <Button key={variation.name} type="button" variant="ghost" size="sm" className="w-full justify-start pl-10 text-muted-foreground" onClick={() => add(definition, variation)}>{variation.title}</Button>)}
                </div>)}
              </div>
              <Separator />
            </div>)}
            {!filtered.length && <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">No sections found.</CardContent></Card>}
          </div>
        </ScrollArea>

        <div className="hidden items-center justify-center bg-muted/40 p-6 md:flex">
          {active ? <Card className="w-full max-w-md">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground"><Blocks /></div>
              <CardTitle>{active.title}</CardTitle>
              <CardDescription>{active.description ?? 'Add this section to the page and configure it from the inspector.'}</CardDescription>
            </CardHeader>
            <CardContent><Badge variant="outline">{getCategoryTitle(active.category) ?? fallbackCategoryTitle(active.category)}</Badge></CardContent>
            <CardFooter><Button type="button" className="w-full" onClick={() => add(active)}><Plus />Add section</Button></CardFooter>
          </Card> : null}
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
