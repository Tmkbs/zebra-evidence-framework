"""Validate an externally pinned, local-only review grant for a typed paragraph operation."""
import hashlib
import hmac
import json
import re
from urllib.parse import urlsplit

OP='zebra-paragraph-after/v1'
TRUST='zebra-trusted-local-operation/v1'
BEFORE='zebra-paragraph-before/v1'
ANCHOR=r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}'
SHA=r'[a-f0-9]{64}'
# Keep the added RFID route within the same public-path policy as extension/capture.js.
SENSITIVE_PATH=re.compile(r'^(?:login|logout|log-in|sign-in|signin|register|signup|account|user|users|admin|internal|private|download|oauth|sso|search|ticket|support-portal)(?:$|[-_.])',re.I)
FIELDS={'case_id':r'[A-Za-z0-9_-]{1,100}','run_id':r'CAPTURE-[a-f0-9]{24}',
        'source_version':r'[0-9]{1,4}(?:-[0-9]{1,4}){1,4}',
        'source_sha256':SHA,'paragraph_sha256':SHA}
def reject():
    raise ValueError('Local typed operation or independent review pin rejected.')
def digest(data):
    return hashlib.sha256(data).hexdigest()
def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode('utf-8')
def check(text, syntax):
    return type(text) is str and len(text)<=1800 and re.fullmatch(syntax,text) is not None
def equal(a,b):
    return check(a,SHA) and check(b,SHA) and hmac.compare_digest(a,b)
def unique(pairs):
    result={}
    for k,v in pairs:
        if k in result:reject()
        result[k]=v
    return result
def parse(raw,cap):
    if type(raw) is not bytes or len(raw)>cap:reject()
    try:
        value=json.loads(raw.decode('utf-8'),object_pairs_hook=unique,
                         parse_constant=lambda _: reject())
    except (UnicodeError,ValueError,RecursionError) as error:
        raise ValueError('Local typed operation or independent review pin rejected.') from error
    if type(value) is not dict:reject()
    return value
def check_link(url,edition):
    if not check(url,r'https://techdocs\.zebra\.com/[A-Za-z0-9_./-]+'):reject()
    p=urlsplit(url); parts=p.path[1:].removesuffix('/').split('/')
    # Match the existing flat routes, plus the one named nested RFID Android family.
    version_index=3 if parts[:3]==['dcs','rfid','android'] else 1
    if ((p.scheme,p.netloc)!=('https','techdocs.zebra.com') or len(parts)<version_index+2 or
        parts[version_index]!=edition or not check(edition,FIELDS['source_version']) or
        any(s in ('','.','..') for s in parts)):reject()
    if version_index==3 and (any(SENSITIVE_PATH.match(s) for s in parts) or
        re.search(r'\.(?!html$)[a-z]{2,}$',p.path,re.I)):reject()
def authorize_local_operation(*,operation_bytes,trust_bytes,operator_trust_sha256,baseline_bytes):
    """The caller must supply the trust SHA from a separate review channel, not the capture."""
    if type(trust_bytes) is not bytes or len(trust_bytes)>16_384 or not equal(digest(trust_bytes),operator_trust_sha256):reject()
    trust=parse(trust_bytes,16_384)
    op=parse(operation_bytes,64_000)
    if set(trust)!=set(FIELDS)|{'schema','scope','operation_sha256','allowed_link'} or trust['schema']!=TRUST or trust['scope']!='LOCAL_RENDERED_COPY_ONLY':reject()
    before=op.get('schema')==BEFORE
    locator_fields={'section_anchor','target_anchor'} if before else {'step'}
    if set(op)!=set(FIELDS)|{'schema','segments'}|locator_fields or op['schema'] not in (OP,BEFORE):reject()
    if before and (not all(check(op[key],ANCHOR) for key in locator_fields) or op['section_anchor']==op['target_anchor']):reject()
    if any(not check(op[k],syntax) or op[k]!=trust[k] for k,syntax in FIELDS.items()):reject()
    if type(baseline_bytes) is not bytes or len(baseline_bytes)>500_000 or not equal(digest(baseline_bytes),op['source_sha256']):reject()
    if not before and (type(op['step']) is not int or not 1<=op['step']<=100):reject()
    if type(op['segments']) is not list or not 1<=len(op['segments'])<=24:reject()
    allowed=trust['allowed_link']
    if allowed is not None:check_link(allowed,op['source_version'])
    seen_link=False
    for seg in op['segments']:
        if type(seg) is not dict or seg.get('kind') not in ('text','code','link'):reject()
        linked=seg['kind']=='link'
        if set(seg)!=({'kind','text','url'} if linked else {'kind','text'}):reject()
        text=seg['text']
        if type(text) is not str or not 1<=len(text)<=1600 or re.search(r'[\x00-\x1f\x7f-\x9f\ud800-\udfff]',text):reject()
        if linked:
            check_link(seg['url'],op['source_version'])
            if seg['url']!=allowed:reject()
            seen_link=True
    if seen_link!=(allowed is not None):reject()
    approved=trust['operation_sha256']
    if not equal(digest(canonical(op)),approved):reject()
    return {'operation':op,'approved_operation_sha256':approved,'allowed_link':allowed}
