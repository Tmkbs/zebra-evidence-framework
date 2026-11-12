import json
import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import lab_proxy

CASE = {
    "id": "TEST-01",
    "question": "Can a web button start scanning?",
    "evidence": "The editorial review describes a native scan start command.",
    "gap": "No browser bridge verified.",
    "sourceUrl": "https://developer.zebra.com/",
    "docUrl": "https://techdocs.zebra.com/",
}


class FakeLab(BaseHTTPRequestHandler):
    requests = []
    def log_message(self, *args):
        pass
    def reply(self, data):
        raw = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
    def do_GET(self):
        if self.path == "/v1/models":
            return self.reply({"data": [{"id": "fake-qwen"}]})
        self.send_error(404)
    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        FakeLab.requests.append(json.loads(raw))
        self.reply({"model": "fake-qwen", "choices": [{"message": {"content": "Provisional answer. Need real device/version."}}],
                    "usage": {"prompt_tokens": 110, "completion_tokens": 7, "total_tokens": 117}})


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.upstream = ThreadingHTTPServer(("127.0.0.1", 0), FakeLab)
        cls.t1 = threading.Thread(target=cls.upstream.serve_forever, daemon=True)
        cls.t1.start()
        c = {
            "api_base": f"http://127.0.0.1:{cls.upstream.server_port}/v1",
            "api_key": "",
            "model": "fake-qwen",
            "webroot": Path(lab_proxy.__file__).resolve().parent,
        }
        cls.proxy = ThreadingHTTPServer(("127.0.0.1", 0), lab_proxy.make_handler(c))
        cls.t2 = threading.Thread(target=cls.proxy.serve_forever, daemon=True)
        cls.t2.start()
        cls.root = f"http://127.0.0.1:{cls.proxy.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.proxy.shutdown(); cls.upstream.shutdown()
        cls.proxy.server_close(); cls.upstream.server_close()

    def get(self, path):
        with urlopen(self.root+path) as r: return json.loads(r.read())

    def post(self, value, headers=None):
        req = Request(self.root+"/api/run", data=json.dumps(value).encode(),
                      headers={"Content-Type": "application/json", **(headers or {})}, method="POST")
        with urlopen(req) as r: return json.loads(r.read())

    def test_status_reports_local_bridge_without_url_or_key(self):
        d=self.get('/api/status')
        self.assertEqual(d['bridge'],'local')
        self.assertTrue(d['configured'])
        self.assertNotIn('127.0.0.1',json.dumps(d))
        self.assertNotIn('api_key',json.dumps(d))

    def test_model_discovery(self):
        self.assertEqual(self.get('/api/models')['models'],['fake-qwen'])

    def test_mocked_run_records_input_and_output(self):
        result=self.post({'case':CASE,'model':'fake-qwen'})
        self.assertEqual(result['model'],'fake-qwen')
        self.assertEqual(result['usage']['total_tokens'],117)
        self.assertIn('Provisional answer',result['response'])
        self.assertEqual(result['reviewStatus'],'CAPTURED_NOT_REVIEWED')
        self.assertTrue(result['sourceReviewOnly'])
        self.assertEqual(FakeLab.requests[-1]['temperature'],0.2)
        self.assertIn('not the official text',result['messages'][1]['content'])
        self.assertEqual(result['parameters']['max_tokens'],900)

    def test_blocks_cross_origin_writes(self):
        with self.assertRaises(HTTPError) as c:
            self.post({'case':CASE}, {'Origin':'https://evil.example'})
        self.assertEqual(c.exception.code,403)

    def test_blocks_invalid_case(self):
        with self.assertRaises(HTTPError) as c:
            self.post({'case':{'id':'a','question':''}})
        self.assertEqual(c.exception.code,400)

    def test_serves_only_entrypoint(self):
        with urlopen(self.root+'/index.html') as r:
            page=r.read().decode()
        self.assertIn('Connect the lab API',page)
        with self.assertRaises(HTTPError) as c:
            urlopen(self.root+'/../../etc/passwd')
        self.assertEqual(c.exception.code,404)

    def test_prompt_is_deterministic(self):
        self.assertEqual(lab_proxy.build_messages(CASE),lab_proxy.build_messages(CASE))


class OfflineTests(unittest.TestCase):
    def test_no_config_no_network(self):
        c={"api_base":"", "api_key":"", "model":"fake", "webroot":Path(lab_proxy.__file__).resolve().parent}
        handler=lab_proxy.make_handler(c)
        s=ThreadingHTTPServer(("127.0.0.1",0),handler)
        t=threading.Thread(target=s.serve_forever,daemon=True);t.start()
        url=f"http://127.0.0.1:{s.server_port}/api/status"
        with urlopen(url) as r: self.assertFalse(json.loads(r.read())['configured'])
        s.shutdown();s.server_close()

if __name__=='__main__': unittest.main()