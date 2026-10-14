import { NavLink } from "react-router-dom";

const navItems = [
  {
    to: "/",
    label: "Executive Summary",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    ),
  },
  {
    to: "/trends",
    label: "Sales & Trends",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
      </svg>
    ),
  },
  {
    to: "/seasonality",
    label: "Seasonality Analysis",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    ),
  },
  {
    to: "/predict-demand",
    label: "Predict Demand",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    ),
  },
  {
    to: "/forecast",
    label: "Demand Forecast",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    ),
  },
  {
    to: "/models",
    label: "Model Performance",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    to: "/risk",
    label: "Inventory & Pricing",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    ),
  },
  {
    to: "/insights",
    label: "AI Business Insights",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
      </svg>
    ),
  },
  {
    to: "/assistant",
    label: "AI Chat Assistant",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    ),
  },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />}
      <aside className={`app-sidebar ${isOpen ? "sidebar-open" : ""}`}>

        {/* Brand Header */}
        <div style={styles.brand}>
          <div style={styles.brandLeft}>
            <div style={styles.logoBadge}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <div>
              <h2 style={styles.brandTitle}>DemandIQ</h2>
              <span style={styles.brandSub}>Predictive Retail ML</span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={styles.closeBtn}
              className="mobile-menu-btn"
              aria-label="Close sidebar navigation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Nav Section Label */}
        <div style={styles.navHeader}>Navigation</div>

        {/* Navigation Items */}
        <nav style={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClose?.()}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <span style={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* System Status Footprint */}
        <div style={styles.footer}>
          <div style={styles.statusCard}>
            <div style={styles.statusRow}>
              <span style={styles.statusDot} />
              <span style={styles.statusLabel}>ML Engine: Active</span>
            </div>
            <div style={styles.statusDetail}>XGBoost Regressors • 4 Models</div>
            <div style={styles.statusDetail}>Dataset: 5,000 Transactions</div>
          </div>
        </div>
      </aside>
    </>
  );
}

const styles = {

  brand: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 8px 24px 8px",
    borderBottom: "1px solid #1e293b",
    marginBottom: "20px",
  },
  brandLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  closeBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadge: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
  },
  brandTitle: {
    fontSize: "17px",
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: "-0.02em",
    margin: 0,
    lineHeight: 1.2,
  },
  brandSub: {
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: "500",
  },
  navHeader: {
    fontSize: "10.5px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#64748b",
    fontWeight: "700",
    padding: "0 12px 10px 12px",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    flex: 1,
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    borderRadius: "8px",
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "13.5px",
    fontWeight: "500",
    transition: "all 0.15s ease",
  },
  navLinkActive: {
    backgroundColor: "#1e293b",
    color: "#ffffff",
    fontWeight: "600",
    boxShadow: "inset 3px 0 0 #3b82f6",
  },
  icon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    marginTop: "auto",
    paddingTop: "20px",
    borderTop: "1px solid #1e293b",
  },
  statusCard: {
    backgroundColor: "#1e293b",
    borderRadius: "10px",
    padding: "12px 14px",
    border: "1px solid #334155",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    boxShadow: "0 0 8px #10b981",
  },
  statusLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#e2e8f0",
  },
  statusDetail: {
    fontSize: "11px",
    color: "#94a3b8",
    lineHeight: "1.4",
  },
};