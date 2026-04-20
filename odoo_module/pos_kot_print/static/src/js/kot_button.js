/** @odoo-module */

import { _t } from "@web/core/l10n/translation";
import { patch } from "@web/core/utils/patch";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";

// GLOBAL STORAGE
if (typeof window.KOT_DATA === 'undefined') {
    window.KOT_DATA = {};
}

patch(ControlButtons.prototype, {
    setup() {
        super.setup(...arguments);
    },

    _key() {
        const o = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;
        return o?.uid || o?.id || o?.name || "x";
    },

    _store() {
        const k = this._key();
        if (!window.KOT_DATA[k]) {
            window.KOT_DATA[k] = { p: false, s: [], t: "" };
        }
        return window.KOT_DATA[k];
    },

    _table() {
        const st = this._store();
        if (st.t) return st.t;
        const o = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;
        let n = "";
        try { n = o?.table_id?.name || ""; } catch(e){}
        if (!n) try { n = o?.table_id?.getName?.() || ""; } catch(e){}
        if (!n) try { for(let k in o?.table_id){if(k==='name'){n=o.table_id[k];break;}} } catch(e){}
        if (!n) try { n = this.pos.selectedTable?.name || ""; } catch(e){}
        if (n) { st.t = String(n); }
        return st.t;
    },

    _type() {
        const o = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;
        try { return o?.preset_id?.name || "Dine In"; } catch(e){ return "Dine In"; }
    },

    _guests() {
        const o = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;
        return o?.guest_count || 0;
    },

    _num() {
        const o = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;
        const r = o?.pos_reference || o?.name || "";
        const p = r.split('-');
        return p.length ? String(parseInt(p[p.length-1]) || "") : "";
    },

    _orderName() {
        const o = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;
        return o?.floating_order_name || "";
    },

    _slotTime() {
        const o = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;
        try {
            const pt = o?.preset_time;
            if (!pt) return "";
            // preset_time is a Luxon DateTime object
            if (typeof pt === 'object' && typeof pt.toFormat === 'function') {
                return pt.toFormat('dd/MM/yyyy HH:mm');
            }
            // fallback: JS Date or ISO string
            const d = new Date(pt);
            if (!isNaN(d.getTime())) {
                const dd = String(d.getDate()).padStart(2,'0');
                const mm = String(d.getMonth()+1).padStart(2,'0');
                const yyyy = d.getFullYear();
                const hh = String(d.getHours()).padStart(2,'0');
                const min = String(d.getMinutes()).padStart(2,'0');
                return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
            }
            return String(pt);
        } catch(e) { return ""; }
    },

    _waiter() {
        let waiter = "";
        try { if (this.pos.user?.name) waiter = this.pos.user.name; } catch(e){}
        if (!waiter) try { const c = this.pos.get_cashier?.(); if (c?.name) waiter = c.name; } catch(e){}
        if (!waiter) try { if (this.pos.cashier?.name) waiter = this.pos.cashier.name; } catch(e){}
        if (!waiter) try { if (this.pos.employee?.name) waiter = this.pos.employee.name; } catch(e){}
        if (!waiter) try { if (this.pos.session?.user_id?.name) waiter = this.pos.session.user_id.name; } catch(e){}
        return waiter;
    },

    _iid(line, i) {
        let pid = "";
        try { pid = typeof line.get_product==='function' ? (line.get_product()?.id||"") : (line.product_id?.id||""); } catch(e){}
        return `${line.id||line.cid||i}_${pid}`;
    },

    _items() {
        const st = this._store();
        const o = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;

        let lines = [];
        try { lines = typeof o?.get_orderlines==='function' ? o.get_orderlines() : (o?.lines||o?.orderlines||[]); } catch(e){}

        const arr = [];
        if (lines?.forEach) lines.forEach(l => arr.push(l));

        return arr.map((line, i) => {
            const id = this._iid(line, i);
            let name = "Item", qty = 1;
            try { const p = typeof line.get_product==='function' ? line.get_product() : line.product_id; name = p?.display_name || p?.name || "Item"; } catch(e){}
            try { qty = typeof line.get_quantity==='function' ? line.get_quantity() : (line.qty||1); } catch(e){}

            // Parse Odoo 19 JSON note format
            let note = "";
            const rawNote = line.customer_note || line.note || "";
            if (rawNote) {
                try {
                    const parsed = typeof rawNote === 'string' ? JSON.parse(rawNote) : rawNote;
                    if (Array.isArray(parsed)) {
                        note = parsed.map(n => n.text || n).filter(Boolean).join(', ');
                    } else if (typeof parsed === 'object' && parsed.text) {
                        note = parsed.text;
                    } else {
                        note = String(rawNote);
                    }
                } catch (e) {
                    note = String(rawNote);
                }
            }

            return {
                id, name: String(name), qty: Number(qty) || 1,
                note: note, sent: st.s.includes(id),
            };
        });
    },

    _buildPayload(type, items) {
        const cfg = this.pos.config;
        return {
            config_id: cfg.id || false,
            printer_ip: cfg.kot_printer_ip || '192.168.0.100',
            printer_port: cfg.kot_printer_port || 9100,
            order_type: this._type(),
            table_name: this._table(),
            order_number: this._num(),
            guest_count: this._guests(),
            waiter: this._waiter(),
            print_type: type,
            order_name: this._orderName(),
            slot_time: this._slotTime(),
            items: items.map(i => ({ name: i.name, qty: i.qty, note: i.note || '' })),
        };
    },

    // Send to Odoo server (queues for agent to pick up)
    async _send(type, items) {
        const payload = this._buildPayload(type, items);
        const table = this._table();
        const waiter = this._waiter();

        console.log("=== SENDING KOT ===", type, items.length, "items");

        try {
            const resp = await fetch('/web/dataset/call_kw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    id: Date.now(),
                    params: {
                        model: 'pos.kot.print',
                        method: 'print_kot',
                        args: [payload],
                        kwargs: {},
                    },
                }),
            });
            const data = await resp.json();

            if (data.error) {
                alert("✗ " + (data.error.data?.message || 'Server error'));
                return false;
            }

            const res = data.result || {};
            if (res.success) {
                alert("✓ KOT [" + type + "]\n" + this._type() + (table ? " - " + table : "") +
                      "\nWaiter: " + waiter + "\nItems: " + items.length);
                return true;
            }

            alert("✗ " + (res.message || "Failed"));
            return false;
        } catch (err) {
            alert("✗ Error: " + err.message);
            return false;
        }
    },

    async onClickKotPrint() {
        const o = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;
        if (!o) { alert("No order"); return; }

        const st = this._store();
        const items = this._items();
        if (!items.length) { alert("No items"); return; }

        const newItems = items.filter(i => !i.sent);

        console.log("=== KOT CHECK ===");
        console.log("Total:", items.length, "| New:", newItems.length, "| Sent:", items.length - newItems.length);

        // FIRST TIME
        if (!st.p) {
            st.p = true;
            items.forEach(i => { if (!st.s.includes(i.id)) st.s.push(i.id); });
            await this._send("NEW", items);
            return;
        }

        // NO NEW ITEMS
        if (!newItems.length) {
            if (confirm("All sent.\nReprint ALL " + items.length + "?")) {
                await this._send("FULL", items);
            }
            return;
        }

        // NEW vs FULL
        let m = "══════════════════\n   KOT OPTIONS\n══════════════════\n\n";
        m += "[OK] = NEW (" + newItems.length + ")\n";
        newItems.slice(0,3).forEach(i => m += "• " + i.qty + "x " + i.name.slice(0,15) + "\n");
        if (newItems.length > 3) m += "...+" + (newItems.length-3) + "\n";
        m += "\n[Cancel] = FULL (" + items.length + ")\n══════════════════";

        if (confirm(m)) {
            newItems.forEach(i => { if (!st.s.includes(i.id)) st.s.push(i.id); });
            await this._send("NEW", newItems);
        } else {
            items.forEach(i => { if (!st.s.includes(i.id)) st.s.push(i.id); });
            await this._send("FULL", items);
        }
    },
});
