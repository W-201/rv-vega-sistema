import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('rv_user');
    const token = localStorage.getItem('rv_token');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('rv_user');
        localStorage.removeItem('rv_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    if (data.token && data.usuario) {
      localStorage.setItem('rv_token', data.token);
      localStorage.setItem('rv_user', JSON.stringify(data.usuario));
      setUser(data.usuario);
      return data.usuario;
    }
    throw new Error('Respuesta inválida del servidor');
  };

  const logout = () => {
    localStorage.removeItem('rv_token');
    localStorage.removeItem('rv_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
