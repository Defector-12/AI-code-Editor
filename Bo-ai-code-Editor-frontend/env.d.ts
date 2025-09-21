/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_DEPLOY_HOST?: string
  readonly VITE_STATIC_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'markdown-it' {
  interface MarkdownItOptions {
    html?: boolean
    xhtmlOut?: boolean
    breaks?: boolean
    langPrefix?: string
    linkify?: boolean
    typographer?: boolean
    quotes?: string
    highlight?: (str: string, lang: string) => string
  }
  class MarkdownIt {
    constructor(options?: MarkdownItOptions)
    render(src: string): string
  }
  export default MarkdownIt
}
