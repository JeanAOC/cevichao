/**
 * Cuál enlace de una lista está activo. Los enlaces pueden llevar ?tab= (por ejemplo /cumple/123?tab=resumen):
 * gana el que coincide con la pestaña de la URL; si ninguno coincide, el que no lleva ?tab= (la pestaña por defecto).
 * Si varios coinciden por ruta (por ejemplo /cevichocho y /cevichocho/pedir), gana la ruta más específica.
 */
export function pickActiveHref(items: { href: string }[], pathname: string, tabParam: string | null): string | undefined {
  const parts = (href: string) => {
    const [path, query = ''] = href.split('?')
    return { path, tab: new URLSearchParams(query).get('tab') }
  }
  const onPath = items.filter(i => {
    const { path } = parts(i.href)
    return pathname === path || pathname.startsWith(`${path}/`)
  }).sort((a, b) => parts(b.href).path.length - parts(a.href).path.length)
  return (
    onPath.find(i => parts(i.href).tab !== null && parts(i.href).tab === tabParam)
    ?? onPath.find(i => parts(i.href).tab === null)
    ?? onPath[0]
  )?.href
}
