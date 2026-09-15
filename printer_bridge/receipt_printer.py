"""
Receipt printing for the Tapas dashboard.

Built for the POSIFLOW KP307-UEWB (80mm, ESC/POS, USB/LAN/Wi-Fi/Bluetooth), and
works with any ESC/POS receipt printer.

How it fits together:

    any phone / laptop  ->  Supabase print_jobs queue
    this bridge         ->  claims each job, formats it as ESC/POS text,
                            sends it straight to the printer, marks it done
    heartbeat (10 s)    ->  the dashboard shows printer online / offline

No printer driver is involved. The bytes go directly to the printer, either
over the network (raw TCP, port 9100) or through a macOS CUPS queue in raw mode
when the printer is on USB.

Configuration (printer_bridge/.env — never committed):

    STATION_KEY=...          required. Copy it from Dashboard -> Settings -> Devices.
    RECEIPT_PRINTER=auto     optional. "auto" finds the printer on the Wi-Fi.
                             Or a fixed address:  192.168.0.50   (port 9100)
                                                  192.168.0.50:9100
                             Or a USB printer:    cups:QUEUE_NAME
    STATION_NAME=counter     optional. Defaults to this computer's name.

The Supabase URL and public anon key are read from the app's own .env in the
repo root, so there is nothing else to copy.

Python 3.9+, standard library only.
"""

import concurrent.futures as cf
import json
import os
import socket
import subprocess
import tempfile
import textwrap
import threading
import time
import unicodedata
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
CACHE_FILE = os.path.join(HERE, ".receipt-printer")
WIDTH = 48          # characters per line on 80mm paper, font A
HALF = WIDTH // 2   # characters per line at double width
SMALL = 64          # characters per line in the smaller font B

ESC, GS = b"\x1b", b"\x1d"

# Live state, mutated by the worker thread and read by the Flask endpoint.
STATE = {
    "running": False,
    "configured": False,
    "online": False,
    "address": None,
    "detail": "Receipt printing has not started",
    "station": None,
    "last_job": None,
}


# ── configuration ────────────────────────────────────────────────────────────

def _read_env(path):
    out = {}
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                out[key.strip()] = value.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return out


def load_config():
    app_env = _read_env(os.path.join(REPO, ".env"))
    own = _read_env(os.path.join(HERE, ".env"))

    def get(key, default=""):
        return os.environ.get(key) or own.get(key) or default

    return {
        "url": get("SUPABASE_URL") or app_env.get("REACT_APP_SUPABASE_URL", ""),
        "anon": get("SUPABASE_ANON_KEY") or app_env.get("REACT_APP_SUPABASE_ANON_KEY", ""),
        "station_key": get("STATION_KEY"),
        "printer": get("RECEIPT_PRINTER", "auto") or "auto",
        "station": get("STATION_NAME") or socket.gethostname().split(".")[0],
    }


# ── text formatting ──────────────────────────────────────────────────────────

# Receipt printers use single-byte code pages. Anything outside plain ASCII is
# mapped to the nearest readable equivalent rather than printed as garbage.
_REPLACE = {
    "₹": "Rs.", "—": "-", "–": "-", "×": "x", "·": "-", "•": "-", "…": "...",
    "‘": "'", "’": "'", "“": '"', "”": '"',
}


def ascii_safe(value):
    text = "" if value is None else str(value)
    for bad, good in _REPLACE.items():
        text = text.replace(bad, good)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return " ".join(text.split())


def inr(value):
    """Indian-grouped rupees: Rs.1,23,456.50 — paise shown only when non-zero."""
    amount = round(float(value or 0), 2)
    negative = amount < 0
    amount = abs(amount)
    rupees = int(amount)
    paise = int(round((amount - rupees) * 100))
    if paise == 100:
        rupees, paise = rupees + 1, 0
    digits = str(rupees)
    if len(digits) > 3:
        head, tail = digits[:-3], digits[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        digits = ",".join(groups + [tail])
    text = "Rs." + digits + (".%02d" % paise if paise else "")
    return ("-" if negative else "") + text


def row(left, right="", width=WIDTH, indent=0):
    """Left text with a right-aligned value on the same line, wrapping the left."""
    pad = " " * indent
    left, right = ascii_safe(left), ascii_safe(right)
    if not right:
        return [pad + line for line in (textwrap.wrap(left, width - indent) or [""])]
    room = width - len(right) - 1 - indent
    if room < 8:
        return [pad + l for l in textwrap.wrap(left, width - indent)] + [right.rjust(width)]
    parts = textwrap.wrap(left, room) or [""]
    last = parts.pop()
    return [pad + p for p in parts] + [pad + last.ljust(room) + " " + right]


# ── shop logo ────────────────────────────────────────────────────────────────

# The logo printed at the top of every slip, stored as a binary PBM. Its packed
# rows (1 = black, most significant bit first) are exactly what ESC/POS raster
# printing takes, so no imaging library is needed on the counter computer.
# Sized to 300 of the KP307's 576 printable dots, thresholded without dithering
# so the lettering stays crisp on thermal paper.
LOGO_FILE = os.path.join(HERE, "receipt_logo.pbm")
_logo_cache = []


def _read_pbm(path):
    with open(path, "rb") as fh:
        data = fh.read()
    fields, i = [], 0
    while len(fields) < 3:
        while data[i:i + 1].isspace():
            i += 1
        if data[i:i + 1] == b"#":           # header comment
            while data[i:i + 1] not in (b"\n", b""):
                i += 1
            continue
        start = i
        while data[i:i + 1] and not data[i:i + 1].isspace():
            i += 1
        fields.append(data[start:i])
    if fields[0] != b"P4":
        raise ValueError("not a binary PBM")
    width, height = int(fields[1]), int(fields[2])
    size = ((width + 7) // 8) * height
    bits = data[i + 1:i + 1 + size]          # exactly one whitespace byte after the header
    if len(bits) < size:
        raise ValueError("PBM is truncated")
    return width, height, bits


def _logo():
    """(width, height, bits), or None if the file is missing or unreadable —
    receipts then fall back to printing the shop name as text."""
    if not _logo_cache:
        try:
            _logo_cache.append(_read_pbm(LOGO_FILE))
        except (OSError, ValueError, IndexError):
            _logo_cache.append(None)
    return _logo_cache[0]


class Ticket:
    """A tiny ESC/POS builder: every method returns self so calls chain."""

    def __init__(self):
        # ESC @ reset, ESC t 0 selects code page PC437 (plain ASCII is safe).
        self.buf = bytearray(ESC + b"@" + ESC + b"t\x00")

    def raw(self, data):
        self.buf += data
        return self

    def text(self, line=""):
        self.buf += line.encode("ascii", "ignore") + b"\n"
        return self

    def lines(self, items):
        for line in items:
            self.text(line)
        return self

    def align(self, n):          # 0 left, 1 centre, 2 right
        return self.raw(ESC + b"a" + bytes([n]))

    def bold(self, on):
        return self.raw(ESC + b"E" + bytes([1 if on else 0]))

    def size(self, n):           # 0 normal, 0x01 double height, 0x11 double both
        return self.raw(GS + b"!" + bytes([n]))

    def font(self, n):           # 0 font A (48 columns), 1 smaller font B (64 columns)
        return self.raw(ESC + b"M" + bytes([n]))

    def rule(self):
        return self.text("-" * WIDTH)

    def feed(self, n):
        return self.raw(ESC + b"d" + bytes([n]))

    def cut(self):
        # GS V B n — feed to the cutter then partial cut (KP307 has an auto-cutter).
        return self.feed(3).raw(GS + b"VB\x00")

    def image(self, width, height, bits):
        # GS v 0 m xL xH yL yH — raster bit image, x counted in bytes per row.
        row = (width + 7) // 8
        return self.raw(GS + b"v0\x00" + bytes([row & 0xFF, row >> 8, height & 0xFF, height >> 8]) + bits)

    def bytes(self):
        return bytes(self.buf)


def render_receipt(p):
    t = Ticket()
    shop = p.get("shop") or {}

    # Logo, then address, GSTIN and phone. The logo already carries the name,
    # so the name is printed in words only when there is no logo file.
    t.align(1)
    logo = _logo()
    if logo:
        t.image(*logo).feed(1)
    else:
        t.size(0x11).bold(True)
        for line in textwrap.wrap(ascii_safe(shop.get("name") or "Tapas Reading Cafe"), HALF):
            t.text(line)
        t.size(0).bold(False)
    for line in shop.get("lines") or []:
        for wrapped in textwrap.wrap(ascii_safe(line), WIDTH):
            t.text(wrapped)
    if shop.get("gstin"):
        t.text("GSTIN: " + ascii_safe(shop["gstin"]))
    if shop.get("phone"):
        t.text("Ph: " + ascii_safe(shop["phone"]))
    t.feed(1).bold(True).text(ascii_safe(p.get("title") or "RECEIPT")).bold(False)

    t.align(0).rule()
    t.lines(row("Bill: " + (p.get("billNo") or "-"), p.get("dateText") or ""))
    if p.get("customer"):
        t.lines(row("Customer: " + p["customer"]))
    t.rule()

    for item in p.get("items") or []:
        qty = int(item.get("qty") or 1)
        label = (item.get("name") or "") + (" x%d" % qty if qty > 1 else "")
        t.lines(row(label, inr(item.get("amount"))))
        if item.get("discLabel") and float(item.get("discAmount") or 0) > 0:
            t.lines(row(item["discLabel"], "-" + inr(item["discAmount"]), indent=2))
    t.rule()

    totals = p.get("totals") or []
    for total in totals:
        if total.get("small"):
            # Tax detail in font B — a size down, laid out on its 64 columns.
            t.font(1).lines(row(total.get("label", ""), inr(total.get("value")), width=SMALL)).font(0)
        else:
            t.lines(row(total.get("label", ""), inr(total.get("value"))))
    # The total sits between two rules so it reads at a glance.
    if totals:
        t.rule()
    t.bold(True).size(0x01).lines(row("TOTAL", inr(p.get("total")))).size(0).bold(False).rule()

    method = (p.get("payMethod") or "").strip()
    if method.lower() == "cash" and p.get("cashReceived") is not None:
        t.lines(row("Cash received", inr(p.get("cashReceived"))))
        t.lines(row("Change", inr(p.get("change"))))
        t.rule()

    t.align(1)
    for line in textwrap.wrap(ascii_safe(p.get("footer") or "Thank you for visiting!"), WIDTH):
        t.text(line)
    return t.align(0).cut().bytes()


def render_test(p):
    t = Ticket()
    t.align(1)
    if _logo():
        t.image(*_logo()).feed(1)
    t.size(0x11).bold(True).text("TEST PRINT").size(0).bold(False)
    t.text("Tapas Reading Cafe")
    t.text(ascii_safe(p.get("dateText") or time.strftime("%d %b %Y %H:%M")))
    t.feed(1).text("If you can read this,").text("receipt printing is working.")
    t.align(0).rule()
    t.lines(row("Left aligned text", "Right"))
    t.lines(row("Indian rupees", inr(123456.5)))
    return t.rule().cut().bytes()


# ── getting bytes to the printer ─────────────────────────────────────────────

def _split_address(target):
    if ":" in target:
        host, port = target.rsplit(":", 1)
        return host, int(port)
    return target, 9100


def _tcp_open(host, port=9100, timeout=0.4):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _local_ip():
    # A UDP "connect" sends nothing; it just asks the OS which interface it
    # would use, which gives this computer's address on the shop network.
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


def discover():
    """Find the receipt printer on this network: devices accepting raw print
    jobs on port 9100. Nothing is ever sent to a device found here — if more
    than one printer answers, we refuse to guess rather than risk printing
    receipt codes onto some other printer."""
    ip = _local_ip()
    if not ip:
        return None, "This computer isn't on a network"
    base = ".".join(ip.split(".")[:3])
    candidates = ["%s.%d" % (base, i) for i in range(1, 255) if "%s.%d" % (base, i) != ip]
    with cf.ThreadPoolExecutor(max_workers=64) as pool:
        found = [h for h, ok in zip(candidates, pool.map(_tcp_open, candidates)) if ok]
    if not found:
        return None, "No receipt printer found on %s.x — is it switched on and joined to this Wi-Fi?" % base
    if len(found) > 1:
        return None, "Found several printers (%s). Set RECEIPT_PRINTER=<address> in printer_bridge/.env" % ", ".join(found)
    return found[0], ""


def _cups_ready(queue):
    try:
        r = subprocess.run(["lpstat", "-p", queue], capture_output=True, text=True, timeout=5)
        low = r.stdout.lower()
        return r.returncode == 0 and ("idle" in low or "ready" in low or "printing" in low)
    except Exception:
        return False


class ReceiptPrinter:
    def __init__(self, cfg, log):
        self.cfg = cfg
        self.log = log
        self.address = None
        self.detail = ""
        self._last_scan = 0.0

    @property
    def automatic(self):
        return self.cfg["printer"] in ("", "auto")

    def resolve(self, rescan=False):
        if not self.automatic:
            return self.cfg["printer"]
        if self.address and not rescan:
            return self.address
        if not rescan and os.path.exists(CACHE_FILE):
            cached = open(CACHE_FILE, encoding="utf-8").read().strip()
            if cached:
                self.address = cached
                return cached
        # Scanning the network takes a couple of seconds; don't hammer it.
        if time.time() - self._last_scan < 30:
            return self.address
        self._last_scan = time.time()
        host, why = discover()
        if host:
            if host != self.address:
                self.log("  receipt printer found at %s" % host)
            self.address, self.detail = host, ""
            with open(CACHE_FILE, "w", encoding="utf-8") as fh:
                fh.write(host)
        else:
            self.address, self.detail = None, why
        return self.address

    def check(self):
        """(online, address, detail)"""
        target = self.resolve()
        if not target:
            return False, None, self.detail or "Printer not found"
        if target.startswith("cups:"):
            ok = _cups_ready(target[5:])
            return ok, target, "" if ok else "USB printer queue %s is not ready" % target[5:]
        host, port = _split_address(target)
        if _tcp_open(host, port, timeout=1.5):
            return True, target, ""
        if self.automatic:
            # The printer may have been given a new address by the router.
            new = self.resolve(rescan=True)
            if new and new != target and _tcp_open(*_split_address(new), timeout=1.5):
                return True, new, ""
        return False, target, "No answer from the printer at %s — check it's on and on the Wi-Fi" % target

    def send(self, data):
        """(ok, error)"""
        target = self.resolve()
        if not target:
            return False, self.detail or "Printer not found"
        if target.startswith("cups:"):
            return self._send_cups(target[5:], data)
        last_error = ""
        for attempt in (1, 2):
            host, port = _split_address(target)
            try:
                with socket.create_connection((host, port), timeout=6) as s:
                    s.sendall(data)
                return True, ""
            except OSError as exc:
                last_error = "Could not reach the printer at %s (%s)" % (target, exc)
                if attempt == 1 and self.automatic:
                    target = self.resolve(rescan=True)
                    if not target:
                        break
                else:
                    break
        return False, last_error

    def _send_cups(self, queue, data):
        with tempfile.NamedTemporaryFile(suffix=".bin", delete=False) as fh:
            fh.write(data)
            path = fh.name
        try:
            r = subprocess.run(["lp", "-d", queue, "-o", "raw", path], capture_output=True, text=True, timeout=20)
            return (r.returncode == 0), (r.stderr or r.stdout).strip()
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass


# ── Supabase ─────────────────────────────────────────────────────────────────

def rpc(cfg, name, args, timeout=10):
    req = urllib.request.Request(
        cfg["url"].rstrip("/") + "/rest/v1/rpc/" + name,
        data=json.dumps(args).encode("utf-8"),
        method="POST",
        headers={
            "apikey": cfg["anon"],
            "Authorization": "Bearer " + cfg["anon"],
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read()
            return json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        message = exc.read().decode("utf-8", "ignore")
        try:
            message = json.loads(message).get("message", message)
        except Exception:
            pass
        raise RuntimeError(message)


# ── label printing (Zebra ZPL via CUPS) ──────────────────────────────────────
#
# Labels used to be POSTed by the browser straight to the Flask bridge on
# 127.0.0.1:5050, which only works when the dashboard is open on this very
# machine. They now arrive through the same queue as receipts, so a phone or a
# second laptop can print a shelf label too — this station owns the printer and
# everyone else queues work for it.
#
# The ZPL goes to CUPS in raw mode: no driver interprets it, the printer reads
# the label language itself.

LABEL_PRINTER = os.environ.get(
    "LABEL_PRINTER", "Zebra_Technologies_ZTC_ZD230_203dpi_ZPL"
)


def print_label(payload, log=print):
    """Send a queued label's ZPL to the Zebra. Returns (ok, error)."""
    zpl = (payload or {}).get("zpl") or ""
    if not zpl:
        return False, "No ZPL in the label job"

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".zpl", delete=False, encoding="utf-8"
        ) as fp:
            fp.write(zpl)
            tmp_path = fp.name

        result = subprocess.run(
            ["lp", "-d", LABEL_PRINTER, "-o", "raw", tmp_path],
            capture_output=True, text=True, timeout=20,
        )
        if result.returncode != 0:
            err = (result.stderr or result.stdout or "lp failed").strip()
            # The commonest cause by far is the queue being paused after a jam.
            if "disabled" in err.lower() or "not accepting" in err.lower():
                err += " — the print queue looks paused; use Settings → Devices → Auto-Fix"
            return False, err
        return True, None
    except FileNotFoundError:
        return False, "lp not found — CUPS printing is unavailable on this machine"
    except subprocess.TimeoutExpired:
        return False, "The label printer did not respond within 20s"
    except Exception as exc:
        return False, "Could not print the label: %s" % exc
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


# ── the worker ───────────────────────────────────────────────────────────────

def start_worker(log=print):
    cfg = load_config()
    STATE["station"] = cfg["station"]

    missing = [k for k in ("url", "anon", "station_key") if not cfg[k]]
    if missing:
        STATE["detail"] = (
            "Receipt printing is off — add STATION_KEY to printer_bridge/.env "
            "(copy it from Dashboard → Settings → Devices)"
            if missing == ["station_key"] else
            "Receipt printing is off — could not read the Supabase settings from the repo's .env"
        )
        log("   Receipts       OFF · " + STATE["detail"])
        return STATE

    STATE["configured"] = True
    printer = ReceiptPrinter(cfg, log)

    def loop():
        last_beat = 0.0
        last_error = None
        while True:
            try:
                if time.time() - last_beat >= 10:
                    online, address, detail = printer.check()
                    STATE.update(online=online, address=address, detail=detail or "Printer ready")
                    rpc(cfg, "print_bridge_heartbeat", {
                        "p_token": cfg["station_key"], "p_station": cfg["station"],
                        "p_online": online, "p_address": address, "p_detail": detail,
                    })
                    last_beat = time.time()

                jobs = rpc(cfg, "print_bridge_claim", {
                    "p_token": cfg["station_key"], "p_station": cfg["station"],
                }) or []
                for job in jobs:
                    try:
                        payload = job.get("payload") or {}
                        kind = job.get("kind")
                        if kind == "label":
                            # A label goes to the Zebra via CUPS, not to the
                            # ESC/POS receipt printer.
                            ok, err = print_label(payload, log)
                        else:
                            data = render_test(payload) if kind == "test" else render_receipt(payload)
                            ok, err = printer.send(data)
                    except Exception as exc:  # a malformed payload must not kill the worker
                        ok, err = False, "Could not handle the print job: %s" % exc
                    rpc(cfg, "print_bridge_finish", {
                        "p_token": cfg["station_key"], "p_id": job["id"],
                        "p_ok": ok, "p_error": None if ok else err,
                    })
                    STATE["last_job"] = {"id": job["id"], "ok": ok, "error": err, "at": time.strftime("%H:%M:%S")}
                    log("  %s %s %s" % ("printed" if ok else "FAILED ", job.get("kind"), err or ""))
                    if ok and job.get("kind") != "label":
                        # Only a successful RECEIPT proves the receipt printer
                        # is alive; a label print says nothing about it.
                        STATE["online"] = True
                last_error = None
            except Exception as exc:
                message = str(exc)
                if message != last_error:   # say it once, not every 1.5 s
                    log("  receipt worker: %s" % message)
                    last_error = message
                STATE["detail"] = message
                time.sleep(5)
            time.sleep(1.5)

    threading.Thread(target=loop, name="receipt-worker", daemon=True).start()
    STATE["running"] = True
    log("   Receipts       ON · station '%s' · printer %s" % (cfg["station"], cfg["printer"]))
    return STATE


if __name__ == "__main__":
    # Preview a receipt as text without a printer: python3 receipt_printer.py
    sample = {
        "shop": {"name": "Tapas Reading Cafe", "lines": ["2nd Floor, 2628, 27th Main Rd, HSR Layout", "Bengaluru 560102"], "gstin": None},
        "title": "RECEIPT", "billNo": "INV-20260911-001", "dateText": "11 Sep 2026, 02:05 pm", "customer": "Apeksha Razdan",
        "items": [{"name": "New Monthly", "qty": 1, "amount": 600, "discLabel": "10% off", "discAmount": 60},
                  {"name": "Masala Chai", "qty": 2, "amount": 120}, {"name": "Deposit (Refundable)", "qty": 1, "amount": 1000}],
        "totals": [{"label": "Subtotal", "value": 1720}, {"label": "Discount", "value": -60}],
        "total": 1660, "payMethod": "cash", "cashReceived": 2000, "change": 340,
    }
    raw = render_receipt(sample)
    import re
    print(re.sub(rb"(\x1b[@tadEa][\x00-\x02]?|\x1d![\x00-\x11]|\x1dVB\x00|\x1b@)", b"", raw).decode("ascii", "ignore"))
