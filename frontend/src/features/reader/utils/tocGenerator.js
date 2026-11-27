/**
 * Converts flat TOC entries from backend into a hierarchical tree.
 */
export function buildTocTree(entries = []) {
  const byId = new Map()
  const roots = []

  for (const entry of entries) {
    byId.set(entry.id, { ...entry, children: [] })
  }

  for (const entry of entries) {
    const node = byId.get(entry.id)
    if (entry.parentId && byId.has(entry.parentId)) {
      byId.get(entry.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
