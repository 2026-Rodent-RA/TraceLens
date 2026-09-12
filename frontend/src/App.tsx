// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Investigation from "./pages/Investigation";
import Report from "./pages/Report";
import Verify from "./pages/Verify";

function Header() {
  return (
    <header className="app-header">
      <div className="header-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <Link to="/" className="logo" id="logo-link">
            <div className="logo-icon" aria-hidden="true">TL</div>
            <span className="logo-text">TraceLens</span>
          </Link>
          <span className="logo-subtitle">AI-assisted On-chain Investigation</span>
        </div>
        <nav style={{ display: "flex", gap: "var(--space-4)" }}>
          <Link to="/" style={{ color: "var(--color-text-primary)", textDecoration: "none", fontWeight: 500 }}>Dashboard</Link>
          <Link to="/verify" style={{ color: "var(--color-accent-blue)", textDecoration: "none", fontWeight: 500 }}>Verify Report</Link>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Header />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/investigation/:analysisId" element={<Investigation />} />
          <Route path="/reports/:reportId" element={<Report />} />
          <Route path="/verify" element={<Verify />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
