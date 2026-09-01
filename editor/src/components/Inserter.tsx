import { useMemo } from 'react';
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

  return <div className="inserter"><select aria-label="Add block" defaultValue="" onChange={event => {
    if (!event.target.value) return;
    const [type, variationName] = event.target.value.split('::');
    const definition = definitions.find(item => item.name === type);
    onAdd(type, definition?.variations?.find(variation => variation.name === variationName));
    event.target.value = '';
  }}><option value="">+ Add block</option>{Object.entries(groups).map(([category, categoryDefinitions]) => <optgroup key={category} label={getCategoryTitle(category) ?? fallbackCategoryTitle(category)}>{categoryDefinitions.flatMap(definition => [<option value={definition.name} key={definition.name}>{definition.title}</option>, ...(definition.variations ?? []).map(variation => <option value={`${definition.name}::${variation.name}`} key={`${definition.name}:${variation.name}`}>{definition.title} — {variation.title}</option>)])}</optgroup>)}</select></div>;
}
