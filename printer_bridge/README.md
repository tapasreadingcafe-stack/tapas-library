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

---

# Receipt printer — POSIFLOW KP307 (and any ESC/POS printer)

The same bridge also runs the **receipt print station**. Once it's running,
**Print Receipt** on any phone or laptop prints straight to the thermal printer
— no browser print window, no driver, nothing to install on the phone.

How it works: the tap puts the receipt in a Supabase print queue; this bridge
picks it up within about a second and sends it to the printer over the Wi-Fi in
the printer's own ESC/POS language. Every 10 seconds it also reports whether the
printer is answering, which is what the 🟢 / 🔴 dot in the POS shows.

## One-time setup

1. **Database.** Run `supabase/migrations/20260911_print_queue.sql` and
   `supabase/migrations/20260919_label_printer_status.sql` in the Supabase SQL
   editor. The second one lets the station report the label printer too.

2. **Printer on the network.** The KP307-UEWB has USB, LAN, Wi-Fi and
   Bluetooth. The steps below are the usual ones for this class of printer —
   check the POSIFLOW user guide or their "KP307 LAN Setup" video if yours
   differs:
   - **Easiest:** plug a network cable from the printer into the Wi-Fi router.
   - **Wi-Fi:** set it up with the vendor's configuration tool, joining the same
     Wi-Fi network as the counter computer.
   - **Find its address:** switch the printer off, hold the **FEED** button,
     switch it on, and release when it starts printing. The self-test page
     shows its IP address.
   - Ask the router to always give the printer the same address (a "DHCP
     reservation") — not required, the bridge re-finds it, but it's faster.

3. **Station key.** In the dashboard open **Settings → Devices**. The Bill /
   Receipt Printer card shows a `STATION_KEY=...` line with a **Copy** button.
   Create the file `printer_bridge/.env` and paste that line in. This file is
   never committed to git.

4. **Start the bridge** as usual (`python3 print_bridge.py`). You should see:

   ```
      Receipts       ON · station 'your-mac' · printer auto
   ```

5. Click **Test Print** on the Devices page. A short test receipt comes out.

## Options (`printer_bridge/.env`)

```
STATION_KEY=...              required
RECEIPT_PRINTER=auto         default: find the printer on this Wi-Fi by itself
RECEIPT_PRINTER=192.168.0.50 or a fixed address (port 9100)
RECEIPT_PRINTER=cups:QUEUE   or a USB printer already added to macOS
RECEIPT_PRINTER=none         or no receipt printer: this till only prints labels
LABEL_PRINTER=cups:QUEUE     the Zebra on USB (the installer builds this queue)
LABEL_PRINTER=192.168.0.60   or a Zebra on the Wi-Fi — raw ZPL, no driver at all
LABEL_PRINTER=none           or no label printer on this till
STATION_NAME=counter         default: this computer's name
```

`auto` looks for a device on the network accepting raw print jobs on port 9100.
If it finds more than one printer it **does not guess** — it tells you to set
`RECEIPT_PRINTER` — so receipts can never land on some other printer.

## Good to know

- **Barcode labels ride along.** The same station prints them: a label queued
  from any phone goes to the Zebra in its own ZPL language, and the heartbeat
  reports whether the Zebra is answering, so **Settings → Devices** shows the
  label printer as ready (or not) from every device — not only from the till.
  When a jam pauses the queue, the **Auto-Fix** button on that page asks the
  station to clear the stuck labels and re-enable the printer.
- **Keep one computer running the bridge.** It's the only piece that can reach
  the printer. Use the login auto-start above so it survives restarts.
- **Printer off?** Receipts wait in the queue and print when it's back — for up
  to 30 minutes. After that they're dropped, so a printer switched on in the
  evening doesn't print the whole afternoon.
- **Preview without a printer:** `python3 receipt_printer.py` prints a sample
  receipt as text.
- **Check what the station sees:** open http://127.0.0.1:5050/api/receipt-printer
  on the counter computer.
- Item names are printed in plain English letters; Hindi or other scripts in an
  item name are left out, because thermal printers can't draw them in text mode.
