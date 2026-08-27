// src/lib/api.ts — handwritten transport layer (Plan 006 D2).
//
// Everything the Auto stores/widgets can't express lives here: fetch, JSON,
// timeouts, caches. The .at side consumes these via `use back.api:` /
// `use { fn }` imports (auto-awaited by codegen). Endpoints and error
// messages are ported verbatim from the original composables
// (useModules/useConfig/useCollection/useEnums/DaemonView).

export interface ConfigModule {
  id: string
  kind: string
  name: string
  icon: string
  description: string
  group: string
  remote?: string
  format?: string
}

export interface EnumOption {
  value: string
  label: string
}

export interface ModulesView {
  modules: ConfigModule[]
  /** Groups with member module objects embedded, first-seen order. */
  groups: { id: string; label: string; members: ConfigModule[] }[]
  /** Modules not in any group. */
  standalone: ConfigModule[]
  /** Seed: the first group's id (expanded by default). */
  firstGroup: string
}

async function json(resp: Response): Promise<any> {
  try {
    return await resp.json()
  } catch {
    return {}
  }
}

/** GET /api/modules + the group/standalone derivation (was in useModules). */
export async function fetchModulesView(): Promise<ModulesView> {
  const resp = await fetch('/api/modules')
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const list = (await resp.json()) as ConfigModule[]
  const seenLabels: string[] = []
  const groups: ModulesView['groups'] = []
  for (const m of list) {
    if (!m.group) continue
    let g = groups.find((x) => x.label === m.group)
    if (!g) {
      g = { id: m.group.toLowerCase().replace(/\s+/g, '-'), label: m.group, members: [] }
      seenLabels.push(m.group)
      groups.push(g)
    }
    g.members.push(m)
  }
  const grouped = new Set(groups.flatMap((g) => g.members.map((m) => m.id)))
  return {
    modules: list,
    groups,
    standalone: list.filter((m) => !grouped.has(m.id)),
    firstGroup: groups.length ? groups[0].id : '',
  }
}

/** Fail-soft wrapper: the DSL has no try/catch (jade fetchXxxSafe pattern). */
export async function fetchModulesViewSafe(): Promise<
  { ok: true; data: ModulesView } | { ok: false; error: string }
> {
  try {
    return { ok: true, data: await fetchModulesView() }
  } catch (e: any) {
    return { ok: false, error: `Failed to load modules: ${e.message || e}` }
  }
}

/** Ensure the group containing `id` is expanded (whole-array rebuild). */
export function expandGroupFor(expanded: string[], groups: ModulesView['groups'], id: string): string[] {
  const out = [...expanded]
  for (const g of groups) {
    if (g.members.some((m) => m.id === id) && !out.includes(g.id)) out.push(g.id)
  }
  return out
}

/** URL hash without '#', '' when absent (deep-link support). */
export function getHash(): string {
  return window.location.hash.slice(1)
}

/** GET /api/config/:id — { value, meta }. */
export async function fetchConfig(moduleId: string): Promise<any> {
  const resp = await fetch(`/api/config/${moduleId}`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/** PUT /api/config/:id — whole-body save. Throws with the daemon's error. */
export async function putConfig(moduleId: string, body: any): Promise<void> {
  const resp = await fetch(`/api/config/${moduleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: body }),
  })
  if (!resp.ok) throw new Error((await json(resp)).error || `HTTP ${resp.status}`)
}

/** DELETE /api/config/:id/blocks/:name (Plan 005 §1.2). */
export async function deleteBlock(moduleId: string, name: string): Promise<void> {
  const resp = await fetch(`/api/config/${moduleId}/blocks/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
  if (!resp.ok) throw new Error((await json(resp)).error || `HTTP ${resp.status}`)
}

/** GET /api/collection/:id — entity summaries. */
export async function fetchCollectionList(moduleId: string): Promise<any> {
  const resp = await fetch(`/api/collection/${moduleId}`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/** GET one entity — atom: { value, sidecar? }; frontmatter-md: fm fields. */
export async function fetchEntity(moduleId: string, name: string): Promise<any> {
  const resp = await fetch(`/api/collection/${moduleId}/${encodeURIComponent(name)}`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/** POST /api/collection/:id — create an entity. */
export async function createEntity(moduleId: string, name: string): Promise<void> {
  const resp = await fetch(`/api/collection/${moduleId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!resp.ok) throw new Error((await json(resp)).error || `HTTP ${resp.status}`)
}

/** PUT one entity (value + sidecar). */
export async function putEntity(
  moduleId: string,
  name: string,
  value: any,
  sidecar: string,
): Promise<void> {
  const resp = await fetch(`/api/collection/${moduleId}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value, sidecar }),
  })
  if (!resp.ok) throw new Error((await json(resp)).error || `HTTP ${resp.status}`)
}

/** DELETE one entity. */
export async function deleteEntity(moduleId: string, name: string): Promise<void> {
  const resp = await fetch(`/api/collection/${moduleId}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
  if (!resp.ok) throw new Error((await json(resp)).error || `HTTP ${resp.status}`)
}

// ── enum options (was useEnums) ─────────────────────────────────────────────

const enumCache = new Map<string, EnumOption[]>()
const enumPending = new Map<string, Promise<EnumOption[]>>()

/** Enum URLs by source kind (mirrors the original EnumSource union). */
export function enumUrl(kind: string, moduleId: string, which: string, provider: string): string {
  if (kind === 'tiers') return '/api/enums/tiers'
  if (kind === 'dir') return `/api/enums/dir/${which}`
  if (kind === 'self-providers') return `/api/enums/self/${moduleId}/providers`
  return `/api/enums/self/${moduleId}/models/${encodeURIComponent(provider)}`
}

/** Cached + deduped enum fetch; network errors resolve to []. */
export function loadEnum(url: string): Promise<EnumOption[]> {
  const hit = enumCache.get(url)
  if (hit) return Promise.resolve(hit)
  const inflight = enumPending.get(url)
  if (inflight) return inflight
  const p = fetch(url)
    .then((r) => (r.ok ? r.json() : []))
    .then((opts: EnumOption[]) => {
      enumCache.set(url, opts)
      enumPending.delete(url)
      return opts
    })
    .catch(() => {
      enumPending.delete(url)
      return []
    })
  enumPending.set(url, p)
  return p
}

// ── accent theme (was useTheme.ts; stores import via `use back.api:`) ──────

export interface AccentOption {
  name: string
  label: string
  swatch: string
  primaryHsl: string
}

/** Same palette as the original useTheme.ts (AutoForge visual language). */
export const ACCENT_OPTIONS: AccentOption[] = [
  { name: 'indigo', label: 'Indigo', swatch: '#6366f1', primaryHsl: '239 84% 67%' },
  { name: 'coral', label: 'Coral', swatch: '#e85d75', primaryHsl: '350 75% 64%' },
  { name: 'ocean', label: 'Ocean', swatch: '#3b82f6', primaryHsl: '217 91% 60%' },
  { name: 'sage', label: 'Sage', swatch: '#10b981', primaryHsl: '160 84% 39%' },
  { name: 'amber', label: 'Amber', swatch: '#f59e0b', primaryHsl: '38 92% 50%' },
]

const STORAGE_KEY = 'autoos-accent-color'

function applyAccentToDom(name: string): void {
  const opt = ACCENT_OPTIONS.find((o) => o.name === name)
  if (!opt) return
  document.documentElement.style.setProperty('--primary', opt.primaryHsl)
}

/** Persisted accent or 'indigo' (also applies it — the store Init side effect). */
export function loadAccent(): string {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    stored = null
  }
  const initial = stored && ACCENT_OPTIONS.some((o) => o.name === stored) ? stored : 'indigo'
  applyAccentToDom(initial)
  return initial
}

/** Set + persist + apply (the store SetAccent side effect). */
export function applyAccent(name: string): void {
  if (!ACCENT_OPTIONS.some((o) => o.name === name)) return
  try {
    localStorage.setItem(STORAGE_KEY, name)
  } catch {
    /* private mode etc. — still apply in-memory */
  }
  applyAccentToDom(name)
}

// ── daemon connection test (was DaemonView) ────────────────────────────────

export interface TestResult {
  status: 'idle' | 'checking' | 'ok' | 'fail' | 'unreachable'
  latency: number
  error: string
}

/** POST /api/action/test-daemon (proxies to aaid :17654), 20s timeout. */
export async function testDaemon(): Promise<TestResult> {
  const t0 = performance.now()
  try {
    const resp = await fetch('/api/action/test-daemon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ use_default: true }),
      signal: AbortSignal.timeout(20000),
    })
    const latency = Math.round(performance.now() - t0)
    if (resp.status === 503) return { status: 'unreachable', latency, error: '' }
    const j = await json(resp)
    if (resp.ok && j.success) return { status: 'ok', latency, error: '' }
    return { status: 'fail', latency, error: j.error || `HTTP ${resp.status}` }
  } catch (e: any) {
    return { status: 'fail', latency: 0, error: e.message || String(e) }
  }
}

// ── collection entity projection (Plan 006 Phase 3) ────────────────────────

import { inferField, inferColumn, humanize } from '../editor/types'

export interface EntityEntry {
  key: string
  value: any
  is_table: boolean
  spec: any
}

/** Project an atom entity body into ordered entries with inferred specs. */
export function bodyEntries(body: any, moduleId: string): EntityEntry[] {
  return Object.entries(body ?? {}).map(([key, value]) => ({
    key,
    value,
    is_table: Array.isArray(value) && value.length > 0 && value.every((x) => typeof x === 'object' && x !== null),
    spec: inferField(key, value, moduleId),
  }))
}

/** Whole-replace one entry's value and re-infer its spec (D5). */
export function setEntry(entries: EntityEntry[], key: string, value: any, moduleId: string): EntityEntry[] {
  return entries.map((e) =>
    e.key === key
      ? {
          ...e,
          value,
          is_table: Array.isArray(value) && value.length > 0 && value.every((x) => typeof x === 'object' && x !== null),
          spec: inferField(key, value, moduleId),
        }
      : e,
  )
}

/** CollectionBrowser list filter (name/description match). */
export function filterEntities(list: any[], q: string): any[] {
  const s = q.trim().toLowerCase()
  if (!s) return list
  return list.filter(
    (e) => e.name.toLowerCase().includes(s) || e.description.toLowerCase().includes(s),
  )
}

/** Fail-soft entity fetch: atom → { atom, fm:null }; frontmatter-md → { atom:null, fm }. */
export async function fetchEntitySafe(
  moduleId: string,
  name: string,
): Promise<{ ok: true; atom: any; fm: any } | { ok: false; error: string }> {
  try {
    const data = await fetchEntity(moduleId, name)
    if (data.value !== undefined) {
      return { ok: true, atom: { value: data.value, sidecar: data.sidecar || '' }, fm: null }
    }
    return { ok: true, atom: null, fm: fmFields(data) }
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) }
  }
}

/** Fail-soft list fetch. */
export async function fetchCollectionListSafe(
  moduleId: string,
): Promise<{ ok: true; list: any[] } | { ok: false; error: string }> {
  try {
    return { ok: true, list: await fetchCollectionList(moduleId) }
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) }
  }
}

/** Fail-soft create. */
export async function createEntitySafe(
  moduleId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await createEntity(moduleId, name)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) }
  }
}

/** Fail-soft save (value + sidecar). */
export async function putEntitySafe(
  moduleId: string,
  name: string,
  value: any,
  sidecar: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // text-first contract: the shared store keeps body_text as a JSON string
    // (editField output); pre-unification object flows pass through as-is.
    await putEntity(moduleId, name, typeof value === 'string' ? JSON.parse(value) : value, sidecar)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) }
  }
}

/** Fail-soft remove. */
export async function deleteEntitySafe(
  moduleId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deleteEntity(moduleId, name)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) }
  }
}

/** Rebuild the atom body object from entries (inverse of bodyEntries). */
export function entriesBody(entries: EntityEntry[]): any {
  const body: any = {}
  for (const e of entries) body[e.key] = e.value
  return body
}

/** Extract the frontmatter-md fields from a raw entity response. */
export function fmFields(data: any): { name: string; description: string; body: string } {
  return { name: data.name ?? '', description: data.description ?? '', body: data.body ?? '' }
}

// ── file-config projection (Plan 006 Phase 4) ──────────────────────────────

export interface CfgEntry {
  key: string
  /** "subform" | "table" | "scalar" */
  kind: string
  /** dot-path from the body root ("provider" or "tier_routing.max") */
  path: string
  value: any
  spec: any
  /** provider-shaped subform (carries a `kind` prop) → delete affordance */
  is_provider: boolean
  /** subform children entries (kind == "subform" only) */
  sub: CfgSubEntry[]
}

export interface CfgSubEntry {
  key: string
  path: string
  value: any
  is_table: boolean
  spec: any
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isObjectArray(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'object' && x !== null)
}

function subEntries(obj: any, path: string, moduleId: string, providerCtx: string): CfgSubEntry[] {
  return Object.entries(obj ?? {}).map(([key, value]) => ({
    key,
    path: `${path}.${key}`,
    value,
    is_table: isObjectArray(value),
    spec: inferField(key, value, moduleId, providerCtx || undefined),
  }))
}

/** Project a config body into ordered top-level entries (D4). */
export function configEntries(
  body: any,
  moduleId: string,
  providerCtx = '',
): CfgEntry[] {
  const provider = providerCtx || body?.default_provider || ''
  return Object.entries(body ?? {}).map(([key, value]) => {
    if (isPlainObject(value)) {
      return {
        key,
        kind: 'subform',
        path: key,
        value,
        spec: { key, kind: 'subform', label: humanize(key) },
        is_provider: 'kind' in value,
        sub: subEntries(value, key, moduleId, provider),
      }
    }
    return {
      key,
      kind: isObjectArray(value) ? 'table' : 'scalar',
      path: key,
      value,
      spec: inferField(key, value, moduleId, provider || undefined),
      is_provider: false,
      sub: [],
    }
  })
}

/** Whole-replace one entry/sub value by dot-path, re-projecting specs (D5). */
export function setCfgEntry(
  entries: CfgEntry[],
  path: string,
  value: any,
  body: any,
  moduleId: string,
): { entries: CfgEntry[]; body: any } {
  const nextBody = { ...body }
  const parts = path.split('.')
  if (parts.length === 1) {
    nextBody[parts[0]] = value
  } else {
    const [head, tail] = parts
    nextBody[head] = { ...nextBody[head], [tail]: value }
  }
  return { entries: configEntries(nextBody, moduleId), body: nextBody }
}

/** The current default_provider (drives default_model's enum source). */
export function cfgProvider(entries: CfgEntry[]): string {
  const e = entries.find((x) => x.key === 'default_provider')
  return e ? String(e.value ?? '') : ''
}

/** First-save confirm + localStorage ack (was useConfig.save). */
export function confirmSaveOnce(): boolean {
  const KEY = 'autoos-config-saved-once'
  try {
    if (localStorage.getItem(KEY)) return true
  } catch {
    return true
  }
  const ok = confirm(
    'Saving rewrites the config file from its parsed AST.\n\n' +
      'This normalizes formatting (indent, quotes) and removes comments. ' +
      'A .bak backup is written next to the file.\n\n' +
      'Continue?',
  )
  if (ok) {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
  }
  return ok
}

/** Fail-soft config fetch → { ok, value, meta } | { ok:false, error }.
 * Plan 008 batch 3: the editor family speaks the vm TEXT contract — `value`
 * is the JSON body as a string (api.at has always been text-first). */
export async function fetchConfigSafe(
  moduleId: string,
): Promise<{ ok: true; value: string; meta: any } | { ok: false; error: string }> {
  try {
    const data = await fetchConfig(moduleId)
    return { ok: true, value: JSON.stringify(data.value), meta: data.meta }
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) }
  }
}

/** Fail-soft whole-body save (text contract — body is a JSON string). */
export async function putConfigSafe(
  moduleId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await putConfig(moduleId, typeof body === 'string' ? JSON.parse(body) : body)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) }
  }
}

/** Fail-soft provider-block delete (Plan 005 §1.2). */
export async function deleteBlockSafe(
  moduleId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deleteBlock(moduleId, name)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) }
  }
}

/** Enum URL from an optionsFrom descriptor ({kind, moduleId, which, provider}). */
export function enumUrlOf(optionsFrom: any): string {
  if (!optionsFrom) return ''
  return enumUrl(
    optionsFrom.kind,
    optionsFrom.moduleId ?? '',
    optionsFrom.which ?? '',
    optionsFrom.provider ?? '',
  )
}

// ── table column inference (was TableField) ────────────────────────────────

export interface TableInfo {
  cols: string[]
  /** per-column spec (select/number/text) */
  specs: Record<string, any>
  /** select columns' enum URLs (empty for non-select) */
  enumUrls: Record<string, string>
}

export function tableInfo(rows: any[], moduleId: string): TableInfo {
  const seen = new Set<string>()
  const cols: string[] = []
  for (const row of rows ?? []) {
    for (const k of Object.keys(row ?? {})) {
      if (!seen.has(k)) {
        seen.add(k)
        cols.push(k)
      }
    }
  }
  const specs: Record<string, any> = {}
  const enumUrls: Record<string, string> = {}
  for (const c of cols) {
    const sample = (rows ?? []).find((r) => c in r)?.[c]
    const spec = inferColumn(c, sample, moduleId)
    specs[c] = spec
    if (spec.optionsFrom) enumUrls[c] = enumUrlOf(spec.optionsFrom)
  }
  return { cols, specs, enumUrls }
}

/** Whole-replace one table cell (immutable row copy). */
export function setCell(rows: any[], i: number, col: string, val: any): any[] {
  return rows.map((r, idx) => (idx === i ? { ...r, [col]: val } : r))
}

/** A blank table row keyed by the given columns (dynamic-key object build). */
export function blankRow(cols: string[]): any {
  const row: any = {}
  for (const c of cols) row[c] = ''
  return row
}

/** Load the enum options for every select column of a table. */
export async function loadColumnOptions(enumUrls: Record<string, string>): Promise<Record<string, any[]>> {
  const out: Record<string, any[]> = {}
  for (const [col, url] of Object.entries(enumUrls ?? {})) {
    if (url) out[col] = await loadEnum(url)
  }
  return out
}

/** Add a provider-shaped child block to the body (Plan 005 §1.3 add path). */
export function addBlockBody(body: any, name: string): any {
  return { ...body, [name]: { kind: 'openai', base_url: '', api_key: '', models: [] } }
}

/** Delete-block confirm (browser confirm lives in TS). */
export function confirmDeleteBlock(name: string): boolean {
  return confirm(
    `Delete block "${name}"? It is removed from the file (original preserved in .bak).`,
  )
}

/** Key-presence check on the body (block-name collision). */
export function bodyHas(body: any, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body ?? {}, key)
}

/** Merge table column info with (async-loaded) enum options for the view. */
export function mergeCols(info: any, colOptions: Record<string, any[]>): any[] {
  return (info?.cols ?? []).map((name: string) => ({
    name,
    kind: info?.specs?.[name]?.kind ?? 'text',
    options: colOptions?.[name] ?? [],
  }))
}

/** Remove the i-th row (immutable). */
export function removeRowAt(rows: any[], i: number): any[] {
  return (rows ?? []).filter((_, idx) => idx !== i)
}

// ── Plan 007 flat surface (shared-store contract; the vm side lives in
//    auto/src/back/api.at — same names, text-first semantics). Stores consume
//    ONLY these; shapes are flat (no nested maps) and lists travel as text +
//    count + per-item getters so the same .at handlers run on both tracks. ──

export interface FlatResult {
  ok: boolean
  error: string
  text: string
}

function pickModule(m: any) {
  return {
    id: m.id ?? '',
    kind: m.kind ?? '',
    name: m.name ?? '',
    icon: m.icon ?? '',
    description: m.description ?? '',
    group: m.group ?? '',
    format: m.format ?? '',
  }
}

function groupLabels(list: any[]): string[] {
  const seen: string[] = []
  for (const m of list) {
    if (m.group && !seen.includes(m.group)) seen.push(m.group)
  }
  return seen
}

export async function fetchModulesRaw(): Promise<FlatResult> {
  try {
    const resp = await fetch('/api/modules')
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    return { ok: true, error: '', text: await resp.text() }
  } catch (e: any) {
    return { ok: false, error: `Failed to load modules: ${e.message || e}`, text: '' }
  }
}

export function modulesCount(text: string): number {
  return (JSON.parse(text) as any[]).length
}

export function moduleAt(text: string, i: number) {
  return pickModule((JSON.parse(text) as any[])[i])
}

export function groupCount(text: string): number {
  return groupLabels(JSON.parse(text)).length
}

export function groupAt(text: string, gi: number) {
  const label = groupLabels(JSON.parse(text))[gi] ?? ''
  return { id: label.toLowerCase().replace(/\s+/g, '-'), label }
}

export function groupMemberCount(text: string, gi: number): number {
  const label = groupLabels(JSON.parse(text))[gi] ?? ''
  return (JSON.parse(text) as any[]).filter((m) => m.group === label).length
}

export function groupMemberAt(text: string, gi: number, mi: number) {
  const label = groupLabels(JSON.parse(text))[gi] ?? ''
  return pickModule((JSON.parse(text) as any[]).filter((m) => m.group === label)[mi])
}

export function standaloneCount(text: string): number {
  return (JSON.parse(text) as any[]).filter((m) => !m.group).length
}

export function standaloneAt(text: string, si: number) {
  return pickModule((JSON.parse(text) as any[]).filter((m) => !m.group)[si])
}

export function selectInfo(text: string, id: string) {
  const m = (JSON.parse(text) as any[]).find((x) => x.id === id)
  if (!m) return { found: false, id: '', kind: '', name: '', read_only: false }
  return {
    found: true,
    id: m.id,
    kind: m.kind,
    name: m.name,
    read_only: m.format === 'frontmatter-md',
  }
}

export function groupOfModule(text: string, id: string): string {
  const list = JSON.parse(text) as any[]
  const m = list.find((x) => x.id === id)
  if (!m?.group) return ''
  return m.group.toLowerCase().replace(/\s+/g, '-')
}

export async function fetchCollectionListRaw(mid: string): Promise<FlatResult> {
  try {
    const resp = await fetch(`/api/collection/${mid}`)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    return { ok: true, error: '', text: await resp.text() }
  } catch (e: any) {
    return { ok: false, error: `Failed to load collection: ${e.message || e}`, text: '' }
  }
}

export function collectionCount(text: string): number {
  return (JSON.parse(text) as any[]).length
}

export function collectionAt(text: string, i: number) {
  const e = (JSON.parse(text) as any[])[i] ?? {}
  return { name: e.name ?? '', description: e.description ?? '' }
}

/** Flat entity fetch (vm contract; value is the raw body on both tracks). */
export async function fetchEntityFlat(mid: string, name: string) {
  const fail = { ok: false, error: 'Failed to load entity', is_atom: false, value: '' as any, sidecar: '', fm_name: '', fm_description: '', fm_body: '' }
  try {
    const resp = await fetch(`/api/collection/${mid}/${encodeURIComponent(name)}`)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    if (data.value !== undefined) {
      return { ok: true, error: '', is_atom: true, value: data.value, sidecar: data.sidecar || '', fm_name: '', fm_description: '', fm_body: '' }
    }
    return { ok: true, error: '', is_atom: false, value: '', sidecar: '', fm_name: data.name ?? '', fm_description: data.description ?? '', fm_body: data.body ?? '' }
  } catch (e: any) {
    return { ...fail, error: e.message || String(e) }
  }
}

// (Plan 008 batch 3: the 007-era object-contract twins entriesCount/entryAt/
// editField that lived here were superseded by the text-contract versions
// below — the ext widgets consuming the EntityEntry shape are retired.)

// The editor family is text-first, but pre-unification callers may still
// hand an object through (e.g. collection_store on vue receives
// fetchEntityFlat's object value) — accept both shapes everywhere below.
function asBodyObj(body: any): any {
  return typeof body === 'string' ? JSON.parse(body) : body
}

// ── Plan 008 batch 3: unified editor text contract (api.at twins) ──────────
// All of these take/return the body as a JSON STRING — the vm side has always
// been text-first; the vue editor family now speaks the same protocol.

/** vm contract twin (auto/src/back/api.at fieldDisplayOf). */
export function fieldDisplayOf(body: any, key: string): string {
  const v = asBodyObj(body)?.[key]
  return v == null ? '' : String(v)
}

/** vm contract twin (auto/src/back/api.at editTagField): add/remove one tag. */
export function editTagField(body: any, key: string, add: string, remove: string): string {
  const obj = asBodyObj(body)
  const arr: string[] = Array.isArray(obj?.[key]) ? [...obj[key]] : []
  const out = add && !arr.includes(add) ? [...arr, add] : remove ? arr.filter((t) => t !== remove) : arr
  return JSON.stringify({ ...obj, [key]: out })
}

/** vm contract twin (entriesCount): top-level key count. */
export function entriesCount(body: any): number {
  const obj = asBodyObj(body)
  return obj && typeof obj === 'object' ? Object.keys(obj).length : 0
}

function displayOfValue(v: unknown): string {
  if (v == null) return ''
  return typeof v === 'string' ? v : JSON.stringify(v)
}

function isObjectArrayVal(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0 && v.every((x) => x != null && typeof x === 'object')
}

/** vm contract twin (entryAt): flat descriptor of the i-th top-level field. */
export function entryAt(body: any, i: number, moduleId: string): any {
  const obj = asBodyObj(body)
  const key = Object.keys(obj)[i]
  const frag = obj[key]
  const spec = inferField(key, frag, moduleId, '')
  return {
    key,
    kind: spec.kind,
    label: spec.label,
    value: displayOfValue(frag),
    frag: JSON.stringify(frag),
    is_table: isObjectArrayVal(frag),
    url: enumUrlOf(spec.optionsFrom),
    depth: 0,
    is_on: displayOfValue(frag) === 'true',
    // 2026-08-27 像素对拍（与 api.at entryAt 孪生）：provider 形子表单（含
    // kind 键）带删除钮；顶层行容器类 = css-era .field-row。
    is_provider: spec.kind === 'subform' && frag != null && typeof frag === 'object' && !Array.isArray(frag) && 'kind' in frag,
    box_class: 'field-row',
    // vue-only extras: the still-unified CollectionBrowser (batch 4) consumes
    // the spec-bearing EntityEntry shape; `raw` keeps the original JS value.
    spec,
    raw: frag,
  }
}

/** vm contract twin (subCount): field count of a subform object fragment. */
export function subCount(frag: any): number {
  const obj = typeof frag === 'string' ? JSON.parse(frag) : frag
  return obj && typeof obj === 'object' && !Array.isArray(obj) ? Object.keys(obj).length : 0
}

/** vm contract twin (subAt): flat descriptor of a subform's j-th field;
 * `head` is the subform key and doubles as the provider context. */
export function subAt(body: any, head: string, j: number, moduleId: string): any {
  const sub = asBodyObj(body)?.[head] ?? {}
  const key = Object.keys(sub)[j]
  const frag = sub[key]
  const spec = inferField(key, frag, moduleId, head)
  // 2026-08-27 像素对拍（与 api.at subAt 孪生）：平铺行拼装 subform 盒——
  // first/last 标记决定补底边+下圆角。
  const total = Object.keys(sub).length
  let boxClass = 'subform-cont'
  if (j === 0) boxClass += ' first'
  if (j === total - 1) boxClass += ' last'
  return {
    key: `${head}.${key}`,
    kind: spec.kind,
    label: spec.label,
    value: displayOfValue(frag),
    frag: JSON.stringify(frag),
    is_table: isObjectArrayVal(frag),
    url: enumUrlOf(spec.optionsFrom),
    depth: 1,
    is_on: displayOfValue(frag) === 'true',
    box_class: boxClass,
  }
}

/** vm contract twin (editField): typed whole-replace at "a" or "a.b". */
export function editField(body: any, path: string, newVal: string): string {
  const obj = asBodyObj(body)
  const parts = path.split('.')
  const coerce = (old: unknown): unknown => {
    if (typeof old === 'boolean') return newVal === 'true'
    if (typeof old === 'number' && /^-?[0-9.]+$/.test(newVal)) return Number(newVal)
    return newVal
  }
  if (parts.length === 1) {
    obj[parts[0]] = coerce(obj[parts[0]])
  } else {
    obj[parts[0]] = { ...(obj[parts[0]] ?? {}), [parts[1]]: coerce(obj[parts[0]]?.[parts[1]]) }
  }
  return JSON.stringify(obj)
}

/** vm contract twin (addBlockText): insert an empty top-level block. */
export function addBlockText(body: any, name: string): string {
  const obj = asBodyObj(body)
  return JSON.stringify({ [name]: {}, ...obj })
}

/** vm contract twin (metaFile): the config file path from a fetch meta. */
export function metaFile(meta: any): string {
  return meta?.file ?? ''
}

/** vm contract twin (bodyHasText): does the top level contain `name`? */
export function bodyHasText(body: any, name: string): boolean {
  const obj = asBodyObj(body)
  return obj && typeof obj === 'object' ? Object.prototype.hasOwnProperty.call(obj, name) : false
}
