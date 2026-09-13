// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Investigation from "./pages/Investigation";
import Report from "./pages/Report";
import Verify from "./pages/Verify";
import { useApp } from "./i18n/context";

function Header() {
  const { lang, setLang, theme, setTheme, t } = useApp();

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
        <nav style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
          <Link to="/" style={{ color: "var(--color-text-primary)", textDecoration: "none", fontWeight: 500 }}>{t('nav.dashboard')}</Link>
          <Link to="/verify" style={{ color: "var(--color-accent-blue)", textDecoration: "none", fontWeight: 500 }}>{t('nav.verify')}</Link>
          
          <div style={{ width: "1px", height: "24px", background: "var(--color-border)", margin: "0 var(--space-2)" }}></div>
          
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as any)}
            style={{ 
              background: "transparent", 
              border: "1px solid var(--color-border)", 
              color: "var(--color-text-primary)",
              padding: "var(--space-1) var(--space-2)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-sm)"
            }}
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
          
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{
              background: "transparent", 
              border: "1px solid var(--color-border)", 
              color: "var(--color-text-primary)",
              padding: "var(--space-1) var(--space-2)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: "var(--text-sm)"
            }}
          >
            {theme === 'light' ? t('theme.dark') : t('theme.light')}
          </button>
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
          <Route path="/report" element={<Report />} />
          <Route path="/verify" element={<Verify />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
