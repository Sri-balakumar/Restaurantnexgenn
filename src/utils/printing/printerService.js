// Basic printer service abstraction. Swap internals for your printer library.
// Current implementation is a stub that logs output and returns success.

export const PrinterType = {
  Bluetooth: 'bluetooth',
  Network: 'network',
};

let selectedPrinter = null;

export const setSelectedPrinter = (printer) => { selectedPrinter = printer; };
export const getSelectedPrinter = () => selectedPrinter;

// Discover printers (stub)
export const discoverPrinters = async () => {
  // TODO: integrate a real discovery via library (BLE/classic or LAN)
  return [];
};

// Connect to a printer (stub)
export const connectPrinter = async (printer) => {
  selectedPrinter = printer;
  return { connected: true };
};

// Print ESC/POS data (stub)
export const printEscpos = async (data /* string | Uint8Array | base64 */) => {
  if (!selectedPrinter) {
    console.warn('[printerService] No printer selected.');
    return { ok: false, error: 'NO_PRINTER' };
  }
  // TODO: call your library's print method here
  console.log('[printerService] Printing to', selectedPrinter, 'data length:', (data?.length ?? 0));
  return { ok: true };
};

// Simple text passthrough (auto adds LF)
export const printText = async (text) => {
  const payload = typeof text === 'string' ? text : String(text ?? '');
  return printEscpos(`${payload}\n`);
};
