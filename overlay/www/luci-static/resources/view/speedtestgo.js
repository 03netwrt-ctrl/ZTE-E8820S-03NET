'use strict';
'require view';
'require rpc';
'require ui';

var callRun = rpc.declare({
    object: 'speedtestgo',
    method: 'run',
    expect: { '': {} }
});

var callStatus = rpc.declare({
    object: 'speedtestgo',
    method: 'status',
    expect: { '': {} }
});

var callProgress = rpc.declare({
    object: 'speedtestgo',
    method: 'progress',
    expect: { '': {} }
});

function parseAndShow(r) {
    var dl = '-', ul = '-', ping = '-', jitter = '-', server = '-', isp = '-';
    try {
        var jr = (typeof r === 'string') ? JSON.parse(r) : r;
        var sv = (jr.servers && jr.servers.length) ? jr.servers[0] : null;
        if (sv) {
            if (sv.dl_speed) dl = (sv.dl_speed * 8 / 1e6).toFixed(1);
            if (sv.ul_speed) ul = (sv.ul_speed * 8 / 1e6).toFixed(1);
            if (sv.latency) ping = (sv.latency / 1e6).toFixed(1);
            if (sv.jitter) jitter = (sv.jitter / 1e6).toFixed(1);
            server = (sv.sponsor || '') + ' - ' + (sv.name || '');
        } else {
            if (jr.download && jr.download.bandwidth) dl = (jr.download.bandwidth * 8 / 1e6).toFixed(1);
            if (jr.upload && jr.upload.bandwidth) ul = (jr.upload.bandwidth * 8 / 1e6).toFixed(1);
            if (jr.ping && jr.ping.latency != null) ping = parseFloat(jr.ping.latency).toFixed(1);
            if (jr.ping && jr.ping.jitter != null) jitter = parseFloat(jr.ping.jitter).toFixed(1);
            if (jr.server) server = (jr.server.sponsor || '') + ' - ' + (jr.server.name || '');
        }
        if (jr.user_info && jr.user_info.Isp) isp = jr.user_info.Isp;
        else if (jr.client && jr.client.isp) isp = jr.client.isp;
    } catch (e) { return false; }

    document.getElementById('stgo-dl').textContent = dl;
    document.getElementById('stgo-ul').textContent = ul;
    document.getElementById('stgo-ping').textContent = ping;
    document.getElementById('stgo-jitter').textContent = jitter;
    document.getElementById('stgo-server').textContent = server;
    document.getElementById('stgo-isp').textContent = isp;
    document.getElementById('stgo-results').style.display = 'block';
    return true;
}

// Update the live speed gauge
function updateGauge(mbps, phase) {
    var maxScale = 100;
    // Auto-scale: use data-max attribute
    var gauge = document.getElementById('stgo-gauge');
    if (!gauge) return;
    var curMax = parseFloat(gauge.getAttribute('data-max') || '100');
    if (mbps > curMax * 0.9) {
        curMax = Math.ceil(mbps * 1.2 / 50) * 50; // round up to 50
        gauge.setAttribute('data-max', curMax);
        document.getElementById('stgo-gauge-max').textContent = curMax;
    }
    maxScale = curMax;

    var frac = Math.min(mbps / maxScale, 1);
    // Arc: semicircle from 180deg to 0deg, radius 80, center (100,100)
    // Active arc length
    var arc = document.getElementById('stgo-arc-active');
    if (arc) {
        var r = 80;
        var startAngle = 180, endAngle = 180 - (frac * 180);
        var x1 = 100 + r * Math.cos(startAngle * Math.PI / 180);
        var y1 = 100 - r * Math.sin(startAngle * Math.PI / 180);
        var x2 = 100 + r * Math.cos(endAngle * Math.PI / 180);
        var y2 = 100 - r * Math.sin(endAngle * Math.PI / 180);
        var large = (frac > 0.5) ? 1 : 0;
        if (frac <= 0.001) {
            arc.setAttribute('d', 'M 20 100 A 80 80 0 0 1 20 100'); // empty
        } else {
            arc.setAttribute('d', 'M 20 100 A 80 80 0 ' + large + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1));
        }
    }
    // Needle
    var needle = document.getElementById('stgo-needle');
    if (needle) {
        var ang = 180 - (frac * 180);
        var nx = 100 + 65 * Math.cos(ang * Math.PI / 180);
        var ny = 100 - 65 * Math.sin(ang * Math.PI / 180);
        needle.setAttribute('x2', nx.toFixed(1));
        needle.setAttribute('y2', ny.toFixed(1));
    }
    // Number
    document.getElementById('stgo-live-speed').textContent = mbps.toFixed(1);
    // Phase label
    var phaseEl = document.getElementById('stgo-phase');
    if (phaseEl) {
        if (phase === 'download') { phaseEl.textContent = _('Download'); phaseEl.style.color = '#00a6ff'; }
        else if (phase === 'upload') { phaseEl.textContent = _('Upload'); phaseEl.style.color = '#7c3aed'; }
        else { phaseEl.textContent = _('Mengukur...'); phaseEl.style.color = '#64748b'; }
    }
}

var isTesting = false;

return view.extend({
    handleStart: function(ev) {
        isTesting = true;
        var btn = document.getElementById('stgo-btn');
        var statusEl = document.getElementById('stgo-status');
        var res = document.getElementById('stgo-results');
        var liveWrap = document.getElementById('stgo-live');

        btn.disabled = true;
        btn.style.display = 'none';
        res.style.display = 'none';
        liveWrap.style.display = 'block';
        statusEl.textContent = _('Memulai tes...');
        // Reset gauge
        document.getElementById('stgo-gauge').setAttribute('data-max', '100');
        document.getElementById('stgo-gauge-max').textContent = '100';
        updateGauge(0, '');

        var startTime = Date.now();
        var timer = null;
        var maxWait = 180;

        var resetUI = function() {
            btn.disabled = false;
            btn.style.display = 'flex';
            liveWrap.style.display = 'none';
            isTesting = false;
        };

        var check = function() {
            var elapsed = Math.floor((Date.now() - startTime) / 1000);
            if (elapsed > maxWait) {
                clearInterval(timer);
                statusEl.textContent = _('Timeout. Coba lagi.');
                resetUI();
                return;
            }
            // Poll live progress for gauge
            callProgress().then(function(p) {
                if (p) {
                    var spd = 0, ph = p.phase || '';
                    if (ph === 'download') spd = parseFloat(p.download_mbps || 0);
                    else if (ph === 'upload') spd = parseFloat(p.upload_mbps || 0);
                    else spd = Math.max(parseFloat(p.download_mbps || 0), parseFloat(p.upload_mbps || 0));
                    updateGauge(spd, ph);
                }
            }).catch(function() {});
            // Poll status for completion
            callStatus().then(function(r) {
                var st = r ? r.status : null;
                if (st === 'DONE') {
                    clearInterval(timer);
                    updateGauge(0, '');
                    if (r.result && parseAndShow(r.result)) {
                        statusEl.textContent = _('Selesai!');
                    } else {
                        statusEl.textContent = _('Gagal parse hasil');
                    }
                    resetUI();
                } else if (st === 'ERROR') {
                    clearInterval(timer);
                    statusEl.textContent = _('Tes gagal. Cek koneksi internet.');
                    resetUI();
                } else {
                    statusEl.textContent = _('Menguji...') + ' (' + elapsed + 's)';
                }
            }).catch(function(e) {
                clearInterval(timer);
                statusEl.textContent = _('Error RPC: ') + e;
                resetUI();
            });
        };

        callRun().then(function(r) {
            var st = r ? r.status : null;
            if (st === 'error' || st === 'ERROR') {
                statusEl.textContent = (r && r.message) || _('speedtest-go tidak terinstall');
                resetUI();
                return;
            }
            timer = setInterval(check, 1000);
            check();
        }).catch(function(e) {
            statusEl.textContent = _('Error: ') + e;
            resetUI();
        });
    },

    render: function() {
        var css = '\
        .stgo-card{background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.08);padding:30px;max-width:600px;margin:20px auto;text-align:center}\
        .stgo-btn{width:150px;height:150px;border-radius:50%;border:4px solid #00a6ff;background:transparent;color:#00a6ff;font-size:28px;font-weight:800;cursor:pointer;transition:.3s;margin:20px auto;display:flex;align-items:center;justify-content:center}\
        .stgo-btn:hover:not(:disabled){transform:scale(1.05);box-shadow:0 0 25px rgba(0,166,255,.4)}\
        .stgo-btn:disabled{opacity:.5;cursor:wait}\
        .stgo-results{display:none;margin-top:20px;text-align:left}\
        .stgo-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}\
        .stgo-row .lbl{color:#64748b}\
        .stgo-row .val{font-weight:700;font-size:18px}\
        .stgo-big{font-size:42px;font-weight:800;color:#00a6ff;margin:10px 0}\
        .stgo-status{color:#64748b;margin:15px 0;min-height:24px}\
        .stgo-live{display:none;margin:10px auto}\
        .stgo-phase{font-size:18px;font-weight:700;margin-bottom:5px}\
        .stgo-speed-num{font-size:48px;font-weight:800;color:#1e293b}\
        .stgo-speed-unit{font-size:18px;color:#64748b}';

        var style = E('style', {}, css);

        // SVG gauge (semicircle speedometer)
        var gaugeSvg = '' +
        '<svg id="stgo-gauge" data-max="100" width="220" height="130" viewBox="0 0 200 130">' +
            '<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" stroke-width="14" stroke-linecap="round"/>' +
            '<path id="stgo-arc-active" d="M 20 100 A 80 80 0 0 1 20 100" fill="none" stroke="#00a6ff" stroke-width="14" stroke-linecap="round"/>' +
            '<line id="stgo-needle" x1="100" y1="100" x2="35" y2="100" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>' +
            '<circle cx="100" cy="100" r="8" fill="#1e293b"/>' +
            '<text x="20" y="125" font-size="11" fill="#64748b">0</text>' +
            '<text id="stgo-gauge-max" x="170" y="125" font-size="11" fill="#64748b">100</text>' +
        '</svg>';

        var liveDiv = E('div', { 'class': 'stgo-live', id: 'stgo-live' }, [
            E('div', { 'class': 'stgo-phase', id: 'stgo-phase' }, _('Mengukur...')),
            E('div', {}, gaugeSvg),
            E('div', {}, [
                E('span', { 'class': 'stgo-speed-num', id: 'stgo-live-speed' }, '0.0'),
                E('span', { 'class': 'stgo-speed-unit' }, ' Mbps')
            ])
        ]);

        var card = E('div', { 'class': 'stgo-card' }, [
            E('h2', {}, _('Speedtest')),
            E('p', { style: 'color:#64748b' }, _('Test kecepatan internet via speedtest.net')),
            E('button', { 'class': 'stgo-btn', id: 'stgo-btn', click: ui.createHandlerFn(this, 'handleStart') }, _('GO')),
            E('div', { 'class': 'stgo-status', id: 'stgo-status' }),
            liveDiv,
            E('div', { 'class': 'stgo-results', id: 'stgo-results' }, [
                E('div', { style: 'text-align:center' }, [
                    E('div', { style: 'color:#64748b' }, _('Download')),
                    E('div', { 'class': 'stgo-big' }, [
                        E('span', { id: 'stgo-dl' }, '-'),
                        E('span', { style: 'font-size:20px' }, ' Mbps')
                    ])
                ]),
                E('div', { 'class': 'stgo-row' }, [
                    E('span', { 'class': 'lbl' }, _('Upload')),
                    E('span', { 'class': 'val' }, [E('span', { id: 'stgo-ul' }, '-'), ' Mbps'])
                ]),
                E('div', { 'class': 'stgo-row' }, [
                    E('span', { 'class': 'lbl' }, _('Ping')),
                    E('span', { 'class': 'val' }, [E('span', { id: 'stgo-ping' }, '-'), ' ms'])
                ]),
                E('div', { 'class': 'stgo-row' }, [
                    E('span', { 'class': 'lbl' }, _('Jitter')),
                    E('span', { 'class': 'val' }, [E('span', { id: 'stgo-jitter' }, '-'), ' ms'])
                ]),
                E('div', { 'class': 'stgo-row' }, [
                    E('span', { 'class': 'lbl' }, _('Server')),
                    E('span', { 'class': 'val', id: 'stgo-server', style: 'font-size:14px' }, '-')
                ]),
                E('div', { 'class': 'stgo-row' }, [
                    E('span', { 'class': 'lbl' }, _('ISP')),
                    E('span', { 'class': 'val', id: 'stgo-isp', style: 'font-size:14px' }, '-')
                ])
            ])
        ]);

        setTimeout(function() {
            if (isTesting) return;
            callStatus().then(function(r) {
                if (isTesting) return;
                if (r && r.status === 'DONE' && r.result) {
                    if (parseAndShow(r.result)) {
                        document.getElementById('stgo-status').textContent = _('Hasil tes terakhir');
                    }
                }
            }).catch(function() {});
        }, 500);

        return E('div', {}, [style, card]);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
