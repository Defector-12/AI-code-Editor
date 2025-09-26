<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  deployApp,
  getAppVoById,
  deleteAppByAdmin,
  deleteApp,
  downloadAppCode,
} from '@/api/appController.ts'
import { listAppChatHistory } from '@/api/chatHistoryController.ts'
import { message } from 'ant-design-vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { API_BASE_URL, getStaticPreviewUrl } from '@/env'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import AppInfoModal from '@/components/AppInfoModal.vue'
import {
  initVisualEditor,
  type SelectedElementInfo,
  type VisualEditorHandle,
} from '@/utils/iframeVisualEditor.ts'

const route = useRoute()
const router = useRouter()
const appIdStr = String(route.params.id || '')

const app = ref<API.AppVO | undefined>()
const loading = ref(false)
const deploying = ref(false)
const downloading = ref(false)
const deployedUrl = ref<string>('')
const showInfo = ref(false)

type MsgPiece = { type: 'text' | 'code'; content: string; lang?: string }
type ChatMsg = { role: 'user' | 'ai'; content: string; createTime?: string; pieces?: MsgPiece[] }
const messages = ref<ChatMsg[]>([])
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str: string, lang: string) {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      }
      return `<pre class="hljs"><code>${hljs.highlightAuto(str).value}</code></pre>`
    } catch {
      return `<pre class="hljs"><code>${str}</code></pre>`
    }
  },
})
const inputText = ref('')
const previewUrl = ref<string>('')
const codeStreamDone = ref(false)
const historyLoading = ref(false)
const historyHasMore = ref(false)
const historyCursor = ref<string | undefined>(undefined)
const totalHistory = ref(0)
const autoScroll = ref(true)
// 使用字符串承载雪花 ID，避免 Number 精度丢失

// 可视化编辑相关状态
const editingMode = ref(false)
const selectedInfo = ref<SelectedElementInfo | null>(null)
const iframeRef = ref<HTMLIFrameElement | null>(null)
const editorHandle = ref<VisualEditorHandle | null>(null)

const fetchApp = async () => {
  const res = await getAppVoById({ id: appIdStr as unknown as number })
  if (res.data.code === 0) {
    app.value = res.data.data
  }
}

const genDoneKey = `appGenDone:${appIdStr}`
const hasGenDone = () => localStorage.getItem(genDoneKey) === '1'
const markGenDone = () => localStorage.setItem(genDoneKey, '1')

onMounted(async () => {
  console.log('AppChatPage onMounted - 开始初始化')

  await fetchApp()
  console.log('应用信息获取完成:', app.value)

  await loadInitialHistory()
  console.log('历史记录加载完成:', {
    totalHistory: totalHistory.value,
    messagesLength: messages.value.length,
  })

  // 进入页面时：若历史记录达 2 条或以上，展示网站；否则根据本地标记也可展示
  const genDone = hasGenDone()
  console.log('检查生成状态:', {
    genDone,
    totalHistory: totalHistory.value,
    shouldShowPreview: genDone || totalHistory.value >= 2,
  })

  if (genDone || totalHistory.value >= 2) {
    codeStreamDone.value = true
    const codeType = (app.value?.codeGenType as string) || 'html'
    previewUrl.value = `${getStaticPreviewUrl(codeType, appIdStr)}?t=${Date.now()}`
    console.log('设置预览URL:', previewUrl.value)
  } else {
    // 如果有应用信息但没有历史记录，也允许编辑（临时解决方案）
    if (app.value && app.value.id) {
      console.log('无历史记录但应用存在，允许编辑')
      codeStreamDone.value = true
      const codeType = (app.value?.codeGenType as string) || 'html'
      previewUrl.value = `${getStaticPreviewUrl(codeType, appIdStr)}?t=${Date.now()}`
      console.log('设置预览URL (无历史):', previewUrl.value)
    }
  }

  console.log('最终状态:', {
    codeStreamDone: codeStreamDone.value,
    canEdit: canEdit.value,
    previewUrl: previewUrl.value,
  })

  // 自动发送初始消息：仅当自己的应用且没有对话历史
  if (messages.value.length === 0 && canEdit.value) {
    const init = app.value?.initPrompt || ''
    if (init) {
      console.log('发送初始提示:', init)
      inputText.value = init
      await doSend()
    }
  }
})

// 监听来自预览 iframe 的 postMessage（冗余兜底）
function onWindowMessage(ev: MessageEvent) {
  const data = ev?.data
  if (data && data.type === 'visual-editor:selected') {
    selectedInfo.value = data.payload || null
  }
}
window.addEventListener('message', onWindowMessage)

onBeforeUnmount(() => {
  try {
    window.removeEventListener('message', onWindowMessage)
  } catch {}
  if (editorHandle.value) {
    editorHandle.value.destroy()
    editorHandle.value = null
  }
})

const scrollRef = ref<HTMLDivElement | null>(null)
watch(messages, async () => {
  await nextTick()
  if (autoScroll.value && scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
})

// 监听预览URL变化，确保iframe及时更新
watch(previewUrl, (newUrl) => {
  console.log('预览URL发生变化:', newUrl)
  if (newUrl && iframeRef.value) {
    console.log('立即更新iframe src')
    iframeRef.value.src = newUrl
  }
})

const loginUserStore = useLoginUserStore()
const canEdit = computed(() => {
  const uid = app.value?.userId
  const me = loginUserStore.loginUser?.id
  const result = !!uid && !!me && uid === me
  console.log('canEdit computed:', {
    uid,
    me,
    result,
    app: app.value,
  })
  return result
})

async function doSend() {
  const text = inputText.value.trim()
  if (!text) return
  if (!canEdit.value) {
    message.warning('无法在别人的作品下对话哦~')
    return
  }
  const finalText = buildPromptWithSelection(text, selectedInfo.value)
  messages.value.push({ role: 'user', content: finalText })
  inputText.value = ''
  // SSE
  loading.value = true
  codeStreamDone.value = false
  autoScroll.value = true
  const aiMsgIndex = messages.value.push({ role: 'ai', content: '' }) - 1
  try {
    // 统一走环境变量域名
    const apiBase = (API_BASE_URL || '/api').replace(/\/$/, '')
    const url = `${apiBase}/app/chat/gen/code?appId=${encodeURIComponent(appIdStr)}&message=${encodeURIComponent(finalText)}`
    const es = new EventSource(url, { withCredentials: true })
    let streamClosed = false
    let hasBusinessError = false

    const closeStream = () => {
      if (!streamClosed) {
        es.close()
        streamClosed = true
      }
    }

    const handleBusinessErrorEvent = (event: MessageEvent) => {
      if (streamClosed) return
      hasBusinessError = true
      closeStream()

      let errorMessage = '生成过程中出现错误'
      try {
        const errorData = JSON.parse(event.data || '{}')
        console.error('SSE业务错误事件:', errorData)
        if (errorData?.message) {
          errorMessage = errorData.message
        }
      } catch (parseError) {
        console.error('解析业务错误事件失败:', parseError, '原始数据:', event.data)
      }

      if (messages.value[aiMsgIndex]) {
        messages.value[aiMsgIndex].content = `❌ ${errorMessage}`
        messages.value[aiMsgIndex].pieces = [{ type: 'text', content: `❌ ${errorMessage}` }]
      }

      loading.value = false
      codeStreamDone.value = true
      message.error(errorMessage)
    }

    es.addEventListener('business-error', handleBusinessErrorEvent)
    es.addEventListener('done', () => {
      if (streamClosed || hasBusinessError) return
      console.log('SSE done事件收到，关闭连接')
      closeStream()
      finalizeAfterStream(aiMsgIndex)
    })

    es.onmessage = (ev) => {
      if (streamClosed || hasBusinessError) return
      // 处理多种结尾标识
      const data = ev.data
      console.log('SSE 收到数据:', data)

      if (data === '[DONE]' || data === 'DONE' || data === 'end') {
        console.log('SSE 结束标识收到，关闭连接')
        closeStream()
        finalizeAfterStream(aiMsgIndex)
        return
      }

      // 某些后端以 JSON 包裹内容，尝试解包常见字段
      let chunk = data
      try {
        const obj = JSON.parse(data)
        if (typeof obj === 'string') chunk = obj
        else if (typeof obj?.d === 'string') chunk = obj.d
        else if (typeof obj?.data === 'string') chunk = obj.data
        else if (typeof obj?.content === 'string') chunk = obj.content
        else if (typeof obj?.text === 'string') chunk = obj.text
        else {
          console.log('JSON解析成功但未找到文本字段:', obj)
        }
      } catch {
        // 非 JSON，直接使用
        console.log('非JSON格式，直接使用:', data)
      }

      if (chunk && chunk.trim()) {
        console.log('追加chunk到消息:', chunk)
        messages.value[aiMsgIndex].content += chunk
      }
    }
    es.onerror = (error) => {
      if (streamClosed) return
      console.error('SSE 连接错误:', error)
      console.log('当前消息内容长度:', messages.value[aiMsgIndex]?.content?.length || 0)
      closeStream()
      if (!hasBusinessError) {
        finalizeAfterStream(aiMsgIndex)
      }
    }
    // 发送后按要求退出编辑模式并清理选择
    clearSelection()
    if (editorHandle.value) {
      editorHandle.value.disable()
    }
    editingMode.value = false
  } catch {
    loading.value = false
  }
}

function finalizeAfterStream(aiMsgIndex: number) {
  loading.value = false
  codeStreamDone.value = true
  // 解析 AI 文本为可读片段（文本 + 代码块）
  const full = messages.value[aiMsgIndex]?.content || ''
  console.log('AI 响应内容:', full)

  // 确保内容被正确解析和显示
  if (full.trim()) {
    messages.value[aiMsgIndex].pieces = buildPiecesFromContent(full)
    console.log('解析后的pieces:', messages.value[aiMsgIndex].pieces)
  }

  // 标记当前应用已完成一次生成，防止刷新后再次自动触发
  markGenDone()

  // 刷新应用信息以拿到最新 codeGenType / 目录
  fetchApp().then(() => {
    const codeType = (app.value?.codeGenType as string) || 'html'
    // 加时间戳防缓存，确保预览更新
    const timestamp = Date.now()
    const newPreviewUrl = `${getStaticPreviewUrl(codeType, appIdStr)}?t=${timestamp}`
    console.log('更新预览URL:', newPreviewUrl)
    previewUrl.value = newPreviewUrl

    // 强制刷新iframe以显示最新内容
    if (iframeRef.value) {
      console.log('强制刷新iframe')
      // 延迟一点确保后端文件已生成
      setTimeout(() => {
        if (iframeRef.value) {
          iframeRef.value.src = newPreviewUrl
        }
      }, 500)
    }
  })
}

function buildPiecesFromContent(content: string): MsgPiece[] {
  const pieces: MsgPiece[] = []

  // 如果内容为空，返回空数组
  if (!content || !content.trim()) {
    console.log('内容为空，返回空pieces')
    return pieces
  }

  // 先按 Markdown 代码块切分
  const regex = /```(\w+)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(content))) {
    const [block, lang, code] = match
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim()
      if (textContent) {
        pieces.push({ type: 'text', content: textContent })
      }
    }
    pieces.push({ type: 'code', content: code, lang: lang || undefined })
    lastIndex = match.index + block.length
  }
  if (lastIndex < content.length) {
    const remainingContent = content.slice(lastIndex).trim()
    if (remainingContent) {
      pieces.push({ type: 'text', content: remainingContent })
    }
  }

  // 如果没有 Markdown 代码块，但内容包含完整 HTML，则整体当代码展示
  if (pieces.length === 1 && pieces[0].type === 'text') {
    const t = pieces[0].content
    if (/(<!DOCTYPE|<html[\s>]|<head[\s>]|<body[\s>])/i.test(t) && /<\/html>/i.test(t)) {
      return [{ type: 'code', content: t, lang: 'html' }]
    }
  }

  // 如果没有找到任何pieces，但有内容，则作为普通文本处理
  if (pieces.length === 0 && content.trim()) {
    console.log('未找到代码块，作为普通文本处理')
    pieces.push({ type: 'text', content: content.trim() })
  }

  console.log('buildPiecesFromContent 结果:', {
    originalContent: content,
    piecesCount: pieces.length,
    pieces: pieces.map((p) => ({ type: p.type, contentLength: p.content?.length || 0 })),
  })

  return pieces
}

function toChatMsg(h: API.ChatHistory): ChatMsg {
  const type = (h.messageType || '').toLowerCase()
  const role: 'user' | 'ai' = type.includes('user') ? 'user' : 'ai'
  return { role, content: h.message || '', createTime: h.createTime }
}

function sortAscByTime(arr: ChatMsg[]) {
  return arr.sort((a, b) => {
    const ta = new Date(a.createTime || 0).getTime()
    const tb = new Date(b.createTime || 0).getTime()
    return ta - tb
  })
}

async function loadInitialHistory() {
  historyLoading.value = true
  autoScroll.value = false
  try {
    const res = await listAppChatHistory({ appId: appIdStr as unknown as number })
    if (res.data.code === 0) {
      const page = res.data.data
      totalHistory.value = page?.totalRow || 0
      const list = (page?.records || []).map(toChatMsg)
      const asc = sortAscByTime(list)
      messages.value = asc
      historyHasMore.value = (page?.totalRow || 0) > (page?.records?.length || 0)
      historyCursor.value = asc[0]?.createTime
    }
  } catch (error) {
    console.error('loadInitialHistory error:', error)
  } finally {
    historyLoading.value = false
  }
}

async function loadMoreHistory() {
  if (historyLoading.value || !historyHasMore.value) return
  historyLoading.value = true
  autoScroll.value = false
  try {
    const res = await listAppChatHistory({
      appId: appIdStr as unknown as number,
      lastCreateTime: historyCursor.value || undefined,
    })
    if (res.data.code === 0) {
      const page = res.data.data
      const list = (page?.records || []).map(toChatMsg)
      const asc = sortAscByTime(list)
      if (asc.length === 0) {
        historyHasMore.value = false
        return
      }
      messages.value = [...asc, ...messages.value]
      historyHasMore.value = (page?.records?.length || 0) >= 10
      historyCursor.value = asc[0]?.createTime
    }
  } finally {
    historyLoading.value = false
  }
}

async function doDeploy() {
  deploying.value = true
  try {
    const res = await deployApp({ appId: appIdStr as unknown as number })
    if (res.data.code === 0) {
      deployedUrl.value = res.data.data || ''
      if (deployedUrl.value) {
        message.success('部署成功')
      }
    } else {
      message.error('部署失败：' + res.data.message)
    }
  } finally {
    deploying.value = false
  }
}

async function doDownload() {
  downloading.value = true
  try {
    const res = await downloadAppCode(
      { appId: appIdStr as unknown as number },
      { responseType: 'blob' },
    )
    const blob: Blob = res.data as Blob
    // 解析文件名
    const disposition =
      (res.headers && (res.headers['content-disposition'] || res.headers['Content-Disposition'])) ||
      ''
    let fileName = `app_${appIdStr}.zip`
    if (disposition) {
      const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition)
      if (match && match[1]) {
        try {
          fileName = decodeURIComponent(match[1].replace(/"/g, ''))
        } catch {
          fileName = match[1].replace(/"/g, '')
        }
        if (!/\.zip$/i.test(fileName)) {
          fileName = `${fileName}.zip`
        }
      }
    }
    const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/zip' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch {
    message.error('下载失败')
  } finally {
    downloading.value = false
  }
}

const canManage = computed(() => {
  const isOwner = canEdit.value
  const isAdmin = loginUserStore.loginUser?.userRole === 'admin'
  return isOwner || isAdmin
})

async function doDeleteApp() {
  if (!app.value?.id) return
  const id = app.value.id
  const isAdmin = loginUserStore.loginUser?.userRole === 'admin'
  const res = isAdmin ? await deleteAppByAdmin({ id }) : await deleteApp({ id })
  if (res.data.code === 0) {
    message.success('删除成功')
    showInfo.value = false
    router.push('/')
  } else {
    message.error('删除失败：' + res.data.message)
  }
}

// 预览 iframe 加载完成时，初始化可视化编辑桥接
function onIframeLoad() {
  console.log('iframe onLoad triggered', {
    iframeRef: iframeRef.value,
    previewUrl: previewUrl.value,
    editingMode: editingMode.value,
  })

  if (!iframeRef.value) {
    console.log('iframeRef 不存在，无法初始化编辑器')
    return
  }

  // 检查iframe是否成功加载内容
  try {
    const iframeWindow = iframeRef.value.contentWindow
    const iframeDocument = iframeWindow?.document

    console.log('iframe 内容检查:', {
      contentWindow: iframeWindow,
      document: iframeDocument,
      readyState: iframeDocument?.readyState,
      location: iframeWindow?.location?.href,
    })

    if (!iframeWindow || !iframeDocument) {
      console.error('无法访问 iframe 内容，可能存在跨域问题')
      return
    }
  } catch (error) {
    console.error('访问 iframe 内容时出错:', error)
    return
  }

  // 销毁旧的（如果有）
  if (editorHandle.value) {
    try {
      editorHandle.value.destroy()
    } catch (error) {
      console.error('销毁旧编辑器时出错:', error)
    }
    editorHandle.value = null
  }

  try {
    editorHandle.value = initVisualEditor({
      iframe: iframeRef.value,
      onSelectedChange: (info) => {
        console.log('选中元素变化:', info)
        selectedInfo.value = info
      },
      highlightColors: { hover: '#1677ff', active: '#fa541c' },
    })

    console.log('Visual editor initialized successfully:', editorHandle.value)

    if (editingMode.value && editorHandle.value) {
      console.log('启用编辑模式')
      editorHandle.value.enable()
    } else if (editorHandle.value) {
      console.log('禁用编辑模式')
      editorHandle.value.disable()
    }
  } catch (error) {
    console.error('初始化可视化编辑器时出错:', error)
  }
}

// 根据编辑模式切换启用/禁用
watch(editingMode, (val) => {
  console.log('editingMode watcher triggered:', {
    val,
    editorHandle: editorHandle.value,
  })

  if (!editorHandle.value) {
    console.log('editorHandle 不存在，无法切换编辑模式')
    return
  }

  if (val) {
    console.log('通过 watcher 启用编辑模式')
    editorHandle.value.enable()
  } else {
    console.log('通过 watcher 禁用编辑模式')
    editorHandle.value.disable()
  }
})

function clearSelection() {
  selectedInfo.value = null
  if (editorHandle.value) {
    editorHandle.value.clearSelection()
  }
}

function toggleEditingMode() {
  console.log('toggleEditingMode called', {
    canEdit: canEdit.value,
    codeStreamDone: codeStreamDone.value,
    editingMode: editingMode.value,
    previewUrl: previewUrl.value,
    app: app.value,
    editorHandle: editorHandle.value,
  })

  if (!canEdit.value || !codeStreamDone.value) {
    console.log('编辑模式被阻止:', {
      canEdit: canEdit.value,
      codeStreamDone: codeStreamDone.value,
    })
    return
  }

  editingMode.value = !editingMode.value
  console.log('编辑模式切换为:', editingMode.value)
}

function buildPromptWithSelection(text: string, info: SelectedElementInfo | null): string {
  if (!info) return text
  const lines: string[] = []
  lines.push('')
  lines.push('[所选网页元素]')
  lines.push(`selector: ${info.selector}`)
  lines.push(`tagName: ${info.tagName}`)
  if (info.id) lines.push(`id: ${info.id}`)
  if (info.className) lines.push(`class: ${info.className}`)
  if (info.textSample) lines.push(`text: ${info.textSample}`)
  return text + '\n' + lines.join('\n')
}

// iframe错误处理
function onIframeError(event: Event) {
  console.error('iframe 加载错误:', event)
  console.log('当前预览URL:', previewUrl.value)

  // 错误时尝试重新加载
  setTimeout(() => {
    if (iframeRef.value && previewUrl.value) {
      console.log('重试加载iframe:', previewUrl.value)
      iframeRef.value.src = previewUrl.value
    }
  }, 1000)
}
</script>

<template>
  <div class="chat-page">
    <div class="header">
      <div class="app-name">{{ app?.appName || '应用对话' }}</div>
      <div class="actions">
        <a-tooltip
          :title="
            !canEdit
              ? '只有应用的创建者才能编辑'
              : !codeStreamDone
                ? '请先生成或加载代码后再使用编辑功能'
                : ''
          "
        >
          <a-button
            style="margin-right: 8px"
            :disabled="!canEdit || !codeStreamDone"
            @click="toggleEditingMode"
          >
            {{ editingMode ? '退出编辑' : '编辑模式' }}
          </a-button>
        </a-tooltip>
        <a-button @click="showInfo = true">应用详情</a-button>
        <a-button :loading="downloading" @click="doDownload" style="margin-right: 8px"
          >下载代码</a-button
        >
        <a-button type="primary" :loading="deploying" @click="doDeploy">部署</a-button>
        <a v-if="deployedUrl" :href="deployedUrl" target="_blank">访问部署地址</a>
      </div>
    </div>
    <div class="content">
      <div class="left" :class="{ disabled: !canEdit }">
        <div class="messages" ref="scrollRef">
          <div class="load-more" v-if="historyHasMore">
            <a-button type="link" size="small" :loading="historyLoading" @click="loadMoreHistory"
              >加载更多</a-button
            >
          </div>
          <div v-for="(m, idx) in messages" :key="idx" class="msg" :class="m.role">
            <template v-if="m.role === 'ai'">
              <div class="bubble rich">
                <template v-if="m.pieces && m.pieces.length">
                  <template v-for="(p, i) in m.pieces" :key="i">
                    <div v-if="p.type === 'text'" class="text" v-html="md.render(p.content)"></div>
                    <div
                      v-else
                      v-html="md.render('```' + (p.lang || '') + '\n' + p.content + '\n```')"
                    ></div>
                  </template>
                </template>
                <template v-else>
                  <div v-html="md.render(m.content)"></div>
                </template>
              </div>
            </template>
            <template v-else>
              <div class="bubble">{{ m.content }}</div>
            </template>
          </div>
        </div>
        <!-- 选中元素信息 Alert（移动到输入框上方） -->
        <div v-if="selectedInfo" class="selection-alert">
          <a-alert
            type="info"
            :message="`已选择元素：${selectedInfo.tagName}${selectedInfo.id ? '#' + selectedInfo.id : ''}${selectedInfo.className ? '.' + String(selectedInfo.className).split(' ').filter(Boolean).join('.') : ''}`"
            :description="
              selectedInfo.textSample
                ? `文本：${selectedInfo.textSample}`
                : `选择器：${selectedInfo.selector}`
            "
            show-icon
            closable
            @close="clearSelection"
          />
        </div>
        <div class="input">
          <a-tooltip :title="!canEdit ? '无法在别人的作品下对话哦~' : ''">
            <a-textarea
              v-model:value="inputText"
              :rows="3"
              :disabled="!canEdit"
              placeholder="请描述你想生成的网站，越详细效果越好哦"
            />
          </a-tooltip>
          <div class="send">
            <a-button type="primary" :disabled="!canEdit" :loading="loading" @click="doSend"
              >发送</a-button
            >
          </div>
        </div>
      </div>
      <div class="right">
        <div v-if="codeStreamDone" class="preview">
          <iframe
            :src="previewUrl"
            frameborder="0"
            ref="iframeRef"
            @load="onIframeLoad"
            @error="onIframeError"
          />
        </div>
        <a-empty v-else description="聊天生成完成或历史达到 2 条后展示预览" />
      </div>
    </div>
  </div>

  <AppInfoModal
    v-model:open="showInfo"
    :app="app"
    :can-manage="canManage"
    @edit="(id) => router.push(`/app/${id}/edit`)"
    @delete="doDeleteApp"
  />
</template>

<style scoped>
.chat-page {
  width: 100%;
  overflow-x: hidden;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0 12px;
}
.app-name {
  font-weight: 600;
  font-size: 18px;
}
.content {
  display: grid;
  grid-template-columns: 520px 1fr;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  height: 100%;
}
.left {
  background: #fff;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  width: 520px;
  flex-shrink: 0;
}
.messages {
  flex: 1;
  overflow: auto;
  overflow-x: hidden;
  padding: 8px;
  min-height: 0;
  max-height: unset;
}
.load-more {
  text-align: center;
  margin-bottom: 8px;
}
.msg {
  display: flex;
  margin-bottom: 8px;
}
.msg.user {
  justify-content: flex-end;
}
.bubble {
  background: #f5f5f5;
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 70%;
}
.bubble.rich {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.bubble.rich img {
  max-width: 100%;
  height: auto;
}
.bubble.rich table {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}
.bubble.rich * {
  box-sizing: border-box;
}
.bubble.rich .text {
  white-space: pre-wrap;
}
.bubble.rich pre.code {
  white-space: pre;
  word-break: normal;
  overflow-x: auto;
  background: #f6f8fa;
  border: 1px solid #f0f0f0;
  padding: 12px;
  border-radius: 8px;
  max-width: 100%;
}
.bubble.rich pre.code code {
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
}
/* highlight.js 基础样式微调 */
.hljs {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  max-width: 100%;
  white-space: pre;
}
.msg.user .bubble {
  background: #1677ff;
  color: #fff;
}
.input {
  margin-top: 8px;
  flex-shrink: 0;
}
.send {
  text-align: right;
  margin-top: 8px;
}
.right {
  background: #fff;
  border-radius: 8px;
  padding: 8px 12px;
  overflow: hidden;
  height: 100%;
  min-height: 0;
  max-height: 100%;
}
.preview {
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-height: 0;
}
.preview iframe {
  width: 100%;
  height: 100%;
  border: none;
}
.selection-alert {
  margin: 8px 8px 0;
}
@media (max-width: 1024px) {
  .content {
    grid-template-columns: 1fr;
  }
  .left {
    width: 100%;
  }
}
</style>
