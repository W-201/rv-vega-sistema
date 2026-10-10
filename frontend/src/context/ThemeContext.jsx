import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Estado del tema: 'light' | 'dark' | 'system'
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('rv-vega-theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch (e) {
      console.warn('No se pudo acceder a localStorage para el tema:', e);
    }
    return 'system';
  });

  // Calcula si el tema activo resuelve a oscuro
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('rv-vega-theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Aplica la clase .dark al <html> y sincroniza meta tags
  const applyTheme = (targetTheme) => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const shouldBeDark =
      targetTheme === 'dark' || (targetTheme === 'system' && mediaQuery.matches);

    setIsDark(shouldBeDark);

    if (shouldBeDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // Actualizar meta tag color-scheme
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute('content', targetTheme === 'system' ? 'light dark' : targetTheme);
    }
  };

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('rv-vega-theme', newTheme);
    } catch (e) {
      console.warn('Error al persistir tema en localStorage:', e);
    }
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    // Si está en dark -> light; si está en light o system (que no sea dark) -> dark
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  // Efecto para inicializar y escuchar cambios del sistema y otras pestañas
  useEffect(() => {
    applyTheme(theme);

    // Escucha cambios en las preferencias del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else {
      mediaQuery.addListener(handleSystemChange);
    }

    // Escucha cambios entre diferentes pestañas del navegador
    const handleStorageChange = (e) => {
      if (e.key === 'rv-vega-theme' && e.newValue) {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } else {
        mediaQuery.removeListener(handleSystemChange);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider');
  }
  return context;
}
