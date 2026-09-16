/* Publishes the print-station files into public/ so a counter laptop can
 * install itself from the dashboard with one command.
 *
 * Why generated rather than committed: receipt_printer.py has one home, in
 * printer_bridge/. Keeping a second copy in public/ would drift the moment
 * either is edited, and the copy people download is the one that must be
 * current. This runs on every build (npm prebuild), including Vercel's, so the
 * download is always the deployed code.
 *
 * The Supabase URL and anon key are baked into the installer. Both are public
 * — they already ship inside the browser bundle — so this exposes nothing new.
 * STATION_KEY is a secret and is never written here; the installer asks for it.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'public');

function fromDotEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    const hit = raw.split('\n').find((l) => l.trim().startsWith(`${key}=`));
    return hit ? hit.slice(hit.indexOf('=') + 1).trim() : '';
  } catch {
    return '';
  }
}

const SUPABASE_URL = fromDotEnv('REACT_APP_SUPABASE_URL');
const SUPABASE_ANON = fromDotEnv('REACT_APP_SUPABASE_ANON_KEY');

fs.copyFileSync(
  path.join(ROOT, 'printer_bridge', 'receipt_printer.py'),
  path.join(PUB, 'print-station.py')
);
try {
  fs.copyFileSync(
    path.join(ROOT, 'printer_bridge', 'receipt_logo.pbm'),
    path.join(PUB, 'print-station-logo.pbm')
  );
} catch {
  // The logo is optional — receipts fall back to printing the shop name.
}

const installer = `#!/bin/bash
# Tapas print station installer.
#
# Sets up this Mac to print receipts and barcode labels for the dashboard.
# Everything the till needs is here: no repo, no git, no pip install — the
# station is one standard-library Python file.
#
# Written to work on old Macs too (tested against macOS 12 Monterey, the last
# release a 2015 MacBook Pro gets): Apple's bash 3.2, Python 3.8+.
#
# Run:  curl -fsSL https://dashboard.tapasreadingcafe.com/install-print-station.sh | bash

set -euo pipefail

BASE="https://dashboard.tapasreadingcafe.com"
DIR="$HOME/TapasPrintStation"
PLIST="$HOME/Library/LaunchAgents/com.tapas.printstation.plist"

echo ""
echo "  Tapas print station"
echo "  ==================="
echo ""

# Find a Python 3 that actually RUNS. 'command -v python3' is not enough:
# since macOS 12, /usr/bin/python3 exists on every Mac as a stub that only
# offers to install Apple's developer tools. It passes that check, and then
# the background service would call it, fail, and be restarted forever while
# this script cheerfully printed "Done" and nothing ever printed.
PY=""
for cand in "$(command -v python3 2>/dev/null || true)" /opt/homebrew/bin/python3 /usr/local/bin/python3 /usr/bin/python3; do
  [ -n "$cand" ] && [ -x "$cand" ] || continue
  # The stub: skip it unless the developer tools behind it are installed,
  # otherwise merely running it pops the install dialog mid-script.
  if [ "$cand" = "/usr/bin/python3" ] && ! xcode-select -p >/dev/null 2>&1; then continue; fi
  if "$cand" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)' >/dev/null 2>&1; then
    PY="$cand"; break
  fi
done
if [ -z "$PY" ]; then
  echo "  This Mac needs Python 3 first. It comes free with Apple's developer tools."
  echo ""
  echo "  A window is opening now — click Install and wait for it to finish"
  echo "  (10-30 minutes on an older Mac). Then run this same command again."
  echo ""
  xcode-select --install >/dev/null 2>&1 || true
  exit 1
fi
echo "  Using $("$PY" --version 2>&1) at $PY"

mkdir -p "$DIR"
echo "  Downloading the station…"
curl -fsSL "$BASE/print-station.py" -o "$DIR/receipt_printer.py"
curl -fsSL "$BASE/print-station-logo.pbm" -o "$DIR/receipt_logo.pbm" || true

# Keep an existing key on a re-run so this is safe to run again.
EXISTING_KEY=""
if [ -f "$DIR/.env" ]; then
  EXISTING_KEY="$(grep -E '^STATION_KEY=' "$DIR/.env" | cut -d= -f2- || true)"
fi

# Every answer can come from the environment instead of a prompt, so this can
# be run unattended — over SSH, from a setup script, or to re-point an existing
# till without a person sitting in front of it:
#
#   STATION_KEY=... RECEIPT_PRINTER=cups:KP307_Receipt bash install-print-station.sh
#
# Anything not supplied is asked for, so the plain curl-to-bash run is unchanged.
ASK=1
[ -t 0 ] || ASK=0            # piped into bash with no terminal to read from
[ -e /dev/tty ] || ASK=0

prompt() {                    # prompt <varname> <question> <default>
  local __var="$1" __q="$2" __def="\${3:-}" __ans=""
  if [ "$ASK" = "1" ]; then
    read -r -p "$__q" __ans < /dev/tty || __ans=""
  fi
  printf -v "$__var" '%s' "\${__ans:-$__def}"
}

# Receipt and label printers speak their own command language (ESC/POS, ZPL),
# so the bytes must reach them untouched. macOS no longer allows "raw" print
# queues, and a normal driver queue from System Settings rewrites the job —
# receipts come out as garbage or not at all. The fix that works (proven on
# the counter Mac, Sept 2026) is a queue whose PPD declares a do-nothing
# filter. This builds that queue.
#
#   setup_usb_queue <QueueName> <what it is> <URI from env, or empty>
#   → prints the queue name on success
setup_usb_queue() {
  local name="$1" what="$2" uri="\${3:-}" n=0 pick=""
  if [ -z "$uri" ]; then
    echo "" >&2
    echo "  Looking for USB printers (make sure the $what is on and plugged in)…" >&2
    local list; list="$(lpinfo --include-schemes usb -v 2>/dev/null | awk '{print $2}')"
    if [ -z "$list" ]; then
      echo "  No USB printer found. Check the cable and power, then run this again." >&2
      return 1
    fi
    while IFS= read -r line; do n=$((n+1)); echo "    $n) $line" >&2; done <<< "$list"
    if [ "$n" = "1" ]; then
      pick=1
    else
      prompt pick "  Which one is the $what? [1]: " "1"
    fi
    uri="$(echo "$list" | sed -n "\${pick}p")"
    [ -n "$uri" ] || { echo "  That number isn't in the list." >&2; return 1; }
  fi

  cat > "$DIR/passthrough.ppd" <<'PPDEOF'
*PPD-Adobe: "4.3"
*FormatVersion: "4.3"
*FileVersion: "1.0"
*LanguageVersion: English
*LanguageEncoding: ISOLatin1
*PCFileName: "tapas-passthrough.ppd"
*Manufacturer: "Tapas"
*Product: "(Pass-through)"
*ModelName: "Tapas pass-through (receipt / label printer)"
*ShortNickName: "Tapas pass-through"
*NickName: "Tapas pass-through (receipt / label printer)"
*PSVersion: "(3010.000) 0"
*LanguageLevel: "3"
*ColorDevice: False
*DefaultColorSpace: Gray
*FileSystem: False
*Throughput: "1"
*LandscapeOrientation: Plus90
*TTRasterizer: Type42
*cupsVersion: 2.3
*cupsFilter: "application/vnd.cups-raw 0 -"
*OpenUI *PageSize/Media Size: PickOne
*OrderDependency: 10 AnySetup *PageSize
*DefaultPageSize: Roll80
*PageSize Roll80/80mm Roll: ""
*CloseUI: *PageSize
*OpenUI *PageRegion: PickOne
*OrderDependency: 10 AnySetup *PageRegion
*DefaultPageRegion: Roll80
*PageRegion Roll80/80mm Roll: ""
*CloseUI: *PageRegion
*DefaultImageableArea: Roll80
*ImageableArea Roll80/80mm Roll: "0 0 227 842"
*DefaultPaperDimension: Roll80
*PaperDimension Roll80/80mm Roll: "227 842"
PPDEOF

  echo "  Setting up print queue $name for $uri …" >&2
  # An admin account can usually do this without a password; if not, ask.
  if ! lpadmin -p "$name" -E -v "$uri" -P "$DIR/passthrough.ppd" 2>/dev/null; then
    if [ "$ASK" = "1" ]; then
      echo "  macOS wants your Mac login password to add a printer:" >&2
      sudo lpadmin -p "$name" -E -v "$uri" -P "$DIR/passthrough.ppd" < /dev/tty || return 1
    else
      echo "  Couldn't add the printer queue (needs an admin account)." >&2
      return 1
    fi
  fi
  cupsenable "$name" >/dev/null 2>&1 || true
  cupsaccept "$name" >/dev/null 2>&1 || true
  echo "$name"
}

STATION_KEY="\${STATION_KEY:-}"
if [ -z "$STATION_KEY" ]; then
  echo ""
  echo "  Open the dashboard on this Mac:  Settings -> Devices -> Receipt printer"
  echo "  and copy the station key."
  echo ""
  if [ -n "$EXISTING_KEY" ]; then
    prompt STATION_KEY "  Station key [press Enter to keep the saved one]: " "$EXISTING_KEY"
  else
    prompt STATION_KEY "  Station key: " ""
  fi
fi
[ -n "$STATION_KEY" ] || {
  echo "  No station key. Pass STATION_KEY=... or run this in a terminal."
  exit 1
}

PRINTER="\${RECEIPT_PRINTER:-}"
if [ -z "$PRINTER" ]; then
  echo ""
  echo "  How is the receipt printer connected?"
  echo "    1) USB cable to this Mac   (no need to add it in System Settings — this sets it up)"
  echo "    2) On the Wi-Fi or LAN     (not tied to any one laptop)"
  prompt CONN "  Choose 1 or 2 [1]: " "1"
  if [ "$CONN" = "1" ]; then
    QUEUE="$(setup_usb_queue Tapas_Receipt "receipt printer" "\${RECEIPT_USB_URI:-}")" || exit 1
    PRINTER="cups:\${QUEUE}"
  else
    echo ""
    echo "  Leave blank to find the printer on the network automatically."
    prompt IP "  Printer IP address [auto]: " "auto"
    PRINTER="$IP"
  fi
fi

# The Zebra that prints barcode labels. On the network it needs no driver at
# all; on USB it needs a CUPS queue, same as the receipt printer.
LABELS="\${LABEL_PRINTER:-}"
if [ -z "$LABELS" ]; then
  echo ""
  echo "  Barcode label printer (Zebra). Leave blank if you don't print labels."
  echo "    - USB cable to this Mac:  type  usb"
  echo "    - on the Wi-Fi:           type its IP, e.g. 192.168.0.60"
  prompt LABELS "  Label printer [skip]: " ""
fi
if [ "$LABELS" = "usb" ]; then
  LQ="$(setup_usb_queue Tapas_Labels "Zebra label printer" "\${LABEL_USB_URI:-}")" || exit 1
  LABELS="cups:\${LQ}"
fi

if [ -z "\${STATION_NAME:-}" ]; then
  prompt STATION_NAME "  A name for this till [$(hostname -s)]: " "$(hostname -s)"
fi

cat > "$DIR/.env" <<ENVEOF
# Tapas print station — this file holds a secret. Do not share it.
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON}
STATION_KEY=$STATION_KEY
RECEIPT_PRINTER=$PRINTER
LABEL_PRINTER=$LABELS
STATION_NAME=$STATION_NAME
ENVEOF
chmod 600 "$DIR/.env"

# Auto-start at login, and restart if it ever stops — a till that silently
# stopped printing after a reboot is the failure that actually costs money.
# python3 -u: without it stdout is block-buffered when it is not a terminal and
# station.log stays empty, which is exactly when someone needs to read it.
# The full path to the Python found above, not 'env python3': launchd runs
# with a bare PATH, where python3 is the macOS stub again.
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.tapas.printstation</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PY</string>
    <string>-u</string>
    <string>$DIR/receipt_printer.py</string>
    <string>--serve</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DIR/station.log</string>
  <key>StandardErrorPath</key><string>$DIR/station.log</string>
</dict>
</plist>
PLISTEOF

launchctl unload "$PLIST" >/dev/null 2>&1 || true
: > "$DIR/station.log"
launchctl load "$PLIST"

# Don't take launchd's word for it. A station that crashes on start gets
# restarted every few seconds and looks "loaded" the whole time, so wait,
# then check it is really up and hasn't logged a crash.
echo ""
echo "  Starting the station…"
sleep 8
PID="$(launchctl list 2>/dev/null | awk '$3 == "com.tapas.printstation" {print $1}')"
if [ -n "$PID" ] && [ "$PID" != "-" ] && ! grep -q "Traceback" "$DIR/station.log" 2>/dev/null; then
  echo ""
  echo "  Done. The station is running and will start again by itself at login."
  echo ""
  echo "    Folder   $DIR"
  echo "    Log      $DIR/station.log"
  echo "    Stop     launchctl unload $PLIST"
  echo ""
  echo "  Check Settings -> Devices on the dashboard — this till should appear"
  echo "  as \"$STATION_NAME\" within about ten seconds."
  echo ""
else
  echo ""
  echo "  The station did NOT start. Last lines of its log:"
  echo ""
  tail -n 15 "$DIR/station.log" 2>/dev/null | sed 's/^/    /'
  echo ""
  echo "  Send a photo of this screen to whoever set up the dashboard."
  echo ""
  exit 1
fi
`;

fs.writeFileSync(path.join(PUB, 'install-print-station.sh'), installer, { mode: 0o644 });

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('[print-station] WARNING: Supabase URL/anon key not found — the installer it wrote will not connect.');
} else {
  console.log('[print-station] published print-station.py + install-print-station.sh');
}
