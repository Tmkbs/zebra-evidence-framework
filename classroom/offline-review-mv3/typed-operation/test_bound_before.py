"""Synthetic fixtures exercise the actual receipt/locator chain, not production approval."""
import unittest
from bound_cli import bound_copy
from structured_locator import locate
from trusted_operation import BEFORE, TRUST, canonical, digest

SECTION='settings'
TARGET='review-note'
SOURCE='https://techdocs.zebra.com/emdk-for-android/3-1/guide/settings/'
CASE='SYNTHETIC-BOUND'
RUN='CAPTURE-'+'e'*24
PARA='<p>Example <code>setting</code>.</p>'
BASE=('<main><article><h2 id="settings">Settings</h2>'+PARA+'<h2>Other</h2>'+PARA+'</article></main>').encode()
INSERT='<p class="proposal" id="review-note">Test clarification.</p>'

def scenario(kind='paragraph', source=SOURCE, edition='3-1'):
    capture={'source_kind':'techdocs','source_url':source,'truncated':True,
             'blocks':[{'kind':'heading','anchor':SECTION,'level':2,'text':'Settings'},
                       {'kind':kind,'text':'Example setting.'}]}
    capture_pin=digest(canonical(capture))
    intake=canonical(dict(schema='zebra-correlated-intake/v1',intake=dict(
        schema='zebra-doc-capture-intake/v1', stage='CAPTURE_REVIEW_REQUIRED',proposed_revision=None,
        release={'publication':False},case={'id':CASE},run_id=RUN,document_snapshot={'source_version_from_url':edition},
        capture_binding={'captures':[{'kind':'techdocs','url':source,'sha256':capture_pin}],
                         'structured_sources':{'techdocs':capture}})))
    op=dict(schema=BEFORE,case_id=CASE,run_id=RUN,source_version=edition,source_sha256=digest(BASE),
            paragraph_sha256=digest(PARA.encode()),section_anchor=SECTION,target_anchor=TARGET,
            segments=[{'kind':'text','text':'Test clarification.'}])
    op_bytes=canonical(op)
    trust=canonical({k:op[k] for k in ('case_id','run_id','source_version','source_sha256','paragraph_sha256')}|
                    dict(schema=TRUST,scope='LOCAL_RENDERED_COPY_ONLY',operation_sha256=digest(op_bytes),allowed_link=None))
    expected=BASE.replace(PARA.encode(),(INSERT+PARA).encode(),1)
    review=canonical(dict(schema='zebra-local-review-binding/v1',scope='PREVIOUSLY_REVIEWED_LOCAL_PARITY_ONLY',
         allows_publication=False,intake_sha256=digest(intake),baseline_sha256=digest(BASE),clean_sha256=digest(expected),
         case_id=CASE,run_id=RUN,source_version=edition,operation_sha256=digest(op_bytes),evidence=[source]))
    options=dict(operation_bytes=op_bytes,trust_bytes=trust,operator_trust_sha256=digest(trust),baseline_bytes=BASE,
         review_bytes=review,review_sha256=digest(review),intake_bytes=intake,source_url=source,source_anchor=SECTION,target_anchor=TARGET)
    return options, expected, capture, capture_pin

class BoundBeforeTests(unittest.TestCase):
    def test_receipt_preserves_binding_and_resolves_same_native_paragraph(self):
        options,expected,capture,pin=scenario()
        copied,r=bound_copy(**options)
        self.assertEqual(copied,expected)
        self.assertEqual((r['operation_schema'],r['case_id'],r['run_id'],r['capture_sha256'],r['working_copy_sha256']),
                         (BEFORE,CASE,RUN,pin,digest(expected)))
        self.assertEqual((r['source_anchor'],r['target_anchor'],r['publication']),(SECTION,TARGET,'NOT_AUTHORIZED'))
        self.assertFalse(r['original_modified'])
        proof=locate(capture=capture,receipt=r,baseline=BASE,intake_bytes=options['intake_bytes'],
                     intake_sha256=digest(options['intake_bytes']))
        self.assertEqual(proof['locator'],dict(section_anchor=SECTION,block_kind='paragraph',section_block_index=0,
                                               block_sha256=digest(b'Example setting.')))
        self.assertTrue(proof['capture_truncated'])
        self.assertFalse(proof['archive_overlay_eligible'])
    def test_nested_rfid_receipt_checks_the_exact_versioned_family(self):
        base='https://techdocs.zebra.com/dcs/rfid/android/'
        source=base+'2-0-5-292/tutorials/usbsupport/'
        args,expected,_,pin=scenario(source=source,edition='2-0-5-292')
        copied,receipt=bound_copy(**args)
        self.assertEqual(copied,expected)
        self.assertEqual((receipt['source_url'],receipt['source_version'],receipt['capture_sha256']),
                         (source,'2-0-5-292',pin))
        self.assertEqual(receipt['publication'],'NOT_AUTHORIZED')
        for bad in (source.replace('292','291'),source.replace('2-0-5-292','latest'),
                    source.replace('/android/','/maui-android/'),source.replace('/rfid/','/other/'),
                    source.replace('/tutorials/','/../'),base+'2-0-5-292/',
                    source.replace('/tutorials/','//tutorials/'),
                    source.replace('/tutorials/','/internal/'),source.replace('/tutorials/','/Sign-In_help/'),
                    base+'2-0-5-292/foo.PDF'):
            args,_,_,_=scenario(source=bad,edition='2-0-5-292')
            with self.subTest(source=bad),self.assertRaises(ValueError):bound_copy(**args)

    def test_reject_mismatched_anchors_and_review_pin(self):
        options,_,_,_=scenario()
        for patch in ({'source_anchor':'other'},{'target_anchor':'replacement'},{'review_sha256':'0'*64}):
            with self.subTest(patch=patch),self.assertRaises(ValueError):bound_copy(**(options|patch))
    def test_before_does_not_project_a_list_item_or_legacy_step(self):
        options,_,capture,_=scenario('list_item')
        _,r=bound_copy(**options)
        args=dict(capture=capture,receipt=r,baseline=BASE,intake_bytes=options['intake_bytes'],intake_sha256=digest(options['intake_bytes']))
        with self.assertRaises(ValueError):locate(**args)
        options,_,capture,_=scenario()
        _,r=bound_copy(**options)
        with self.assertRaises(ValueError):
            locate(capture=capture,receipt=r,baseline=BASE,step=1,intake_bytes=options['intake_bytes'],
                   intake_sha256=digest(options['intake_bytes']))
