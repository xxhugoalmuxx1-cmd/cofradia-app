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

function clearSessionAndRedirect() {
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

// El token de acceso caduca a los 15 minutos por seguridad, pero el de
// refresco dura 7 días. Antes, al caducar el de acceso, la app mandaba
// directamente al login — ahora, primero intenta renovarlo sola con el
// de refresco (sin que el usuario note nada) y solo pide iniciar sesión
// de nuevo si han pasado los 7 días o si se cerró sesión manualmente.
//
// "refreshPromise" evita que, si varias peticiones fallan a la vez (ej.
// la pantalla pide 3 cosas a la vez y el token caducó justo entonces),
// se disparen 3 renovaciones en paralelo: todas esperan a la misma.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No hay token de refresco");

  const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
  localStorage.setItem("accessToken", data.accessToken);
  return data.accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // El token de refresco también ha fallado o ha caducado (más de
        // 7 días de inactividad): ahí sí hace falta volver a iniciar sesión.
        clearSessionAndRedirect();
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401) {
      clearSessionAndRedirect();
    }

    return Promise.reject(error);
  }
);
