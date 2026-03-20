import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Shell from "./layout/Shell.js";
import Dashboard from "./pages/Dashboard.js";
import AccountDetail from "./pages/AccountDetail.js";
import Billing from "./pages/Billing.js";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="/account/:id" element={<AccountDetail />} />
          <Route path="/billing" element={<Billing />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
