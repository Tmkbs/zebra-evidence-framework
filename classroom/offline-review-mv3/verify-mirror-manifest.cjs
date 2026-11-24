'use strict';
const {createHash}=require('node:crypto');
const fail=()=>{throw new Error('Mirror manifest does not match approved TechDocs capture metadata.');};
function verifyMirrorManifest(manifest,capture) {
 if(manifest?.schema_version!=='zebra-offline-site/v1'||capture?.source_kind!=='techdocs'||
    !Array.isArray(manifest.allowed_origins)||!Array.isArray(manifest.roots)||!Array.isArray(manifest.pages)||
    manifest.pages.length<1||manifest.pages.length>75||manifest.captured_pages!==manifest.pages.length)fail();
 const match=manifest.pages.filter(p=>p?.source_url===capture.source_url);
 if(match.length!==1||!manifest.allowed_origins.includes(new URL(capture.source_url).origin))fail();
 const row=match[0];
 if(row.source_kind!==capture.source_kind||row.captured_at!==capture.captured_at||
    row.blocks!==capture.blocks.length||row.capture_truncated!==capture.truncated||
    typeof row.path!=='string'||!/^pages\/\d{3}\.html$/u.test(row.path)||row.path.length!==14||
    manifest.pages.filter(p=>p?.path===row.path).length!==1)fail();
 // This hashes the parsed manifest only, not the original ZIP or mirror document bytes.
 const manifest_record_sha256=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
 return {schema:'zebra-mirror-intake-correlation/v1',status:'METADATA_MATCH_ONLY',
  source_url:capture.source_url,mirror_path:row.path,manifest_record_sha256,
  mirror_content_authenticated:false};
}
module.exports={verifyMirrorManifest};
