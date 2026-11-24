import copy
import unittest
from trusted_operation import authorize_local_operation,canonical,digest
BASE=b'<main><article><ol><li><p>Synthetic paragraph</p></li></ol></article></main>'
LINK='https://techdocs.zebra.com/emdk-for-android/7-3/synthetic/tutorial/'
def fixture():
    op={'schema':'zebra-paragraph-after/v1','case_id':'SYNTHETIC','run_id':'CAPTURE-'+'a'*24,'source_version':'7-3',
        'source_sha256':digest(BASE),'paragraph_sha256':digest(b'<p>Synthetic paragraph</p>'),'step':1,
        'segments':[{'kind':'text','text':'Synthetic '},{'kind':'code','text':'read()'},{'kind':'link','text':'Fixture','url':LINK}]}
    trust={k:op[k] for k in ('case_id','run_id','source_version','source_sha256','paragraph_sha256')}
    trust.update(schema='zebra-trusted-local-operation/v1',scope='LOCAL_RENDERED_COPY_ONLY',
                 operation_sha256=digest(canonical(op)),allowed_link=LINK)
    return op,trust
def invoke(op,trust,pin=None,baseline=BASE):
    t=canonical(trust)
    return authorize_local_operation(operation_bytes=canonical(op),trust_bytes=t,
        operator_trust_sha256=pin or digest(t),baseline_bytes=baseline)
class TestTrustedOperation(unittest.TestCase):
    def test_fixture_accepts_and_only_returns_local_renderer_arguments(self):
        op,trust=fixture()
        self.assertEqual(invoke(op,trust),{'operation':op,'approved_operation_sha256':trust['operation_sha256'],'allowed_link':LINK})
    def test_modified_capture_cannot_reseal_independent_trust(self):
        op,trust=fixture();pin=digest(canonical(trust))
        op['segments'][0]['text']='Changed '
        with self.assertRaises(ValueError):invoke(op,trust,pin)
        trust['operation_sha256']=digest(canonical(op))
        with self.assertRaises(ValueError):invoke(op,trust,pin)
        op['operator_trust_sha256']=pin
        with self.assertRaises(ValueError):invoke(op,trust)
    def test_renderer_target_identity_and_link_are_guarded(self):
        op,trust=fixture()
        with self.assertRaises(ValueError):invoke(op,trust,baseline=BASE+b' ')
        for url in (LINK.replace('7-3','7-4'),LINK.replace('techdocs.zebra.com','example.org'),LINK+'?query=x',LINK.replace('synthetic/','../')):
            mutated=copy.deepcopy(op);candidate=dict(trust);candidate['allowed_link']=url;mutated['segments'][2]['url']=url
            candidate['operation_sha256']=digest(canonical(mutated))
            with self.assertRaises(ValueError):invoke(mutated,candidate)
    def test_duplicate_json_key_and_scope_elevation_rejected(self):
        op,trust=fixture()
        raw=canonical(op).replace(b'"step":1',b'"step":1,"step":2')
        t=canonical(trust)
        with self.assertRaises(ValueError):
            authorize_local_operation(operation_bytes=raw,trust_bytes=t,operator_trust_sha256=digest(t),baseline_bytes=BASE)
        trust['scope']='PUBLISH'
        with self.assertRaises(ValueError):invoke(op,trust)
