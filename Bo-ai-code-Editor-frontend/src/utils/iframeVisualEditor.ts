// 该模块封装 iframe 内部的可视化编辑逻辑（hover/点击高亮）与主页面的通信。
// 主页面与预览页同域，可直接注入脚本并访问 iframe.contentWindow / document。

export type SelectedElementInfo = {
  selector: string
  tagName: string
  id?: string
  className?: string
  textSample?: string
}

export type VisualEditorInitOptions = {
  iframe: HTMLIFrameElement
  onSelectedChange?: (info: SelectedElementInfo | null) => void
  highlightColors?: {
    hover: string
    active: string
  }
}

const BRIDGE_FLAG = '__visual_editor_injected__'
const LISTENER_FLAG = '__visual_editor_listeners__'

export type VisualEditorHandle = {
  enable: () => void
  disable: () => void
  clearSelection: () => void
  destroy: () => void
}

function buildUniqueSelector(el: Element): string {
  // 简易选择器：优先 id，其次 class/tag 组合，回退到层级路径
  if (!el) return ''
  const id = (el as HTMLElement).id
  if (id) return `#${CSS.escape(id)}`
  const className = (el as HTMLElement).className
  const tag = el.tagName.toLowerCase()
  if (typeof className === 'string' && className.trim()) {
    const cls = className
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((c) => `.${CSS.escape(c)}`)
      .join('')
    return `${tag}${cls}`
  }
  // 层级路径（限制深度，避免过长）
  const parts: string[] = []
  let cur: Element | null = el
  let depth = 0
  while (cur && depth < 5) {
    const name = cur.tagName ? cur.tagName.toLowerCase() : 'el'
    let seg = name
    const sibIdx = getElementIndexAmongSameTag(cur)
    if (sibIdx > 1) seg += `:nth-of-type(${sibIdx})`
    parts.unshift(seg)
    cur = cur.parentElement
    depth++
  }
  return parts.join(' > ')
}

function getElementIndexAmongSameTag(el: Element): number {
  if (!el.parentElement) return 1
  const tag = el.tagName
  let idx = 0
  for (const child of Array.from(el.parentElement.children)) {
    if ((child as Element).tagName === tag) {
      idx++
    }
    if (child === el) return idx
  }
  return 1
}

function getTextSample(el: Element): string | undefined {
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ')
  if (!text) return undefined
  return text.length > 60 ? text.slice(0, 57) + '...' : text
}

export function initVisualEditor(options: VisualEditorInitOptions): VisualEditorHandle {
  console.log('initVisualEditor called', { options })
  const { iframe, onSelectedChange, highlightColors } = options
  const hoverColor = highlightColors?.hover || '#1677ff'
  const activeColor = highlightColors?.active || '#fa4b2a'

  const win = iframe.contentWindow as Window | null
  console.log('iframe window:', win)
  if (!win) {
    console.log('No iframe window found, returning empty handle')
    return {
      enable: () => {},
      disable: () => {},
      clearSelection: () => {},
      destroy: () => {},
    }
  }
  const doc = win.document
  console.log('iframe document:', doc)

  // 创建悬浮与选中覆盖层（outline）
  const hoverOutline = doc.createElement('div')
  const activeOutline = doc.createElement('div')
  for (const el of [hoverOutline, activeOutline]) {
    el.style.position = 'absolute'
    el.style.pointerEvents = 'none'
    el.style.zIndex = '2147483647'
    el.style.border = '2px dashed transparent'
    el.style.borderRadius = '2px'
    el.style.boxSizing = 'border-box'
    el.style.display = 'none'
  }
  hoverOutline.style.borderColor = hoverColor
  activeOutline.style.border = `2px solid ${activeColor}`

  function ensureOverlayContainer() {
    if (!doc.body) return
    if (!doc.body.contains(hoverOutline)) doc.body.appendChild(hoverOutline)
    if (!doc.body.contains(activeOutline)) doc.body.appendChild(activeOutline)
  }

  // 根据目标元素更新覆盖层位置
  function placeOutlineFor(el: Element | null, outline: HTMLDivElement) {
    if (!el || !doc.body) {
      outline.style.display = 'none'
      return
    }
    const rect = (el as HTMLElement).getBoundingClientRect()
    const scrollX = win?.scrollX || doc.documentElement.scrollLeft || doc.body.scrollLeft || 0
    const scrollY = win?.scrollY || doc.documentElement.scrollTop || doc.body.scrollTop || 0
    outline.style.left = rect.left + scrollX + 'px'
    outline.style.top = rect.top + scrollY + 'px'
    outline.style.width = rect.width + 'px'
    outline.style.height = rect.height + 'px'
    outline.style.display = 'block'
  }

  let enabled = false
  let selectedEl: Element | null = null

  function computeSelectedInfo(el: Element | null): SelectedElementInfo | null {
    if (!el) return null
    const info: SelectedElementInfo = {
      selector: buildUniqueSelector(el),
      tagName: el.tagName.toLowerCase(),
      id: (el as HTMLElement).id || undefined,
      className: (el as HTMLElement).className || undefined,
      textSample: getTextSample(el),
    }
    return info
  }

  function postSelected(info: SelectedElementInfo | null) {
    try {
      win?.parent.postMessage(
        {
          type: 'visual-editor:selected',
          payload: info,
        },
        '*',
      )
    } catch {}
    onSelectedChange && onSelectedChange(info)
  }

  function onMouseMove(e: MouseEvent) {
    if (!enabled) return
    const target = e.target as Element | null
    if (!target) return
    if (selectedEl && target === selectedEl) {
      // 悬浮在选中元素上时，仅显示 activeOutline
      hoverOutline.style.display = 'none'
      placeOutlineFor(selectedEl, activeOutline)
      return
    }
    placeOutlineFor(target, hoverOutline)
  }

  function onClick(e: MouseEvent) {
    if (!enabled) return
    e.preventDefault()
    e.stopPropagation()
    const target = e.target as Element | null
    if (!target) return
    selectedEl = target
    placeOutlineFor(selectedEl, activeOutline)
    hoverOutline.style.display = 'none'
    postSelected(computeSelectedInfo(selectedEl))
  }

  function onScrollOrResize() {
    if (!enabled) return
    ensureOverlayContainer()
    if (selectedEl) placeOutlineFor(selectedEl, activeOutline)
  }

  function enable() {
    console.log('Visual editor enable called', { enabled, win, doc })
    if (enabled) return
    enabled = true
    ensureOverlayContainer()
    doc.addEventListener('mousemove', onMouseMove, true)
    doc.addEventListener('click', onClick, true)
    win?.addEventListener('scroll', onScrollOrResize, true)
    win?.addEventListener('resize', onScrollOrResize, true)
    ;(win as any)[LISTENER_FLAG] = true
    console.log('Visual editor enabled successfully')
  }

  function disable() {
    console.log('Visual editor disable called', { enabled })
    if (!enabled) return
    enabled = false
    doc.removeEventListener('mousemove', onMouseMove, true)
    doc.removeEventListener('click', onClick, true)
    win?.removeEventListener('scroll', onScrollOrResize, true)
    win?.removeEventListener('resize', onScrollOrResize, true)
    hoverOutline.style.display = 'none'
    activeOutline.style.display = 'none'
    console.log('Visual editor disabled successfully')
  }

  function clearSelection() {
    selectedEl = null
    activeOutline.style.display = 'none'
    postSelected(null)
  }

  function destroy() {
    disable()
    try {
      hoverOutline.remove()
      activeOutline.remove()
    } catch {}
  }

  // 防止重复注入（同一 iframe 生命周期内）
  if (!(win as any)[BRIDGE_FLAG]) {
    ;(win as any)[BRIDGE_FLAG] = true
    // 无需额外脚本注入，直接使用覆盖层与事件委托
  }

  return { enable, disable, clearSelection, destroy }
}
