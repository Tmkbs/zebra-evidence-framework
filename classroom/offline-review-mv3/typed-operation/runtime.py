"""Dependency-free static typed insertion into a trusted local baseline."""
from html import escape
from html.parser import HTMLParser
from trusted_operation import authorize_local_operation,digest,BEFORE
from native_before import select_before

VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
MARK='arming-before-trigger'
def fail():raise ValueError('Local paragraph target could not be uniquely verified.')
class Locate(HTMLParser):
    def __init__(self,source,step):
        super().__init__(convert_charrefs=False)
        self.source=source
        self.offsets=[0]+[i+1 for i,c in enumerate(source) if c=='\n']
        self.frames=[]
        self.matches=[]
        self.step=step
    def pos(self):
        line,col=self.getpos()
        return self.offsets[line-1]+col
    def safe(self,tag,attrs):
        if any((k=='id' and v==MARK) or k.startswith('on') or k=='srcdoc' for k,v in attrs):fail()
        if tag in {'script','iframe','object','embed','base','form','svg','math','template'}:fail()
    def handle_starttag(self,tag,attrs):
        self.safe(tag,attrs)
        if len(self.frames)>=128:fail()
        if tag in VOID:return
        p=self.frames[-1] if self.frames else None
        ordinal=1
        if p:
            p['children'][tag]=p['children'].get(tag,0)+1
            ordinal=p['children'][tag]
        names=[f['tag'] for f in self.frames]
        target=(tag=='p' and ordinal==1 and len(names)>=4 and names[-3:]==['article','ol','li']
                and 'main' in names[:-3] and p['ordinal']==self.step)
        self.frames.append({'tag':tag,'ordinal':ordinal,'children':{},'target':target,'start':self.pos()})
    def handle_startendtag(self,tag,attrs):
        self.safe(tag,attrs)
        if tag not in VOID:fail()
    def handle_endtag(self,tag):
        if not self.frames or self.frames[-1]['tag']!=tag:fail()
        current=self.frames.pop()
        if current['target']:
            start=self.pos()
            end=self.source.find('>',start)
            if end<0 or self.source[start:end+1].lower()!='</p>':fail()
            self.matches.append((current['start'],end+1))
def apply_reviewed_local_copy(*,operation_bytes,trust_bytes,operator_trust_sha256,baseline_bytes):
    a=authorize_local_operation(operation_bytes=operation_bytes,trust_bytes=trust_bytes,
        operator_trust_sha256=operator_trust_sha256,baseline_bytes=baseline_bytes)
    op=a['operation']; source=baseline_bytes.decode('utf-8')
    before=op['schema']==BEFORE
    if before:
        first,last=select_before(source,op,Locate,fail)
    else:
        parser=Locate(source,op['step'])
        parser.feed(source)
        parser.close()
        if parser.frames or len(parser.matches)!=1:fail()
        first,last=parser.matches[0]
    if digest(source[first:last].encode('utf-8'))!=op['paragraph_sha256']:fail()
    insertion=[]
    for seg in op['segments']:
        val=escape(seg['text'],quote=False)
        kind=seg['kind']
        if kind=='code':val='<code>'+val+'</code>'
        if kind=='link':val='<a href="'+escape(seg['url'],quote=True)+'">'+val+'</a>'
        insertion.append(val)
    marked='<p class="proposal" id="'+(op['target_anchor'] if before else MARK)+'">'+''.join(insertion)+'</p>'
    # Preserve the baseline paragraph's ordinary layout whitespace ahead of the new sibling.
    if not before:
        while last<len(source) and source[last] in ' \t\r\n':last+=1
    idx=first if before else last
    copy=(source[:idx]+marked+source[idx:]).encode('utf-8')
    return copy,{'schema':'zebra-typed-static-local-copy/v1','case_id':op['case_id'],'run_id':op['run_id'],
        'source_version':op['source_version'],'original_sha256':op['source_sha256'],
        'operation_sha256':a['approved_operation_sha256'],'working_copy_sha256':digest(copy),
        'original_modified':False,'publication':'NOT_AUTHORIZED'}
