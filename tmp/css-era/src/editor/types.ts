// Editor control types + the inference engine.
//
// This is the "Tier 0 + convention enums" layer from Plan 002: a generic
// editor that renders a form for ANY auto-atom config body, with zero per-file
// schema. The decision of which control to use for a field is driven by:
//   (a) the JSON value's shape (bool / number / string / array / object), and
//   (b) a small set of *convention rules* — keyed on the field name — that
//       pull options from the daemon's /api/enums/* endpoints.
//
// Adding a new module with a new .at shape requires NO editor code: register
// it in the backend registry and it gets a working form for free. Only fields
// that need truly custom UX (e.g. "test connection" buttons) fall back to a
// hand-written component.

/** Which control renders a given field. */
export type ControlKind =
  | 'toggle'
  | 'number'
  | 'text'
  | 'password'
  | 'select'
  | 'multiselect'
  | 'tags' // free-form string array (add/remove)
  | 'table' // array of homogeneous objects
  | 'subform' // nested object → recursive ConfigEditor
  | 'readonly'

/** Description of a field, derived by inferField(). */
export interface FieldSpec {
  key: string
  kind: ControlKind
  /** For select/multiselect: where the options come from. */
  optionsFrom?: EnumSource
  /** Humanized label, e.g. "listen_addr" → "Listen Addr". */
  label: string
}

/** A source of dropdown/multi-select options, fetched from the daemon. */
export type EnumSource =
  | { kind: 'tiers' } // GET /api/enums/tiers
  | { kind: 'dir'; which: 'roles' | 'skills' | 'modes' } // GET /api/enums/dir/:which
  | { kind: 'self-providers'; moduleId: string } // GET /api/enums/self/:mod/providers
  | { kind: 'self-models'; moduleId: string; provider: string } // depends on selected provider

// ---- convention rules -----------------------------------------------------

/** Field names that should render as password (masked) inputs. */
const SECRET_RE = /(^|_)(api_key|key|secret|token|password)(_|$)/i

/** Field names whose value is a string array sourced from a config dir.
 *  These are the harness-selection fields — the common multi-select case. */
const DIR_ARRAY_KEYS: Record<string, 'roles' | 'skills' | 'modes'> = {
  roles: 'roles',
  skills: 'skills',
  modes: 'modes',
}

/** Humanize a snake_case key into a label: "listen_addr" → "Listen Addr". */
export function humanize(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Decide which control renders a field, given its key, current value, and the
 * module it belongs to.
 *
 * @param key        field key (e.g. "default_provider")
 * @param value      current JSON value (drives the structural decision)
 * @param moduleId   the owning module id (for self-referential enums)
 * @param providerContext  if this field is inside a provider block, the
 *                   provider name (so default_model can list that provider's
 *                   models). Passed down by the recursive editor.
 */
export function inferField(
  key: string,
  value: unknown,
  moduleId: string,
  providerContext?: string,
): FieldSpec {
  const label = humanize(key)

  // 1. Structural: array of objects → table; nested object → subform.
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every(isPlainObject)) {
      return { key, kind: 'table', label }
    }
    // Scalar array: convention multi-select for the harness trio, else tags.
    const dirWhich = DIR_ARRAY_KEYS[key]
    if (dirWhich) {
      return { key, kind: 'multiselect', label, optionsFrom: { kind: 'dir', which: dirWhich } }
    }
    return { key, kind: 'tags', label }
  }
  if (isPlainObject(value)) {
    return { key, kind: 'subform', label }
  }

  // 2. Scalar conventions by key name.
  if (typeof value === 'boolean') {
    return { key, kind: 'toggle', label }
  }
  if (typeof value === 'number') {
    return { key, kind: 'number', label }
  }
  // strings (and null treated as text):
  if (SECRET_RE.test(key)) {
    return { key, kind: 'password', label }
  }
  if (key === 'tier' || key === 'model_tier') {
    return { key, kind: 'select', label, optionsFrom: { kind: 'tiers' } }
  }
  if (key === 'default_provider') {
    return { key, kind: 'select', label, optionsFrom: { kind: 'self-providers', moduleId } }
  }
  if (key === 'default_mode') {
    // modes are builtin (no disk dir) → /api/enums/dir/modes returns []. The
    // control falls back to a free-text input with a hint when empty.
    return { key, kind: 'select', label, optionsFrom: { kind: 'dir', which: 'modes' } }
  }
  if (key === 'default_model' && providerContext) {
    return {
      key,
      kind: 'select',
      label,
      optionsFrom: { kind: 'self-models', moduleId, provider: providerContext },
    }
  }
  return { key, kind: 'text', label }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * For table columns: infer a per-column control. Only scalar columns are
 * supported (nested tables/objects inside a table cell are out of v1 scope).
 */
export function inferColumn(key: string, value: unknown, moduleId: string): FieldSpec {
  // Reuse inferField but force scalar kinds; tables of objects only.
  const spec = inferField(key, value, moduleId)
  if (spec.kind === 'table' || spec.kind === 'subform') {
    // A nested object/array inside a table cell → fall back to text (rare).
    return { key, kind: 'text', label: spec.label }
  }
  return spec
}
