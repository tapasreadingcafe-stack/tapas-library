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
    # Check if the CUPS printer is actually online, not just that the bridge is running.
    try:
        result = subprocess.run(
            ["lpstat", "-p", PRINTER_NAME],
            capture_output=True, text=True, timeout=5,
        )
        output = result.stdout.lower()
        # lpstat prints "is idle" or "is ready" when online; "disabled" or nothing when unplugged.
        printer_ready = result.returncode == 0 and ("idle" in output or "ready" in output or "printing" in output)
    except Exception:
        printer_ready = False
    return jsonify(ok=printer_ready, printer=PRINTER_NAME, port=PORT)


def _printer_status():
    """Inspect the CUPS queue and return a structured health report.

    Distinguishes the failure modes the staff actually hit:
      - printer not installed / unplugged (lpstat can't find it)
      - queue paused / disabled (the "Unable to send data" case) -> auto-fixable
      - online but jobs backed up
    """
    installed = False
    enabled = False
    state = "unknown"
    reason = ""
    try:
        p = subprocess.run(
            ["lpstat", "-p", PRINTER_NAME], capture_output=True, text=True, timeout=5
        )
        out = p.stdout.strip()
        if p.returncode == 0 and out:
            installed = True
            low = out.lower()
            # lpstat lines look like:
            #   "printer NAME is idle.  enabled since ..."
            #   "printer NAME disabled since ... - <reason>"
            if "disabled" in low:
                enabled = False
                state = "disabled"
                if " - " in out:
                    reason = out.split(" - ", 1)[1].strip()
            elif "printing" in low:
                enabled, state = True, "printing"
            elif "idle" in low or "ready" in low:
                enabled, state = True, "idle"
            else:
                enabled = "disabled" not in low
                state = "ready" if enabled else "disabled"
    except Exception as e:  # pragma: no cover - defensive
        reason = str(e)

    queued = 0
    try:
        q = subprocess.run(
            ["lpstat", "-o", PRINTER_NAME], capture_output=True, text=True, timeout=5
        )
        queued = len([ln for ln in q.stdout.splitlines() if ln.strip()])
    except Exception:
        pass

    healthy = installed and enabled
    # A paused queue, or a healthy queue clogged with jobs, is something
    # cancel -a + cupsenable can recover from.
    fixable = (installed and not enabled) or queued > 5

    if not installed:
        diagnosis = (
            "Printer not found. Check the Zebra is powered on and the USB cable is connected."
        )
    elif not enabled:
        base = f"Print queue is paused ({reason or 'unknown reason'})."
        diagnosis = base + (f" {queued} job(s) stuck." if queued else "")
    elif queued > 5:
        diagnosis = f"Printer is online but {queued} jobs are backed up in the queue."
    else:
        diagnosis = "Printer is online and ready."

    return {
        "printer": PRINTER_NAME,
        "installed": installed,
        "enabled": enabled,
        "state": state,
        "reason": reason,
        "queued": queued,
        "healthy": healthy,
        "fixable": fixable,
        "diagnosis": diagnosis,
    }


@app.route("/api/printer-status", methods=["GET"])
def printer_status():
    """Detailed printer diagnosis for the dashboard's Device Manager card."""
    return jsonify(ok=True, **_printer_status())


@app.route("/api/printer-fix", methods=["POST", "OPTIONS"])
def printer_fix():
    """Self-heal a stuck Zebra: clear the queue, then re-enable it.

    This is the same recovery a human would run in Terminal:
        cancel -a <printer>
        cupsenable <printer>
    """
    if request.method == "OPTIONS":
        return ("", 204)

    steps = []

    def _run(label, cmd):
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            steps.append({
                "step": label,
                "ok": r.returncode == 0,
                "detail": (r.stderr or r.stdout).strip(),
            })
        except Exception as e:
            steps.append({"step": label, "ok": False, "detail": str(e)})

    print("\n--- PRINTER AUTO-FIX requested ---")
    _run("Cleared stuck print jobs", ["cancel", "-a", PRINTER_NAME])
    _run("Re-enabled the printer queue", ["cupsenable", PRINTER_NAME])

    status = _printer_status()
    success = status["healthy"]
    if success:
        message = "Printer recovered — queue cleared and re-enabled. It's online and ready."
    else:
        message = (
            "Ran the fix, but the printer still isn't ready. Make sure the Zebra is "
            "powered on and its USB cable is connected, then try again."
        )
    print(f"Auto-fix result: success={success} state={status['state']}")
    print("----------------------------------\n")
    return jsonify(success=success, message=message, steps=steps, status=status)


@app.route("/api/print", methods=["POST", "OPTIONS"])
def print_label():
    if request.method == "OPTIONS":
        return ("", 204)

    try:
        body = request.get_json(force=True, silent=True) or {}
        zpl = body.get("zpl", "")
        if not zpl:
            return jsonify(success=False, error="No ZPL in request body"), 400

        # Log ZPL to terminal so you can verify what's being sent
        print("\n--- ZPL RECEIVED ---")
        print(zpl[:600])
        if len(zpl) > 600:
            print(f"... ({len(zpl)} chars total)")
        print("--------------------\n")

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

        print(f"lp exit={result.returncode} stdout={result.stdout.strip()!r} stderr={result.stderr.strip()!r}")

        # Check queue status after submitting
        try:
            q = subprocess.run(["lpq", "-P", PRINTER_NAME], capture_output=True, text=True, timeout=5)
            print(f"Queue: {q.stdout.strip()}")
        except Exception:
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
