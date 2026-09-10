// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Investigation from "./pages/Investigation";

function Header() {
  return (
    <header className="app-header">
      <div className="header-inner">
        <Link to="/" className="logo" id="logo-link">
          <div className="logo-icon" aria-hidden="true">TL</div>
          <span className="logo-text">TraceLens</span>
        </Link>
        <span className="logo-subtitle">AI-assisted On-chain Investigation</span>
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
        </Routes>
      </div>
    </BrowserRouter>
  );
}
