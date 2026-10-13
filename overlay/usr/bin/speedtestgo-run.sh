#!/bin/sh
# 03NET-WRT speedtest-go runner
# Runs speedtest-go and saves JSON result

BIN="/usr/bin/speedtest-go"
[ -x "$BIN" ] || BIN="/usr/sbin/speedtest-go"

echo "RUNNING" > /tmp/speedtestgo_status.txt
rm -f /tmp/speedtestgo_result.json

# Run test, output JSON
"$BIN" --json > /tmp/speedtestgo_result.json 2>/tmp/speedtestgo.log
RC=$?

if [ $RC -eq 0 ] && [ -s /tmp/speedtestgo_result.json ]; then
    echo "DONE" > /tmp/speedtestgo_status.txt
else
    echo "ERROR" > /tmp/speedtestgo_status.txt
fi
