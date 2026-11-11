/**
 * Inspector field components (R693, R783, R784). Built-in types cover common
 * props; hosts add their own with `defineField`. A field component gets the
 * same props as a Puck custom field (`field`, `name`, `id`, `value`,
 * `onChange`, `readOnly`), so existing custom fields work unchanged.
 */

import {
  APPROVED_DYNAMIC_SOURCES,
  type BreakpointConfig,
  createDynamicBinding,
  DEFAULT_BREAKPOINTS,
  DEVICE_LABELS,
  isDynamicBinding,
  type Device,
  type DynamicBinding,
  type DynamicSourceDef,
  type FieldDef,
  fieldVisible,
  getPath,
  setPath,
  inheritedFrom,
  resetDeviceValue,
  valueForDevice,
  withDeviceValue,
} from '@nextcms/builder-core';
import {
  AlignmentPad,
  type AlignmentValue,
  BackgroundGroup,
  type BackgroundValue,
  BorderGroup,
  type BorderValue,
  Button,
  Chip,
  ChooseField as E12ChooseField,
  type ChooseOption,
  ColorField as E12ColorField,
  type ColorToken,
  DimensionsField as E12DimensionsField,
  type DimensionsValue,
  EasingField,
  FlexContainerGroup,
  type FlexContainerValue,
  IconButton,
  IconField as E12IconField,
  type MediaBrowseHandler,
  MediaField as E12MediaField,
  type MediaValue,
  normalizeMedia,
  Input,
  NumberField as E12NumberField,
  Select,
  SelectField as E12SelectField,
  ShadowEditor,
  type ShadowItem,
  SliderField as E12SliderField,
  Switch,
  Textarea,
  TransitionPicker,
  type TransitionValue,
  TypographyGroup,
  type TypographyValue,
} from '@nextcms/editor-ui';
import { ArrowDown, ArrowUp, ChevronDown, Database, Plus, X } from 'lucide-react';
import React, {
  type ComponentType,
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useState,
} from 'react';
import { DraggableNumber, TokenPicker, type Unit, parseSize } from './style-controls';

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
export function defineField<V>(
  type: string,
  component: ComponentType<FieldProps<V>>
): [string, FieldComponent] {
  return [type, component as unknown as FieldComponent];
}

const FieldTypesContext = createContext<Record<string, FieldComponent>>({});

/** Shared look for host fields that still style their own inputs (kept for compatibility). */
export const inputStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '6px 8px',
  borderRadius: 'var(--ne-radius-md, 6px)',
  border: '1px solid var(--ne-border, rgba(127,127,127,.35))',
  background: 'var(--ne-surface, transparent)',
  color: 'inherit',
  font: '13px/1.4 system-ui, sans-serif',
};

const str = (value: unknown) =>
  value === undefined || value === null ? '' : String(value);

// `minmax(0, 1fr)` lets rows shrink to the panel instead of growing to their widest child.
const stack = (gap: number): CSSProperties => ({
  display: 'grid',
  gap,
  gridTemplateColumns: 'minmax(0, 1fr)',
});

function TextField({
  field,
  id,
  value,
  onChange,
  readOnly,
}: FieldProps<string>) {
  const placeholder =
    'placeholder' in field
      ? (field.placeholder as string | undefined)
      : undefined;
  if (field.type === 'textarea') {
    return (
      <Textarea
        id={id}
        rows={3}
        value={str(value)}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={event => onChange(event.target.value)}
      />
    );
  }
  return (
    <Input
      id={id}
      type={field.type === 'url' ? 'url' : 'text'}
      value={str(value)}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={event => onChange(event.target.value)}
    />
  );
}

function NumberField({
  field,
  id,
  value,
  onChange,
  readOnly,
}: FieldProps<number | undefined>) {
  const range = field.type === 'number' ? field : undefined;
  return (
    <Input
      id={id}
      type="number"
      value={value ?? ''}
      min={range?.min}
      max={range?.max}
      step={range?.step}
      readOnly={readOnly}
      onChange={event =>
        onChange(
          event.target.value === '' ? undefined : Number(event.target.value)
        )
      }
    />
  );
}

function ToggleField({
  field,
  id,
  value,
  onChange,
  readOnly,
}: FieldProps<boolean>) {
  return (
    <Switch
      id={id}
      aria-label={field.label}
      checked={!!value}
      disabled={readOnly}
      onChange={checked => onChange(checked)}
    />
  );
}

function SelectField({
  field,
  id,
  value,
  onChange,
  readOnly,
}: FieldProps<string | number | boolean>) {
  const options =
    field.type === 'select' || field.type === 'radio' ? field.options : [];
  const index = options.findIndex(option => option.value === value);
  if (field.type === 'radio') {
    return (
      <fieldset
        id={id}
        aria-label={field.label}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          border: 0,
          margin: 0,
          padding: 0,
        }}
      >
        {options.map(option => (
          <Chip
            key={String(option.value)}
            active={option.value === value}
            disabled={readOnly}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </fieldset>
    );
  }
  // Option values may be numbers or booleans, so the <select> works on indexes.
  return (
    <Select
      id={id}
      value={index === -1 ? '' : String(index)}
      disabled={readOnly}
      options={[
        ...(index === -1 ? [{ value: '', label: 'Choose…' }] : []),
        ...options.map((option, i) => ({
          value: String(i),
          label: option.label,
        })),
      ]}
      onChange={event =>
        onChange(options[Number(event.target.value)]?.value as string)
      }
    />
  );
}

function ColorField({ id, value, onChange, readOnly }: FieldProps<string>) {
  return (
    <Input
      id={id}
      value={str(value)}
      placeholder="Inherit"
      readOnly={readOnly}
      onChange={event => onChange(event.target.value)}
      leftElement={
        <input
          type="color"
          aria-label="Pick a color"
          value={/^#[0-9a-f]{6}$/i.test(str(value)) ? str(value) : '#000000'}
          disabled={readOnly}
          onChange={event => onChange(event.target.value)}
          style={{
            width: 18,
            height: 18,
            padding: 0,
            border: 0,
            background: 'none',
            cursor: 'pointer',
          }}
        />
      }
    />
  );
}

function ImageField({ id, value, onChange, readOnly }: FieldProps<string>) {
  return (
    <div style={stack(6)}>
      {/* biome-ignore lint/performance/noImgElement: framework-agnostic package; hosts may not use Next.js */}
      {value ? (
        <img
          src={value}
          alt=""
          style={{ maxWidth: '100%', borderRadius: 'var(--ne-radius-md, 6px)' }}
        />
      ) : null}
      <Input
        id={id}
        type="url"
        value={str(value)}
        placeholder="Image URL"
        readOnly={readOnly}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  );
}

/** The host's media library, used by `media` fields and background images. */
const MediaBrowseContext = createContext<MediaBrowseHandler | undefined>(
  undefined
);

/**
 * Wires the host's media library into the inspector: wrap the editor and
 * pass a handler that opens the picker and calls `pick` with the chosen file.
 */
export function MediaBrowseProvider({
  onBrowse,
  children,
}: {
  onBrowse?: MediaBrowseHandler;
  children: ReactNode;
}) {
  return (
    <MediaBrowseContext.Provider value={onBrowse}>
      {children}
    </MediaBrowseContext.Provider>
  );
}

export function useMediaBrowse(): MediaBrowseHandler | undefined {
  return useContext(MediaBrowseContext);
}

/** `type: 'icon'`: a lucide icon id picked from a searchable popover. */
function IconFieldControl({ id, value, onChange, readOnly }: FieldProps<string>) {
  return (
    <E12IconField
      id={id}
      value={str(value)}
      onChange={onChange}
      disabled={readOnly}
    />
  );
}

/** `type: 'media'`: `{ url, alt }` with a thumbnail, Browse, and alt text. */
function MediaFieldControl({
  field,
  id,
  value,
  onChange,
  readOnly,
}: FieldProps<MediaValue | string | undefined>) {
  const onBrowse = useMediaBrowse();
  return (
    <E12MediaField
      id={id}
      value={normalizeMedia(value)}
      onChange={onChange}
      onBrowse={readOnly ? undefined : onBrowse}
      showAlt={(field as { alt?: boolean }).alt !== false}
      disabled={readOnly}
    />
  );
}

function ComputedField({ field, id, props }: FieldProps<unknown>) {
  const text = field.type === 'computed' ? field.compute(props) : '';
  return (
    <output
      id={id}
      style={{
        font: '13px/1.4 system-ui, sans-serif',
        color: 'var(--ne-text-muted, inherit)',
      }}
    >
      {text}
    </output>
  );
}

function ObjectField({
  field,
  name,
  value,
  onChange,
  readOnly,
}: FieldProps<Record<string, unknown> | undefined>) {
  const fields = field.type === 'object' ? field.fields : {};
  const current = value ?? {};
  return (
    <div
      style={{
        ...stack(10),
        paddingInlineStart: 8,
        borderInlineStart: '2px solid var(--ne-border, rgba(127,127,127,.2))',
      }}
    >
      {Object.entries(fields).map(([key, inner]) => (
        <FieldControl
          key={key}
          name={`${name}.${key}`}
          field={inner}
          value={current[key]}
          props={current}
          readOnly={readOnly}
          onChange={next => onChange({ ...current, [key]: next })}
        />
      ))}
    </div>
  );
}

function ListField({
  field,
  name,
  value,
  onChange,
  readOnly,
  props: blockProps,
}: FieldProps<Record<string, unknown>[] | undefined>) {
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
  const canAdd =
    !readOnly && (list.max === undefined || items.length < list.max);
  const canRemove =
    !readOnly && (list.min === undefined || items.length > list.min);
  const border = '1px solid var(--ne-border, rgba(127,127,127,.25))';
  return (
    <div style={stack(6)}>
      {items.map((item, index) => {
        const label = list.itemLabel?.(item, index) ?? `Item ${index + 1}`;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: list items have no ids; position is their identity
          <div
            key={index}
            style={{
              border,
              borderRadius: 'var(--ne-radius-md, 6px)',
              background: 'var(--ne-surface, transparent)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '2px 4px',
              }}
            >
              <Button
                size="sm"
                variant="ghost"
                aria-expanded={open === index}
                onClick={() => setOpen(open === index ? null : index)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  justifyContent: 'space-between',
                }}
                rightIcon={
                  <ChevronDown
                    style={{
                      width: 12,
                      height: 12,
                      transform: open === index ? 'rotate(180deg)' : undefined,
                    }}
                  />
                }
              >
                {label}
              </Button>
              <IconButton
                size="sm"
                aria-label={`Move ${label} up`}
                tooltip="Move up"
                disabled={readOnly || index === 0}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp style={{ width: 12, height: 12 }} />
              </IconButton>
              <IconButton
                size="sm"
                aria-label={`Move ${label} down`}
                tooltip="Move down"
                disabled={readOnly || index === items.length - 1}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown style={{ width: 12, height: 12 }} />
              </IconButton>
              <IconButton
                size="sm"
                variant="danger"
                aria-label={`Remove ${label}`}
                tooltip="Remove"
                disabled={!canRemove}
                onClick={() => update(items.filter((_, i) => i !== index))}
              >
                <X style={{ width: 12, height: 12 }} />
              </IconButton>
            </div>
            {open === index && (
              <div style={{ ...stack(10), padding: 8, borderTop: border }}>
                {Object.entries(list.item).map(([key, inner]) => (
                  <FieldControl
                    key={key}
                    name={`${name}.${index}.${key}`}
                    field={inner}
                    value={item[key]}
                    props={item}
                    parentProps={blockProps}
                    readOnly={readOnly}
                    onChange={next =>
                      update(
                        items.map((it, i) =>
                          i === index ? { ...it, [key]: next } : it
                        )
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {canAdd && (
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Plus style={{ width: 12, height: 12 }} />}
          onClick={() => {
            update([...items, { ...list.defaultItem }]);
            setOpen(items.length);
          }}
        >
          Add
        </Button>
      )}
    </div>
  );
}

/** `type: 'custom'` with a Puck-style `render` function. */
function CustomRenderField(props: FieldProps<unknown>) {
  const render = props.field.render as
    | ((p: FieldProps<unknown>) => ReactNode)
    | undefined;
  return render ? render(props) : null;
}

const asField = <V,>(component: ComponentType<FieldProps<V>>) =>
  component as unknown as FieldComponent;

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
  icon: asField(IconFieldControl),
  media: asField(MediaFieldControl),
  computed: asField(ComputedField),
  object: asField(ObjectField),
  list: asField(ListField),
  custom: asField(CustomRenderField),
};

/* ---------- E12 Normalization & Adaptation Helpers ---------- */

function toColorTokens(
  tokens?: { value: string; label: string; color?: string }[]
): ColorToken[] | undefined {
  if (!tokens || tokens.length === 0) return undefined;
  return tokens.map(t => ({
    name: t.label || t.value,
    value: t.color || t.value,
    cssVar: t.value.startsWith('var(') ? t.value.slice(4, -1) : undefined,
  }));
}

export function normalizeDimensions(val: unknown): DimensionsValue {
  if (val && typeof val === 'object' && 'top' in val) {
    const obj = val as Record<string, unknown>;
    return {
      top: typeof obj.top === 'number' ? obj.top : (Number(obj.top) || 0),
      right: typeof obj.right === 'number' ? obj.right : (Number(obj.right) || 0),
      bottom: typeof obj.bottom === 'number' ? obj.bottom : (Number(obj.bottom) || 0),
      left: typeof obj.left === 'number' ? obj.left : (Number(obj.left) || 0),
      unit: typeof obj.unit === 'string' ? obj.unit : 'px',
    };
  }
  if (typeof val === 'number') {
    return { top: val, right: val, bottom: val, left: val, unit: 'px' };
  }
  if (typeof val === 'string') {
    const parsed = parseSize(val);
    const num = parsed?.value ?? 0;
    const unit = parsed?.unit ?? 'px';
    return { top: num, right: num, bottom: num, left: num, unit };
  }
  return { top: 0, right: 0, bottom: 0, left: 0, unit: 'px' };
}

export function normalizeBorder(val: unknown): BorderValue {
  if (typeof val === 'string') {
    const parts = val.trim().split(/\s+/);
    return {
      width: Number.parseInt(parts[0] || '1', 10) || 1,
      style: (parts[1] as BorderValue['style']) || 'solid',
      color: parts[2] || '#000000',
    };
  }
  if (val && typeof val === 'object') {
    return val as BorderValue;
  }
  return {};
}

export function normalizeShadow(val: unknown): ShadowItem[] {
  if (Array.isArray(val)) {
    return val as ShadowItem[];
  }
  if (val && typeof val === 'object' && 'x' in val) {
    return [val as ShadowItem];
  }
  if (typeof val === 'string') {
    return [{ x: 0, y: 4, blur: 6, spread: 0, color: val || 'rgba(0,0,0,0.15)' }];
  }
  return [{ x: 0, y: 4, blur: 6, spread: 0, color: 'rgba(0,0,0,0.15)' }];
}

export function normalizeBackground(val: unknown): BackgroundValue {
  if (typeof val === 'string') {
    if (val.includes('gradient')) {
      return {
        type: 'gradient',
        gradient: {
          type: 'linear',
          angle: 90,
          stops: [
            { offset: 0, color: '#4f46e5' },
            { offset: 100, color: '#06b6d4' },
          ],
        },
      };
    }
    return { type: 'color', color: val };
  }
  if (val && typeof val === 'object') {
    return val as BackgroundValue;
  }
  return { type: 'color', color: 'transparent' };
}

/* ---------- E12 Control Adapters ---------- */

function SliderFieldControl({
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<number | undefined>) {
  const f = field as Extract<FieldDef, { type: 'slider' }>;
  return (
    <E12SliderField
      label={field.label}
      value={typeof value === 'number' ? value : (f.defaultValue ?? f.min ?? 0)}
      onChange={onChange}
      min={f.min}
      max={f.max}
      step={f.step}
      unit={f.unit}
      ticks={f.ticks}
      defaultValue={f.defaultValue}
      disabled={readOnly}
    />
  );
}

function ChooseFieldControl({
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<string | number | boolean | undefined>) {
  const f = field as Extract<FieldDef, { type: 'choose' }>;
  const options = ((f.options ?? []) as { value: string | number | boolean; label: string }[]).map(o => ({
    value: String(o.value),
    label: o.label,
  }));
  return (
    <E12ChooseField
      label={field.label}
      options={options}
      value={value !== undefined ? String(value) : undefined}
      onChange={val => {
        const match = f.options?.find(o => String(o.value) === val);
        onChange(match ? match.value : val);
      }}
      disabled={readOnly}
    />
  );
}

function DimensionsFieldControl({
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<DimensionsValue | number | string | undefined>) {
  const f = field as Extract<FieldDef, { type: 'dimensions' }>;
  const normalized = normalizeDimensions(value);
  return (
    <E12DimensionsField
      label={field.label}
      value={normalized}
      onChange={onChange}
      units={f.units}
      disabled={readOnly}
    />
  );
}

function TypographyFieldControl({
  field,
  value,
  onChange,
}: FieldProps<TypographyValue | undefined>) {
  const f = field as Extract<FieldDef, { type: 'typography' }>;
  const tokens = toColorTokens(f.tokens);
  return (
    <TypographyGroup
      value={value && typeof value === 'object' ? value : {}}
      onChange={onChange}
      tokens={tokens}
    />
  );
}

function BorderFieldControl({
  field,
  value,
  onChange,
}: FieldProps<BorderValue | string | undefined>) {
  const f = field as Extract<FieldDef, { type: 'border' }>;
  const tokens = toColorTokens(f.tokens);
  const normalized = normalizeBorder(value);
  return (
    <BorderGroup
      value={normalized}
      onChange={onChange}
      tokens={tokens}
    />
  );
}

function ShadowFieldControl({
  field,
  value,
  onChange,
}: FieldProps<ShadowItem[] | ShadowItem | string | undefined>) {
  const f = field as Extract<FieldDef, { type: 'shadow' }>;
  const tokens = toColorTokens(f.tokens);
  const normalized = normalizeShadow(value);
  return (
    <ShadowEditor
      label={field.label ?? 'Shadow'}
      value={normalized}
      onChange={onChange}
      type={f.kind ?? 'box'}
      tokens={tokens}
    />
  );
}

function BackgroundFieldControl({
  field,
  value,
  onChange,
}: FieldProps<BackgroundValue | string | undefined>) {
  const f = field as Extract<FieldDef, { type: 'background' }>;
  const tokens = toColorTokens(f.tokens);
  const normalized = normalizeBackground(value);
  const onBrowse = useMediaBrowse();
  return (
    <BackgroundGroup
      value={normalized}
      onChange={onChange}
      tokens={tokens}
      onBrowseImage={onBrowse}
    />
  );
}

function FlexFieldControl({
  value,
  onChange,
}: FieldProps<FlexContainerValue | undefined>) {
  return (
    <FlexContainerGroup
      value={value && typeof value === 'object' ? value : {}}
      onChange={onChange}
    />
  );
}

function AlignmentFieldControl({
  field,
  value,
  onChange,
}: FieldProps<AlignmentValue | undefined>) {
  return (
    <AlignmentPad
      label={field.label}
      value={value ?? { justify: 'center', align: 'center' }}
      onChange={onChange}
    />
  );
}

function EasingFieldControl({
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<string | undefined>) {
  return (
    <EasingField
      label={field.label}
      value={value ?? 'ease-out'}
      onChange={onChange}
      disabled={readOnly}
    />
  );
}

function TransitionFieldControl({
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<TransitionValue | undefined>) {
  return (
    <TransitionPicker
      label={field.label}
      value={value}
      onChange={onChange}
      disabled={readOnly}
    />
  );
}

function E12NumberFieldControl({
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<number | string | undefined>) {
  const f = field as Extract<FieldDef, { type: 'number' }>;
  const numValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number.parseFloat(value)
        : undefined;
  return (
    <E12NumberField
      label={field.label}
      value={numValue !== undefined && !Number.isNaN(numValue) ? numValue : undefined}
      onChange={next => onChange(next)}
      min={f.min}
      max={f.max}
      step={f.step}
      unit={f.unit}
      disabled={readOnly}
    />
  );
}

function E12ColorFieldControl({
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<string | undefined>) {
  const tokens = toColorTokens(field.tokens);
  return (
    <E12ColorField
      label={field.label}
      value={value ?? ''}
      onChange={onChange}
      tokens={tokens}
      disabled={readOnly}
    />
  );
}

function E12SelectFieldControl({
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<string | number | boolean | undefined>) {
  const f = field as Extract<FieldDef, { type: 'select' | 'radio' }>;
  const options = f.options ?? [];
  return (
    <E12SelectField
      label={field.label}
      value={value !== undefined ? String(value) : undefined}
      onChange={val => {
        const match = options.find(o => String(o.value) === val);
        onChange(match ? match.value : val);
      }}
      options={options.map(o => ({ value: String(o.value), label: o.label }))}
      disabled={readOnly}
    />
  );
}

/* ---------- E12 Field Registry & Feature Flag ---------- */

export const E12_FIELD_COMPONENTS: Record<string, FieldComponent> = {
  slider: asField(SliderFieldControl),
  choose: asField(ChooseFieldControl),
  dimensions: asField(DimensionsFieldControl),
  typography: asField(TypographyFieldControl),
  border: asField(BorderFieldControl),
  shadow: asField(ShadowFieldControl),
  background: asField(BackgroundFieldControl),
  flex: asField(FlexFieldControl),
  alignment: asField(AlignmentFieldControl),
  easing: asField(EasingFieldControl),
  transition: asField(TransitionFieldControl),
};

export const E12_UPGRADED_BUILT_IN_FIELDS: Record<string, FieldComponent> = {
  number: asField(E12NumberFieldControl),
  color: asField(E12ColorFieldControl),
  select: asField(E12SelectFieldControl),
  radio: asField(ChooseFieldControl),
};

export const E12_BUILT_IN_FIELDS: Record<string, FieldComponent> = {
  ...BUILT_IN_FIELDS,
  ...E12_FIELD_COMPONENTS,
  ...E12_UPGRADED_BUILT_IN_FIELDS,
};

let e12RuntimeFlag: boolean | null = null;

export const USE_E12_CONTROLS_FLAG = 'NEXT_PUBLIC_USE_E12_CONTROLS';

export function isE12ControlsEnabled(): boolean {
  if (e12RuntimeFlag !== null) {
    return e12RuntimeFlag;
  }
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.NEXT_PUBLIC_USE_E12_CONTROLS === '1' ||
      process.env.USE_E12_CONTROLS === '1' ||
      process.env.NEXT_PUBLIC_USE_E12_CONTROLS === 'true'
    );
  }
  return false;
}

export function setE12ControlsEnabled(enabled: boolean | null): void {
  e12RuntimeFlag = enabled;
}

export const E12ControlsContext = createContext<boolean | undefined>(undefined);
export const E12ControlsProvider = E12ControlsContext.Provider;

export function useE12Controls(): boolean {
  const ctx = useContext(E12ControlsContext);
  return ctx !== undefined ? ctx : isE12ControlsEnabled();
}

export function getBuiltInFields(useE12?: boolean): Record<string, FieldComponent> {
  const active = useE12 !== undefined ? useE12 : isE12ControlsEnabled();
  return active ? E12_BUILT_IN_FIELDS : { ...BUILT_IN_FIELDS, ...E12_FIELD_COMPONENTS };
}

/**
 * Migrates legacy flat or unstructured block props to E12 structured style values (E12h).
 * Handles:
 * - Flat typography props (fontSize, fontWeight, fontFamily, etc.) -> TypographyValue
 * - Flat or string border props (borderWidth, borderStyle, borderColor, borderRadius) -> BorderValue
 * - Flat or string shadow props -> ShadowValue
 * - Flat background props -> BackgroundValue
 * - Flat spacing props (padding, margin as string or number) -> DimensionsValue
 * - Responsive values ({ desktop, tablet, mobile })
 */
export function migrateLegacyBlockProps(
  props: Record<string, unknown>,
  fields?: Record<string, FieldDef>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...props };

  const migrateValue = (val: unknown, migrator: (v: unknown) => unknown): unknown => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const keys = Object.keys(val);
      if (keys.some(k => k === 'desktop' || k === 'tablet' || k === 'mobile')) {
        const resp: Record<string, unknown> = {};
        for (const [d, v] of Object.entries(val)) {
          resp[d] = migrator(v);
        }
        return resp;
      }
    }
    return migrator(val);
  };

  if (fields) {
    for (const [key, field] of Object.entries(fields)) {
      const current = result[key];
      switch (field.type) {
        case 'dimensions': {
          if (current !== undefined) {
            result[key] = migrateValue(current, normalizeDimensions);
          }
          break;
        }
        case 'border': {
          if (current !== undefined) {
            result[key] = migrateValue(current, normalizeBorder);
          }
          break;
        }
        case 'shadow': {
          if (current !== undefined) {
            result[key] = migrateValue(current, normalizeShadow);
          }
          break;
        }
        case 'background': {
          if (current !== undefined) {
            result[key] = migrateValue(current, normalizeBackground);
          }
          break;
        }
        case 'typography': {
          if (current && typeof current === 'object') {
            result[key] = current;
          }
          break;
        }
      }
    }
  }

  // Common legacy flat props migration
  if (typeof result.padding === 'number' || typeof result.padding === 'string') {
    result.padding = normalizeDimensions(result.padding);
  }
  if (typeof result.margin === 'number' || typeof result.margin === 'string') {
    result.margin = normalizeDimensions(result.margin);
  }

  const hasFlatTypo =
    result.fontSize !== undefined ||
    result.fontWeight !== undefined ||
    result.fontFamily !== undefined ||
    result.lineHeight !== undefined ||
    result.letterSpacing !== undefined ||
    result.textAlign !== undefined;

  if (hasFlatTypo && !result.typography) {
    const typo: Record<string, unknown> = {};
    if (result.fontFamily !== undefined) typo.fontFamily = String(result.fontFamily);
    if (result.fontSize !== undefined) {
      typo.fontSize =
        typeof result.fontSize === 'number'
          ? result.fontSize
          : Number(result.fontSize) || 16;
    }
    if (result.fontWeight !== undefined) typo.fontWeight = String(result.fontWeight);
    if (result.lineHeight !== undefined) {
      typo.lineHeight =
        typeof result.lineHeight === 'number'
          ? result.lineHeight
          : Number(result.lineHeight) || 1.5;
    }
    if (result.letterSpacing !== undefined) typo.letterSpacing = String(result.letterSpacing);
    if (result.textAlign !== undefined) typo.textAlign = String(result.textAlign);
    if (result.textColor !== undefined) typo.color = String(result.textColor);
    result.typography = typo;
  }

  const hasFlatBorder =
    result.borderWidth !== undefined ||
    result.borderStyle !== undefined ||
    result.borderColor !== undefined ||
    result.borderRadius !== undefined;

  if (hasFlatBorder && !result.border) {
    const border: Record<string, unknown> = {};
    if (result.borderWidth !== undefined) {
      border.width =
        typeof result.borderWidth === 'number'
          ? result.borderWidth
          : Number(result.borderWidth) || 1;
    }
    if (result.borderStyle !== undefined) border.style = String(result.borderStyle);
    if (result.borderColor !== undefined) border.color = String(result.borderColor);
    if (result.borderRadius !== undefined) {
      border.radius =
        typeof result.borderRadius === 'number'
          ? result.borderRadius
          : Number(result.borderRadius) || 0;
    }
    result.border = border;
  }

  if (typeof result.backgroundColor === 'string' && !result.background) {
    result.background = { type: 'color', color: result.backgroundColor };
  }

  return result;
}

export function FieldTypesProvider({
  types,
  useE12,
  children,
}: {
  types?: Record<string, FieldComponent>;
  useE12?: boolean;
  children: ReactNode;
}) {
  const inheritedE12 = useE12Controls();
  const activeE12 = useE12 !== undefined ? useE12 : inheritedE12;
  const builtIn = activeE12 ? E12_BUILT_IN_FIELDS : BUILT_IN_FIELDS;
  return (
    <E12ControlsProvider value={activeE12}>
      <FieldTypesContext.Provider value={{ ...builtIn, ...types }}>
        {children}
      </FieldTypesContext.Provider>
    </E12ControlsProvider>
  );
}

const DeviceContext = createContext<Device>('desktop');
export const DeviceProvider = DeviceContext.Provider;

const BreakpointsContext =
  createContext<BreakpointConfig>(DEFAULT_BREAKPOINTS);
export const BreakpointsProvider = BreakpointsContext.Provider;

const DEVICE_LABEL = DEVICE_LABELS;

/** The id a field's control gets, so an outside label can point at it. */
export function fieldControlId(name: string): string {
  return `field-${name.replace(/[^\w-]/g, '-')}`;
}

/** Records a picked-item source (`pageRef`, `postRef`) can point at. */
export type DynamicRefChoices = {
  page: { id: string; title: string }[];
  post: { id: string; title: string }[];
};

const DynamicRefsContext = createContext<DynamicRefChoices>({
  page: [],
  post: [],
});

/** Gives dynamic bindings the pages and posts to choose from. */
export const DynamicRefsProvider = DynamicRefsContext.Provider;

export type DynamicSourcesValue = {
  /** Sources offered by the binding picker. */
  sources: Record<string, DynamicSourceDef>;
  /** Source and field a new binding starts with. */
  defaultSource: string;
  defaultPath: string;
};

const DynamicSourcesContext = createContext<DynamicSourcesValue>({
  sources: APPROVED_DYNAMIC_SOURCES,
  defaultSource: 'page',
  defaultPath: 'title',
});

/**
 * Overrides the dynamic sources for one editor, e.g. a Loop Item template
 * that lists its post type's own fields under "Loop Item".
 */
export const DynamicSourcesProvider = DynamicSourcesContext.Provider;

export function useDynamicSources(): DynamicSourcesValue {
  return useContext(DynamicSourcesContext);
}

/** Whether an inspector field accepts `{ $dynamic: ... }` data bindings. */
export function fieldAllowsDynamic(field: FieldDef): boolean {
  return Boolean(
    field.dynamic ||
      field.type === 'text' ||
      field.type === 'textarea' ||
      field.type === 'url' ||
      field.type === 'image'
  );
}

/** Compact "Dynamic" tag trigger button rendered next to a field label. */
export function DynamicTriggerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Bind to dynamic content"
      data-dynamic-trigger=""
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        background: 'none',
        border: 'none',
        padding: '2px 4px',
        cursor: 'pointer',
        color: 'var(--ne-text-muted, #64748b)',
        fontSize: '11px',
        borderRadius: 4,
      }}
    >
      <Database style={{ width: 11, height: 11 }} />
      Dynamic
    </button>
  );
}

/** Dynamic content source and field picker (R415 / BLD-23). */
export function DynamicBindingField({
  value,
  onChange,
  onSwitchToStatic,
}: {
  value: DynamicBinding;
  onChange: (next: DynamicBinding) => void;
  onSwitchToStatic: () => void;
}) {
  const { sources } = useContext(DynamicSourcesContext);
  const currentSource = value.$dynamic || 'page';
  const currentPath = value.path || '';
  const sourceDef = sources[currentSource] ?? APPROVED_DYNAMIC_SOURCES[currentSource];
  const availableFields = sourceDef?.fields ?? [];
  const refChoices = useContext(DynamicRefsContext);
  const pickKind = sourceDef?.pick;
  const choices = pickKind ? refChoices[pickKind] : [];

  return (
    <div
      style={{
        display: 'grid',
        gap: 6,
        padding: '8px',
        borderRadius: 'var(--ne-radius-md, 6px)',
        border: '1px dashed var(--ne-primary, #4f46e5)',
        background: 'rgba(79, 70, 229, 0.05)',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontWeight: 600,
            color: 'var(--ne-primary, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Database style={{ width: 12, height: 12 }} /> Dynamic Binding
        </span>
        <button
          type="button"
          onClick={onSwitchToStatic}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--ne-text-muted, #64748b)',
            cursor: 'pointer',
            fontSize: '11px',
            textDecoration: 'underline',
          }}
        >
          Use static value
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--ne-text-muted, #64748b)', marginBottom: 2 }}>
            Source
          </label>
          <select
            value={currentSource}
            onChange={e => {
              const newSource = e.target.value;
              const def = sources[newSource];
              const firstField = def?.fields[0]?.key ?? '';
              const { ref: _ref, ...rest } = value;
              onChange({ ...rest, $dynamic: newSource, path: firstField });
            }}
            style={inputStyle}
          >
            {Object.values(sources).map(src => (
              <option key={src.id} value={src.id}>
                {src.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--ne-text-muted, #64748b)', marginBottom: 2 }}>
            Field
          </label>
          {availableFields.length > 0 ? (
            <select
              value={currentPath}
              onChange={e => onChange({ ...value, path: e.target.value })}
              style={inputStyle}
            >
              {currentPath && !availableFields.some(f => f.key === currentPath) && (
                <option value={currentPath}>{currentPath}</option>
              )}
              {availableFields.map(f => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={currentPath}
              placeholder="e.g. price, author"
              onChange={e => onChange({ ...value, path: e.target.value })}
              style={inputStyle}
            />
          )}
        </div>
      </div>

      {pickKind && (
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--ne-text-muted, #64748b)', marginBottom: 2 }}>
            {pickKind === 'post' ? 'Blog post' : 'Page'}
          </label>
          <select
            value={value.ref ?? ''}
            onChange={e => {
              const { ref: _ref, ...rest } = value;
              onChange(e.target.value ? { ...rest, ref: e.target.value } : rest);
            }}
            style={inputStyle}
          >
            <option value="">
              {choices.length
                ? `Choose a ${pickKind === 'post' ? 'post' : 'page'}…`
                : `No published ${pickKind === 'post' ? 'posts' : 'pages'}`}
            </option>
            {value.ref && !choices.some(c => c.id === value.ref) && (
              <option value={value.ref}>Unavailable item</option>
            )}
            {choices.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--ne-text-muted, #64748b)', marginBottom: 2 }}>
          Fallback value (optional)
        </label>
        <input
          type="text"
          value={value.fallback ?? ''}
          placeholder="Value if empty"
          onChange={e => onChange({ ...value, fallback: e.target.value || undefined })}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

export type FieldValueAccessor = {
  path: string;
  read: (props: Record<string, unknown> | undefined) => unknown;
  write: (
    props: Record<string, unknown> | undefined,
    next: unknown
  ) => Record<string, unknown>;
};

/**
 * Access a field's value and build atomic patches for `store.updateProps`.
 * Supports direct prop keys ('title') and dotted paths ('section.fill', 'elements.title.color').
 */
export function fieldValueAccess(
  field: FieldDef,
  name: string
): FieldValueAccessor {
  const targetPath = field.path ?? name;
  return {
    path: targetPath,
    read(props) {
      return getPath(props, targetPath);
    },
    write(props, next) {
      if (!targetPath.includes('.')) {
        if (
          targetPath === 'section' &&
          next &&
          typeof next === 'object' &&
          !Array.isArray(next)
        ) {
          const existing =
            props?.section && typeof props.section === 'object'
              ? (props.section as Record<string, unknown>)
              : {};
          return { section: { ...existing, ...(next as Record<string, unknown>) } };
        }
        return { [targetPath]: next };
      }
      const rootKey = targetPath.split('.')[0]!;
      const rest = targetPath.slice(rootKey.length + 1);
      const rootVal =
        props?.[rootKey] &&
        typeof props[rootKey] === 'object' &&
        !Array.isArray(props[rootKey])
          ? (props[rootKey] as Record<string, unknown>)
          : {};
      return {
        [rootKey]: setPath(rootVal, rest, next),
      };
    },
  };
}

/**
 * One field with its label, per-device handling, and conditional visibility.
 * `bare` drops the label, device hint, reset and description, for callers
 * (the inspector) that draw those in their own row.
 */
export function FieldControl({
  name,
  field,
  value,
  onChange,
  props,
  parentProps,
  readOnly,
  bare = false,
}: {
  name: string;
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  props: Record<string, unknown>;
  parentProps?: Record<string, unknown>;
  readOnly?: boolean;
  bare?: boolean;
}) {
  const types = useContext(FieldTypesContext);
  const device = useContext(DeviceContext);
  const dynamicDefaults = useContext(DynamicSourcesContext);
  const e12 = useE12Controls();
  if (!fieldVisible(field, props, device, parentProps)) return null;
  const activeTypes = e12
    ? { ...E12_BUILT_IN_FIELDS, ...types }
    : { ...BUILT_IN_FIELDS, ...E12_FIELD_COMPONENTS, ...types };
  const Component = (activeTypes[field.type] ??
    activeTypes.text) as unknown as ComponentType<FieldProps<unknown>>;
  const breakpoints = useContext(BreakpointsContext);
  const id = fieldControlId(name);
  const responsive = !!field.responsive;
  const stored = responsive ? valueForDevice(value, device, breakpoints) : value;
  const shown =
    stored === undefined &&
    (field.type === 'toggle' ||
      field.type === 'select' ||
      field.type === 'radio')
      ? field.defaultValue
      : stored;
  const source = responsive ? inheritedFrom(value, device, breakpoints) : null;
  const own = responsive && source === device;
  const isContainer = field.type === 'list' || field.type === 'object';
  const isDynamic = isDynamicBinding(shown);
  const allowsDynamic = fieldAllowsDynamic(field);

  return (
    <div style={stack(4)}>
      {!bare && field.label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label
            htmlFor={isContainer ? undefined : id}
            style={{
              font: '500 12px/1.4 system-ui, sans-serif',
              color: 'var(--ne-text, inherit)',
            }}
          >
            {field.label}
          </label>
          {allowsDynamic && !isDynamic && !readOnly && (
            <DynamicTriggerButton
              onClick={() =>
                onChange(
                  responsive
                    ? withDeviceValue(
                        value,
                        device,
                        createDynamicBinding(
                          dynamicDefaults.defaultSource,
                          dynamicDefaults.defaultPath,
                          ''
                        )
                      )
                    : createDynamicBinding(
                        dynamicDefaults.defaultSource,
                        dynamicDefaults.defaultPath,
                        ''
                      )
                )
              }
            />
          )}
          {responsive && (
            <span
              style={{
                font: '11px/1 system-ui, sans-serif',
                color: 'var(--ne-text-muted, inherit)',
              }}
            >
              {DEVICE_LABEL[device]}
              {source && source !== device
                ? ` · from ${DEVICE_LABEL[source].toLowerCase()}`
                : ''}
            </span>
          )}
          {own && device !== 'desktop' && (
            <Button
              size="sm"
              variant="ghost"
              style={{ marginInlineStart: 'auto' }}
              aria-label={`Reset ${field.label} on ${DEVICE_LABEL[device].toLowerCase()}`}
              onClick={() => onChange(resetDeviceValue(value, device))}
            >
              Reset
            </Button>
          )}
        </div>
      )}
      {isDynamic ? (
        <DynamicBindingField
          value={shown}
          onChange={next =>
            onChange(responsive ? withDeviceValue(value, device, next) : next)
          }
          onSwitchToStatic={() =>
            onChange(responsive ? withDeviceValue(value, device, '') : '')
          }
        />
      ) : (
        <Component
          field={field as FieldDef & Record<string, unknown>}
          name={name}
          id={id}
          value={shown}
          props={props}
          readOnly={readOnly || field.readOnly}
          onChange={next =>
            onChange(responsive ? withDeviceValue(value, device, next) : next)
          }
        />
      )}
      {field.visual && !readOnly && field.type === 'number' && !e12 && (
        <DraggableNumber
          value={typeof shown === 'number' ? shown : undefined}
          onChange={next => onChange(next)}
          unit={(field.unit ?? 'px') as Unit}
          step={field.step ?? 1}
          min={field.min}
          max={field.max}
          label={field.label}
        />
      )}
      {field.visual && !readOnly && field.type === 'color' && field.tokens && !e12 && (
        <TokenPicker
          value={typeof shown === 'string' ? shown : undefined}
          onChange={next => onChange(next)}
          tokens={field.tokens}
          label={field.label}
        />
      )}
      {!bare && field.description && (
        <p
          style={{
            margin: 0,
            font: '11px/1.4 system-ui, sans-serif',
            color: 'var(--ne-text-muted, inherit)',
          }}
        >
          {field.description}
        </p>
      )}
    </div>
  );
}
