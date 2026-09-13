import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Investigation from "./pages/Investigation";
import Report from "./pages/Report";
import Verify from "./pages/Verify";
import { useApp } from "./i18n/context";
import { DEMO_MODE } from "./services/api";

function BrandMark() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <circle cx="20" cy="7" r="3" />
      <circle cx="14" cy="20" r="3" />
      <path d="M10.6 9.5 12.8 17M17.6 9.1l-2.2 8.2M10.9 8.2l6.1-.7" />
    </svg>
  );
}

function Header() {
  const { lang, setLang, theme, setTheme, t } = useApp();

  return (
    <header className="app-header">
      <div className="header-inner">
        <NavLink to="/" className="logo" id="logo-link" aria-label="TraceLens home">
          <span className="logo-icon"><BrandMark /></span>
          <span className="brand-copy">
            <span className="logo-text">TraceLens</span>
            <span className="logo-subtitle">On-chain Investigation</span>
          </span>
        </NavLink>

        <nav className="main-nav" aria-label="Primary navigation">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h5v5h-5z" /></svg>
            {t("nav.dashboard")}
          </NavLink>
          <NavLink to="/verify" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.4 16 5v4.1c0 4-2.5 6.9-6 8.5-3.5-1.6-6-4.5-6-8.5V5l6-2.6Z" /><path d="m7.2 9.8 1.8 1.8 3.8-4" /></svg>
            {t("nav.verify")}
          </NavLink>
        </nav>

        <div className="header-actions">
          {DEMO_MODE && <span className="environment-badge"><i /> Demo</span>}
          <label className="language-control" aria-label="Language">
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M2.5 10h15M10 2.5c2 2.1 3 4.6 3 7.5s-1 5.4-3 7.5c-2-2.1-3-4.6-3-7.5s1-5.4 3-7.5Z" /></svg>
            <select value={lang} onChange={(event) => setLang(event.target.value as "ko" | "en")}>
              <option value="ko">KO</option>
              <option value="en">EN</option>
            </select>
          </label>
          <button
            className="icon-button"
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? t("theme.dark") : t("theme.light")}
            title={theme === "light" ? t("theme.dark") : t("theme.light")}
          >
            {theme === "light" ? (
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.6 12.7A7 7 0 0 1 7.3 3.4 7 7 0 1 0 16.6 12.7Z" /></svg>
            ) : (
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.2" /><path d="M10 1.7v2M10 16.3v2M18.3 10h-2M3.7 10h-2M15.9 4.1l-1.4 1.4M5.5 14.5l-1.4 1.4M15.9 15.9l-1.4-1.4M5.5 5.5 4.1 4.1" /></svg>
            )}
          </button>
        </div>
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
