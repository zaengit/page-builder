import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import type { Breakpoint, LayoutItem, PageBlock, SectionLayout } from './types';
import { parentLayout, patchResponsive, responsive } from './layout';

export function SectionLayoutInspector({ block, breakpoint, onChange }: { block: PageBlock; breakpoint: Breakpoint; onChange: (layout: SectionLayout) => void }) {
  const layout = block.layout ?? {};
  const mode = responsive(layout.mode, breakpoint, 'block');
  const set = <K extends keyof SectionLayout>(key: K, value: any) => onChange({ ...layout, [key]: patchResponsive(layout[key] as any, breakpoint, value) });
  return (
    <div className="space-y-3">
      <div className="grid gap-1.5"><Label className="text-xs font-medium">Layout mode</Label><ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={v => v && set('mode', v)} className="w-full bg-muted/30"><ToggleGroupItem value="block" className="flex-1">Block</ToggleGroupItem><ToggleGroupItem value="flex" className="flex-1">Flex</ToggleGroupItem><ToggleGroupItem value="grid" className="flex-1">Grid</ToggleGroupItem></ToggleGroup></div>
      {mode === 'flex' && <>
        <FieldSelect label="Direction" value={responsive(layout.flexDirection, breakpoint, 'row')} onChange={v => set('flexDirection', v)} options={['row','column','row-reverse','column-reverse']} />
        <FieldSelect label="Wrap" value={responsive(layout.flexWrap, breakpoint, 'nowrap')} onChange={v => set('flexWrap', v)} options={['nowrap','wrap','wrap-reverse']} />
        <FieldSelect label="Justify" value={responsive(layout.justifyContent, breakpoint, 'flex-start')} onChange={v => set('justifyContent', v)} options={['flex-start','center','flex-end','space-between','space-around','space-evenly']} />
        <FieldSelect label="Align items" value={responsive(layout.alignItems, breakpoint, 'stretch')} onChange={v => set('alignItems', v)} options={['stretch','flex-start','center','flex-end','baseline']} />
        <FieldSelect label="Align content" value={responsive(layout.alignContent, breakpoint, 'stretch')} onChange={v => set('alignContent', v)} options={['stretch','flex-start','center','flex-end','space-between','space-around','space-evenly']} />
      </>}
      {mode === 'grid' && <>
        <NumberField label="Columns" value={responsive(layout.gridColumns, breakpoint, 1)} min={1} max={24} onChange={v => set('gridColumns', v)} />
        <div className="grid gap-1"><Label className="text-[11px]">Rows</Label><Input className="h-7 text-xs" value={String(responsive(layout.gridRows, breakpoint, 'auto'))} onChange={e => set('gridRows', e.target.value === 'auto' ? 'auto' : Math.max(1, Number(e.target.value) || 1))} /></div>
        <FieldSelect label="Auto flow" value={responsive(layout.gridAutoFlow, breakpoint, 'row')} onChange={v => set('gridAutoFlow', v)} options={['row','column','row dense','column dense']} />
      </>}
      {mode !== 'block' && <>
        <TextField label="Gap" value={responsive(layout.gap, breakpoint, '0px')} onChange={v => set('gap', v)} />
        <TextField label="Row gap" value={responsive(layout.rowGap, breakpoint, responsive(layout.gap, breakpoint, '0px'))} onChange={v => set('rowGap', v)} />
        <TextField label="Column gap" value={responsive(layout.columnGap, breakpoint, responsive(layout.gap, breakpoint, '0px'))} onChange={v => set('columnGap', v)} />
      </>}
    </div>
  );
}

export function LayoutItemInspector({ block, allBlocks, breakpoint, onChange }: { block: PageBlock; allBlocks: PageBlock[]; breakpoint: Breakpoint; onChange: (item: LayoutItem) => void }) {
  const mode = parentLayout(allBlocks, block.id, breakpoint);
  const item = block.layoutItem ?? {};
  if (mode === 'block') return null;
  const set = <K extends keyof LayoutItem>(key: K, value: any) => onChange({ ...item, [key]: patchResponsive(item[key] as any, breakpoint, value) });
  return <div className="space-y-3">
    <p className="text-[11px] font-semibold">Layout item · {mode}</p>
    {mode === 'flex' ? <>
      <NumberField label="Grow" value={responsive(item.flexGrow, breakpoint, 0)} min={0} max={12} onChange={v => set('flexGrow', v)} />
      <NumberField label="Shrink" value={responsive(item.flexShrink, breakpoint, 1)} min={0} max={12} onChange={v => set('flexShrink', v)} />
      <TextField label="Basis" value={responsive(item.flexBasis, breakpoint, 'auto')} onChange={v => set('flexBasis', v)} />
      <NumberField label="Order" value={responsive(item.order, breakpoint, 0)} min={-99} max={99} onChange={v => set('order', v)} />
      <FieldSelect label="Align self" value={responsive(item.alignSelf, breakpoint, 'auto')} onChange={v => set('alignSelf', v)} options={['auto','stretch','flex-start','center','flex-end','baseline']} />
    </> : <>
      <NumberField label="Column span" value={responsive(item.columnSpan, breakpoint, 1)} min={1} max={24} onChange={v => set('columnSpan', v)} />
      <NumberField label="Row span" value={responsive(item.rowSpan, breakpoint, 1)} min={1} max={24} onChange={v => set('rowSpan', v)} />
      <div className="flex gap-2"><Button type="button" variant="outline" size="xs" onClick={() => set('columnSpan', Math.max(1, responsive(item.columnSpan, breakpoint, 1)-1))}>− Col</Button><Button type="button" variant="outline" size="xs" onClick={() => set('columnSpan', responsive(item.columnSpan, breakpoint, 1)+1)}>+ Col</Button><Button type="button" variant="outline" size="xs" onClick={() => set('rowSpan', responsive(item.rowSpan, breakpoint, 1)+1)}>+ Row</Button></div>
    </>}
  </div>;
}

function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <div className="grid gap-1.5"><Label className="text-xs font-medium">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div> }
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <div className="grid gap-1.5"><Label className="text-xs font-medium">{label}</Label><Input className="h-9 text-xs" value={value} onChange={e => onChange(e.target.value)} /></div> }
function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) { return <div className="grid gap-1.5"><Label className="text-xs font-medium">{label}</Label><Input className="h-9 text-xs" type="number" min={min} max={max} value={value} onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))} /></div> }
