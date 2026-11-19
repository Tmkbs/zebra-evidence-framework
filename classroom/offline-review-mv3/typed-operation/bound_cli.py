"""Receipt-only bridge for a trusted typed copy and independently pinned replay identity."""
import argparse
import json
import os
import re
import stat
from runtime import Locate, MARK, apply_reviewed_local_copy
from trusted_operation import authorize_local_operation, check_link, check, SHA, digest, equal, parse

def bad():raise ValueError('Reviewed typed copy reference does not match.')
class Sections(Locate):
    def __init__(self,*a):
        super().__init__(*a);self.headings=[];self.matches_by_article=[];self.ids=[]
    def handle_starttag(self,tag,attrs):
        ident=dict(attrs).get('id')
        if ident:self.ids.append(ident)
        article=next((f['start'] for f in reversed(self.frames) if f['tag']=='article'),None)
        if article is not None and re.fullmatch(r'h[1-6]',tag):
            self.headings.append((article,self.pos(),ident))
        super().handle_starttag(tag,attrs)
        if self.frames and self.frames[-1]['target'] and self.frames[-1]['start']==self.pos():
            self.matches_by_article.append((article,self.pos()))
def bound_copy(*,operation_bytes,trust_bytes,operator_trust_sha256,baseline_bytes,
               review_bytes,review_sha256,intake_bytes,source_url,source_anchor,target_anchor):
    if not equal(digest(review_bytes),review_sha256):bad()
    r=parse(review_bytes,16_384)
    if r.get('schema')!='zebra-local-review-binding/v1' or r.get('scope')!='PREVIOUSLY_REVIEWED_LOCAL_PARITY_ONLY' or r.get('allows_publication') is not False:bad()
    if not equal(digest(intake_bytes),r.get('intake_sha256')) or not equal(digest(baseline_bytes),r.get('baseline_sha256')):bad()
    record=parse(intake_bytes,1_000_000)
    if record.get('schema')!='zebra-correlated-intake/v1':bad()
    intake=record['intake']
    if intake.get('schema')!='zebra-doc-capture-intake/v1' or intake.get('stage')!='CAPTURE_REVIEW_REQUIRED' or intake.get('proposed_revision') is not None or intake['release']['publication'] is not False:bad()
    approved=authorize_local_operation(operation_bytes=operation_bytes,trust_bytes=trust_bytes,
        operator_trust_sha256=operator_trust_sha256,baseline_bytes=baseline_bytes)
    op=approved['operation']
    if any(op[k]!=r.get(k) for k in ('case_id','run_id','source_version')) or not equal(approved['approved_operation_sha256'],r.get('operation_sha256')):bad()
    if intake['case']['id']!=op['case_id'] or intake['run_id']!=op['run_id'] or intake['document_snapshot']['source_version_from_url']!=op['source_version']:bad()
    check_link(source_url,op['source_version'])
    if not isinstance(r.get('evidence'),list) or r['evidence'].count(source_url)!=1:bad()
    pins=[x for x in intake['capture_binding']['captures'] if x['kind']=='techdocs' and x['url']==source_url]
    if len(pins)!=1 or not check(pins[0]["sha256"],SHA):bad()
    if not isinstance(source_anchor,str) or re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}',source_anchor) is None or target_anchor!=MARK:bad()
    original=baseline_bytes.decode('utf-8')
    parser=Sections(original,op['step']);parser.feed(original);parser.close()
    if len(parser.matches_by_article)!=1 or parser.ids.count(source_anchor)!=1:bad()
    article,target_pos=parser.matches_by_article[0]
    candidates=[a for parent,at,a in parser.headings if parent==article and at<target_pos]
    if not candidates or candidates[-1]!=source_anchor:bad()
    copied,out=apply_reviewed_local_copy(operation_bytes=operation_bytes,trust_bytes=trust_bytes,
        operator_trust_sha256=operator_trust_sha256,baseline_bytes=baseline_bytes)
    if not equal(out['working_copy_sha256'],r.get('clean_sha256')):bad()
    return copied,{
      'schema':'zebra-bound-typed-copy/v1','case_id':op['case_id'],'run_id':op['run_id'],
      'source_url':source_url,'source_anchor':source_anchor,'target_anchor':target_anchor,
      'source_version':op['source_version'],'source_sha256':op['source_sha256'],
      'capture_sha256':pins[0]['sha256'],'paragraph_sha256':op['paragraph_sha256'],
      'operation_sha256':out['operation_sha256'],'working_copy_sha256':out['working_copy_sha256'],
      'capture_status':'CAPTURE_REVIEW_REQUIRED','original_modified':False,'write_performed':False,
      'model_execution':'NOT_RUN','publication':'NOT_AUTHORIZED'}
def read(path,limit):
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
    with os.fdopen(fd,'rb') as f:
        st=os.fstat(f.fileno())
        if not stat.S_ISREG(st.st_mode) or st.st_size>limit:bad()
        b=f.read(limit+1)
        if len(b)>limit:bad()
        return b
def main():
    p=argparse.ArgumentParser(description='Validate and render reviewed copy in memory; emit only a receipt.')
    for flag in ('operation','trust','operator-trust-sha256','baseline','review','review-sha256','intake','source-url','source-anchor','target-anchor'):
        p.add_argument('--'+flag,required=True)
    a=p.parse_args()
    try:
        _,r=bound_copy(operation_bytes=read(a.operation,64000),trust_bytes=read(a.trust,16384),
         operator_trust_sha256=a.operator_trust_sha256,baseline_bytes=read(a.baseline,500000),
         review_bytes=read(a.review,16384),review_sha256=a.review_sha256,intake_bytes=read(a.intake,1_000_000),
         source_url=a.source_url,source_anchor=a.source_anchor,target_anchor=a.target_anchor)
    except (ValueError,TypeError,KeyError,AttributeError,OSError):p.exit(1,'Reviewed typed copy rejected.\n')
    print(json.dumps(r,indent=2))
if __name__=='__main__':main()
