import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import usersRoutes from "../modules/users/users.routes";
import membersRoutes from "../modules/members/members.routes";
import financeRoutes from "../modules/finance/finance.routes";
import cashRoutes from "../modules/cash/cash.routes";
import salesRoutes from "../modules/sales/sales.routes";
import productsRoutes from "../modules/products/products.routes";
import lotteryRoutes from "../modules/lottery/lottery.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import auditRoutes from "../modules/audit/audit.routes";
import reportsRoutes from "../modules/reports/reports.routes";
import bankRoutes from "../modules/bank/bank.routes";
import feesRoutes from "../modules/fees/fees.routes";
import donationsRoutes from "../modules/donations/donations.routes";
import eventsRoutes from "../modules/events/events.routes";
import documentsRoutes from "../modules/documents/documents.routes";
import publicRoutes from "../modules/public/public.routes";
import settingsRoutes from "../modules/settings/settings.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/members", membersRoutes);
router.use("/cash-registers", cashRoutes);
router.use("/bank-accounts", bankRoutes);
router.use("/sales", salesRoutes);
router.use("/products", productsRoutes);
router.use("/lottery", lotteryRoutes);
router.use("/fees", feesRoutes);
router.use("/donations", donationsRoutes);
router.use("/events", eventsRoutes);
router.use("/documents", documentsRoutes);
router.use("/public", publicRoutes);
router.use("/settings", settingsRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/reports", reportsRoutes);
// IMPORTANTE: se registra el último a propósito. Como financeRoutes está
// montado en "/" (para exponer /income y /expenses sin prefijo extra),
// si se registrara antes que los demás interceptaría TODAS las rutas que
// aún no hubieran encontrado coincidencia — incluidas las públicas como
// /public/catalog o /settings/hero-image — y las rechazaría con 401 antes
// de que llegaran a su código real. Puesto el último, solo actúa cuando
// ninguna otra ruta más específica ha coincidido ya.
router.use("/", financeRoutes); // expone /income y /expenses

export default router;
