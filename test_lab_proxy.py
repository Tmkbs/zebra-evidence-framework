"""Local regression checks for the optional Zebra lab adapter.

No network traffic leaves localhost; the upstream model API is always mocked.
Run: python -m unittest -v test_lab_proxy.py
"""
import json
import os
import threading
import unittest
from contextlib import contextmanager
from http.server import ThreadingHTTPServer
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import lab_proxy


CASE = {
    "id": "ZF-WEB-INTEGRATION",
    "question": "Can a web app start and stop scanning?",
    "evidence": "DataWedge 15.0 documents software scan trigger commands.",
    "gap": "Browser bridge and installed version remain unknown.",
    "docUrl": "https://techdocs.zebra.com/datawedge/15-0/guide/api/softscantrigger/",
    "sourceUrl": "https://developer.zebra.com/",
}


@contextmanager
def local_bridge(api_base=""):
    config = {"api_base": api_base, "api_key": "", "model": "test-model",
              "webroot": lab_proxy.Path(__file__).resolve().parent}
    server = ThreadingHTTPServer(("127.0.0.1", 0), lab_proxy.make_handler(config))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield "http://127.0.0.1:%d" % server.server_port
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def json_request(url, method="GET", payload=None, headers=None):
    data = json.dumps(payload).encode() if payload is not None else None
    request = Request(url, data=data, method=method, headers=headers or {})
    if payload is not None:
        request.add_header("Content-Type", "application/json")
    try:
        with urlopen(request, timeout=5) as response:
            return response.status, json.load(response)
    except HTTPError as e:
        return e.code, json.load(e)


class TestLabProxy(unittest.TestCase):
    def test_prompt_is_deterministic(self):
        a = lab_proxy.build_messages(CASE)
        b = lab_proxy.build_messages(dict(CASE))
        self.assertEqual(a, b)
        self.assertEqual(a[0]["role"], "system")
        self.assertIn("not the official text", a[1]["content"])
        self.assertIn("ZF-WEB-INTEGRATION", a[1]["content"])

    def test_missing_case_identity_rejected(self):
        for missing in ("id", "question"):
            case = CASE.copy()
            case[missing] = ""
            with self.assertRaises(ValueError):
                lab_proxy.build_messages(case)

    def test_non_text_and_oversized_fields_rejected(self):
        case = CASE.copy()
        case["evidence"] = ["unsafe"]
        with self.assertRaises(ValueError):
            lab_proxy.build_messages(case)
        case = CASE.copy()
        case["evidence"] = "x" * 15000
        with self.assertRaises(ValueError):
            lab_proxy.build_messages(case)

    def test_config_normalizes_base_and_denies_url_credentials(self):
        with patch.dict(os.environ, {"ZEBRA_LAB_API_BASE": "http://example.invalid:8080/v1/chat/completions"},
                        clear=True):
            self.assertEqual(lab_proxy.get_config()["api_base"], "http://example.invalid:8080/v1")
        with patch.dict(os.environ, {"ZEBRA_LAB_API_BASE": "http://user:secret@example.invalid:8080/v1"},
                        clear=True):
            with self.assertRaises(ValueError):
                lab_proxy.get_config()

    def test_offline_status_and_model_list_fails_closed(self):
        with local_bridge() as base:
            status, data = json_request(base + "/api/status")
            self.assertEqual(status, 200)
            self.assertFalse(data["configured"])
            status, data = json_request(base + "/api/models")
            self.assertEqual(status, 503)
            self.assertIn("not configured", data["error"])

    def test_offline_run_refused(self):
        with local_bridge() as base:
            status, data = json_request(base + "/api/run", "POST", {"case": CASE, "model": "test-model"})
            self.assertEqual(status, 503)
            self.assertIn("not configured", data["error"])

    def test_case_is_not_sent_to_upstream_for_disallowed_origin(self):
        with local_bridge("http://example.invalid:8080/v1") as base:
            request = Request(base + "/api/run", method="POST",
                              data=json.dumps({"case": CASE}).encode(),
                              headers={"Content-Type": "application/json", "Origin": "https://attacker.invalid"})
            with self.assertRaises(HTTPError) as error:
                urlopen(request, timeout=5)
            self.assertEqual(error.exception.code, 403)

    def test_run_uses_frozen_prompt_and_captures_unreviewed_response(self):
        with local_bridge("http://example.invalid:8080/v1") as base:
            with patch.object(lab_proxy, "urlopen") as upstream:
                reply = {"model": "test-model", "choices": [{"message": {"content": "Provisional answer"}}],
                         "usage": {"prompt_tokens": 30, "completion_tokens": 9}}
                response = upstream.return_value.__enter__.return_value
                response.read.return_value = json.dumps(reply).encode()
                status, result = json_request(base + "/api/run", "POST", {"case": CASE, "model": "test-model"})
                self.assertEqual(status, 200)
                self.assertEqual(result["response"], "Provisional answer")
                self.assertEqual(result["reviewStatus"], "CAPTURED_NOT_REVIEWED")
                self.assertTrue(result["sourceReviewOnly"])
                self.assertEqual(result["usage"]["prompt_tokens"], 30)
                outbound = upstream.call_args.args[0]
                self.assertTrue(outbound.full_url.endswith("/v1/chat/completions"))
                sent = json.loads(outbound.data)
                self.assertEqual(sent["messages"], lab_proxy.build_messages(CASE))
                self.assertFalse(sent["stream"])
                self.assertLessEqual(sent["max_tokens"], 900)


if __name__ == "__main__":
    unittest.main()
