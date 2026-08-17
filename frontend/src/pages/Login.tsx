import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HeroImage } from "../components/HeroImage";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Email o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand/5 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl overflow-hidden shadow-md mb-4 h-48 bg-white">
          <HeroImage className="w-full h-full" />
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-md">
          <h1 className="text-xl font-semibold text-brand mb-1 text-center">Purísima</h1>
          <p className="text-xs text-gray-400 text-center mb-6">Gestión de la asociación</p>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-4"
            required
            autoFocus
          />
          <label className="block text-sm mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-4"
            required
          />
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <button disabled={loading} className="w-full bg-brand text-white rounded-lg py-2.5 font-medium hover:bg-brand-light disabled:opacity-60 transition-colors">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
