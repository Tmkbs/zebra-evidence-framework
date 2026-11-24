import assert from 'node:assert/strict';
import test from 'node:test';
import {coverageCsv,csvField} from './extension/coverage-csv.js';
test('coverage metadata CSV has stable columns, UTF-8 BOM and CRLF',()=>{
 const result=coverageCsv({schema_version:'zebra-offline-site/v1',pages:[],missing:[{source_url:'https://example.test/page',reason:'not_supplied'}]});
 assert.equal(result.codePointAt(0),0xfeff);
 const [header,record,done]=result.split('\r\n');
 assert.equal(header.split(',').length,16);
 assert.equal(record.split(',').length,16);
 assert.match(record,/"missing_target".*"not_supplied"/);
 assert.equal(done,'');
});
test('quotes delimiters and neutralizes formulas by leading text marker',()=>{
 assert.equal(csvField('样例,"abc"\nlast'),'"样例,""abc""\nlast"');
 for(const raw of ['=1+1','\t+1','\u200b@SUM()','\u00a0-2','\u0001=0']){
  assert.equal(csvField(raw),'"\''+raw+'"');
 }
 assert.equal(csvField(-2),'"-2"');
 assert.equal(csvField(''), '""');
});
