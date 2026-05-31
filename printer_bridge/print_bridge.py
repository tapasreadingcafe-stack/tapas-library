#!/usr/bin/env python3
"""
Tapas Reading Cafe — local Zebra print bridge.

The dashboard's "Direct Print" button POSTs ZPL to this service; we
forward it to the Zebra ZD230 (already installed in macOS as a CUPS
printer) using `lp -o raw` so CUPS passes the bytes through verbatim
instead of re-interpreting them as PostScript.

Run:
    python3 print_bridge.py

Keep this terminal window open while you're printing.
Stop with Ctrl+C.

Tested with macOS + Zebra ZD230 USB.
"""

import os
import subprocess
import tempfile

from flask import Flask, jsonify, request
from flask_cors import CORS

# The exact CUPS queue name macOS uses for the Zebra. To check yours
# run `lpstat -p` in Terminal. If it changes (e.g. you reinstall the
# printer), update this constant.
PRINTER_NAME = "Zebra_Technologies_ZTC_ZD230_203dpi_ZPL"
PORT = 5050

app = Flask(__name__)
# The dashboard runs at dashboard.tapasreadingcafe.com / localhost:3000,
# both are different origins from 127.0.0.1:5050, so CORS must be open.
CORS(app)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(ok=True, printer=PRINTER_NAME, port=PORT)


@app.route("/api/print", methods=["POST", "OPTIONS"])
def print_label():
    if request.method == "OPTIONS":
        return ("", 204)

    try:
        body = request.get_json(force=True, silent=True) or {}
        zpl = body.get("zpl", "")
        if not zpl:
            return jsonify(success=False, error="No ZPL in request body"), 400

        # Drop ZPL into a temp file. `lp -o raw <file>` is the most
        # reliable way to push raw bytes to a Zebra on macOS; piping
        # via stdin sometimes mangles CRLFs and confuses the printer.
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".zpl", delete=False, encoding="utf-8"
        ) as fp:
            fp.write(zpl)
            tmp_path = fp.name

        try:
            result = subprocess.run(
                ["lp", "-d", PRINTER_NAME, "-o", "raw", tmp_path],
                capture_output=True,
                text=True,
                timeout=20,
            )
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

        if result.returncode != 0:
            return (
                jsonify(
                    success=False,
                    error=(result.stderr or result.stdout or "lp failed").strip(),
                ),
                500,
            )

        return jsonify(success=True, jobId=result.stdout.strip())

    except Exception as e:
        return jsonify(success=False, error=str(e)), 500


if __name__ == "__main__":
    print("\n🖨️  Tapas print bridge")
    print(f"   Listening on  http://127.0.0.1:{PORT}")
    print(f"   Printer        {PRINTER_NAME}")
    print("   Keep this terminal open while you print. Ctrl+C to stop.\n")
    app.run(host="127.0.0.1", port=PORT, debug=False)
