# Local typed-copy binding prototype

This standard-library Python entry point runs explicitly, once, and prints a receipt. It applies the existing local operator trust gate and requires a separate trusted review digest, supplied by the caller. A receipt distinguishes source URL and version, case, run, capture digest, reviewed paragraph digest, original section and edited-copy anchor. It independently checks the captured document identity and the reproduced working copy hash. It does not write revised HTML, execute a model, authenticate a reviewer, or grant publication authority.

Run `python bound_cli.py --help` for its inputs and `python -m unittest discover -s . -q` here for the parser/gate runtime tests. A previously reviewed EMDK baseline was replayed locally outside this repository. Source, model output, customer documents and approval records are not bundled as fixtures.

The separate archive prototype requires a true paragraph anchor in the capture. This CLI reports the containing original heading, not a verified captured-paragraph anchor. Do not treat these two opt-in modules as a single real-case pipeline. Add an explicit digest-bound paragraph locator and actual Chrome verification before any product claim.
