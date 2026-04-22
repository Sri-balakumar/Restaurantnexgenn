// Global axios interceptor that shows a Retry/Cancel popup on network/server errors.
// On Retry: replays the same request and resolves the original promise.
// On Cancel: rejects with the original error so existing catch blocks still run.
import axios from 'axios';
import useNetworkErrorStore from '@components/NetworkError/networkErrorStore';

const isNetworkError = (error) => {
  if (!error) return false;
  // Axios: no response = server unreachable / no internet / CORS.
  if (!error.response) return true;
  // Explicit timeout code.
  if (error.code === 'ECONNABORTED') return true;
  // React Native "Network Error" message.
  if (typeof error.message === 'string' && /Network Error/i.test(error.message)) return true;
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

let installed = false;

export function installNetworkInterceptor() {
  if (installed) return;
  installed = true;

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (!isNetworkError(error)) return Promise.reject(error);

      const config = error.config;
      // Avoid prompting twice for the same retried request.
      if (!config || config.__networkRetried) return Promise.reject(error);

      return new Promise((resolve, reject) => {
        const { show } = useNetworkErrorStore.getState();
        const { title, message } = pickMessage(error);
        show({
          title,
          message,
          onRetry: async () => {
            try {
              const retryConfig = { ...config, __networkRetried: true };
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
