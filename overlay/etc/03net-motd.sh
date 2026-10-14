#!/bin/sh
# 03NET-WRT login banner — live system info at shell login (ttyd / SSH)

HR="───────────────────────────────────────────────────────────────────────────"

echo "$HR"
cat <<'ART'
  ██████╗ ██████╗ ███╗   ██╗███████╗████████╗   ██╗    ██╗██████╗ ████████╗
 ██╔═████╗╚════██╗████╗  ██║██╔════╝╚══██╔══╝   ██║    ██║██╔══██╗╚══██╔══╝
 ██║██╔██║ █████╔╝██╔██╗ ██║█████╗     ██║      ██║ █╗ ██║██████╔╝   ██║
 ████╔╝██║ ╚═══██╗██║╚██╗██║██╔══╝     ██║      ██║███╗██║██╔══██╗   ██║
 ╚██████╔╝██████╔╝██║ ╚████║███████╗   ██║      ╚███╔███╔╝██║  ██║   ██║
  ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝       ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝
ART
echo "$HR"
echo "                       WELCOME TO 03NET-WRT PROJECT"
echo "                         Telegram: @O3netwrt77"
echo "$HR"

model="$(cat /tmp/sysinfo/model 2>/dev/null)"
[ -z "$model" ] && model="ZTE E8820S"
echo " * Model  : $model 03NET-WRT"

arch="$(uname -m)"
temp=""
for tz in /sys/class/thermal/thermal_zone*/temp; do
	[ -r "$tz" ] && { temp=" $(( $(cat "$tz") / 1000 )).0°C"; break; }
done
echo " * Arch   : $arch$temp"

sysdesc="$(sed -n "s/^DISTRIB_DESCRIPTION='\(.*\)'/\1/p" /etc/openwrt_release 2>/dev/null)"
[ -z "$sysdesc" ] && sysdesc="OpenWrt"
echo " * System : $sysdesc"

up_s=$(cut -d. -f1 /proc/uptime 2>/dev/null); up_s=${up_s:-0}
printf " * Uptime : %dd %02d:%02d:%02d, %s\n" \
	"$((up_s/86400))" "$((up_s%86400/3600))" "$((up_s%3600/60))" "$((up_s%60))" \
	"$(date '+%Y-%m-%d %H:%M:%S')"
echo "$HR"

rootfs=$(df -h /overlay 2>/dev/null | awk 'NR==2{print $2", used: "$3", free: "$4}')
[ -z "$rootfs" ] && rootfs=$(df -h / 2>/dev/null | awk 'NR==2{print $2", used: "$3", free: "$4}')
echo " * RootFS : $rootfs"

mt=$(awk '/^MemTotal:/{print int($2/1024)}' /proc/meminfo 2>/dev/null)
mf=$(awk '/^MemFree:/{print int($2/1024)}' /proc/meminfo 2>/dev/null)
if [ -n "$mt" ] && [ -n "$mf" ]; then
	echo " * Memory : ${mt}MB, used: $((mt-mf))MB, free: ${mf}MB"
fi

st=$(awk '/^SwapTotal:/{print int($2/1024)}' /proc/meminfo 2>/dev/null)
sf=$(awk '/^SwapFree:/{print int($2/1024)}' /proc/meminfo 2>/dev/null)
if [ -n "$st" ] && [ "$st" -gt 0 ]; then
	echo " * Swap   : total: ${st}MB, used: $((st-sf))MB, free: ${sf}MB"
fi
echo "$HR"

lan=$(ip -o -4 addr show br-lan 2>/dev/null | awk '{print $4}' | head -1)
[ -n "$lan" ] && echo " * LAN    : $lan (br-lan)"

wan_if=$(ubus call network.interface.wan status 2>/dev/null | sed -n 's/.*"device":"\([^"]*\)".*/\1/p' | head -1)
[ -z "$wan_if" ] && wan_if=$(ip route show default 2>/dev/null | awk '{print $5}' | head -1)
if [ -n "$wan_if" ]; then
	wan_ip=$(ip -o -4 addr show "$wan_if" 2>/dev/null | awk '{print $4}' | head -1)
	[ -n "$wan_ip" ] && echo " * WAN    : $wan_ip ($wan_if)"
fi

if command -v curl >/dev/null 2>&1; then
	isp=$(curl -m 4 -s "http://ip-api.com/line/?fields=query,org" 2>/dev/null | tr '\n' ' ' | sed 's/ *$//')
	[ -n "$isp" ] && echo " * ISP    : $isp"
fi
echo "$HR"
