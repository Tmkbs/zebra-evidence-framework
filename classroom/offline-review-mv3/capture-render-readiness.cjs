'use strict';
const {isDeepStrictEqual}=require('node:util');
const {intake}=require('../capture-intake.cjs');
const ANCHOR=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/u;

/** Local read-only readiness projection; it intentionally cannot create a revision. */
function projectCaptureReadiness(record,{sectionAnchor=null}={}) {
 if(record?.schema!=='zebra-doc-capture-intake/v1'||record.stage!=='CAPTURE_REVIEW_REQUIRED'||
    typeof record?.case?.id!=='string')throw new Error('A canonical local capture intake record is required.');
 const sources=record.capture_binding?.structured_sources;
 const canonical=intake({forum:sources?.forum,techdocs:sources?.techdocs,caseId:record.case.id});
 if(!isDeepStrictEqual(canonical,record))throw new Error('Capture intake record differs from the canonical framework result.');
 if(sectionAnchor!==null&&(typeof sectionAnchor!=='string'||sectionAnchor.trim()!==sectionAnchor||!ANCHOR.test(sectionAnchor)))
   throw new Error('Only a captured section anchor can be inspected.');
 const target=canonical.capture_binding.captures.find(c=>c.kind==='techdocs');
 const blocks=canonical.capture_binding.structured_sources.techdocs.blocks;
 const matches=sectionAnchor===null?[]:blocks.filter(b=>b.anchor===sectionAnchor);
 return {
  schema:'zebra-capture-render-readiness/v1',stage:'CAPTURE_REVIEW_REQUIRED',revision_ready:false,
  case_id:canonical.case.id,run_id:canonical.run_id,document_reference:canonical.case.document_reference,
  source_version_from_url:canonical.document_snapshot.source_version_from_url,
  capture:{source_url:target.url,capture_sha256:target.sha256,captured_at:target.captured_at,truncated:target.truncated},
  section:{anchor:sectionAnchor,captured_match_count:matches.length,
   status:sectionAnchor===null?'NOT_SELECTED':matches.length===1?'CAPTURE_MATCH_ONLY':matches.length?'AMBIGUOUS_CAPTURE':'NOT_IN_CAPTURE'},
  blocked_by:['REVIEWED_QUESTION_REQUIRED','AUTHORITATIVE_VERSIONED_ORIGINAL_HTML_AND_PARAGRAPH_BINDING_REQUIRED','EVIDENCE_ASSESSMENT_REQUIRED','REVIEWED_PROPOSAL_REQUIRED'],
  evidence_urls:canonical.evidence.map(e=>e.public_url),unknowns:canonical.unknowns,next_checks:canonical.next_checks,
  model_execution:'NOT_RUN',apply_allowed:false,export_to_handoff_allowed:false,publication:'NOT_AUTHORIZED'
 };
}
module.exports={projectCaptureReadiness};
