import { create } from 'zustand';

// Helper to build a stable key for an item
const getItemKey = (it) => {
  if (Number.isInteger(it?.remoteId)) return `p_${it.remoteId}`;
  if (Array.isArray(it?.product_id) && Number.isInteger(it.product_id[0])) return `p_${it.product_id[0]}`;
  if (Number.isInteger(it?.id)) return `id_${it.id}`;
  const name = it?.name || (Array.isArray(it?.product_id) ? it.product_id[1] : 'Item');
  return `n_${name}`;
};

const normalizeLines = (items = []) => {
  const map = {};
  items.forEach((it) => {
    const key = getItemKey(it);
    const qty = Number(it.quantity ?? it.qty ?? 1);
    map[key] = (map[key] || 0) + qty;
  });
  return map;
};

const useKitchenTickets = create((set, get) => ({
  // snapshots[orderId] = { key -> qtyPrinted }
  snapshots: {},

  getSnapshot: (orderId) => get().snapshots[orderId] || {},

  setSnapshot: (orderId, items) => set((state) => {
    const snap = normalizeLines(items);
    return { snapshots: { ...state.snapshots, [orderId]: snap } };
  }),

  resetSnapshot: (orderId) => set((state) => {
    const next = { ...state.snapshots };
    delete next[orderId];
    return { snapshots: next };
  }),

  // Compute delta between current items and last printed snapshot
  getDelta: (orderId, currentItems) => {
    const prev = get().snapshots[orderId] || {};
    const curr = normalizeLines(currentItems);
    const delta = [];
    const nameFrom = (it) => it?.name || (Array.isArray(it?.product_id) ? it.product_id[1] : 'Item');
    // Build by product keys from current items only (new adds)
    currentItems.forEach((it) => {
      const key = getItemKey(it);
      const c = curr[key] || 0;
      const p = prev[key] || 0;
      const diff = c - p;
      if (diff > 0) {
        delta.push({ ...it, qty: diff, quantity: diff, name: nameFrom(it) });
      }
    });
    return delta;
  },
}));

export default useKitchenTickets;
export { getItemKey };
