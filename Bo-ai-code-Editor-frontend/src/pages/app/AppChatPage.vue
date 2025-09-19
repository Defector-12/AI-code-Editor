<script setup lang="ts">
import { onMounted, reactive, ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { chatToGenCsode, deployApp, getAppVoById } from '@/api/appController.ts'
import myAxios from '@/request'
import { message } from 'ant-design-vue'

const route = useRoute()
const appIdStr = String(route.params.id || '')

const app = ref<API.AppVO | undefined>()
const loading = ref(false)
const deploying = ref(false)
const deployedUrl = ref<string>('')

type MsgPiece = { type: 'text' | 'code'; content: string; lang?: string }
type ChatMsg = { role: 'user' | 'ai'; content: string; pieces?: MsgPiece[] }
const messages = ref<ChatMsg[]>([])
const inputText = ref('')
const previewUrl = ref<string>('')
const codeStreamDone = ref(false)

const fetchApp = async () => {
  const res = await getAppVoById({ id: appIdStr as any })
  if (res.data.code === 0) {
    app.value = res.data.data
  }
}

onMounted(async () => {
  await fetchApp()
  // 自动发送初始提示词
  const init = (route.query.init as string) || app.value?.initPrompt || ''
  if (init) {
    inputText.value = decodeURIComponent(init)
    await doSend()
  }
})

const scrollRef = ref<HTMLDivElement | null>(null)
watch(messages, async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
})

async function doSend() {
  const text = inputText.value.trim()
  if (!text) return
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  // SSE
  loading.value = true
  codeStreamDone.value = false
  let aiMsgIndex = messages.value.push({ role: 'ai', content: '' }) - 1
  try {
    // 统一走同源 '/api'，保证 Cookie 携带
    const apiBase = (myAxios as any).defaults.baseURL?.replace(/\/$/, '') || '/api'
    const url = `${apiBase}/app/chat/gen/code?appId=${encodeURIComponent(appIdStr)}&message=${encodeURIComponent(
      text,
    )}`
    const es = new EventSource(url, { withCredentials: true })
    es.onmessage = (ev) => {
      // 处理多种结尾标识
      const data = ev.data
      if (data === '[DONE]' || data === 'DONE' || data === 'end') {
        es.close()
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
      } catch (_) {
        // 非 JSON，直接使用
      }
      messages.value[aiMsgIndex].content += chunk
    }
    es.onerror = () => {
      es.close()
      finalizeAfterStream(aiMsgIndex)
    }
  } catch (e) {
    loading.value = false
  }
}

function finalizeAfterStream(aiMsgIndex: number) {
  loading.value = false
  codeStreamDone.value = true
  // 解析 AI 文本为可读片段（文本 + 代码块）
  const full = messages.value[aiMsgIndex]?.content || ''
  messages.value[aiMsgIndex].pieces = buildPiecesFromContent(full)
  // 刷新应用信息以拿到最新 codeGenType / 目录
  fetchApp().then(() => {
    const prefix = `/api/static/${app.value?.codeGenType ?? 'vite'}_${appIdStr}/`
    // 加时间戳防缓存
    previewUrl.value = `${prefix}?t=${Date.now()}`
  })
}

function buildPiecesFromContent(content: string): MsgPiece[] {
  const pieces: MsgPiece[] = []
  // 先按 Markdown 代码块切分
  const regex = /```(\w+)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(content))) {
    const [block, lang, code] = match
    if (match.index > lastIndex) {
      pieces.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    pieces.push({ type: 'code', content: code, lang: lang || undefined })
    lastIndex = match.index + block.length
  }
  if (lastIndex < content.length) {
    pieces.push({ type: 'text', content: content.slice(lastIndex) })
  }
  // 如果没有 Markdown 代码块，但内容包含完整 HTML，则整体当代码展示
  const joined = pieces
    .map((p) => (p.type === 'code' ? p.content : ''))
    .join('')
    .trim()
  if (pieces.length === 1 && pieces[0].type === 'text') {
    const t = pieces[0].content
    if (/(<!DOCTYPE|<html[\s>]|<head[\s>]|<body[\s>])/i.test(t) && /<\/html>/i.test(t)) {
      return [{ type: 'code', content: t, lang: 'html' }]
    }
  }
  return pieces
}

async function doDeploy() {
  deploying.value = true
  try {
    const res = await deployApp({ appId: appIdStr as any })
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
</script>

<template>
  <div class="chat-page">
    <div class="header">
      <div class="app-name">{{ app?.appName || '应用对话' }}</div>
      <div class="actions">
        <a-button type="primary" :loading="deploying" @click="doDeploy">部署</a-button>
        <a v-if="deployedUrl" :href="deployedUrl" target="_blank">访问部署地址</a>
      </div>
    </div>
    <div class="content">
      <div class="left">
        <div class="messages" ref="scrollRef">
          <div v-for="(m, idx) in messages" :key="idx" class="msg" :class="m.role">
            <template v-if="m.role === 'ai' && m.pieces && m.pieces.length">
              <div class="bubble rich">
                <template v-for="(p, i) in m.pieces" :key="i">
                  <div v-if="p.type === 'text'" class="text">{{ p.content }}</div>
                  <pre v-else class="code"><code>{{ p.content }}</code></pre>
                </template>
              </div>
            </template>
            <template v-else>
              <div class="bubble">{{ m.content }}</div>
            </template>
          </div>
        </div>
        <div class="input">
          <a-textarea v-model:value="inputText" :rows="3" placeholder="继续描述你的需求..." />
          <div class="send">
            <a-button type="primary" :loading="loading" @click="doSend">发送</a-button>
          </div>
        </div>
      </div>
      <div class="right">
        <div v-if="codeStreamDone" class="preview">
          <iframe :src="previewUrl" frameborder="0" />
        </div>
        <a-empty v-else description="生成完成后在此展示预览" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  max-width: 1200px;
  margin: 0 auto;
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
  grid-template-columns: 1fr 520px;
  gap: 16px;
}
.left {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  min-height: 70vh;
}
.messages {
  flex: 1;
  overflow: auto;
  padding: 8px;
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
  max-width: 80%;
}
.msg.user .bubble {
  background: #1677ff;
  color: #fff;
}
.input {
  margin-top: 8px;
}
.send {
  text-align: right;
  margin-top: 8px;
}
.right {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
}
.preview {
  width: 100%;
  height: 70vh;
}
.preview iframe {
  width: 100%;
  height: 100%;
  border: none;
}
@media (max-width: 1024px) {
  .content {
    grid-template-columns: 1fr;
  }
}
</style>
