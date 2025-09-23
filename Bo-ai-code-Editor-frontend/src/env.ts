/**
 * 环境变量与 URL 构造
 * - API_BASE_URL: 请求域名（带 /api 前缀）
 * - getDeployUrl: 线上部署访问地址 http(s)://DEPLOY_HOST/{deployKey}
 * - getStaticPreviewUrl: 本地生成预览静态资源 http(s)://STATIC_HOST/api/static/{codeGenType}_{appId}/
 */

const VITE_API_BASE_URL = import.meta.env?.VITE_API_BASE_URL as string | undefined
const VITE_DEPLOY_HOST = import.meta.env?.VITE_DEPLOY_HOST as string | undefined
const VITE_STATIC_HOST = import.meta.env?.VITE_STATIC_HOST as string | undefined

export const API_BASE_URL = (VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export function getDeployUrl(deployKey: string, codeGenType?: string) {
  const host = (VITE_DEPLOY_HOST || 'http://localhost').replace(/\/$/, '')
  const base = `${host}/${deployKey}`
  if ((codeGenType || '').toLowerCase() === 'vue_project') {
    return `${base}/dist/index.html`
  }
  return base
}

export function getStaticPreviewUrl(codeGenType: string, appId: string | number) {
  // 为了让 iframe 与前端同源，默认走相对路径，由 Vite 代理到后端。
  // 若显式配置了 VITE_STATIC_HOST（例如部署环境），则拼接为 {host}/api/static/...
  const host = (VITE_STATIC_HOST || '').replace(/\/$/, '')
  const basePrefix = host ? `${host}/api` : '/api'
  const base = `${basePrefix}/static/${codeGenType}_${appId}`
  if ((codeGenType || '').toLowerCase() === 'vue_project') {
    return `${base}/dist/index.html`
  }
  return `${base}/`
}
