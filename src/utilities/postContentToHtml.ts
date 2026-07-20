import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { Post } from '@/payload-types'

export function postContentToHtml(content: Post['content']): string {
  if (!content?.root) return ''

  try {
    return convertLexicalToHTML({
      data: content,
      disableContainer: true,
    })
  } catch (error) {
    console.error('[postContentToHtml]', error)
    return ''
  }
}
