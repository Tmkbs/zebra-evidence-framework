import json,unittest
from runtime import apply_reviewed_local_copy
from trusted_operation import TRUST,BEFORE,canonical,digest

P='<p>Controls whether to change the default.</p>'
H='<h2 id="set-default-input-method">Set Default Input Method</h2>'
H2='<h2 id="set-default-input-method-1">Set Default Input Method</h2>'
S='<main><article><div>'+H+'<p></p>'+P+H2+P+'</div></article></main>'
def render(source=S,op_override=None,trust_pin_override=None):
    body=source.encode()
    op=dict(schema=BEFORE, case_id='PUBLIC-CASE',run_id='CAPTURE-'+'d'*24,
      source_version='3-1',source_sha256=digest(body),paragraph_sha256=digest(P.encode()),
      section_anchor='set-default-input-method',target_anchor='review-proposal',
      segments=[dict(kind='text',text='Clarification <not markup>.')])
    op.update(op_override or {})
    trust={k:op[k] for k in ('case_id','run_id','source_version','source_sha256','paragraph_sha256')}
    trust.update(schema=TRUST,scope='LOCAL_RENDERED_COPY_ONLY',operation_sha256=digest(canonical(op)),allowed_link=None)
    tb=canonical(trust)
    return apply_reviewed_local_copy(operation_bytes=canonical(op),trust_bytes=tb,
        operator_trust_sha256=trust_pin_override or digest(tb),baseline_bytes=body)
class TestNativeBefore(unittest.TestCase):
    def test_exact_sibling_before_without_touching_source(self):
        copied,r=render()
        marker='<p class="proposal" id="review-proposal">Clarification &lt;not markup&gt;.</p>'
        self.assertEqual(copied.decode(),S.replace(P,marker+P,1))
        self.assertEqual(r['working_copy_sha256'],digest(copied))
        self.assertEqual(r['publication'],'NOT_AUTHORIZED')
        self.assertFalse(r['original_modified'])
    def test_reject_same_section_duplicate(self):
        with self.assertRaises(ValueError):render(S.replace('<p></p>','<p></p>'+P))
    def test_reject_duplicate_native_heading_id(self):
        with self.assertRaises(ValueError):render(S.replace(H2,H))
    def test_reject_missing_native_heading(self):
        with self.assertRaises(ValueError):render(S.replace(H,H.replace(' id="set-default-input-method"','')))
    def test_reject_wrong_boundary(self):
        with self.assertRaises(ValueError):render(S.replace('<p></p>'+P,'<p></p>'))
    def test_reject_reused_overlay_anchor(self):
        with self.assertRaises(ValueError):render(S.replace('<p></p>','<p id="review-proposal"></p>'))
    def test_reject_nested_non_sibling(self):
        with self.assertRaises(ValueError):render(S.replace('<p></p>'+P,'<p></p><div>'+P+'</div>'))
    def test_reject_changed_paragraph_bytes(self):
        with self.assertRaises(ValueError):render(S.replace('the default.','the default!'))
    def test_reject_unapproved_pin(self):
        with self.assertRaises(ValueError):render(trust_pin_override='0'*64)
    def test_reject_unordered_or_nested_landmarks(self):
        for source in ('<article><main>'+H+P+'</main></article>',
                       '<main><article><article>'+H+P+'</article></article></main>',
                       '<main><main><article>'+H+P+'</article></main></main>'):
            with self.subTest(source=source),self.assertRaises(ValueError):render(source)
    def test_reject_target_in_excluded_landmark(self):
        for tag in ('aside','nav','header','footer'):
            with self.subTest(tag=tag),self.assertRaises(ValueError):
                render(f'<main><article><{tag}>'+H+P+f'</{tag}></article></main>')
    def test_reject_wrapped_peer_boundary(self):
        with self.assertRaises(ValueError):
            render('<main><article><div>'+H+'<div>'+H2+'</div>'+P+'</div></article></main>')
    def test_reject_unclosed_or_structural_heading_content(self):
        for heading in (H.replace('</h2>',''), H.replace('</h2>',P+'</h2>'),
                        H.replace('</h2>','<div></div></h2>')):
            with self.subTest(heading=heading),self.assertRaises(ValueError):
                render('<main><article>'+heading+P+'</article></main>')
    def test_reject_duplicate_unrelated_native_anchor(self):
        with self.assertRaises(ValueError):
            render('<main><article>'+H+'<p id="other"></p><p id="other"></p>'+P+'</article></main>')
    def test_ordered_wrappers_and_inline_heading(self):
        heading=H.replace('Set Default Input Method','<em>Set Default Input Method</em>')
        source='<html><body><main><div><article><section>'+heading+P+'</section></article></div></main></body></html>'
        self.assertIn('Clarification &lt;not markup&gt;.</p>'+P,render(source)[0].decode())
