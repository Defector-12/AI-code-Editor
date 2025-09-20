/**
 * 环境变量与 URL 构造
 * - API_BASE_URL: 请求域名（带 /api 前缀）
 * - getDeployUrl: 线上部署访问地址 http(s)://DEPLOY_HOST/{deployKey}
 * - getStaticPreviewUrl: 本地生成预览静态资源 http(s)://STATIC_HOST/api/static/{codeGenType}_{appId}/
 */

const VITE_API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined
const VITE_DEPLOY_HOST = (import.meta as any).env?.VITE_DEPLOY_HOST as string | undefined
const VITE_STATIC_HOST = (import.meta as any).env?.VITE_STATIC_HOST as string | undefined

export const API_BASE_URL = (VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export function getDeployUrl(deployKey: string) {
  const host = (VITE_DEPLOY_HOST || 'http://localhost').replace(/\/$/, '')
  return `${host}/${deployKey}`
}

export function getStaticPreviewUrl(codeGenType: string, appId: string | number) {
  const host = (VITE_STATIC_HOST || 'http://localhost:8123').replace(/\/$/, '')
  return `${host}/api/static/${codeGenType}_${appId}/`
}
