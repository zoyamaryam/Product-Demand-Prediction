import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getSummary } from "../api";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";

export default function ExecutiveSummary() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = () => {
    setLoading(true);
    setError(null);
    getSummary()
      .then((data) => {
        setSummary(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    getSummary()
      .then((data) => {
        if (isMounted) {
          setSummary(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingState message="Loading executive revenue metrics and category distributions..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Executive Overview"
        message={error}
        onRetry={loadSummary}
      />
    );
  }

  if (!summary || summary.total_quantity_sold === 0 || !summary.monthly_trend?.length) {
    return (
      <EmptyState
        title="No Sales Transactions Found"
        message="The database currently contains no retail sales records. Please run the backend seed script to populate synthetic multi-category transactions."
      />
    );
  }

  // Format currency consistently with product catalog pricing ($)
  const formatCurrency = (val) =>
    `$${Number(val).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  // Take recent 24 periods for cleaner timeline chart
  const recentTrend = (summary.monthly_trend || []).slice(-24);

  return (
    <div className="animate-fade-in">
      {/* Synthetic Prototype Notice Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backgroundColor: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "8px",
          padding: "10px 16px",
          marginBottom: "20px",
          fontSize: "13px",
          color: "#1e40af",
        }}
      >
        <span style={{ fontSize: "16px" }}>ℹ️</span>
        <div>
          <strong>Synthetic Prototype Dataset:</strong> {summary?.total_records ? `${summary.total_records.toLocaleString()} raw transaction records (aggregated to 720 monthly SKU observations across the 36-month training split)` : "8,048 multi-category transactions"} spanning 48 consecutive months (2021-01 to 2024-12). All KPIs and trend trajectories reflect live responses from the SQLite database.
        </div>
      </div>

      {/* Page Title & Controls */}
      <div style={styles.pageHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 style={{ margin: 0 }}>Executive Overview</h1>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: "var(--bg-subtle)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                padding: "3px 10px",
                borderRadius: "12px",
              }}
            >
              Active Dataset Cycle: Dec 2024 (Historical Data End)
            </span>
          </div>
          <p style={styles.subtitle}>
            Real-time business performance, macro demand patterns, and immediate supply chain health.
          </p>
        </div>
        <div style={styles.headerActions}>
          <Link to="/forecast" className="btn-primary" style={{ textDecoration: "none" }}>
            <span>Generate Forecast</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link to="/risk" className="btn-secondary" style={{ textDecoration: "none" }}>
            <span>Review Risks</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div style={styles.kpiGrid}>
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(summary.total_revenue)}
          change={`${summary.revenue_growth_pct >= 0 ? "+" : ""}${summary.revenue_growth_pct}% MoM`}
          changeType={summary.revenue_growth_pct >= 0 ? "positive" : "negative"}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          }
        />
        <KpiCard
          label="Units Sold"
          value={summary.total_quantity_sold.toLocaleString()}
          badge="Lifetime Units"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          }
        />
        <KpiCard
          label="Products Monitored"
          value={summary.products_analyzed}
          badge="4 Categories"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          }
        />
        <KpiCard
          label="Stockout Incidents"
          value={summary.stockout_risk_count.toLocaleString()}
          badge="Immediate Attention"
          badgeType="danger"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          }
        />
        <KpiCard
          label="Overstock Incidents"
          value={summary.overstock_risk_count.toLocaleString()}
          badge="Markdown Review"
          badgeType="warning"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
          }
        />
      </div>

      {/* Visual Analytics Grid */}
      <div className="charts-grid-responsive">
        {/* Revenue Trajectory Chart */}
        <div className="card-base" style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div>
              <h3 style={styles.chartTitle}>Historical Monthly Revenue Trajectory</h3>
              <p style={styles.chartSub}>24-month revenue progression across all product categories</p>
            </div>
            <span className="badge badge-primary">Trend: +{summary.revenue_growth_pct}% MoM</span>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recentTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), "Revenue"]}
                  contentStyle={styles.tooltipBox}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Contribution Distribution */}
        <div className="card-base" style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div>
              <h3 style={styles.chartTitle}>Revenue by Category</h3>
              <p style={styles.chartSub}>Gross contribution & volume share across 4 sectors</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.category_distribution || []}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <YAxis dataKey="category" type="category" stroke="#475569" fontSize={12} tickLine={false} />
                <Tooltip
                  formatter={(val, name, props) => [
                    `${formatCurrency(val)} (${props.payload.share_pct}%)`,
                    "Revenue",
                  ]}
                  contentStyle={styles.tooltipBox}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strategic Callout Footer */}
      <div style={styles.actionCallout}>
        <div style={styles.actionCalloutIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: "0 0 4px 0", fontSize: "14.5px", color: "var(--text-primary)" }}>
            Operational Recommendation
          </h4>
          <p style={{ margin: 0, fontSize: "13.5px", color: "var(--text-secondary)" }}>
            Active volume in <strong>{summary.category_distribution?.[0]?.category || "Clothing"}</strong> leads gross contribution, with {summary.stockout_risk_count.toLocaleString()} historical stockout events recorded across catalog items.
            Head to <Link to="/forecast" style={{ color: "var(--primary)", fontWeight: 600 }}>Forecast</Link> to inspect model predictions and{" "}
            <Link to="/risk" style={{ color: "var(--primary)", fontWeight: 600 }}>Inventory Risk</Link> to adjust purchase orders.
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, change, changeType, badge, badgeType, icon }) {
  return (
    <div className="card-base" style={styles.kpiCard}>
      <div style={styles.kpiTopRow}>
        <span style={styles.kpiLabel}>{label}</span>
        <div style={styles.iconCircle}>{icon}</div>
      </div>
      <div style={styles.kpiValue}>{value}</div>
      <div style={styles.kpiBottomRow}>
        {change && (
          <span
            style={{
              ...styles.kpiChange,
              color: changeType === "positive" ? "#059669" : "#dc2626",
              backgroundColor: changeType === "positive" ? "#ecfdf5" : "#fef2f2",
            }}
          >
            {change}
          </span>
        )}
        {badge && (
          <span
            className={`badge ${
              badgeType === "danger"
                ? "badge-danger"
                : badgeType === "warning"
                ? "badge-warning"
                : "badge-primary"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

const styles = {
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
    gap: "20px",
    flexWrap: "wrap",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    marginTop: "6px",
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "18px",
    marginBottom: "28px",
  },
  kpiCard: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  },
  kpiTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  kpiLabel: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  iconCircle: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    backgroundColor: "var(--bg-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontSize: "26px",
    fontWeight: "800",
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    marginBottom: "12px",
  },
  kpiBottomRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "auto",
  },
  kpiChange: {
    fontSize: "12px",
    fontWeight: "600",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "1.6fr 1fr",
    gap: "24px",
    marginBottom: "28px",
  },
  chartCard: {
    padding: "24px",
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  chartTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
  },
  chartSub: {
    fontSize: "12.5px",
    color: "var(--text-secondary)",
    marginTop: "3px",
  },
  tooltipBox: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "13px",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
  },
  actionCallout: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "var(--radius-lg)",
    padding: "18px 20px",
  },
  actionCalloutIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    backgroundColor: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "360px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid var(--primary)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  errorBanner: {
    padding: "16px 20px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    color: "#b91c1c",
    fontSize: "14px",
  },
};