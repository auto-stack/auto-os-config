// Fetching convention-enum options from the daemon.
//
// Options are cached per source for the session — they change rarely and the
// editor re-fetches nothing while typing.

import { ref, type Ref } from 'vue'
import type { EnumSource } from './types'

interface EnumOption {
  value: string
  label: string
}

const cache = new Map<string, EnumOption[]>()
const pending = new Map<string, Promise<EnumOption[]>>()

function urlFor(src: EnumSource): string {
  switch (src.kind) {
    case 'tiers':
      return '/api/enums/tiers'
    case 'dir':
      return `/api/enums/dir/${src.which}`
    case 'self-providers':
      return `/api/enums/self/${src.moduleId}/providers`
    case 'self-models':
      return `/api/enums/self/${src.moduleId}/models/${encodeURIComponent(src.provider)}`
  }
}

function keyFor(src: EnumSource): string {
  return urlFor(src)
}

/** Load options for a source, deduplicating concurrent requests + caching. */
export function loadEnum(src: EnumSource): Promise<EnumOption[]> {
  const k = keyFor(src)
  const hit = cache.get(k)
  if (hit) return Promise.resolve(hit)
  const inflight = pending.get(k)
  if (inflight) return inflight
  const p = fetch(urlFor(src))
    .then((r) => (r.ok ? r.json() : []))
    .then((opts: EnumOption[]) => {
      cache.set(k, opts)
      pending.delete(k)
      return opts
    })
    .catch(() => {
      pending.delete(k)
      return []
    })
  pending.set(k, p)
  return p
}

/** Reactive wrapper: a ref that fills with options once loaded. */
export function useEnum(src: Ref<EnumSource | null>): Ref<EnumOption[]> {
  const options = ref<EnumOption[]>([])
  async function refresh() {
    if (src.value) options.value = await loadEnum(src.value)
    else options.value = []
  }
  refresh()
  return options
}
