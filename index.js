/**
 * dsh-translate-kit · 翻译工坊（Host插件·零依赖·无构建）
 * 管翻译质量：术语表常驻（workspace glossary.json）、双译对照纪律、翻译偏好记忆。
 * 工具 glossary：术语表读/写/查（存 workspace/glossary.json·跨会话复用）。
 */
export const name = 'translate-kit'
export const inject = ['systemPrompt', 'tools']
const SECTION = 'translate-kit:rules'
const DEFAULTS = { order: 95, enabled: true, tool: true, glossary: 'glossary.json' }

function norm(c) {
  const r = c ?? {}
  return {
    order: typeof r.order === 'number' ? r.order : DEFAULTS.order,
    enabled: r.enabled !== false,
    tool: r.tool !== false,
    glossary: typeof r.glossary === 'string' ? r.glossary : DEFAULTS.glossary,
  }
}

function renderSection() {
  return [
    '## 翻译工坊 · 翻译质量纪律（遇到翻译任务时生效）',
    '',
    '**一、先查术语表**：翻译前先跑 glossary 工具读 workspace/glossary.json——专有名词、产品名、人名必须按术语表走，不自造译名。',
    '**二、术语沉淀**：新术语译完即写入术语表（源词/译词/语境一行）——同一词第二次出现必须同译，跨会话一致。',
    '**三、双译对照**：重要文案（产品页/README/对外信）给两个版本：①直译（忠实）②意译（地道·英语母语者的表达习惯），并各一句说明适用场景。',
    '**四、语域对齐**：先问/推断目标读者（开发者文档≠营销文案≠法律条款），术语密度和句长按语域调整；技术文档保留原文术语不硬译。',
    '**五、回译自检**：营销/法律等高 stakes 文案，把译文回译成源语言对照——意思走样即回炉。',
  ].join('\n')
}

export default function plugin(ctx) {
  const cfg = norm(ctx.config?.[SECTION])
  if (!cfg.enabled) { ctx.logger?.info?.('dsh-translate-kit: disabled'); return }
  const { join, resolve } = ctx.paths ?? {}
  const pathJoin = join ?? ((...a) => a.join('/'))

  function findRoot() {
    if (ctx.workspace?.root) return ctx.workspace.root
    let dir = process.cwd()
    for (let i = 0; i < 24; i++) {
      try { if (ctx.fs?.existsSync?.(pathJoin(dir, 'package.json')) || ctx.fs?.existsSync?.(pathJoin(dir, 'README.md'))) return dir } catch {}
      const parent = pathJoin(dir, '..')
      if (parent === dir) break
      dir = parent
    }
    return process.cwd()
  }

  ctx.registerSection?.({
    name: SECTION,
    order: cfg.order,
    render: () => renderSection(),
  })

  if (cfg.tool) {
    ctx.registerTool?.({
      name: 'translate_glossary',
      description: '翻译术语表：查（读全部/按关键词）/加（源词+译词+语境）/删。存 workspace/glossary.json，跨会话复用。',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['查', '加', '删'], description: '查=读术语表；加=新增术语；删=删除词条' },
          source: { type: 'string', description: '源词（加/删时必填）' },
          target: { type: 'string', description: '译词（加时必填）' },
          note: { type: 'string', description: '语境说明（加时可选）' },
        },
        required: ['action'],
        additionalProperties: false,
      },
      output: { schema: { type: 'object', properties: { report: { type: 'string' } }, required: ['report'], additionalProperties: false } },
      execute: async (args) => {
        try {
          const root = findRoot()
          const gp = pathJoin(root, cfg.glossary)
          const fsMod = ctx.fs ?? await import('node:fs/promises')
          let rows = []
          try { rows = JSON.parse(await fsMod.readFile(gp, 'utf8')); if (!Array.isArray(rows)) rows = [] } catch {}
          const act = args?.action ?? '查'
          if (act === '查') {
            const kw = typeof args?.source === 'string' ? args.source.toLowerCase() : ''
            const hits = kw ? rows.filter(r => (r.source + ' ' + r.target).toLowerCase().includes(kw)) : rows
            const body = hits.length === 0 ? '（术语表空或无命中）' : hits.slice(-80).map(r => `  ${r.source} → ${r.target}${r.note ? '｜' + r.note : ''}`).join('\n')
            return { report: `【术语表】共 ${rows.length} 条：\n${body}` }
          }
          if (act === '加') {
            const src = (args?.source ?? '').trim(); const tgt = (args?.target ?? '').trim()
            if (!src || !tgt) return { report: '加词条需要 source 与 target。' }
            const i = rows.findIndex(r => r.source === src)
            if (i >= 0) rows[i] = { source: src, target: tgt, note: args?.note ?? rows[i].note }
            else rows.push({ source: src, target: tgt, note: args?.note ?? '' })
            await fsMod.writeFile(gp, JSON.stringify(rows, null, 2), 'utf8')
            return { report: `【术语表】已写入：${src} → ${tgt}（共 ${rows.length} 条）` }
          }
          if (act === '删') {
            const src = (args?.source ?? '').trim()
            const before = rows.length
            rows = rows.filter(r => r.source !== src)
            await fsMod.writeFile(gp, JSON.stringify(rows, null, 2), 'utf8')
            return { report: `【术语表】删 ${src}：${before - rows.length} 条移除（余 ${rows.length}）` }
          }
          return { report: '未知动作：' + act }
        } catch (error) {
          return { report: 'translate-kit 内部错：' + String(error?.message ?? error).slice(0, 200) }
        }
      },
    })
  }
  ctx.logger?.info?.('dsh-translate-kit: section %s registered (order=%d)', SECTION, cfg.order)
}
