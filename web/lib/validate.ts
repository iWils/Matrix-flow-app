
const serviceRe = /^\s*(\d{1,5})(?:-(\d{1,5}))?\/(tcp|udp|TCP|UDP)\s*$/
export function validateServiceList(value?: string){
  if(!value) return true
  for(const part of value.split(/[,;]/)){
    const p = part.trim()
    if(!p) continue
    const m = p.match(serviceRe)
    if(!m) return false
    const a = parseInt(m[1],10), b = parseInt(m[2]||m[1],10)
    if(!(a>0 && b>0 && a<=65535 && b<=65535 && a<=b)) return false
  }
  return true
}
