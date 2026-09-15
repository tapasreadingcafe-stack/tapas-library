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
# station is one Python file and macOS already ships Python 3.
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

command -v python3 >/dev/null 2>&1 || {
  echo "  Python 3 is missing. Install Xcode command line tools first:"
  echo "    xcode-select --install"
  exit 1
}

mkdir -p "$DIR"
echo "  Downloading the station…"
curl -fsSL "$BASE/print-station.py" -o "$DIR/receipt_printer.py"
curl -fsSL "$BASE/print-station-logo.pbm" -o "$DIR/receipt_logo.pbm" || true

# Keep an existing key on a re-run so this is safe to run again.
EXISTING_KEY=""
if [ -f "$DIR/.env" ]; then
  EXISTING_KEY="$(grep -E '^STATION_KEY=' "$DIR/.env" | cut -d= -f2- || true)"
fi

echo ""
echo "  Open the dashboard on this Mac:  Settings -> Devices -> Receipt printer"
echo "  and copy the station key."
echo ""
if [ -n "$EXISTING_KEY" ]; then
  read -r -p "  Station key [press Enter to keep the saved one]: " STATION_KEY < /dev/tty
  STATION_KEY="\${STATION_KEY:-$EXISTING_KEY}"
else
  read -r -p "  Station key: " STATION_KEY < /dev/tty
fi
[ -n "$STATION_KEY" ] || { echo "  No key given — stopping."; exit 1; }

echo ""
echo "  How is the receipt printer connected?"
echo "    1) USB to this Mac      (set it up in System Settings -> Printers first)"
echo "    2) On the Wi-Fi or LAN  (recommended — not tied to any one laptop)"
read -r -p "  Choose 1 or 2 [2]: " CONN < /dev/tty
CONN="\${CONN:-2}"

if [ "$CONN" = "1" ]; then
  echo ""
  echo "  Printer queues on this Mac:"
  lpstat -p 2>/dev/null | awk '{print "    - " $2}' || echo "    (none found)"
  read -r -p "  Queue name: " QUEUE < /dev/tty
  PRINTER="cups:\${QUEUE}"
else
  echo ""
  echo "  Leave blank to find the printer on the network automatically."
  read -r -p "  Printer IP address [auto]: " IP < /dev/tty
  PRINTER="\${IP:-auto}"
fi

read -r -p "  A name for this till [$(hostname -s)]: " STATION_NAME < /dev/tty
STATION_NAME="\${STATION_NAME:-$(hostname -s)}"

cat > "$DIR/.env" <<ENVEOF
# Tapas print station — this file holds a secret. Do not share it.
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON}
STATION_KEY=$STATION_KEY
RECEIPT_PRINTER=$PRINTER
STATION_NAME=$STATION_NAME
ENVEOF
chmod 600 "$DIR/.env"

# Auto-start at login, and restart if it ever stops — a till that silently
# stopped printing after a reboot is the failure that actually costs money.
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.tapas.printstation</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>python3</string>
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
launchctl load "$PLIST"

echo ""
echo "  Done. The station is running and will start again by itself at login."
echo ""
echo "    Folder   $DIR"
echo "    Log      $DIR/station.log"
echo "    Stop     launchctl unload $PLIST"
echo ""
echo "  Check Settings -> Devices on the dashboard — this till should appear"
echo "  as \\"$STATION_NAME\\" within about ten seconds."
echo ""
`;

fs.writeFileSync(path.join(PUB, 'install-print-station.sh'), installer, { mode: 0o644 });

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('[print-station] WARNING: Supabase URL/anon key not found — the installer it wrote will not connect.');
} else {
  console.log('[print-station] published print-station.py + install-print-station.sh');
}
