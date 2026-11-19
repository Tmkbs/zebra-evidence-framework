const test=require('node:test');
const assert=require('node:assert/strict');
const deps=require('../capture-intake.cjs');
const {createReviewedPairAdapter}=require('./reviewed-pair.cjs');
const api=createReviewedPairAdapter(deps);
const make=(kind,url)=>({schema_version:'zebra-doc-capture/v1',source_url:url,source_kind:kind,
 captured_at:'2026-11-19T12:00:00.000Z',title:'Synthetic fixture',blocks:[{kind:'paragraph',text:'Test text.'}],truncated:false});
function fixture() {
 const f=make('forum','https://developer.zebra.com/content/sample-forum-question');
 const d=make('techdocs','https://techdocs.zebra.com/datawedge/15-0/guide/api/softscantrigger/');
 const entry=packet=>({packet,review:{source_url:packet.source_url,sha256:api.inspect(packet,packet.source_url).sha256,approved_for_local_intake:true}});
 return {forum:entry(f),techdocs:entry(d)};
}
test('paired popup plain JSON preserves exact upstream evidence and remains non-applicable',()=>{
 const pair=fixture(), output=api.run(pair);
 assert.deepEqual(output,deps.intake({forum:pair.forum.packet,techdocs:pair.techdocs.packet}));
 assert.equal(output.case.model_execution_status,'NOT_RUN');
 assert.equal(output.capture_binding.association,'USER_SELECTED_NOT_VERIFIED');
 assert.deepEqual(output.evidence.map(x=>x.public_url),[pair.forum.packet.source_url,pair.techdocs.packet.source_url]);
 assert.equal(output.capture_binding.captures[1].sha256,pair.techdocs.review.sha256);
});
test('fails closed on missing approval, substituted URLs or altered review bytes',()=>{
 const pair=fixture();pair.forum.review.approved_for_local_intake=false;
 assert.throws(()=>api.run(pair),/Explicit review/);
 pair.forum.review.approved_for_local_intake=true;
 const original=pair.forum.review.source_url;pair.forum.review.source_url=pair.techdocs.packet.source_url;
 assert.throws(()=>api.run(pair),/selected public URL/);
 pair.forum.review.source_url=original;
 pair.forum.packet.blocks[0].text+='Changed.';
 assert.throws(()=>api.run(pair),/after preview/);
});
test('fails if upstream begins marking intake as deployable',()=>{
 const breaking=createReviewedPairAdapter({...deps,intake:args=>{
  const out=deps.intake(args);out.downstream_adapter.apply_allowed=true;return out;
 }});
 assert.throws(()=>breaking.run(fixture()),/no handoff returned/);
});
