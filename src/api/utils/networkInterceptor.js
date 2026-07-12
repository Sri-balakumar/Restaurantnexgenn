// Global axios interceptor that shows a Retry/Cancel popup on network/server errors.
// On Retry: replays the same request and resolves the original promise.
// On Cancel: rejects with the original error so existing catch blocks still run.
import axios from 'axios';
import useNetworkErrorStore from '@components/NetworkError/networkErrorStore';

// True only for GENUINE connectivity failures — Wi-Fi off, DNS down, server
// totally unreachable. Server-side errors (4xx/5xx) and cancelled requests
// fall through silently because they're not "no internet" situations.
const isNetworkError = (error) => {
  if (!error) return false;
  // Cancelled / aborted (component unmount, switched screens) — never a "no internet" error.
  if (axios.isCancel?.(error)) return false;
  if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError' || error.name === 'AbortError') return false;

  // Server actually responded with an HTTP status — that means the network
  // works fine; the error is server-side. Don't show the popup.
  if (error.response) return false;

  // Real network/connectivity signals from React Native + Node + axios:
  if (error.code === 'ECONNABORTED') return true;            // request timeout
  if (['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET',
       'ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH']
       .includes(error.code)) return true;
  if (typeof error.message === 'string' && /Network Error|network request failed/i.test(error.message)) return true;
  return false;
};

const pickMessage = (error) => {
  if (error?.code === 'ECONNABORTED') {
    return {
      title: 'Server not responding',
      message: 'The server took too long to respond. Check your internet connection or network and try again.',
    };
  }
  return {
    title: 'Cannot reach server',
    message: 'Please check your internet connection, Wi-Fi or router, and try again.',
  };
};

// Silently retry a genuine network failure a few times before bothering the
// user. Retrying is SAFE: isNetworkError() is only true when the server never
// responded (no error.response), so the request never landed — it cannot have
// created/changed an order. The popup appears only after all retries fail.
const MAX_SILENT_RETRIES = 5;   // background retries before showing the popup
const RETRY_DELAY = 800;        // ms between tries (~4s total before the popup)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let installed = false;

export function installNetworkInterceptor() {
  if (installed) return;
  installed = true;

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (!isNetworkError(error)) return Promise.reject(error);

      const config = error.config;
      // A manual "Retry" that failed again, or a request with no config — don't
      // loop or prompt again.
      if (!config || config.__networkRetried) return Promise.reject(error);

      // Background polling can opt out (logo fetch, etc.).
      if (config.__skipNetworkErrorPopup) return Promise.reject(error);

      // Silently retry in the background up to MAX_SILENT_RETRIES. Any retry
      // that succeeds resolves normally with NO popup — so transient blips on
      // Home / new-order never bother the user. The counter re-enters this same
      // interceptor and stops the recursion once the limit is reached.
      const attempt = config.__retryCount || 0;
      if (attempt < MAX_SILENT_RETRIES) {
        await sleep(RETRY_DELAY);
        return axios.request({ ...config, __retryCount: attempt + 1 });
      }

      // All retries failed → the server (local or cloud) is genuinely
      // unreachable → show the popup.
      return new Promise((resolve, reject) => {
        const { show } = useNetworkErrorStore.getState();
        const { title, message } = pickMessage(error);
        show({
          title,
          message,
          onRetry: async () => {
            try {
              const retryConfig = { ...config, __networkRetried: true, __retryCount: 0 };
              const res = await axios.request(retryConfig);
              resolve(res);
            } catch (e) {
              reject(e);
            }
          },
          onCancel: () => reject(error),
        });
      });
    },
  );
}

export default installNetworkInterceptor;
