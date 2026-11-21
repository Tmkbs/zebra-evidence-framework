'use strict';
const {createHash}=require('node:crypto');
module.exports=function syntheticFixture() {
 const before='Synthetic heading', originalHtml='<main><h2 id="fixture">'+before+'</h2></main>';
 const source_sha256=createHash('sha256').update(originalHtml).digest('hex');
 const evidence_records=[{id:'SYNTHETIC-1',source_label:'Synthetic',public_url:'https://example.org/synthetic',
   claim:'Synthetic fixture only',scope_limit:'Not a source or endorsement'}];
 const trustedBaseline={schema:'practicum-framework-source/v1',source_sha256,anchor_html:'<h2 id="fixture">'+before+'</h2>',
  before,case_id:'SYNTHETIC-ONLY',forum_url:'https://example.org/forum',question:'Fixture question?',document_id:'DOC-SYNTHETIC',
  bundle_sha256:'1'.repeat(64),source_paragraph_id:'fixture',framework_commit:'a'.repeat(40),practicum_commit:'b'.repeat(40),
  source_version:'0.0-test',source_text:before,evidence_records};
 const after='Synthetic note\n\n'+before;
 const handoff={schema:'research-documentation-handoff/v0.4',fictional_demo:false,document_source_kind:'practicum_public_source',
  case:{id:trustedBaseline.case_id,case_url:trustedBaseline.forum_url,question:trustedBaseline.question,
   document_reference:trustedBaseline.document_id,model_execution_status:'NOT_RUN'},
  practicum_binding:{schema:'practicum-framework-binding/v1',bundle_sha256:trustedBaseline.bundle_sha256,source_sha256,
   source_paragraph_id:trustedBaseline.source_paragraph_id,framework_commit:trustedBaseline.framework_commit,
   practicum_commit:trustedBaseline.practicum_commit,copy_only_acknowledged:true,review_attestation:'LOCAL_UI_NOT_AUTHENTICATED',
   connection:'LOCAL_CODE_ADAPTER_NOT_DEPLOYED',model_execution:'NOT_RUN'},
  proposed_revision:{case_id:trustedBaseline.case_id,document_id:trustedBaseline.document_id,source_version:trustedBaseline.source_version,
   section:trustedBaseline.source_paragraph_id,before,after,rationale:'Synthetic rationale only.',status:'approved_for_retest',
   local_retest_approved:true,customer_publication_approved:false},
  document_snapshot:{original_text:before,selected_paragraph:before,exact_match_count:1,character_count:before.length},
  reviewer_choice:'document_review_only',failure_diagnosis:{category:'clarity'},
  patch_execution:{status:'applied_to_copy',original_modified:false,result_copy:after},
  release:{status:'NOT_AUTHORIZED',publication:false,real_device_validation:'NOT_RUN',customer_acceptance:'NOT_RUN'},
  evidence:evidence_records};
 // Only the existing validator's required shape requires fictional_demo:false;
 // this function and every value above are synthetic and never leave test memory.
 return {handoff,trustedBaseline,originalHtml};
};
