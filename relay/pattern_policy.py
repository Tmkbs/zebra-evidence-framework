#!/usr/bin/env python3
"""Conservative, explainable pattern triage for PUBLIC Zebra support summaries.
This is rule-based triage, not semantic clustering or measured model accuracy.
"""
import argparse
import json
from pathlib import Path
import re
import sys

POLICIES = {
    "VERSION_APPLICABILITY": {
        "tokens": ("version mismatch","different version","firmware version","datawedge version","os version","android version","release version","build version"),
        "action": "Ask for exact device model, OS, relevant Zebra software version and installed build. Cite same-edition docs; never transfer instructions across versions without checking.",
        "checks": ["product and build", "official edition", "compatibility matrix"]
    },
    "MISSING_PREREQUISITE": {
        "tokens": ("permission","license required","not enabled","configuration","setup step","intent filter","manifest","profile setting","prerequisite"),
        "action": "Identify the required setup and permissions from edition-specific documentation; provide an ordered checklist and request the actual configuration when evidence is missing.",
        "checks": ["permission/license requirements","configuration state","observable success condition"]
    },
    "CAPABILITY_BOUNDARY": {
        "tokens": ("unsupported","not supported","out of scope","not available","browser api","feature unavailable","cannot use","does not support"),
        "action": "Differentiate documented support, unsupported functionality, and an unsuccessful search. Do not claim feature absence without an explicit applicable source.",
        "checks": ["official feature statement","supported runtime","software edition"]
    },
    "DOCUMENTED_VS_OBSERVED": {
        "tokens": ("works differently","but docs say","documentation says","does not match","actual device","reported behavior","still occurs","inconsistent with docs"),
        "action": "Present the documented contract alongside the reported behavior without asserting a defect. Request reproducible logs, version details and authorized device verification.",
        "checks": ["exact source excerpt","reproduction steps","device logs and result"]
    },
    "RETRIEVAL_OR_SOURCE_GAP": {
        "tokens": ("cannot find","broken link","404","missing page","not documented","search result","could not locate","wrong source"),
        "action": "Record a retrieval coverage issue separately from a confirmed documentation omission. Search alternate official edition paths; escalate only with reproducible source receipts.",
        "checks": ["URL and retrieval date","alternate official edition","independent reviewer check"]
    },
    "INTEGRATION_CONTEXT": {
        "tokens": ("xamarin","maui","android manifest","enterprise browser","webview","intent output","broadcast receiver","callback","javascript bridge"),
        "action": "Clarify integration runtime, app/OS versions and error logs. Distinguish source-code structure from live device behavior; prefer a minimal reproducible example.",
        "checks": ["runtime and SDK", "minimal project","compiler/build/device result"]
    }
}
DISALLOWED_AS_FACT = ("confirmed defect","resolved defect","fixed on device")
def tokenize(s):
    s = re.sub(r"[^a-z0-9]+"," ",s.lower())
    return " "+s+" "
def triage(record):
    if not isinstance(record,dict):
        raise ValueError("Expected public support summary object")
    if set(record)-{"id","summary","evidence_urls","source_type"}:
        raise ValueError("Unexpected fields; do not supply private case records")
    summary=record.get("summary","")
    if not isinstance(summary,str) or len(summary)>3000 or len(summary)<12:
        raise ValueError("Summary must contain 12-3000 characters")
    if any(term in summary.lower() for term in DISALLOWED_AS_FACT):
        raise ValueError("Input makes a device/defect approval claim; clarify first")
    urls=record.get("evidence_urls",[])
    if not isinstance(urls,list) or len(urls)>8:
        raise ValueError("Invalid evidence URLs")
    for v in urls:
        if not isinstance(v,str) or len(v)>500 or not v.startswith("https://"):
            raise ValueError("Evidence links must use HTTPS")
    words=tokenize(summary)
    candidates=[]
    for pattern,policy in POLICIES.items():
        matched=[]
        for term in policy["tokens"]:
            target=tokenize(term).strip()
            if " "+target+" " in words:
                matched.append(term)
        if matched:
            candidates.append({"pattern":pattern,"matched_phrases":matched,"strategy":policy["action"],
                "next_checks":policy["checks"],"validation":"NEEDS_REVIEW"})
    candidates.sort(key=lambda x:(-len(x["matched_phrases"]),x["pattern"]))
    return {
        "id":str(record.get("id",""))[:80],
        "status":"CANDIDATE_PATTERNS_NEED_REVIEW" if candidates else "UNCLASSIFIED_NEEDS_REVIEW",
        "candidates":candidates[:4],
        "unclassified":not bool(candidates),
        "evidence_urls":urls,
        "method":"deterministic_phrase_triage_v1",
        "device_tested":False, "model_quality_improved":None,
        "claim":"Candidates are not confirmed common causes. Validate across multiple independent cases and review versioned evidence."
    }
def main(argv=None):
    ap=argparse.ArgumentParser()
    ap.add_argument("input",help="JSON with a public, short support summary")
    ap.add_argument("--out")
    args=ap.parse_args(argv)
    p=Path(args.input)
    if p.stat().st_size>16000:
        raise ValueError("Refusing oversized / potentially private records")
    obj=triage(json.loads(p.read_text(encoding="utf-8")))
    result=json.dumps(obj,indent=2,ensure_ascii=False)+"\n"
    if args.out:Path(args.out).write_text(result,encoding="utf-8")
    else:sys.stdout.write(result)
if __name__=="__main__":
    main()
