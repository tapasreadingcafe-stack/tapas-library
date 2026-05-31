# Tapas — local Zebra print bridge

The dashboard's **Direct Print** button needs this small Flask service
running on your laptop because browsers cannot talk to USB devices
directly. It listens on `http://127.0.0.1:5050/api/print`, takes ZPL
in a JSON body, and forwards it to your Zebra ZD230 via macOS `lp`.

## First-time setup (~2 minutes)

Open Terminal and run:

```bash
cd ~/Desktop/tapas-library/printer_bridge
python3 -m pip install -r requirements.txt
```

That installs Flask. Only needed once.

## Each time you want to print

```bash
cd ~/Desktop/tapas-library/printer_bridge
python3 print_bridge.py
```

You should see:

```
🖨️  Tapas print bridge
   Listening on  http://127.0.0.1:5050
   Printer        Zebra_Technologies_ZTC_ZD230_203dpi_ZPL
   Keep this terminal open while you print. Ctrl+C to stop.
```

Leave that terminal window open. Now Direct Print on the dashboard
will work silently — one click, label out of the Zebra.

When you're done printing for the day, hit `Ctrl+C` in the terminal
or just close the window.

## Troubleshooting

- **"address already in use" on startup** — something else is on
  port 5050. Find it: `lsof -i :5050`, kill it, restart.
- **"Direct Print" still shows the 5050 error** — make sure the
  terminal still says "Listening on …" and you didn't accidentally
  close it.
- **Job submits but nothing prints** — check the printer queue with
  `lpstat -W not-completed -o`. If a job is stuck, clear it with
  `cancel -a Zebra_Technologies_ZTC_ZD230_203dpi_ZPL`.
- **Printer name changed** — if you reinstall the Zebra, its CUPS
  name might change. Run `lpstat -p` to see the new name, then edit
  the `PRINTER_NAME` constant at the top of `print_bridge.py`.

## Make it auto-start at login (optional)

If you don't want to type the command every morning, you can create
a launchd plist:

```bash
cat > ~/Library/LaunchAgents/com.tapas.printbridge.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.tapas.printbridge</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>REPLACE_WITH_ABSOLUTE_PATH_TO/print_bridge.py</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/tapas-printbridge.log</string>
  <key>StandardErrorPath</key><string>/tmp/tapas-printbridge.err</string>
</dict>
</plist>
EOF
```

Replace `REPLACE_WITH_ABSOLUTE_PATH_TO` with the real path (run
`pwd` inside the `printer_bridge/` folder to get it), then:

```bash
launchctl load ~/Library/LaunchAgents/com.tapas.printbridge.plist
```

Now the bridge starts every time you log in.
