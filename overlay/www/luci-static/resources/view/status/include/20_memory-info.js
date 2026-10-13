"use strict";
"require baseclass";
"require rpc";

var callSystemInfo = rpc.declare({
  object: "system",
  method: "info"
});

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
  return String.format("%1024.2mB", bytes || 0);
}

function modernBar(value, max) {

  var v = parseInt(value) || 0;
  var m = parseInt(max) || 100;
  var pc = Math.floor((100 / m) * v);

  return E('div', {
    style: `
      display:flex;
      flex-direction:column;
      gap:6px;
    `
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
      style: `
        font-size:12px;
        color:#dark;
      `
    }, `${fmt(value)} / ${fmt(max)} (${pc}%)`)
  ]);
}

function memCard(label, value, max) {

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
        color:inherit;
        opacity:.85;
      `
    }, label),

    modernBar(value, max)
  ]);
}

return baseclass.extend({

  title: _("Memory"),

  load: function() {
    return L.resolveDefault(callSystemInfo(), {});
  },

  render: function(systeminfo) {

    var mem = L.isObject(systeminfo.memory) ? systeminfo.memory : {};
    var swap = L.isObject(systeminfo.swap) ? systeminfo.swap : {};

    var total = mem.total || 0;
    var used = (mem.total || 0) - (mem.free || 0);
    var available = mem.available ?
      mem.available :
      (mem.free || 0) + (mem.buffered || 0);

    var cards = [];

    if (available < used) {
      cards.push(
        memCard(_("Used"), used, total),
        memCard(_("Free"), available, total)
      );
    } else {
      cards.push(
        memCard(_("Free"), available, total),
        memCard(_("Used"), used, total)
      );
    }

    if ((swap.total || 0) === 0) {
      cards.push(
        memCard(_("Buffered"), mem.buffered || 0, total)
      );
    }

    cards.push(
      memCard(_("Cached"), mem.cached || 0, total)
    );

    if ((swap.total || 0) > 0) {
      cards.push(
        memCard(_("Swap Free"), swap.free || 0, swap.total)
      );
    }

    return E('div', {
      style: `
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
        gap:14px;
      `
    }, cards);
  }

});