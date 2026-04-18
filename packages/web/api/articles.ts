import type { VercelRequest, VercelResponse } from '@vercel/node'
import fs from 'fs'
import path from 'path'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const lang = (req.query.lang as string) || 'he'
  const slug = req.query.slug as string | undefined
  const articlesDir = path.join(process.cwd(), 'public', 'articles', lang)

  try {
    if (slug) {
      const filePath = path.join(articlesDir, `${slug}.md`)
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' })
      const content = fs.readFileSync(filePath, 'utf-8')
      return res.json({ slug, content, lang })
    } else {
      if (!fs.existsSync(articlesDir)) return res.json({ articles: [] })
      const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'))
      const articles = files.map(file => {
        const slug = file.replace('.md', '')
        const content = fs.readFileSync(path.join(articlesDir, file), 'utf-8')
        const lines = content.split('\n')
        const title = lines[0].replace(/^#+\s*/, '').trim()
        const metaLine = lines.find(l => l.startsWith('תיאור מטא:') || l.startsWith('description:'))
        const excerpt = metaLine?.replace(/^תיאור מטא:\s*|^description:\s*/, '').trim() || ''
        const categoryLine = lines.find(l => l.startsWith('category:'))
        const category = categoryLine?.replace('category:', '').trim() || ''
        return { slug, title, excerpt, category, lang }
      })
      return res.json({ articles })
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
