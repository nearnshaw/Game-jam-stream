import type ReactEcs from '@dcl/sdk/react-ecs'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'

type Mount = () => ReactEcs.JSX.Element | ReactEcs.JSX.Element[] | null

type Entry = { id: string; mount: Mount; priority: number }

type Registry = {
  patched: boolean
  installed: boolean
  hostRenderer: (() => ReactEcs.JSX.Element | ReactEcs.JSX.Element[] | null) | null
  mounts: Map<string, Entry>
  setUiRendererOriginal?: typeof ReactEcsRenderer.setUiRenderer
}

const KEY = '__dcl_ui_registry__'
const g = globalThis as any

// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
if (!g[KEY]) {
  g[KEY] = {
    patched: false,
    installed: false,
    hostRenderer: null,
    mounts: new Map<string, Entry>(),
    setUiRendererOriginal: undefined
  } satisfies Registry
}

const reg: Registry = g[KEY]

/** Composite render: host (if it exists) + all mounts ordered by priority */
function compositeRenderer(): Array<ReactEcs.JSX.Element | ReactEcs.JSX.Element[] | null> {
  const nodes: Array<ReactEcs.JSX.Element | ReactEcs.JSX.Element[] | null> = []
  if (reg.hostRenderer != null) {
    nodes.push(reg.hostRenderer())
  }
  const entries = [...reg.mounts.values()].sort((a, b) => a.priority - b.priority)
  for (const e of entries) {
    nodes.push(e.mount())
  }
  return nodes
}

/** Patches setUiRenderer to wrap the host’s renderer inside ours */
export function patchSetUiRendererOnce(): void {
  if (reg.patched) {
    return
  }
  reg.patched = true
  reg.setUiRendererOriginal = ReactEcsRenderer.setUiRenderer.bind(ReactEcsRenderer)

  ReactEcsRenderer.setUiRenderer = (hostRenderer: () => ReactEcs.JSX.Element | ReactEcs.JSX.Element[] | null): void => {
    reg.hostRenderer = hostRenderer
    // Call the original setUiRenderer with the composite renderer
    if (reg.setUiRendererOriginal != null) {
      reg.setUiRendererOriginal(compositeRenderer)
    }
    reg.installed = true
  }
}

/** Installs our renderer if the host never called setUiRenderer */
function ensureInstalledIfNoHost(): void {
  if (reg.installed) {
    return
  }
  // If no one has called it yet, we install the composite (it will only include our mounts)
  if (reg.setUiRendererOriginal == null) {
    // If we haven’t patched yet, we need to save the original first
    reg.setUiRendererOriginal = ReactEcsRenderer.setUiRenderer.bind(ReactEcsRenderer)
  }
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (reg.setUiRendererOriginal) {
    reg.setUiRendererOriginal(compositeRenderer)
  }
  reg.installed = true
}

/** Registers a mount. Uses priority (lower = rendered earlier, “further back”). */
export function registerMount(id: string, mount: Mount, priority = 100): void {
  patchSetUiRendererOnce()
  reg.mounts.set(id, { id, mount, priority })
  // If the host hasn’t installed anything, we make sure at least our renderer is set
  ensureInstalledIfNoHost()
}

/** Removes the mount by id */
export function unregisterMount(id: string): void {
  reg.mounts.delete(id)
}

/** Allows another part to check if there is already a host renderer plugged in (optional) */
export function hasHostRenderer(): boolean {
  return !(reg.hostRenderer == null)
}
