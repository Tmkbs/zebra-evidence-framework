import copy
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import agent_relay as relay

class RelayTests(unittest.TestCase):
    def setUp(self):
        self.task = {
            "title":"Evidence-based review",
            "goal":"Check repeated issues without inventing validation.",
            "constraints":["Public evidence only"],
            "public_references":["https://github.com/Tmkbs/zebra-evidence-framework"],
            "acceptance_checks":["No false fixes"],
        }
    def test_public_task(self):
        self.assertIn("Evidence-based", relay.public_task(self.task))
    def test_reject_unknown_fields(self):
        t = dict(self.task, private_notes="customer@example.com")
        with self.assertRaises(ValueError): relay.public_task(t)
    def test_reject_internal_url(self):
        t = copy.deepcopy(self.task)
        t["public_references"]=["http://c3dgx0.cs.northwestern.edu:8080"]
        with self.assertRaises(ValueError): relay.public_task(t)
    def test_reject_arbitrary_web(self):
        t = copy.deepcopy(self.task)
        t["public_references"]=["https://example.com/private"]
        with self.assertRaises(ValueError): relay.public_task(t)
    def test_reject_qwen_external(self):
        for url in ["https://evil.example/v1", "https://api.openai.com/v1", "http://api.openai.com/v1"]:
            with self.assertRaises(ValueError):
                relay.validate_base(url)

    def test_campus_url(self):
        self.assertEqual("http://c3dgx0.cs.northwestern.edu:8080/v1",
            relay.validate_base("http://c3dgx0.cs.northwestern.edu:8080/v1"))

    def test_previous_text_clamped(self):
        self.assertEqual(2500, len(relay.prev_summary({"qwen_proposal":{"text":"x"*20000}})))

    def test_prev_invalid(self):
        self.assertEqual("No previous round.", relay.prev_summary(None))

    def test_only_one_campus_call_no_paid_credentials(self):
        requests=[]
        def fake(base, model, api_key, system, content, timeout=55):
            requests.append((base,model,api_key,content))
            return {"model":model,"text":"proposal","truncated":False}
        with patch.dict(os.environ,{},clear=True), patch.object(relay,"invoke",side_effect=fake):
            result=relay.execute(self.task,{"round":3,"qwen_proposal":{"text":"prior"}}, "Review the version boundary.")
        self.assertEqual(1,len(requests))
        self.assertTrue(requests[0][0].startswith("http://c3dgx0.cs.northwestern.edu:"))
        self.assertIn("Review the version boundary.",requests[0][3])
        self.assertIn("prior",requests[0][3])
        self.assertEqual(4,result["round"])
        self.assertEqual("northwestern_campus_only",result["model_provider"])
        self.assertTrue(result["model_runs_are_not_code_changes"])
        self.assertEqual("awaiting_independent_review",result["status"])

    def test_no_network_for_other_endpoint(self):
        with patch.object(relay.urllib.request,"build_opener") as opener:
            with self.assertRaises(ValueError):
                relay.invoke("https://api.openai.com/v1","model","key","system","task")
            opener.assert_not_called()

    def test_reject_redirect(self):
        with self.assertRaises(ValueError):
            relay.NoRedirect().redirect_request(None,None,302,"redirect",{},"https://example.com/v1")

    def test_validate_only_offline(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"task.json"
            path.write_text(json.dumps(self.task),encoding="utf-8")
            with patch.object(relay,"invoke",side_effect=AssertionError("Unexpected API call")):
                self.assertEqual(0,relay.main(["--task",str(path),"--validate-only"]))
    def test_reject_oversized(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"oversized.json"
            path.write_bytes(b"x"*200)
            with self.assertRaises(ValueError):
                relay.read_json(path,10)

if __name__=="__main__":
    unittest.main()
