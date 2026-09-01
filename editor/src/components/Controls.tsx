import { useId } from 'react';
import { getControl } from '../registry';
import { defaults } from '../utils';
import type { ControlProps } from '../types';

function Help({ text }: { text?: string }) {
  return text ? <small>{text}</small> : null;
}

export function BuiltInControl({ name, path = [name], schema, value, onChange, requestMedia }: ControlProps) {
  const id = useId();
  const label = schema.label ?? name;

  if (schema.type === 'select') {
    return <label htmlFor={id}>{label}<select id={id} value={String(value ?? '')} onChange={event => {
      const option = schema.options?.find(item => String(item) === event.target.value);
      onChange(option ?? event.target.value);
    }}>{schema.options?.map(option => <option key={String(option)} value={String(option)}>{String(option)}</option>)}</select><Help text={schema.help} /></label>;
  }

  if (schema.type === 'boolean') {
    return <label className="check" htmlFor={id}><input id={id} type="checkbox" checked={Boolean(value)} onChange={event => onChange(event.target.checked)} />{label}</label>;
  }

  if (schema.type === 'textarea') {
    return <label htmlFor={id}>{label}<textarea id={id} value={String(value ?? '')} onChange={event => onChange(event.target.value)} /><Help text={schema.help} /></label>;
  }

  if (schema.type === 'number' || schema.type === 'range') {
    return <label htmlFor={id}>{label}<input id={id} type={schema.type === 'range' ? 'range' : 'number'} min={schema.min} max={schema.max} step={schema.step} value={Number(value ?? 0)} onChange={event => onChange(Number(event.target.value))} />{schema.type === 'range' && <span>{String(value ?? 0)}</span>}<Help text={schema.help} /></label>;
  }

  if (schema.type === 'repeater') {
    const items = Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
    return <fieldset className="repeater"><legend>{label}</legend>{items.map((item, index) => <div className="repeater-item" key={index}><div className="repeater-head"><strong>Item {index + 1}</strong><button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>{Object.entries(schema.fields ?? {}).map(([field, fieldSchema]) => <Control key={field} name={field} path={[...path, String(index), field]} schema={fieldSchema} value={item[field]} onChange={next => onChange(items.map((current, itemIndex) => itemIndex === index ? { ...current, [field]: next } : current))} requestMedia={requestMedia} />)}</div>)}<button type="button" onClick={() => onChange([...items, defaults(schema.fields)])}>+ Add item</button></fieldset>;
  }

  if (schema.type === 'image') {
    return <label htmlFor={id}>{label}<div className="media-control"><input id={id} type="url" value={String(value ?? '')} onChange={event => onChange(event.target.value)} />{requestMedia && <button type="button" onClick={() => requestMedia(path)}>Browse</button>}</div><Help text={schema.help} /></label>;
  }

  return <label htmlFor={id}>{label}<input id={id} type={schema.type === 'url' ? 'url' : 'text'} value={String(value ?? '')} onChange={event => onChange(event.target.value)} /><Help text={schema.help} /></label>;
}

export function Control(props: ControlProps) {
  const Custom = getControl(props.schema.control ?? props.schema.type);
  return Custom ? <Custom {...props} /> : <BuiltInControl {...props} />;
}
