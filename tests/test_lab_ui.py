import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

HERE=Path(__file__).resolve().parents[1]
async def main():
  async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=await browser.new_context(viewport={'width':1366,'height':920},accept_downloads=True)
    page=await context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    calls=[]
    async def api(route):
      path=route.request.url
      if path.endswith('/api/status'):
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps({'bridge':'local','configured':True,'modelHint':'fake-qwen','requiresCampusOrVpn':True}),headers={'Access-Control-Allow-Origin':'*'})
      if path.endswith('/api/models'):
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps({'models':['fake-qwen']}),headers={'Access-Control-Allow-Origin':'*'})
      if path.endswith('/api/run'):
        args=json.loads(route.request.post_data)
        calls.append(args)
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps({'model':'fake-qwen','requestedModel':args['model'],'response':'Provisional answer: needs a device test.','messages':[{'role':'system','content':'test'}, {'role':'user','content':'same prompt'}],'parameters':{'temperature':0.2,'top_p':0.95,'max_tokens':900},'usage':{'total_tokens':13},'elapsedMs':12,'createdAt':'2026-11-11T19:00:00Z','reviewStatus':'CAPTURED_NOT_REVIEWED','sourceReviewOnly':True}),headers={'Access-Control-Allow-Origin':'*'})
      return await route.abort()
    await page.route('**/api/**',api)
    html=(HERE/'index.html').read_text()
    html=html.replace('<head>','<head><base href="http://127.0.0.1:8765/">',1)
    await page.set_content(html,wait_until='load')
    assert await page.locator('#stat-cases').inner_text()=='3'
    await page.locator('[data-view=lab]').click()
    assert await page.locator('#lab-run').is_disabled()
    await page.locator('#lab-check').click()
    await page.wait_for_function("document.getElementById('lab-status').textContent.includes('configured')")
    await page.locator('#lab-models').click()
    await page.wait_for_function("document.getElementById('lab-model').value==='fake-qwen'")
    await page.locator('#lab-approve').check()
    assert await page.locator('#lab-run').is_enabled()
    await page.locator('#lab-run').click()
    await page.wait_for_function("document.getElementById('lab-run-status').textContent.includes('Captured')")
    assert len(calls)==1 and calls[0]['case']['id']=='ZF-WEB-INTEGRATION'
    await page.screenshot(path=str(HERE/'_lab_test.png'),full_page=True)
    assert await page.locator('#lab-output').inner_text()=='Provisional answer: needs a device test.'
    assert await page.locator('#lab-run-list .runitem').count()==1
    await page.locator('#lab-copy-a').click()
    assert await page.locator('#view-models').is_visible()
    assert await page.locator('.model-card[data-slot=A] .model-response').input_value()=='Provisional answer: needs a device test.'
    assert await page.locator('.model-card[data-slot=A] select').first.input_value()==''
    await page.locator('[data-view=export]').click()
    async with page.expect_download() as info: await page.locator('#export-json').click()
    d=await info.value; await d.save_as(HERE/'_lab_fixture.json')
    obj=json.loads((HERE/'_lab_fixture.json').read_text())
    assert len(obj['runs'])==1
    assert obj['runs'][0]['messages'][1]['content']=='same prompt'
    assert len(obj['evaluations'])==1
    await page.locator('[data-view=lab]').click()
    async with page.expect_download() as info: await page.locator('#lab-export-runs').click()
    d=await info.value; await d.save_as(HERE/'_lab_runs.csv')
    assert 'fake-qwen' in (HERE/'_lab_runs.csv').read_text('utf-8-sig')
    assert not errors, errors
    await browser.close()
    print(json.dumps({'ui':'PASS','cases':3,'captured_runs':1,'copied_for_manual_review':1,'api_calls_mocked':len(calls),'page_errors':errors}))
asyncio.run(main())