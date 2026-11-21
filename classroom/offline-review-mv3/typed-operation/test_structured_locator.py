import unittest
from structured_locator import locate,verify_explicit_locator_grant
from trusted_operation import canonical,digest
BASE=b'<main><article><h2 id="sample">Sample</h2><ol><li><p>First <code>read()</code>\n now</p></li></ol></article></main>'
def args():
  capture={'source_kind':'techdocs','source_url':'https://techdocs.zebra.com/emdk-for-android/7-3/samples/barcode/',
    'blocks':[{'kind':'heading','anchor':'sample','level':2,'text':'Sample'},
              {'kind':'list_item','text':'First read() now'}, {'kind':'heading','anchor':'later','level':2,'text':'Later'},
              {'kind':'list_item','text':'First read() now'}], 'truncated':True}
  receipt={'schema':'zebra-bound-typed-copy/v1','source_url':capture['source_url'],'source_anchor':'sample','case_id':'FIXTURE',
    'run_id':'CAPTURE-'+'b'*24,'capture_sha256':'a'*64,'source_sha256':digest(BASE),
    'paragraph_sha256':digest(b'<p>First <code>read()</code>\n now</p>')}
  intake=canonical({'schema':'zebra-correlated-intake/v1','intake':{'stage':'CAPTURE_REVIEW_REQUIRED','case':{'id':'FIXTURE'},
     'run_id':receipt['run_id'],'capture_binding':{'structured_sources':{'techdocs':capture},
     'captures':[{'kind':'techdocs','url':capture['source_url'],'sha256':receipt['capture_sha256']}]}}})
  return dict(capture=capture,receipt=receipt,baseline=BASE,step=1,intake_bytes=intake,intake_sha256=digest(intake))
class StructuredLocatorTest(unittest.TestCase):
  def test_projected_list_item_is_not_native_anchor_or_grant(self):
    proof=locate(**args())
    self.assertEqual(proof['locator']['section_block_index'],0)
    self.assertEqual(proof['locator']['block_kind'],'list_item')
    self.assertIsNone(proof['native_capture_anchor'])
    self.assertTrue(proof['capture_truncated'])
    self.assertFalse(proof['archive_overlay_eligible'])
  def test_external_pin_only_and_missing_source_drift(self):
    a=args();proof=locate(**a)
    keys=('case_id','run_id','source_url','capture_sha256','baseline_sha256','paragraph_sha256','locator','capture_truncated')
    grant=canonical({**{k:proof[k] for k in keys},'schema':'zebra-reviewed-structured-locator/v1','scope':'LOCAL_LOCATOR_BINDING_ONLY'})
    verified=verify_explicit_locator_grant(proof=proof,grant_bytes=grant,operator_grant_sha256=digest(grant))
    self.assertEqual(verified['status'],'OPERATOR_PINNED_LOCATOR_MATCH')
    self.assertNotIn('native_capture_anchor',verified)
    self.assertNotIn('block_index_zero_based',verified)
    self.assertFalse(verified['archive_overlay_eligible'])
    with self.assertRaises(ValueError):verify_explicit_locator_grant(proof=proof,grant_bytes=grant+b' ',operator_grant_sha256=digest(grant))
    a['capture']['blocks'][1]['text']+='Changed'
    with self.assertRaises(ValueError):locate(**a)
