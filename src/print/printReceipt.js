// src/print/printReceipt.js
// Helper to generate and share a receipt PDF using expo-print and expo-sharing
// Usage: await printAndShareReceipt(htmlString)

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Generate a PDF from HTML and share it (works in Expo Go)
 * @param {string} html - The HTML string for the receipt
 * @param {string} [fileName='receipt'] - Optional file name (no extension)
 */
export async function printAndShareReceipt(html, fileName = 'receipt') {
  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, { dialogTitle: 'Share or print receipt' });
  } catch (e) {
    console.warn('Failed to print/share receipt:', e);
  }
}
