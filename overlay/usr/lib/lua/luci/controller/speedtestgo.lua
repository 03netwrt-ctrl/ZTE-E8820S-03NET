module("luci.controller.speedtestgo", package.seeall)

function index()
    entry({"admin", "services", "speedtestgo"}, alias("admin", "services", "speedtestgo", "view"), _("Speedtest"), 99)
    entry({"admin", "services", "speedtestgo", "view"}, template("speedtestgo/index")).leaf = true
    entry({"admin", "services", "speedtestgo", "start"}, call("action_start"), nil).leaf = true
    entry({"admin", "services", "speedtestgo", "check"}, call("action_check"), nil).leaf = true
end

function action_start()
    -- Check if speedtest-go binary exists
    local f = io.open("/usr/bin/speedtest-go", "r")
    if not f then
        f = io.open("/usr/sbin/speedtest-go", "r")
    end
    if f then f:close() else
        luci.http.prepare_content("application/json")
        luci.http.write_json({ status = "error", log = "speedtest-go not installed. Run: opkg install speedtest-go" })
        return
    end
    os.execute("rm -f /tmp/speedtestgo_status.txt /tmp/speedtestgo_result.json /tmp/speedtestgo.log")
    os.execute("echo 'RUNNING' > /tmp/speedtestgo_status.txt")
    os.execute("/usr/bin/speedtestgo-run.sh >/dev/null 2>&1 &")
    luci.http.prepare_content("application/json")
    luci.http.write_json({ status = "started" })
end

function action_check()
    local status = "IDLE"
    local f = io.open("/tmp/speedtestgo_status.txt", "r")
    if f then
        status = f:read("*all"):gsub("^%s*(.-)%s*$", "%1")
        f:close()
    end

    local result = nil
    if status == "DONE" then
        local fr = io.open("/tmp/speedtestgo_result.json", "r")
        if fr then
            result = fr:read("*all")
            fr:close()
        end
    end

    luci.http.prepare_content("application/json")
    luci.http.write_json({ status = status, result = result })
end
