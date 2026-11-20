// Deterministic store-only ZIP. Only expected inert mirror paths are accepted.
const encoder=new TextEncoder();
const crcTable=Uint32Array.from({length:256},(_,n)=>{
  for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;
  return n>>>0;
});
function crc(bytes) {
  let n=0xffffffff;
  for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);
  return (n^0xffffffff)>>>0;
}
function buffer(length) {
  const bytes=new Uint8Array(length), view=new DataView(bytes.buffer);
  return {bytes,u16:(o,n)=>view.setUint16(o,n,true),u32:(o,n)=>view.setUint32(o,n,true)};
}
export function mirrorZip(files) {
  if(!(files instanceof Map)||files.size>78||!['index.html','manifest.json','site.css'].every(k=>files.has(k)))
    throw new Error('Incomplete mirror files.');
  const local=[],central=[];
  let offset=0, directory=0;
  for(const [path,source] of [...files.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0)){
    if(typeof path!=='string'||!/^(?:index\.html|manifest\.json|site\.css|pages\/(?:[0-9]{3}|original-excerpt|clean-excerpt)\.html)$/.test(path)||path.trim()!==path||
      typeof source!=='string'||source.length>25_000_000)throw new Error('Unsafe or oversized mirror entry.');
    const name=encoder.encode(path), data=encoder.encode(source), checksum=crc(data);
    const h=buffer(30), c=buffer(46);
    h.u32(0,0x04034b50); h.u16(4,20); h.u16(12,33);h.u32(14,checksum);h.u32(18,data.length);h.u32(22,data.length);h.u16(26,name.length);
    c.u32(0,0x02014b50); c.u16(4,20); c.u16(6,20); c.u16(14,33);c.u32(16,checksum);c.u32(20,data.length);c.u32(24,data.length);c.u16(28,name.length);c.u32(42,offset);
    offset+=30+name.length+data.length; directory+=46+name.length;
    if(offset+directory>25_010_000)throw new Error('Mirror ZIP exceeds the output limit.');
    local.push(h.bytes,name,data);central.push(c.bytes,name);
  }
  const end=buffer(22);
  end.u32(0,0x06054b50);end.u16(8,files.size);end.u16(10,files.size);end.u32(12,directory);end.u32(16,offset);
  return new Blob([...local,...central,end.bytes],{type:'application/zip'});
}
