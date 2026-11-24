/* Read-only companion for a published team reader. No remote fetch, forum
 * posting, model call, personal data, or duplicate case catalog.
 * Public reader keys are not ZF IDs and never count as new cases.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.ZebraTeamVisual=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const key="dw62-intent-receiver";
const reader="https://zebra-techdocs-practicum.vercel.app/document-reader/dw62-intent-receiver/index.html#receiving-app-intent-filter";
const archiveCommit="922f359fe59e4cce01420af7e234cf016d93171c";
const archivePath="Zebra_Forum_Backup_2026-10-26/offline-structured-forum-20261027-v3/pages/89377fa2869e7f7ff472418f.html";
const archive="https://github.com/1235357/zebra-public-site-archive/blob/"+archiveCommit+"/"+archivePath;
const report="https://developer.zebra.com/content/datawedge-broadcast-intents-are-not-being-delivered";
const release="https://github.com/1235357/zebra-public-site-archive/blob/"+archiveCommit+"/README.md";
const title="Why a successful test broadcast does not establish scan delivery";
const context="Archived public developer report: TC700K, Android 6.0.1, DataWedge 6.2.23, Xamarin context-registered receiver. The author reported receiving ADB broadcasts, but not DataWedge broadcast intents. These observations have not been independently reproduced.";
const question="Why can a Xamarin app receive a test broadcast sent through ADB, but not receive the configured DataWedge Intent Output?";
const frozen=Object.freeze({key,reader_url:reader,report_url:report,archive_url:archive,release_note_url:release,archive_commit:archiveCommit,archive_blob_sha:"6e5f61f606380955a8354da8d57994da4e1c5431",release:"r61",catalog_release_observed:"r62",reported_version:"6.2.23",reader_document_edition:"6.2",product:"datawedge",title,question,context});
function get(readerKey){return readerKey===key?{...frozen}:null}
function keyFromSearch(search){
 if(typeof search!=="string"||search.length>160)return null;
 const params=new URLSearchParams(search);
 if([...params.keys()].some(k=>k!=="reader")||params.getAll("reader").length!==1)return null;
 return get(params.get("reader"))?.key||null;
}
function handoff(readerKey){
 const r=get(readerKey);if(!r)return null;
 return {schema:"zebra-team-visual-handoff/v1",reader_key:r.key,question:r.question,question_origin:"paraphrased_public_report_not_blind_test",product:r.product,
  context:r.context,reported_version:r.reported_version,reader_document_edition:r.reader_document_edition,version:"",source_urls:[],case_id:"",
  reader_url:r.reader_url,report_url:r.report_url,archive_url:r.archive_url,official_source_verified:false,device_tested:false,model_calls:0};
}
function graph(readerKey){
 const r=get(readerKey);if(!r)return null;
 const observed=(section,quote)=>({origin:"public_forum_report",section,quote,url:report,archive_url:archive,archive_blob_sha:r.archive_blob_sha});
 const citedRelease={origin:"team_release_note",section:"r61 review summary",url:release,quote:"separates a test broadcast from scan delivery"};
 const nodes=[
  {id:"report",title:"Reported setup",caption:"TC700K · DataWedge 6.2.23",status:"reported",detail:"The public report names an Android 6.0.1 device and a Xamarin app with a context-registered broadcast receiver. This is historical self-report, not current device telemetry.",evidence:[observed("Reported version","My datawedge version is 6.2.23 on Android 6.0.1 running on TC700K.")]},
  {id:"test",title:"ADB test path",caption:"Reported received",status:"reported",detail:"The author tested broadcasts using ADB and reported that the app received them. The result concerns the tested broadcast; it does not establish delivery of a DataWedge scan event.",evidence:[observed("Reported test","I have verified that my app receives the intents when I broadcast them via ADB.")]},
  {id:"scan",title:"DataWedge path",caption:"Reported not received",status:"check",detail:"The author configured a profile for broadcast intents but reported no delivery. The post does not establish which upstream or downstream condition caused the failure.",evidence:[observed("Reported symptom","I have created a profile in DW that should output broadcast intents, but my app never receives them.")]},
  {id:"boundary",title:"Separate the two paths",caption:"Cause unresolved",status:"check",detail:"Treat the successful test as one observation, not a diagnosis. Ask which profile is active, which output configuration applies, and what is actually observed on the intended scan path. Check the matching official article before giving an API-specific instruction. The team's release note identifies this same distinction; it is not independent proof.",evidence:[citedRelease]}
 ];
 return {schema:"zebra-visual-guide/v1",kind:"reported_path_comparison",title:r.title,summary:"Compare two reported observations without inferring a device fix.",columns:[["report"],["test","scan"],["boundary"]],links:[
 {from:"report",to:"test",relation:"reported_test_path"},{from:"report",to:"scan",relation:"reported_scan_path"},{from:"test",to:"boundary",relation:"compare_reported_observations"},{from:"scan",to:"boundary",relation:"compare_reported_observations"}],
 nodes,next:{id:"boundary",text:"A successful ADB test alone does not establish DataWedge scan delivery. Compare the actual scan path with the selected profile and receiver context."},controls:[],state:{},device_tested:false,visual_model_calls:0,observation_status:"archived_public_self_report_unverified",publication_approved:false};
}
function checkpoint(readerKey,choice){
 if(!get(readerKey)||!["yes","no","unknown"].includes(choice))return null;
 return {schema:"zebra-team-visual-check/v1",reader_key:readerKey,choice,correct:choice==="no",feedback:choice==="no"?"Correct. The ADB test does not establish delivery from the configured DataWedge profile.":"The report only establishes what the author observed in the ADB test. It does not establish the complete scan-delivery path.",scope:"single_optional_concept_check_not_evaluation",device_tested:false};
}
return Object.freeze({get,keyFromSearch,handoff,graph,checkpoint,defaultReader:key});
});
