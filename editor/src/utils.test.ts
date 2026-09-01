import { describe, expect, it } from 'vitest';
import { parseJson, setPathValue } from './utils';

describe('editor utilities', () => {
  it('uses fallback for malformed embedded JSON', () => expect(parseJson('{broken', { blocks: [] })).toEqual({ blocks: [] }));
  it('updates nested object and array paths without mutating input', () => {
    const source = { slides: [{ image: 'old' }] };
    const result = setPathValue(source, ['slides', '0', 'image'], 'new');
    expect(result).toEqual({ slides: [{ image: 'new' }] });
    expect(source.slides[0].image).toBe('old');
  });
});
