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
        with self.assertRaises(ValueError): relay.validate_base("https://evil.example/v1",campus=True)
    def test_reject_openai_http(self):
        with self.assertRaises(ValueError): relay.validate_base("http://api.openai.com/v1")
    def test_openai_url(self):
        self.assertEqual("https://api.openai.com/v1", relay.validate_base("https://api.openai.com/v1"))
    def test_campus_url(self):
        self.assertEqual("http://c3dgx0.cs.northwestern.edu:8080/v1",
            relay.validate_base("http://c3dgx0.cs.northwestern.edu:8080/v1",campus=True))
    def test_previous_text_clamped(self):
        self.assertEqual(2500, len(relay.prev_summary({"openai_review":{"text":"x"*20000}})))
    def test_prev_invalid(self):
        self.assertEqual("No previous round.", relay.prev_summary(None))
    def test_no_creds_no_execution(self):
        with patch.dict(os.environ,{"RELAY_OPENAI_MODEL":"gpt-4.1-mini","OPENAI_API_KEY":""}):
            with self.assertRaises(ValueError): relay.execute(self.task,{})
    def test_exchange_mocked(self):
        requests=[]
        def fake(base, model, api_key, system, content, timeout=55):
            requests.append((base,model,content))
            return {"model":model, "text":"proposal" if len(requests)==1 else "review", "truncated":False}
        env={"RELAY_OPENAI_MODEL":"gpt-4.1-mini","OPENAI_API_KEY":"placeholder","RELAY_QWEN_BASE":"http://c3dgx0.cs.northwestern.edu:8080/v1"}
        with patch.dict(os.environ,env), patch.object(relay,"invoke",side_effect=fake):
            value=relay.execute(self.task,{})
        self.assertEqual(2,len(requests))
        self.assertEqual(1,value["round"])
        self.assertTrue(value["model_runs_are_not_code_changes"])
        self.assertIn("proposal",requests[1][2])
    def test_validate_only_offline(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"task.json"
            path.write_text(json.dumps(self.task),encoding="utf-8")
            with patch.object(relay,"invoke",side_effect=AssertionError("Unexpected API call")):
                self.assertEqual(0,relay.main(["--task",str(path),"--validate-only"]))
    def test_reject_oversized(self):
        with self.assertRaises(ValueError):
            relay.read_json("/does/not/exist",0)

if __name__=="__main__":
    unittest.main()
