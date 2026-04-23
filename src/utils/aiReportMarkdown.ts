/**
 * 修复大模型把 Markdown 表格压成一行时产生的 `||` 粘连，便于 GFM 解析。
 * 将 `||` 视为「换行 + 新行首的 |」。
 */
export function normalizeAIReportMarkdown(content: string): string {
  let s = content;
  if (s.includes('||')) {
    s = s.replace(/\|\|/g, '\n|');
  }
  s = s.replace(/^\n+/, '');
  return s;
}
