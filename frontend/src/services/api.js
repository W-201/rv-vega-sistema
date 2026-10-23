const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('rv_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Error al interpretar la respuesta del servidor' };
      }
    } else {
      const text = await response.text();
      data = { error: text || response.statusText || 'Error en la respuesta del servidor' };
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        if (endpoint !== '/auth/login') {
          // Token expirado o inválido
          localStorage.removeItem('rv_token');
          localStorage.removeItem('rv_user');
          window.location.reload();
        }
      }
      throw new Error(data.error || `Error ${response.status}: ${response.statusText || 'Error al comunicarse con el servidor'}`);
    }

    return data;
  } catch (err) {
    console.error(`API Error en [${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' })
};
