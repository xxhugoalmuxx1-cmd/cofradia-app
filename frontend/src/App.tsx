import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cash from "./pages/Cash";
import Sales from "./pages/Sales";
import Members from "./pages/Members";
import Finance from "./pages/Finance";
import Products from "./pages/Products";
import Lottery from "./pages/Lottery";
import Audit from "./pages/Audit";
import Events from "./pages/Events";
import Fees from "./pages/Fees";
import Donations from "./pages/Donations";
import Reports from "./pages/Reports";
import Documents from "./pages/Documents";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/cash" element={<Cash />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/members" element={<Members />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/products" element={<Products />} />
        <Route path="/lottery" element={<Lottery />} />
        <Route path="/events" element={<Events />} />
        <Route path="/fees" element={<Fees />} />
        <Route path="/donations" element={<Donations />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/audit" element={<Audit />} />
      </Route>
    </Routes>
  );
}
