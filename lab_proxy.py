#!/usr/bin/env python3
"""Opt-in localhost-only bridge to an OpenAI-compatible lab inference endpoint.

No external dependency, no live network request until the user invokes Models/Run.
The API base URL and optional key are taken only from this process's environment.
The browser never receives the key; static hosting does not enable inference.
"""
import argparse
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

MAX_REQUEST_BYTES = 32_768
MAX_RESPONSE_BYTES = 500_000
DEFAULT_MODEL = "nvidia/Qwen3.8-Flash-Next-FP4-Local"
SYSTEM_PROMPT = (
    "You are being evaluated as an assistant for Zebra software documentation. "
    "You receive only an editorial case summary, not the full official documentation. "
    "Do not claim the docs, a browser, or a device were tested by you. "
    "Clearly distinguish reported problem, source-review summary, unknowns, and next verification step. "
    "Cite only the supplied URLs and label them as links requiring independent verification. "
    "Do not invent product-version applicability, a working fix, or missing official passages. "
    "Provide a short provisional answer followed by Missing context and Next check."
)


def build_messages(case):
    """Freeze a deterministic prompt from one case record (same bytes for repeated runs)."""
    for key in ("id", "question", "evidence", "gap", "docUrl", "sourceUrl"):
        if not isinstance(case.get(key, ""), str):
            raise ValueError(f"Case field {key} must be text")
    if not case.get("id", "").strip() or not case.get("question", "").strip():
        raise ValueError("Case ID and question are required")
    if len(json.dumps(case, ensure_ascii=False)) > 14000:
        raise ValueError("Case too large (limit 14k characters)")
    message = (
        "EVALUATION INPUT — the following source review is editorial, not the official text.\n\n"
        f"Case ID: {case.get('id', '')}\n"
        f"Reported question: {case.get('question', '')}\n"
        f"Editorial source-review summary: {case.get('evidence', '') or 'NOT PROVIDED'}\n"
        f"Known gaps / missing context: {case.get('gap', '') or 'NOT PROVIDED'}\n"
        f"Official source URL (not fetched): {case.get('docUrl', '') or 'NOT PROVIDED'}\n"
        f"Original question URL (not fetched): {case.get('sourceUrl', '') or 'NOT PROVIDED'}\n\n"
        "Answer only within these evidence limits; if facts are insufficient, ask a useful question."
    )
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": message}]


def get_config():
    base = os.environ.get("ZEBRA_LAB_API_BASE", "").strip().rstrip("/")
    if base and base.endswith("/chat/completions"):
        base = base[: -len("/chat/completions")]
    if base and not base.endswith("/v1"):
        base += "/v1"
    u = urlsplit(base) if base else None
    if base and (u.scheme not in ("http", "https") or not u.netloc or u.username or u.password or u.query or u.fragment):
        raise ValueError("ZEBRA_LAB_API_BASE must be a http(s) base URL with no credentials or query")
    return {
        "api_base": base,
        "api_key": os.environ.get("ZEBRA_LAB_API_KEY", "").strip(),
        "model": os.environ.get("ZEBRA_LAB_MODEL", DEFAULT_MODEL).strip(),
        "webroot": Path(__file__).resolve().parent,
    }


def make_handler(config):
    class Handler(BaseHTTPRequestHandler):
        server_version = "ZebraLocalBridge/1.1"

        def log_message(self, fmt, *args):
            # Log route + status only, not case text/prompt or credentials.
            if os.environ.get("ZEBRA_LAB_LOG_REQUESTS") == "1":
                super().log_message(fmt, *args)

        def reply(self, status, data):
            raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def upstream(self, path, payload=None):
            if not config["api_base"]:
                raise RuntimeError("Lab API is not configured; offline demo is still available")
            headers = {"Accept": "application/json"}
            if config["api_key"]:
                headers["Authorization"] = "Bearer " + config["api_key"]
            if payload is not None:
                headers["Content-Type"] = "application/json"
            body = json.dumps(payload).encode("utf-8") if payload is not None else None
            method = "POST" if payload is not None else "GET"
            req = Request(config["api_base"] + path, data=body, headers=headers, method=method)
            try:
                with urlopen(req, timeout=75 if payload else 8) as response:
                    raw = response.read(MAX_RESPONSE_BYTES + 1)
            except HTTPError as e:
                # Do not reflect private upstream response bodies to the browser.
                raise RuntimeError(f"Lab API returned HTTP {e.code}") from e
            except (URLError, TimeoutError, OSError) as e:
                raise RuntimeError("Cannot reach lab API. Check Northwestern VPN, endpoint port and model availability.") from e
            if len(raw) > MAX_RESPONSE_BYTES:
                raise RuntimeError("Lab response exceeds safety limit")
            try:
                return json.loads(raw)
            except (ValueError, UnicodeError) as e:
                raise RuntimeError("Lab response was not valid JSON") from e

        def do_GET(self):
            route = urlsplit(self.path).path
            if route == "/api/status":
                return self.reply(200, {"bridge": "local", "configured": bool(config["api_base"]),
                                        "modelHint": config["model"], "requiresCampusOrVpn": True})
            if route == "/api/models":
                try:
                    data = self.upstream("/models")
                    ids = [x.get("id") for x in data.get("data", []) if isinstance(x, dict) and isinstance(x.get("id"), str)]
                    return self.reply(200, {"models": ids[:100], "queriedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
                except (RuntimeError, ValueError, KeyError) as e:
                    return self.reply(503, {"error": str(e)})
            if route in ("/", "/index.html"):
                html = (config["webroot"] / "index.html").read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.send_header("Content-Length", str(len(html)))
                self.end_headers()
                return self.wfile.write(html)
            return self.reply(404, {"error": "Unknown route"})

        def do_POST(self):
            if urlsplit(self.path).path != "/api/run":
                return self.reply(404, {"error": "Unknown route"})
            # Block cross-origin websites from using this local bridge.
            origin = self.headers.get("Origin", "")
            host = self.headers.get("Host", "")
            if origin and origin not in ("http://" + host, "https://" + host):
                return self.reply(403, {"error": "Cross-origin requests are not allowed"})
            if self.headers.get("Content-Type", "").split(";", 1)[0].strip() != "application/json":
                return self.reply(415, {"error": "Expected application/json"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                return self.reply(400, {"error": "Invalid Content-Length"})
            if length < 1 or length > MAX_REQUEST_BYTES:
                return self.reply(413, {"error": "Request must be 1–32768 bytes"})
            try:
                req = json.loads(self.rfile.read(length))
                if not isinstance(req, dict) or not isinstance(req.get("case"), dict):
                    raise ValueError("A case object is required")
                model = req.get("model") or config["model"]
                if not isinstance(model, str) or not model.strip() or len(model) > 200:
                    raise ValueError("Invalid model ID")
                messages = build_messages(req["case"])
                if not config["api_base"]:
                    raise RuntimeError("Lab API is not configured; offline demo is still available")
                params = {"model": model, "messages": messages, "temperature": 0.2,
                          "top_p": 0.95, "max_tokens": 900, "stream": False}
                started = time.perf_counter()
                result = self.upstream("/chat/completions", params)
                elapsed_ms = int((time.perf_counter() - started) * 1000)
                choices = result.get("choices", []) if isinstance(result, dict) else []
                message = choices[0].get("message", {}) if choices and isinstance(choices[0], dict) else {}
                content = message.get("content", "") if isinstance(message, dict) else ""
                if isinstance(content, list):
                    content = "\n".join(p.get("text", "") for p in content if isinstance(p, dict))
                if not isinstance(content, str) or not content.strip():
                    raise RuntimeError("Lab model returned no visible answer text")
                usage = result.get("usage", {}) if isinstance(result.get("usage"), dict) else {}
                return self.reply(200, {
                    "model": str(result.get("model") or model)[:200], "requestedModel": model,
                    "response": content[:40000], "messages": messages, "parameters": {
                        "temperature": params["temperature"], "top_p": params["top_p"],
                        "max_tokens": params["max_tokens"], "stream": False},
                    "usage": {k: usage.get(k) for k in ("prompt_tokens", "completion_tokens", "total_tokens") if isinstance(usage.get(k), int)},
                    "elapsedMs": elapsed_ms, "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "sourceReviewOnly": True, "reviewStatus": "CAPTURED_NOT_REVIEWED"})
            except (RuntimeError, ValueError, TypeError, KeyError, IndexError) as e:
                return self.reply(400 if isinstance(e, ValueError) else 503, {"error": str(e)})

    return Handler


def main():
    parser = argparse.ArgumentParser(description="Local-only optional lab API bridge")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    config = get_config()
    with ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(config)) as server:
        print(f"Framework: http://127.0.0.1:{args.port}")
        print("Lab bridge configured:" + (" yes (campus/VPN required)" if config["api_base"] else " no (offline-only)"))
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")

if __name__ == "__main__":
    main()

