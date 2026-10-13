#!/bin/sh
# 03NET-WRT login banner — live system info at shell login (ttyd / SSH)

HR1="───────────────────────────────────────────────────────────────────────────"
HR2="───────────────────────────────────────────────────────────"

echo "$HR1"
cat <<'ART'
  ██████╗ ██████╗ ███╗   ██╗███████╗████████╗   ██╗    ██╗██████╗ ████████╗
 ██╔═████╗╚════██╗████╗  ██║██╔════╝╚══██╔══╝   ██║    ██║██╔══██╗╚══██╔══╝
 ██║██╔██║ █████╔╝██╔██╗ ██║█████╗     ██║      ██║ █╗ ██║██████╔╝   ██║
 ████╔╝██║ ╚═══██╗██║╚██╗██║██╔══╝     ██║      ██║███╗██║██╔══██╗   ██║
 ╚██████╔╝██████╔╝██║ ╚████║███████╗   ██║      ╚███╔███╔╝██║  ██║   ██║
  ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝       ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝
ART
echo "$HR1"
echo "                       WELCOME TO 03NET-WRT PROJECT"
echo "$HR1"

# Model
model="$(cat /tmp/sysinfo/model 2>/dev/null)"
[ -z "$model" ] && model="ZTE E8820S"
echo " * Model  : $model 03NET-WRT"

# Arch (+ SoC temp when a thermal sensor exists)
arch="$(uname -m)"
temp=""
for tz in /sys/class/thermal/thermal_zone*/temp; do
	[ -r "$tz" ] && { temp=" $(( $(cat "$tz") / 1000 )).0°C"; break; }
done
echo " * Arch   : $arch$temp"

# System
sysdesc="$(sed -n "s/^DISTRIB_DESCRIPTION='\(.*\)'/\1/p" /etc/openwrt_release 2>/dev/null)"
[ -z "$sysdesc" ] && sysdesc="OpenWrt"
echo " * System : $sysdesc"

# Uptime
up_s=$(cut -d. -f1 /proc/uptime 2>/dev/null); up_s=${up_s:-0}
printf " * Uptime : %dd %02d:%02d:%02d, %s\n" \
	"$((up_s/86400))" "$((up_s%86400/3600))" "$((up_s%3600/60))" "$((up_s%60))" \
	"$(date '+%Y-%m-%d %H:%M:%S')"
echo "$HR1"

# RootFS
rootfs=$(df -h /overlay 2>/dev/null | awk 'NR==2{print $2", used: "$3", free: "$4}')
[ -z "$rootfs" ] && rootfs=$(df -h / 2>/dev/null | awk 'NR==2{print $2", used: "$3", free: "$4}')
echo " * RootFS : $rootfs"

# Memory (MB)
mem=$(free -m 2>/dev/null | awk '/^Mem:/{printf "%sMB, used: %sMB, free: %sMB", $2, $3, $4}')
[ -n "$mem" ] && echo " * Memory : $mem"

# Swap
if free -m 2>/dev/null | awk '/^Swap:/{exit ($2==0)}'; then
	swap=$(free -m 2>/dev/null | awk '/^Swap:/{printf "total: %sMB, used: %sMB, free: %sMB", $2, $3, $4}')
	echo " * Swap   : $swap"
fi
echo "$HR2"

# LAN
lan=$(ip -o -4 addr show br-lan 2>/dev/null | awk '{print $4}' | head -1)
[ -n "$lan" ] && echo " * LAN    : $lan (br-lan)"

# WAN (ubus wan interface, fallback to default route device)
wan_if=$(ubus call network.interface.wan status 2>/dev/null | sed -n 's/.*"device":"\([^"]*\)".*/\1/p' | head -1)
[ -z "$wan_if" ] && wan_if=$(ip route show default 2>/dev/null | awk '{print $5}' | head -1)
if [ -n "$wan_if" ]; then
	wan_ip=$(ip -o -4 addr show "$wan_if" 2>/dev/null | awk '{print $4}' | head -1)
	[ -n "$wan_ip" ] && echo " * WAN    : $wan_ip ($wan_if)"
fi

# ISP: public IP + org (short timeout, silent when offline)
if command -v curl >/dev/null 2>&1; then
	isp=$(curl -m 4 -s "http://ip-api.com/line/?fields=query,org" 2>/dev/null | tr '\n' ' ' | sed 's/ *$//')
	[ -n "$isp" ] && echo " * ISP    : $isp"
fi
echo "$HR2"
