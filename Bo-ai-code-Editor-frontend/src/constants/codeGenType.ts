export type CodeGenType = 'html' | 'multi_file'

export const CODE_GEN_TYPE_OPTIONS: { label: string; value: CodeGenType }[] = [
  { label: '原生 HTML 模式', value: 'html' },
  { label: '原生多文件模式', value: 'multi_file' },
]

export const CODE_GEN_TYPE_MAP: Record<CodeGenType, string> = {
  html: '原生 HTML 模式',
  multi_file: '原生多文件模式',
}
