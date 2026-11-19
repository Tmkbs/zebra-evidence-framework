"""Compute an exact local comparison locator; optional independently pinned grant verification."""
import re
from html.parser import HTMLParser
from runtime import Locate
from trusted_operation import parse,digest,equal,check,SHA
ANCHOR=r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}'
def fail():raise ValueError('Structured capture locator could not be verified.')
def normalize(value):
    if type(value) is not str:fail()
    return re.sub(r'[\t\n\f\r ]+',' ',value).strip(' ')
class Text(HTMLParser):
    def __init__(self,s):
        super().__init__(convert_charrefs=True);self.parts=[];self.feed(s);self.close()
    def handle_data(self,data):self.parts.append(data)
def locate(*,capture,receipt,baseline,step,intake_bytes,intake_sha256):
    """Receipt is from the already validated bound runtime, not the captured page."""
    if not equal(digest(intake_bytes),intake_sha256):fail()
    r=parse(intake_bytes,1_000_000)
    if r.get('schema')!='zebra-correlated-intake/v1' or receipt.get('schema')!='zebra-bound-typed-copy/v1':fail()
    i=r['intake']; binding=i['capture_binding']
    if i['stage']!='CAPTURE_REVIEW_REQUIRED' or i['case']['id']!=receipt['case_id'] or i['run_id']!=receipt['run_id']:fail()
    if binding['structured_sources']['techdocs']!=capture or capture.get('source_kind')!='techdocs':fail()
    source=receipt['source_url']
    docs=[p for p in binding['captures'] if p['kind']=='techdocs' and p['url']==source]
    if len(docs)!=1 or not equal(docs[0]['sha256'],receipt['capture_sha256']) or capture['source_url']!=source:fail()
    if type(baseline) is not bytes or len(baseline)>500_000 or not equal(digest(baseline),receipt['source_sha256']):fail()
    if type(step) is not int or not 1<=step<=100:fail()
    s=baseline.decode('utf-8'); p=Locate(s,step);p.feed(s);p.close()
    if p.frames or len(p.matches)!=1:fail()
    start,end=p.matches[0]; raw=s[start:end]
    if not equal(digest(raw.encode()),receipt['paragraph_sha256']):fail()
    normalized=normalize(''.join(Text(raw).parts))
    anchor=receipt['source_anchor']
    if not normalized or not check(anchor,ANCHOR):fail()
    blocks=capture['blocks']
    hits=[j for j,x in enumerate(blocks) if x['kind']=='heading' and x.get('anchor')==anchor]
    if len(hits)!=1:fail()
    lo=hits[0]; level=blocks[lo]['level']
    if type(level) is not int or not 1<=level<=6:fail()
    end=next((j for j in range(lo+1,len(blocks)) if blocks[j]['kind']=='heading' and blocks[j]['level']<=level),len(blocks))
    resolved=[(j,x) for j,x in enumerate(blocks[lo+1:end],lo+1)
              if x['kind'] in ('paragraph','list_item') and normalize(x['text'])==normalized]
    if len(resolved)!=1:fail()
    j,block=resolved[0]
    return {'schema':'zebra-structured-locator-proof/v1','case_id':receipt['case_id'],'run_id':receipt['run_id'],
      'source_url':source,'capture_sha256':receipt['capture_sha256'],'baseline_sha256':receipt['source_sha256'],
      'paragraph_sha256':receipt['paragraph_sha256'],'capture_truncated':capture['truncated'],
      'native_capture_anchor':block.get('anchor'),'block_index_zero_based':j,
      'locator':{'section_anchor':anchor,'block_kind':block['kind'],'section_block_index':j-lo-1,
                 'block_sha256':digest(normalized.encode())},
      'status':'STRUCTURAL_MATCH_ONLY','archive_overlay_eligible':False}
def verify_explicit_locator_grant(*,proof,grant_bytes,operator_grant_sha256):
    """Separate optional binding check; no grant creation, HTML rendering or archive authorization."""
    if not equal(digest(grant_bytes),operator_grant_sha256):fail()
    grant=parse(grant_bytes,16_384)
    keys=('case_id','run_id','source_url','capture_sha256','baseline_sha256','paragraph_sha256','locator','capture_truncated')
    if set(grant)!=set(keys)|{'schema','scope'} or grant['schema']!='zebra-reviewed-structured-locator/v1' or grant['scope']!='LOCAL_LOCATOR_BINDING_ONLY':fail()
    if set(proof)!=set(keys)|{'schema','native_capture_anchor','block_index_zero_based','status','archive_overlay_eligible'} or proof['schema']!='zebra-structured-locator-proof/v1' or proof['status']!='STRUCTURAL_MATCH_ONLY' or proof['archive_overlay_eligible'] is not False or any(grant[k]!=proof[k] for k in keys):fail()
    return {**{k:proof[k] for k in keys},'schema':'zebra-structured-locator-proof/v1',
            'status':'OPERATOR_PINNED_LOCATOR_MATCH','archive_overlay_eligible':False}
