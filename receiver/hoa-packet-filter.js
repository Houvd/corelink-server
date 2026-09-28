'use strict'

/** Packet contract: parse(validatedCorelinkBuffer) -> HOA header|null;
 * create(header, routeTag, nowMs) -> route-owned packet state;
 * select(route, channels) -> changed boolean; rewrite(route, header, buffer)
 * -> new Buffer|null. Input buffers are never modified. rewrite mutates the
 * private parsed header and route sequence/codec state; no audio decoding occurs.
 */
function parse(packet) {
  if(packet.length<8) return null
  const hs=packet.readUInt16LE(0)&32767
  let h
  try { h=JSON.parse(packet.toString('utf8',8,8+hs)) } catch (_) { return null }
  if (!h || h.sv!==1 || h.c!==2 || !Number.isInteger(h.o) || h.o<0 || h.o>7 || h.t!==(h.o+1)**2 || !Number.isSafeInteger(h.ep) || !Number.isSafeInteger(h.a) || !Number.isInteger(h.s) || !Number.isInteger(h.e) || h.s<0 || h.e>h.t || h.e<=h.s) return null
  return h
}
function create(h, tag, time) {
  return {tag,epoch:h.ep,maximum:h.t,channels:h.t,frame:-1,generation:1,
    sequence:0,ids:new Map(),codecs:new Map(),codecSequence:0,seen:time,
    feedbackSequence:0,feedbackAt:time}
}
function select(r, next) {
  if(next===r.channels) return false
  for(const start of r.codecs.keys()) if(start>=next) r.codecs.delete(start)
  r.channels=next;r.generation++
  return true
}
function rewrite(r,h,packet) {
  const hs=packet.readUInt16LE(0)&32767
    const originalID=h.i
    if (!r.ids.has(originalID)) { r.ids.set(originalID,++r.sequence); if(r.ids.size>1024) r.ids.delete(r.ids.keys().next().value) }
    let codec=r.codecs.get(h.s)
    if (!codec || codec.original!==h.cg) { codec={original:h.cg,generation:++r.codecSequence}; r.codecs.set(h.s,codec) }
    h.rt=r.tag; h.si=originalID; h.i=r.ids.get(originalID); h.t=r.channels; h.o=Math.sqrt(r.channels)-1; h.og=r.generation; h.cg=codec.generation
    const json=Buffer.from(JSON.stringify(h)), prefix=Buffer.from(packet.subarray(0,8))
    if(json.length>32767) { return null }
    prefix.writeUInt16LE(json.length,0)
    const output=Buffer.concat([prefix,json,packet.subarray(8+hs)])
  return output
}
module.exports={parse,create,select,rewrite}
