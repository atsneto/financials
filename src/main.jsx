import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import ImportCSVNubank from "./pages/ImportCSVNubank";
import Profile from "./pages/Profile";
import Investiments from "./pages/Investiments";
import Onboarding from "./pages/Onboarding";
import OpenFinance from "./pages/OpenFinance";
import Settings from "./pages/Settings";

import ProtectedRoute from "./components/ProtectedRoute";
import SubscriptionGate from "./components/SubscriptionGate";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Subscribe from "./pages/Subscribe";
import SubscribeSuccess from "./pages/SubscribeSuccess";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* ROTAS PÚBLICAS */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ONBOARDING — auth, sem assinatura obrigatória */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* ASSINATURA — auth, sem gate de assinatura */}
        <Route
          path="/subscribe"
          element={
            <ProtectedRoute>
              <Subscribe />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscribe/success"
          element={
            <ProtectedRoute>
              <SubscribeSuccess />
            </ProtectedRoute>
          }
        />

        {/* ROTAS PROTEGIDAS COM LAYOUT */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/import-transactions" element={<ImportCSVNubank />} />
          <Route path="/investiments" element={<Investiments />} />
          <Route path="/open-finance" element={<OpenFinance />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* LANDING E REDIRECIONAMENTOS */}
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
