import { Fragment, type ReactNode } from 'react'

/**
 * 把文本里的 **粗体** 标记渲染成 <strong>。
 * 用于在经历/贡献等文案中强调数字和关键词，无需引入 markdown 库。
 */
export function renderBold(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    const match = /^\*\*([^*]+)\*\*$/.exec(part)
    if (match) return <strong key={i}>{match[1]}</strong>
    return <Fragment key={i}>{part}</Fragment>
  })
}
