import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from pattern_policy import triage

class PatternPolicyTests(unittest.TestCase):
    def test_version(self):
        r=triage({"id":"example-1","summary":"Different version of DataWedge caused a version mismatch in a documented API."})
        self.assertEqual("VERSION_APPLICABILITY",r["candidates"][0]["pattern"])
        self.assertIsNone(r["model_quality_improved"])
    def test_prereq(self):
        r=triage({"summary":"The Android manifest is missing an intent filter and required permission."})
        self.assertIn("MISSING_PREREQUISITE",[v["pattern"] for v in r["candidates"]])
    def test_conflict_does_not_claim_defect(self):
        r=triage({"summary":"Documentation says an API behaves one way, but docs say behavior differs from the actual device."})
        self.assertFalse(r["device_tested"])
        self.assertIn("NEEDS_REVIEW",r["status"])
    def test_unknown(self):
        r=triage({"summary":"A user asked a question with no technical information provided."})
        self.assertTrue(r["unclassified"])
    def test_reject_private_extra_field(self):
        with self.assertRaises(ValueError):
            triage({"summary":"A user asked a device question.","customer_email":"x@example.com"})
    def test_reject_confirmed_defect(self):
        with self.assertRaises(ValueError):
            triage({"summary":"This is a confirmed defect and fixed on device."})
    def test_reject_long(self):
        with self.assertRaises(ValueError):
            triage({"summary":"x"*3001})
    def test_citation_urls(self):
        r=triage({"summary":"Android manifest requires a permission for this setup.","evidence_urls":["https://techdocs.zebra.com/datawedge/15-0/guide/"]})
        self.assertEqual(1,len(r["evidence_urls"]))

if __name__=="__main__":
    unittest.main()
