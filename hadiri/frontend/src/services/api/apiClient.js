const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('hadirin_token') : null;
  }

  getToken() {
    if (typeof window !== 'undefined') {
      const stored =
        localStorage.getItem('hadirin_token') ||
        sessionStorage.getItem('hadirin_token') ||
        this.token;
      if (stored && stored !== 'null' && stored !== 'undefined') {
        this.token = stored;
        return stored;
      }
      this.token = null;
      return null;
    }
    return this.token || null;
  }

  getLanguage() {
    return (typeof window !== 'undefined' ? localStorage.getItem('hadirin_lang') : null) || 'id';
  }

  setToken(token) {
    const validToken = token && token !== 'null' && token !== 'undefined' ? token : null;
    this.token = validToken;
    if (typeof window !== 'undefined') {
      if (validToken) {
        localStorage.setItem('hadirin_token', validToken);
        sessionStorage.setItem('hadirin_token', validToken);
      } else {
        localStorage.removeItem('hadirin_token');
        sessionStorage.removeItem('hadirin_token');
      }
    }
  }

  async request(endpoint, options = {}) {
    let url = `${this.baseUrl}${endpoint}`;
    if (options.params && typeof options.params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, val);
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    const token = this.getToken();
    const lang = this.getLanguage();

    const headers = {
      'Content-Type': 'application/json',
      'Accept-Language': lang,
      ...(token ? { Authorization: `Bearer ${token.trim()}` } : {}),
      ...(options.headers || {}),
    };

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid: clear session
          this.setToken(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('hadirin_user');
            localStorage.removeItem('hadirin_tenant');
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
        }

        const fallbackMsg = lang === 'en'
          ? `HTTP Error ${response.status}: Request failed to process.`
          : `HTTP Error ${response.status}: Permintaan gagal diproses.`;
        const errorMessage = data.message || fallbackMsg;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      // Return data field from standardized { success: true, data, message } envelope
      return data.data !== undefined ? data.data : data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const netErr = lang === 'en'
          ? 'Failed to connect to backend server. Make sure the backend server is running.'
          : 'Gagal terhubung ke backend server. Pastikan server backend sedang aktif.';
        throw new Error(netErr);
      }
      throw err;
    }
  }

  get(endpoint, options = {}) {
    let config;
    if (options && (options.params !== undefined || options.headers !== undefined || options.signal !== undefined)) {
      config = { method: 'GET', ...options };
    } else if (options && typeof options === 'object' && Object.keys(options).length > 0) {
      config = { method: 'GET', params: options };
    } else {
      config = { method: 'GET' };
    }
    return this.request(endpoint, config);
  }

  post(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  }

  put(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers,
    });
  }

  patch(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers,
    });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
