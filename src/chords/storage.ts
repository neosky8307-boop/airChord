import type { FingerVector } from '../hand/fingers'
import { DEFAULT_TEMPLATES, type Templates } from './definitions'

export const TEMPLATES_KEY = 'airchord.templates.v1'

type Reader = Pick<Storage, 'getItem'>
type Writer = Pick<Storage, 'setItem'>

function isVector(v: unknown): v is FingerVector {
  return Array.isArray(v) && v.length === 5 && v.every((n) => typeof n === 'number' && n >= 0 && n <= 1)
}

/** 저장된 템플릿을 기본값 위에 덮어 읽는다. 저장소가 없거나 깨진 데이터여도 기본값으로 동작한다. */
export function loadTemplates(storage: Reader | null): Templates {
  const result: Templates = { ...DEFAULT_TEMPLATES }
  try {
    const raw = storage?.getItem(TEMPLATES_KEY)
    if (!raw) return result
    const saved: unknown = JSON.parse(raw)
    if (typeof saved !== 'object' || saved === null) return result
    for (const id of Object.keys(DEFAULT_TEMPLATES)) {
      const v = (saved as Record<string, unknown>)[id]
      if (isVector(v)) result[id] = v
    }
  } catch {
    // 접근 불가 / 파싱 실패 → 기본값
  }
  return result
}

/** 기본값과 다른(사용자가 녹화한) 템플릿만 저장한다. 실패해도 앱은 계속 동작한다. */
export function saveTemplates(storage: Writer | null, templates: Templates): void {
  try {
    const custom: Templates = {}
    for (const [id, v] of Object.entries(templates)) {
      const def = DEFAULT_TEMPLATES[id]
      if (!def || v.some((n, i) => n !== def[i])) custom[id] = v
    }
    storage?.setItem(TEMPLATES_KEY, JSON.stringify(custom))
  } catch {
    // 용량 초과 / 비공개 모드 등
  }
}

export function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
