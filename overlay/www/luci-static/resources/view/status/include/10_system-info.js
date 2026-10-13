'use strict';
'require baseclass';
'require rpc';
'require fs';
var callLuciVersion = rpc.declare({
  object: "luci",
  method: "getVersion"
});
var callSystemBoard = rpc.declare({
  object: "system",
  method: "board"
});
var callSystemInfo = rpc.declare({
  object: "system",
  method: "info"
});
var callCpu = rpc.declare({
  object: 'cputemp',
  method: 'get'
});
const MAX_MBPS = 100;
let tempVal = 0,
  cpuVal = 0,
  memVal = 0,
  netVal = 0;
let tempCircle, cpuCircle, memCircle, netCircle;
let tempText, cpuText, memText, netText;
let uiBuilt = !1;

function getCols() {
  return window.innerWidth < 600 ? 2 :
    window.innerWidth < 900 ? 3 :
    window.innerWidth < 1200 ? 3 : 5;
}

function glass() {
  return `
    background:rgba(255,255,255,0.12);
    border:1px solid rgba(255,255,255,0.25);
    backdrop-filter:blur(6px);
    -webkit-backdrop-filter:blur(6px);
    border-radius:14px;
    box-shadow:
      0 4px 14px rgba(0,0,0,0.15),
      inset 0 1px rgba(255,255,255,0.25);
  `
}

function getBrandFromCgi() {
  return fetch('/cgi-bin/radmon', {
    cache: 'no-store'
  }).then(r => r.ok ? r.text() : '').then(t => (t || '').trim() ||
    '03NET-WRT').catch(() => '03NET-WRT')
}

function getColor(v) {
  if (v <= 50) return "#4caf50";
  if (v <= 75) return "#ff9800";
  return "#f44336"
}

function formatSpeed(bytesPerSec) {
  let bits = bytesPerSec * 8;
  if (bits < 1000) return {
    v: bits.toFixed(0),
    u: " bps"
  };
  if (bits < 1e6) return {
    v: (bits / 1e3).toFixed(1),
    u: " Kbps"
  };
  return {
    v: (bits / 1e6).toFixed(1),
    u: " Mbps"
  }
}

function animate(circle, text, from, to, disp, unit) {
  let start = null,
    dur = 500;

  function f(ts) {
    if (!start) start = ts;
    let p = (ts - start) / dur;
    if (p > 1) p = 1;
    let val = from + (to - from) * p;
    circle.setAttribute("stroke-dashoffset", 220 * (1 - (val / 100)));
    circle.setAttribute("stroke", getColor(val));
    text.textContent = disp() + unit;
    if (p < 1) requestAnimationFrame(f);
  }
  requestAnimationFrame(f)
}

function buildInfoCard(label, value) {
  const colorMap = {
    "Model": "#22c55e",
    "Firmware": "#3b82f6",
    "Kernel": "#a855f7",
    "Local Time": "#f59e0b",
    "Uptime": "#ef4444"
  };
  let c = colorMap[label] || "#38bdf8";
  return E('div', {
    style: `
      ${glass()}
      padding:14px 16px;
      display:flex;
      flex-direction:column;
      gap:6px;
      border:2px solid ${c};
    `
  }, [E('div', {
    style: `
        font-size:12px;
        opacity:.75;
      `
  }, label), E('div', {
    style: `
        font-size:13px;
        font-weight:700;
        word-break:break-word;
      `
  }, value)])
}

function buildGauge(label) {
  let text = E('div', {
    style: `
      position:absolute;
      top:50%;left:50%;
      transform:translate(-50%,-50%);
      font-size:13px;
      font-weight:500;
    `
  }, "0");
  let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "90");
  svg.setAttribute("height", "90");
  let bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bg.setAttribute("cx", "45");
  bg.setAttribute("cy", "45");
  bg.setAttribute("r", "35");
  bg.setAttribute("stroke", "rgba(128,128,128,0.35)");
  bg.setAttribute("stroke-width", "9");
  bg.setAttribute("fill", "none");
  let fg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  fg.setAttribute("cx", "45");
  fg.setAttribute("cy", "45");
  fg.setAttribute("r", "35");
  fg.setAttribute("stroke", "#4ade80");
  fg.setAttribute("stroke-width", "8");
  fg.setAttribute("fill", "none");
  fg.setAttribute("stroke-dasharray", "220");
  fg.setAttribute("stroke-dashoffset", "220");
  fg.setAttribute("stroke-linecap", "round");
  fg.setAttribute("transform", "rotate(-90 45 45)");
  svg.append(bg, fg);
  let wrap = E('div', {
    style: 'position:relative;width:90px;height:90px;margin:auto;'
  }, [svg, text]);
  let box = E('div', {
    style: `
      width:140px;
      margin:auto;
      padding:12px 6px;
      text-align:center;
      ${glass()}
    `
  }, [E('div', {
    style: `
        font-weight:600;
        font-size:13px;
        margin-bottom:6px;
        opacity:.85;
      `
  }, label), wrap]);
  return {
    box,
    fg,
    text
  }
}

function buildConnGauge() {
  let text = E('div', {
    style: `
      position:absolute;
      top:50%;left:50%;
      transform:translate(-50%,-50%);
      font-size:14px;
      font-weight:700;
    `
  }, "0%");
  let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "90");
  svg.setAttribute("height", "90");
  let bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bg.setAttribute("cx", "45");
  bg.setAttribute("cy", "45");
  bg.setAttribute("r", "35");
  bg.setAttribute("stroke", "rgba(128,128,128,0.35)");
  bg.setAttribute("stroke-width", "9");
  bg.setAttribute("fill", "none");
  let fg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  fg.setAttribute("cx", "45");
  fg.setAttribute("cy", "45");
  fg.setAttribute("r", "35");
  fg.setAttribute("stroke", "#22c55e");
  fg.setAttribute("stroke-width", "8");
  fg.setAttribute("fill", "none");
  fg.setAttribute("stroke-dasharray", "220");
  fg.setAttribute("stroke-dashoffset", "220");
  fg.setAttribute("stroke-linecap", "round");
  fg.setAttribute("transform", "rotate(-90 45 45)");
  svg.append(bg, fg);
  let wrap = E('div', {
    style: 'position:relative;width:90px;height:90px;margin:auto;'
  }, [svg, text]);

  function color(p) {
    if (p < 50) return "#22c55e";
    if (p < 75) return "#f59e0b";
    return "#ef4444"
  }

  function update() {
    Promise.all([fs.read('/proc/sys/net/netfilter/nf_conntrack_count'), fs.read(
      '/proc/sys/net/netfilter/nf_conntrack_max')]).then(r => {
      let cur = parseInt(r[0]) || 0;
      let max = parseInt(r[1]) || 1;
      let pct = Math.min(100, Math.round((cur / max) * 100));
      fg.setAttribute("stroke-dashoffset", 220 * (1 - (pct / 100)));
      fg.setAttribute("stroke", color(pct));
      text.textContent = pct + "%"
    }).catch(() => {})
  }
  update();
  setInterval(update, 3000);
  let box = E('div', {
    style: `
      width:140px;
      margin:auto;
      padding:12px 6px;
      text-align:center;
      ${glass()}
    `
  }, [E('div', {
    style: `
        font-weight:600;
        font-size:13px;
        margin-bottom:6px;
        opacity:.85;
      `
  }, "Active Conn"), wrap]);
  return box
}
return baseclass.extend({
  title: _("System"),
  load: function() {
    return Promise.all([L.resolveDefault(callSystemBoard(), {}), L
      .resolveDefault(callSystemInfo(), {}), L.resolveDefault(
        callLuciVersion(), {
          revision: _("unknown"),
          branch: "LuCI"
        }), getBrandFromCgi(), callCpu()
    ])
  },
  render: function(data) {

    let cols = getCols();

    let boardinfo = data[0];
    let systeminfo = data[1];
    let luciversion = data[2];
    let brand = data[3];
    let cpu = data[4] || {};
    let datestr = null;
    if (systeminfo.localtime) {
      let d = new Date(systeminfo.localtime * 1000);
      datestr = "%04d-%02d-%02d %02d:%02d:%02d".format(d.getUTCFullYear(),
        d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d
        .getUTCMinutes(), d.getUTCSeconds())
    }
    let fields = [_("Model"), (boardinfo.model || "Unknown") + " " +
      brand, _("Firmware"), (boardinfo.release?.description || ""), _(
        "Kernel"), boardinfo.kernel, _("Local Time"), datestr, _(
        "Uptime"), "%t".format(systeminfo.uptime || 0)
    ];
    window._infoGrid = E('div', {
      style: `
        display:grid;
        grid-template-columns:repeat(${cols},1fr);
        gap:14px;
        margin-bottom:12px;
      `
    });
    for (let i = 0; i < fields.length; i += 2) {
      window._infoGrid.appendChild(
        buildInfoCard(fields[i], fields[i + 1])
      );
    }
    let separator = E('div', {
      style: `
      height:1px;
      background:linear-gradient(to right,transparent,#ddd,transparent);
      margin:14px 0;
    `
    });
    let t = Math.round(cpu.temp || 0);
    let c = Math.round(cpu.cpu || 0);
    let m = Math.round(cpu.mem || 0);
    let total = (cpu.rx_Bps || 0) + (cpu.tx_Bps || 0);
    let sp = formatSpeed(total);
    let mbps = (total * 8) / 1e6;
    let gNet = Math.min(100, (mbps / MAX_MBPS) * 100);
    if (!uiBuilt) {
      let g1 = buildGauge("CPU Temp");
      let g2 = buildGauge("CPU Load");
      let g3 = buildGauge("RAM Usage");
      let g4 = buildGauge("Bandwidth");
      let connBox = buildConnGauge();
      tempCircle = g1.fg;
      tempText = g1.text;
      cpuCircle = g2.fg;
      cpuText = g2.text;
      memCircle = g3.fg;
      memText = g3.text;
      netCircle = g4.fg;
      netText = g4.text;
      window._gaugeGrid = E('div', {
        style: `
        display:grid;
        grid-template-columns:repeat(${cols},1fr);
        gap:16px;
        margin-top:4px;
      `
      }, [g1.box, g2.box, g3.box, g4.box, connBox]);
      uiBuilt = !0
      if (!window._resizeBound) {
        window.addEventListener('resize', function() {
          let cols = getCols();

          if (window._infoGrid)
            window._infoGrid.style.gridTemplateColumns =
            `repeat(${cols},1fr)`;

          if (window._gaugeGrid)
            window._gaugeGrid.style.gridTemplateColumns =
            `repeat(${cols},1fr)`;
        });

        window._resizeBound = true;
      }
    }
    animate(tempCircle, tempText, tempVal, t, () => t, "°C");
    animate(cpuCircle, cpuText, cpuVal, c, () => c, "%");
    animate(memCircle, memText, memVal, m, () => m, "%");
    animate(netCircle, netText, netVal, gNet, () => sp.v, sp.u);
    tempVal = t;
    cpuVal = c;
    memVal = m;
    netVal = gNet;
    return E('div', {}, [
      window._infoGrid,
      separator,
      window._gaugeGrid
    ]);
  }
})