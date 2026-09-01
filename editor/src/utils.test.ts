import { describe, expect, it } from 'vitest';
import { clone, defaults, parseJson, setPathValue } from './utils';

describe('editor utilities', () => {
  it('parses valid JSON and uses fallback for missing or malformed embedded JSON', () => {
    expect(parseJson('{"ok":true}', { ok: false })).toEqual({ ok: true });
    expect(parseJson(undefined, { blocks: [] })).toEqual({ blocks: [] });
    expect(parseJson('{broken', { blocks: [] })).toEqual({ blocks: [] });
  });

  it('clones values and creates field defaults without shared references', () => {
    const original = { nested: { value: 1 } };
    const copy = clone(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);

    const result = defaults({
      title: { type: 'string', default: 'Hello' },
      items: { type: 'repeater', default: [{ value: 'a' }], fields: {} },
      empty: { type: 'string' },
    });
    expect(result).toEqual({ title: 'Hello', items: [{ value: 'a' }], empty: '' });
    expect(result.items).not.toBe((defaults({ items: { type: 'repeater', default: [{ value: 'a' }], fields: {} } })).items);
  });

  it('updates nested object and array paths without mutating input', () => {
    const source = { slides: [{ image: 'old' }] };
    const result = setPathValue(source, ['slides', '0', 'image'], 'new');
    expect(result).toEqual({ slides: [{ image: 'new' }] });
    expect(source.slides[0].image).toBe('old');
  });

  it('creates missing object and array-compatible path segments and replaces an empty path', () => {
    expect(setPathValue({}, ['meta', 'caption'], 'Hello')).toEqual({ meta: { caption: 'Hello' } });
    expect(setPathValue([{ value: 'a' }], ['0', 'value'], 'b')).toEqual([{ value: 'b' }]);
    expect(setPathValue(null, ['value'], 10)).toEqual({ value: 10 });
    expect(setPathValue({ old: true }, [], 'replacement')).toBe('replacement');
  });
});
