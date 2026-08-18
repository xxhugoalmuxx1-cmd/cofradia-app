import axios from "axios";

// En desarrollo, Vite hace proxy o se usa la URL directa del backend.
// En producción, Nginx sirve el frontend y reenvía /api al backend.
const baseURL = import.meta.env.VITE_API_URL || "/api/v1";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // Importante: hay que borrar también "user", no solo los tokens.
      // Si se dejaba "user" en localStorage, la app seguía creyendo que
      // había sesión iniciada, volvía a pedir datos, fallaba otra vez y
      // redirigía de nuevo a /login — un bucle infinito de recargas.
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
