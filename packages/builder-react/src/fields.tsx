/**
 * Inspector field components (R693, R783, R784). Built-in types cover common
 * props; hosts add their own with `defineField`. A field component gets the
 * same props as a Puck custom field (`field`, `name`, `id`, `value`,
 * `onChange`, `readOnly`), so existing custom fields work unchanged.
 */

import {
  type Device,
  type FieldDef,
  inheritedFrom,
  resetDeviceValue,
  valueForDevice,
  withDeviceValue,
} from '@nextcms/builder-core';
import { type ComponentType, type CSSProperties, createContext, type ReactNode, useContext, useState } from 'react';

export type FieldProps<V = unknown> = {
  field: FieldDef & Record<string, unknown>;
  name: string;
  id: string;
  value: V;
  onChange: (value: V) => void;
  readOnly?: boolean;
  /** All props of the block, for fields that depend on others. */
  props: Record<string, unknown>;
};

export type FieldComponent = ComponentType<FieldProps<never>>;

/** Registers a field type for the inspector: `defineField('custom:color', ColorField)`. */
export function defineField<V>(type: string, component: ComponentType<FieldProps<V>>): [string, FieldComponent] {
  return [type, component as unknown as FieldComponent];
}

const FieldTypesContext = createContext<Record<string, FieldComponent>>({});

export const inputStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid rgba(127,127,127,.35)',
  background: 'transparent',
  color: 'inherit',
  font: '13px/1.4 system-ui, sans-serif',
};

const smallButton: CSSProperties = {
  padding: '2px 6px',
  borderRadius: 4,
  border: '1px solid rgba(127,127,127,.35)',
  background: 'transparent',
  color: 'inherit',
  font: '12px/1.4 system-ui, sans-serif',
  cursor: 'pointer',
};

const str = (value: unknown) => (value === undefined || value === null ? '' : String(value));

function TextField({ field, id, value, onChange, readOnly }: FieldProps<string>) {
  const placeholder = 'placeholder' in field ? (field.placeholder as string | undefined) : undefined;
  if (field.type === 'textarea') {
    return (
      <textarea id={id} rows={3} style={inputStyle} value={str(value)} placeholder={placeholder}
        readOnly={readOnly} onChange={event => onChange(event.target.value)} />
    );
  }
  return (
    <input id={id} type={field.type === 'url' ? 'url' : 'text'} style={inputStyle} value={str(value)}
      placeholder={placeholder} readOnly={readOnly} onChange={event => onChange(event.target.value)} />
  );
}

function NumberField({ field, id, value, onChange, readOnly }: FieldProps<number | undefined>) {
  const range = field.type === 'number' ? field : undefined;
  return (
    <input id={id} type="number" style={inputStyle} value={value ?? ''} min={range?.min} max={range?.max}
      step={range?.step} readOnly={readOnly}
      onChange={event => onChange(event.target.value === '' ? undefined : Number(event.target.value))} />
  );
}

function ToggleField({ id, value, onChange, readOnly }: FieldProps<boolean>) {
  return (
    <input id={id} type="checkbox" checked={!!value} disabled={readOnly}
      onChange={event => onChange(event.target.checked)} />
  );
}

function SelectField({ field, id, value, onChange, readOnly }: FieldProps<string | number | boolean>) {
  const options = field.type === 'select' || field.type === 'radio' ? field.options : [];
  const index = options.findIndex(option => option.value === value);
  if (field.type === 'radio') {
    return (
      <fieldset id={id} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, border: 0, margin: 0, padding: 0 }}>
        {options.map(option => (
          <button key={String(option.value)} type="button" aria-pressed={option.value === value}
            disabled={readOnly} onClick={() => onChange(option.value)}
            style={{ ...smallButton, background: option.value === value ? 'rgba(79,70,229,.15)' : 'transparent' }}>
            {option.label}
          </button>
        ))}
      </fieldset>
    );
  }
  return (
    <select id={id} style={inputStyle} value={index === -1 ? '' : String(index)} disabled={readOnly}
      onChange={event => onChange(options[Number(event.target.value)]?.value as string)}>
      {index === -1 && <option value="">Choose…</option>}
      {options.map((option, i) => (
        <option key={String(option.value)} value={String(i)}>{option.label}</option>
      ))}
    </select>
  );
}

function ColorField({ id, value, onChange, readOnly }: FieldProps<string>) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input type="color" aria-label="Pick a color" value={/^#[0-9a-f]{6}$/i.test(str(value)) ? str(value) : '#000000'}
        disabled={readOnly} onChange={event => onChange(event.target.value)} />
      <input id={id} style={inputStyle} value={str(value)} placeholder="Inherit" readOnly={readOnly}
        onChange={event => onChange(event.target.value)} />
    </div>
  );
}

function ImageField({ id, value, onChange, readOnly }: FieldProps<string>) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {/* biome-ignore lint/performance/noImgElement: framework-agnostic package; hosts may not use Next.js */}
      {value ? <img src={value} alt="" style={{ maxWidth: '100%', borderRadius: 6 }} /> : null}
      <input id={id} type="url" style={inputStyle} value={str(value)} placeholder="Image URL" readOnly={readOnly}
        onChange={event => onChange(event.target.value)} />
    </div>
  );
}

function ComputedField({ field, id, props }: FieldProps<unknown>) {
  const text = field.type === 'computed' ? field.compute(props) : '';
  return <output id={id} style={{ font: '13px/1.4 system-ui, sans-serif', opacity: 0.75 }}>{text}</output>;
}

function ObjectField({ field, name, value, onChange, readOnly }: FieldProps<Record<string, unknown> | undefined>) {
  const fields = field.type === 'object' ? field.fields : {};
  const current = value ?? {};
  return (
    <div style={{ display: 'grid', gap: 10, paddingLeft: 8, borderLeft: '2px solid rgba(127,127,127,.2)' }}>
      {Object.entries(fields).map(([key, inner]) => (
        <FieldControl key={key} name={`${name}.${key}`} field={inner} value={current[key]} props={current}
          readOnly={readOnly} onChange={next => onChange({ ...current, [key]: next })} />
      ))}
    </div>
  );
}

function ListField({ field, name, value, onChange, readOnly }: FieldProps<Record<string, unknown>[] | undefined>) {
  const list = field.type === 'list' ? field : undefined;
  const items = value ?? [];
  const [open, setOpen] = useState<number | null>(null);
  if (!list) return null;
  const update = (next: Record<string, unknown>[]) => onChange(next);
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update(next);
    setOpen(to);
  };
  const canAdd = !readOnly && (list.max === undefined || items.length < list.max);
  const canRemove = !readOnly && (list.min === undefined || items.length > list.min);
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {items.map((item, index) => {
        const label = list.itemLabel?.(item, index) ?? `Item ${index + 1}`;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: list items have no ids; position is their identity
          <div key={index} style={{ border: '1px solid rgba(127,127,127,.25)', borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px' }}>
              <button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}
                style={{ ...smallButton, border: 0, flex: 1, textAlign: 'left' }}>
                {label}
              </button>
              <button type="button" aria-label={`Move ${label} up`} disabled={readOnly || index === 0}
                onClick={() => move(index, index - 1)} style={smallButton}>▲</button>
              <button type="button" aria-label={`Move ${label} down`} disabled={readOnly || index === items.length - 1}
                onClick={() => move(index, index + 1)} style={smallButton}>▼</button>
              <button type="button" aria-label={`Remove ${label}`} disabled={!canRemove}
                onClick={() => update(items.filter((_, i) => i !== index))} style={smallButton}>✕</button>
            </div>
            {open === index && (
              <div style={{ display: 'grid', gap: 10, padding: 8, borderTop: '1px solid rgba(127,127,127,.2)' }}>
                {Object.entries(list.item).map(([key, inner]) => (
                  <FieldControl key={key} name={`${name}.${index}.${key}`} field={inner} value={item[key]} props={item}
                    readOnly={readOnly}
                    onChange={next => update(items.map((it, i) => (i === index ? { ...it, [key]: next } : it)))} />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {canAdd && (
        <button type="button" style={smallButton}
          onClick={() => { update([...items, { ...list.defaultItem }]); setOpen(items.length); }}>
          + Add
        </button>
      )}
    </div>
  );
}

/** `type: 'custom'` with a Puck-style `render` function. */
function CustomRenderField(props: FieldProps<unknown>) {
  const render = props.field.render as ((p: FieldProps<unknown>) => ReactNode) | undefined;
  return render ? render(props) : null;
}

const asField = <V,>(component: ComponentType<FieldProps<V>>) => component as unknown as FieldComponent;

export const BUILT_IN_FIELDS: Record<string, FieldComponent> = {
  text: asField(TextField),
  textarea: asField(TextField),
  url: asField(TextField),
  number: asField(NumberField),
  toggle: asField(ToggleField),
  select: asField(SelectField),
  radio: asField(SelectField),
  color: asField(ColorField),
  image: asField(ImageField),
  computed: asField(ComputedField),
  object: asField(ObjectField),
  list: asField(ListField),
  custom: asField(CustomRenderField),
};

export function FieldTypesProvider({ types, children }: { types?: Record<string, FieldComponent>; children: ReactNode }) {
  return <FieldTypesContext.Provider value={{ ...BUILT_IN_FIELDS, ...types }}>{children}</FieldTypesContext.Provider>;
}

const DeviceContext = createContext<Device>('desktop');
export const DeviceProvider = DeviceContext.Provider;

const DEVICE_LABEL: Record<Device, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };

/** One field with its label, per-device handling, and conditional visibility. */
export function FieldControl({
  name,
  field,
  value,
  onChange,
  props,
  readOnly,
}: {
  name: string;
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  props: Record<string, unknown>;
  readOnly?: boolean;
}) {
  const types = useContext(FieldTypesContext);
  const device = useContext(DeviceContext);
  if (field.when && !field.when(props)) return null;
  const Component = (types[field.type] ?? types.text) as unknown as ComponentType<FieldProps<unknown>>;
  const id = `field-${name.replace(/[^\w-]/g, '-')}`;
  const responsive = !!field.responsive;
  const shown = responsive ? valueForDevice(value, device) : value;
  const source = responsive ? inheritedFrom(value, device) : null;
  const own = responsive && source === device;
  const isContainer = field.type === 'list' || field.type === 'object';

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {field.label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label htmlFor={isContainer ? undefined : id} style={{ font: '600 12px/1.4 system-ui, sans-serif' }}>
            {field.label}
          </label>
          {responsive && (
            <span style={{ font: '11px/1 system-ui, sans-serif', opacity: 0.6 }}>
              {DEVICE_LABEL[device]}
              {source && source !== device ? ` · from ${DEVICE_LABEL[source].toLowerCase()}` : ''}
            </span>
          )}
          {own && device !== 'desktop' && (
            <button type="button" style={{ ...smallButton, marginLeft: 'auto' }}
              aria-label={`Reset ${field.label} on ${DEVICE_LABEL[device].toLowerCase()}`}
              onClick={() => onChange(resetDeviceValue(value, device))}>
              Reset
            </button>
          )}
        </div>
      )}
      <Component
        field={field as FieldDef & Record<string, unknown>}
        name={name}
        id={id}
        value={shown}
        props={props}
        readOnly={readOnly || field.readOnly}
        onChange={next => onChange(responsive ? withDeviceValue(value, device, next) : next)}
      />
      {field.description && (
        <p style={{ margin: 0, font: '11px/1.4 system-ui, sans-serif', opacity: 0.65 }}>{field.description}</p>
      )}
    </div>
  );
}
