import unittest
from trusted_operation import canonical,digest
from runtime import apply_reviewed_local_copy
class TestStaticCopy(unittest.TestCase):
    def make(self,base,selected=b'<p>Original</p>'):
        op={'schema':'zebra-paragraph-after/v1','case_id':'SYNTHETIC','run_id':'CAPTURE-'+'a'*24,'source_version':'7-3',
            'source_sha256':digest(base),'paragraph_sha256':digest(selected),'step':1,
            'segments':[{'kind':'text','text':'A < B'},{'kind':'code','text':'read()'}]}
        t={k:op[k] for k in ('case_id','run_id','source_version','source_sha256','paragraph_sha256')}
        t.update(schema='zebra-trusted-local-operation/v1',scope='LOCAL_RENDERED_COPY_ONLY',allowed_link=None,operation_sha256=digest(canonical(op)))
        return dict(operation_bytes=canonical(op),trust_bytes=canonical(t),operator_trust_sha256=digest(canonical(t)),baseline_bytes=base)
    def test_one_byte_preserving_additive_copy_and_escaped_inline_code(self):
        base=b'<main><article><ol><li><p>Original</p>\n<p>Next</p></li></ol></article></main>'
        out,receipt=apply_reviewed_local_copy(**self.make(base))
        mark=b'<p class="proposal" id="arming-before-trigger">A &lt; B<code>read()</code></p>'
        self.assertEqual(out,base.replace(b'<p>Next',mark+b'<p>Next'))
        self.assertEqual(receipt['original_sha256'],digest(base))
        self.assertEqual(receipt['publication'],'NOT_AUTHORIZED')
    def test_rejects_wrong_exact_paragraph_and_invalid_shape(self):
        base=b'<main><article><ol><li><p>Original</p></li></ol></article></main>'
        with self.assertRaises(ValueError):apply_reviewed_local_copy(**self.make(base,b'<p>Other</p>'))
        for bad in (base.replace(b'</p>',b''),base.replace(b'<p>',b'<p hidden onclick="noop">'),
                    b'<main><article><ol><li><p>Original</p></li></ol><ol><li><p>Original</p></li></ol></article></main>'):
            with self.assertRaises(ValueError):apply_reviewed_local_copy(**self.make(bad))
