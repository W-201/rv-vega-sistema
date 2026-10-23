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

      // Credential Management API (Estándar W3C para navegadores Chrome, Edge, Safari, Firefox)
      // Dispara la ventana nativa "¿Quieres guardar la contraseña?" del navegador
      if (typeof window !== 'undefined' && window.PasswordCredential && navigator.credentials?.store) {
        try {
          const cred = new window.PasswordCredential({
            id: email,
            password: password,
            name: data.usuario.nombre || email
          });
          await navigator.credentials.store(cred);
        } catch (credErr) {
          // Ignorar si el usuario canceló previamente o el navegador tiene desactivado el gestor
        }
      }

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
