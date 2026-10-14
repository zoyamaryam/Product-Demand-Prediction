import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import LoadingState from "./components/LoadingState";
import { getSystemStatus } from "./api";

const ExecutiveSummary = lazy(() => import("./pages/ExecutiveSummary"));
const Trends = lazy(() => import("./pages/Trends"));
const Seasonality = lazy(() => import("./pages/Seasonality"));
const Forecast = lazy(() => import("./pages/Forecast"));
const PredictDemand = lazy(() => import("./pages/PredictDemand"));
const ModelPerformance = lazy(() => import("./pages/ModelPerformance"));
const InventoryRisk = lazy(() => import("./pages/InventoryRisk"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const Assistant = lazy(() => import("./pages/Assistant"));

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [systemInfo, setSystemInfo] = useState({
    activeCycle: "Dec 2024",
    records: "8k records",
    allModelsTrained: true,
  });

  useEffect(() => {
    let isMounted = true;
    getSystemStatus()
      .then((data) => {
        if (!isMounted) return;
        const cycle = data?.database?.active_cycle || "2024-12";
        const [yr, mo] = cycle.split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedCycle = mo ? `${monthNames[parseInt(mo, 10) - 1] || mo} ${yr}` : cycle;
        const recCount = data?.database?.records
          ? `${(data.database.records / 1000).toFixed(1)}k rows`
          : "5k records";

        setSystemInfo({
          activeCycle: formattedCycle,
          records: `SQLite (${recCount})`,
          allModelsTrained: data?.ml?.all_trained ?? true,
        });
      })
      .catch(() => {
        // Fall back gracefully to defaults
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <BrowserRouter>
      <div style={styles.layout}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={styles.contentWrapper}>
          <header style={styles.topBar} className="top-bar-container">
            <div style={styles.topBarLeft}>
              <button
                style={styles.mobileToggleBtn}
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
                aria-expanded={sidebarOpen}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              <span style={styles.liveBadge}>LIVE SYSTEM</span>
              <span style={styles.cycleIndicator}>
                Historical Data Cycle: <strong>{systemInfo.activeCycle} (Dataset End Date)</strong>
              </span>
            </div>
            <div style={styles.topBarRight}>
              <span style={styles.pillBadge}>{systemInfo.records}</span>
              <span style={styles.pillBadgePrimary}>
                ML: {systemInfo.allModelsTrained ? "4 XGBoost Models" : "Training..."}
              </span>
            </div>
          </header>
          <main style={styles.pageArea} className="main-page-area">
            <Suspense fallback={<LoadingState message="Loading module..." />}>
              <Routes>
                <Route path="/" element={<ExecutiveSummary />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/seasonality" element={<Seasonality />} />
                <Route path="/predict-demand" element={<PredictDemand />} />
                <Route path="/forecast" element={<Forecast />} />
                <Route path="/models" element={<ModelPerformance />} />
                <Route path="/model-performance" element={<ModelPerformance />} />
                <Route path="/risk" element={<InventoryRisk />} />
                <Route path="/inventory" element={<InventoryRisk />} />
                <Route path="/insights" element={<AIInsights />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="animate-fade-in" style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ fontSize: "56px", marginBottom: "16px" }}>🔍</div>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>Page Not Found</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "28px", fontSize: "15px" }}>
        The page you&apos;re looking for doesn&apos;t exist in the DemandIQ dashboard.
      </p>
      <Link to="/" className="btn-primary" style={{ textDecoration: "none" }}>
        ← Return to Executive Overview
      </Link>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    width: "100%",
    backgroundColor: "var(--bg-app)",
  },
  contentWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflowX: "hidden",
  },
  topBar: {
    minHeight: "56px",
    backgroundColor: "var(--bg-surface)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    boxSizing: "border-box",
    flexWrap: "wrap",
    gap: "12px",
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  mobileToggleBtn: {
    backgroundColor: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "6px",
    cursor: "pointer",
    color: "var(--text-primary)",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
  },
  liveBadge: {
    fontSize: "10.5px",
    fontWeight: "800",
    color: "#059669",
    backgroundColor: "#ecfdf5",
    border: "1px solid #a7f3d0",
    padding: "3px 8px",
    borderRadius: "12px",
    letterSpacing: "0.06em",
  },
  cycleIndicator: {
    fontSize: "13px",
    color: "var(--text-secondary)",
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  pillBadge: {
    fontSize: "12px",
    fontWeight: "500",
    backgroundColor: "var(--bg-subtle)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    padding: "4px 10px",
    borderRadius: "6px",
  },
  pillBadgePrimary: {
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    border: "1px solid #bfdbfe",
    padding: "4px 10px",
    borderRadius: "6px",
  },
  pageArea: {
    flex: 1,
    padding: "28px",
    maxWidth: "1400px",
    width: "100%",
    boxSizing: "border-box",
    margin: "0 auto",
  },
};