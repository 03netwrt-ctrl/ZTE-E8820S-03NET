'use strict';
'require view';
'require rpc';
'require ui';

var callRun = rpc.declare({
    object: 'speedtestgo',
    method: 'run',
    expect: { status: '' }
});

var callStatus = rpc.declare({
    object: 'speedtestgo',
    method: 'status',
    expect: { status: '', result: '' }
});

return view.extend({
    handleStart: function(ev) {
        var btn = document.getElementById('stgo-btn');
        var statusEl = document.getElementById('stgo-status');
        var spin = document.getElementById('stgo-spin');
        var res = document.getElementById('stgo-results');

        btn.disabled = true;
        btn.style.display = 'none';
        spin.style.display = 'block';
        res.style.display = 'none';
        statusEl.textContent = _('Memulai tes...');

        var startTime = Date.now();
        var timer = null;

        var check = function() {
            var elapsed = Math.floor((Date.now() - startTime) / 1000);
            statusEl.textContent = _('Menguji...') + ' (' + elapsed + 's)';
            callStatus().then(function(r) {
                if (r.status === 'DONE') {
                    clearInterval(timer);
                    showResults(r.result);
                } else if (r.status === 'ERROR') {
                    clearInterval(timer);
                    statusEl.textContent = _('Tes gagal. Cek koneksi internet.');
                    resetUI();
                }
            });
        };

        var showResults = function(jsonStr) {
            try {
                var r = JSON.parse(jsonStr);
                var dl = (r.download && r.download.bandwidth) ? (r.download.bandwidth * 8 / 1e6).toFixed(1) : '-';
                var ul = (r.upload && r.upload.bandwidth) ? (r.upload.bandwidth * 8 / 1e6).toFixed(1) : '-';
                var ping = (r.ping && r.ping.latency != null) ? parseFloat(r.ping.latency).toFixed(1) : '-';
                var jitter = (r.ping && r.ping.jitter != null) ? parseFloat(r.ping.jitter).toFixed(1) : '-';
                var server = '-';
                if (r.server) server = (r.server.sponsor || '') + ' - ' + (r.server.name || '');
                var isp = (r.client && r.client.isp) ? r.client.isp : '-';

                document.getElementById('stgo-dl').textContent = dl;
                document.getElementById('stgo-ul').textContent = ul;
                document.getElementById('stgo-ping').textContent = ping;
                document.getElementById('stgo-jitter').textContent = jitter;
                document.getElementById('stgo-server').textContent = server;
                document.getElementById('stgo-isp').textContent = isp;
                res.style.display = 'block';
                statusEl.textContent = _('Selesai!');
            } catch (e) {
                statusEl.textContent = _('Gagal parse hasil');
            }
            resetUI();
        };

        var resetUI = function() {
            btn.disabled = false;
            btn.style.display = 'flex';
            spin.style.display = 'none';
        };

        callRun().then(function(r) {
            if (r.status === 'error') {
                statusEl.textContent = r.message || _('speedtest-go tidak terinstall');
                resetUI();
                return;
            }
            timer = setInterval(check, 2000);
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
        .stgo-spin{border:4px solid #f3f3f3;border-top:4px solid #00a6ff;border-radius:50%;width:40px;height:40px;animation:stgo-spin 1s linear infinite;margin:20px auto;display:none}\
        @keyframes stgo-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';

        var style = E('style', {}, css);
        var card = E('div', { 'class': 'stgo-card' }, [
            E('h2', {}, _('Speedtest')),
            E('p', { style: 'color:#64748b' }, _('Test kecepatan internet via speedtest.net')),
            E('button', { 'class': 'stgo-btn', id: 'stgo-btn', click: ui.createHandlerFn(this, 'handleStart') }, _('GO')),
            E('div', { 'class': 'stgo-spin', id: 'stgo-spin' }),
            E('div', { 'class': 'stgo-status', id: 'stgo-status' }),
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

        return E('div', {}, [style, card]);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
