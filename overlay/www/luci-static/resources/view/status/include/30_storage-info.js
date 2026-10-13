'use strict';
'require baseclass';
'require rpc';

var callSystemInfo = rpc.declare({
  object: 'system',
  method: 'info'
});

var callMountPoints = rpc.declare({
  object: 'luci',
  method: 'getMountPoints',
  expect: {
    result: []
  }
});

var MountSkipList = ["/rom", "/tmp", "/dev", "/overlay", "/"];

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
  `;
}

function fmt(bytes) {
  return String.format('%1024.2mB', bytes || 0);
}

function modernBar(used, size) {

  let pc = Math.max(1, Math.floor((used / size) * 100));

  return E('div', {
    style: `display:flex;flex-direction:column;gap:6px;`
  }, [

    E('div', {
      style: `
        height:12px;
        background:#e5e7eb;
        border-radius:999px;
        overflow:hidden;
      `
    }, [
      E('div', {
        style: `
          height:100%;
          width:${pc}%;
          background:linear-gradient(90deg,#0ea5e9,#38bdf8);
          border-radius:999px;
          transition:0.4s;
        `
      })
    ]),

    E('div', {
      style: `font-size:12px;opacity:.85;`
    }, `${fmt(used)} / ${fmt(size)} (${pc}%)`)
  ]);
}

function storageCard(label, used, size) {

  return E('div', {
    style: `
      ${glass()}
      padding:14px 16px;
      display:flex;
      flex-direction:column;
      gap:8px;
    `
  }, [
    E('div', {
      style: `
        font-size:13px;
        font-weight:600;
        opacity:.9;
        word-break:break-all;
      `
    }, label),

    modernBar(used, size)
  ]);
}

return baseclass.extend({

  title: _('Storage'),

  load: function() {
    return Promise.all([
      L.resolveDefault(callSystemInfo(), {}),
      L.resolveDefault(callMountPoints(), {})
    ]);
  },

  render: function(data) {

    let systeminfo = data[0];
    let mounts = data[1];

    let root = L.isObject(systeminfo.root) ? systeminfo.root : {};
    let tmp = L.isObject(systeminfo.tmp) ? systeminfo.tmp : {};

    let fields = {};

    function add(name, used, size) {
      if (!fields[name])
        fields[name] = {
          used: used,
          size: size
        };
    }

    add(_('Disk space'),
      (root.used || 0) * 1024,
      (root.total || 1) * 1024);

    add(_('Temp space'),
      (tmp.used || 0) * 1024,
      (tmp.total || 1) * 1024);

    mounts.forEach(m => {
      if (MountSkipList.includes(m.mount)) return;

      let name = `${m.device} (${m.mount})`;
      let used = m.size - m.free;

      add(name, used, m.size);
    });

    let cards = [];

    Object.keys(fields).forEach(k => {
      let f = fields[k];
      cards.push(storageCard(k, f.used, f.size));
    });

    return E('div', {
      style: `
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
        gap:14px;
      `
    }, cards);
  }

});