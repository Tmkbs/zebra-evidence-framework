const omissionKeys=['invalid_url','cross_origin','link_budget','depth_budget','not_supplied','missing_fragment'];
const headings=['record_type','source_url','archive_path','source_kind','captured_at_utc','depth','captured_blocks','capture_truncated','link_discovery',...omissionKeys,'reason'];

// Spreadsheet import may ignore leading white space or control characters.
export function csvField(value){
 const raw=value===null||value===undefined?'':String(value);
 const cell=typeof value==='string'&&/^[\s\p{Cc}\p{Cf}]*[=+\-@]/u.test(raw)?"'"+raw:raw;
 return '"'+cell.replaceAll('"','""')+'"';
}

/** Presentation of already validated local archive metadata; no source titles or text. */
export function coverageCsv(manifest){
 if(manifest?.schema_version!=='zebra-offline-site/v1'||!Array.isArray(manifest.pages)||!Array.isArray(manifest.missing))
   throw new Error('A validated local archive manifest is required.');
 const rows=manifest.pages.map(row=>['rendered_capture',row.source_url,row.path,row.source_kind,row.captured_at,row.depth,row.blocks,
   row.capture_truncated,row.link_discovery,...omissionKeys.map(key=>row.omitted_links[key]),'']);
 for(const row of manifest.missing)rows.push(['missing_target',row.source_url,'','','','','','','',...omissionKeys.map(()=>''),row.reason]);
 return '\ufeff'+[headings,...rows].map(row=>row.map(csvField).join(',')).join('\r\n')+'\r\n';
}
