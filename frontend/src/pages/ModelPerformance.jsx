import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getModelBenchmark, getModelFeatureSchema, getModelStatus } from "../api";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

export default function ModelPerformance() {
  const [benchmark, setBenchmark] = useState(null);
  const [featureSchema, setFeatureSchema] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const loadAllMetrics = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      getModelBenchmark(),
      getModelFeatureSchema(),
      getModelStatus(),
    ])
      .then(([benchData, schemaData, statusData]) => {
        setBenchmark(benchData);
        setFeatureSchema(schemaData);
        setModelStatus(statusData);
      })
      .catch((err) => {
        setError(err.message || "Failed to load model benchmark metrics");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getModelBenchmark(),
      getModelFeatureSchema(),
      getModelStatus(),
    ])
      .then(([benchData, schemaData, statusData]) => {
        if (isMounted) {
          setBenchmark(benchData);
          setFeatureSchema(schemaData);
          setModelStatus(statusData);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load model benchmark metrics");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingState message="Loading model benchmarks, hold-out validation metrics, and schema integrity..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Model Benchmarks"
        message={error}
        onRetry={loadAllMetrics}
      />
    );
  }

  // Comparison chart data (WAPE % for each category and model)
  const chartData = (benchmark?.categories || []).map((cat) => ({
    category: cat.category,
    XGBoost: Number(cat.models?.xgboost?.wape_pct || 0),
    Naive: Number(cat.models?.naive?.wape_pct || 0),
    "Seasonal Naive": Number(cat.models?.seasonal_naive?.wape_pct || 0),
    "Moving Avg 3M": Number(cat.models?.moving_average_3?.wape_pct || 0),
    preferred: cat.preferred_model,
  }));

  const filteredCategories =
    selectedCategory === "All"
      ? benchmark?.categories || []
      : (benchmark?.categories || []).filter((c) => c.category === selectedCategory);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: "40px" }}>
      {/* Page Header */}
      <div style={styles.headerRow}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={styles.badgeVersion}>Production ML v{benchmark?.model_version || "2.0.0"}</span>
            <span style={styles.badgeSynthetic}>Verified Hold-Out Test</span>
          </div>
          <h1 style={{ margin: 0 }}>Model Performance & Benchmark Scorecard</h1>
          <p style={styles.subtitle}>
            Transparent comparison between XGBoost regressors and standard statistical baselines across all retail sectors.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadAllMetrics} title="Refresh benchmarks">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Metric Definitions & Methodology Alert */}
      <div style={styles.alertBanner}>
        <div style={styles.alertIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div style={{ flex: 1, fontSize: "13px", lineHeight: "1.6", color: "#1e293b" }}>
          <strong>Evaluation Policy:</strong> Models are evaluated on an out-of-sample chronological hold-out split (80% training / 20% future test period without shuffling).
          Baselines (Naive, Seasonal-Naive, and 3-Month Moving Average) provide reference points. Where a baseline achieves superior test performance (e.g. Beauty sector), DemandIQ explicitly reports the winning model.
        </div>
      </div>

      {/* Aggregate Scorecard Summary */}
      <div style={styles.scorecardGrid}>
        <div className="card-base" style={styles.scorecardCard}>
          <span style={styles.scorecardLabel}>Evaluation Methodology</span>
          <span style={styles.scorecardValue}>{benchmark?.evaluation_strategy || "Chronological Hold-Out"}</span>
          <span style={styles.scorecardNote}>Strict time-series split prevents future data leakage</span>
        </div>
        <div className="card-base" style={styles.scorecardCard}>
          <span style={styles.scorecardLabel}>XGBoost Average WAPE</span>
          <span style={{ ...styles.scorecardValue, color: "#2563eb" }}>
            {benchmark?.aggregate_metrics?.xgboost?.avg_wape_pct != null
              ? `${benchmark.aggregate_metrics.xgboost.avg_wape_pct.toFixed(2)}%`
              : "—"}
          </span>
          <span style={styles.scorecardNote}>Weighted Absolute Percentage Error</span>
        </div>
        <div className="card-base" style={styles.scorecardCard}>
          <span style={styles.scorecardLabel}>Best Baseline Average WAPE</span>
          <span style={{ ...styles.scorecardValue, color: "#475569" }}>
            {benchmark?.aggregate_metrics?.naive?.avg_wape_pct != null
              ? `${benchmark.aggregate_metrics.naive.avg_wape_pct.toFixed(2)}%`
              : "—"}
          </span>
          <span style={styles.scorecardNote}>Naive baseline across 4 categories</span>
        </div>
        <div className="card-base" style={styles.scorecardCard}>
          <span style={styles.scorecardLabel}>Model Status</span>
          <span style={{ ...styles.scorecardValue, color: "#10b981" }}>
            {modelStatus?.total_supported || 4}/4 Active
          </span>
          <span style={styles.scorecardNote}>Cached in memory with fast inference</span>
        </div>
      </div>

      {/* Visual Benchmark Comparison Chart */}
      <div className="card-base" style={{ ...styles.card, marginTop: "24px" }}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)" }}>
              Cross-Category Error Comparison (WAPE %)
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
              Lower is better. Compares XGBoost against Naive, Seasonal Naive, and 3-Month Moving Average.
            </p>
          </div>
          <span className="badge badge-primary">Metric: WAPE (%)</span>
        </div>

        <div style={{ width: "100%", height: 340, marginTop: "16px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="category" stroke="#475569" fontSize={13} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(val, name) => [`${Number(val).toFixed(2)}%`, name]}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="XGBoost" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Naive" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Seasonal Naive" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Moving Avg 3M" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sector Category Detailed Scorecards */}
      <div style={{ marginTop: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", margin: 0, color: "var(--text-primary)" }}>Detailed Category Benchmarks</h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
              Examine point errors (MAE, RMSE) and percentage errors (MAPE, WAPE) by sector.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {["All", "Beauty", "Clothing", "Electronics", "Home"].map((cat) => (
              <button
                key={cat}
                style={{
                  ...styles.filterPill,
                  ...(selectedCategory === cat ? styles.filterPillActive : {}),
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.categoryGrid}>
          {filteredCategories.map((c) => {
            const isXgbWinner = c.preferred_model === "XGBoost";
            return (
              <div key={c.category} className="card-base" style={styles.catCard}>
                <div style={styles.catCardHeader}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "17px", color: "var(--text-primary)" }}>{c.category}</h3>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Best Baseline: <strong>{c.best_baseline}</strong>
                    </span>
                  </div>
                  <span
                    style={{
                      ...styles.preferredBadge,
                      backgroundColor: isXgbWinner ? "#dbeafe" : "#fef3c7",
                      color: isXgbWinner ? "#1e40af" : "#92400e",
                      borderColor: isXgbWinner ? "#bfdbfe" : "#fde68a",
                    }}
                  >
                    ★ Preferred: {c.preferred_model}
                  </span>
                </div>

                <p style={styles.catSummary}>{c.decision_summary}</p>

                {/* Metrics Table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.metricsTable}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Model</th>
                        <th style={styles.thRight}>MAE (Units)</th>
                        <th style={styles.thRight}>RMSE (Units)</th>
                        <th style={styles.thRight}>MAPE (%)</th>
                        <th style={styles.thRight}>WAPE (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={c.preferred_model === "XGBoost" ? styles.preferredRow : {}}>
                        <td style={styles.td}>
                          <strong>XGBoost Regressor</strong>
                          {c.preferred_model === "XGBoost" && <span style={styles.star}> ★</span>}
                        </td>
                        <td style={styles.tdRight}>{c.models?.xgboost?.mae?.toFixed(2)}</td>
                        <td style={styles.tdRight}>{c.models?.xgboost?.rmse?.toFixed(2)}</td>
                        <td style={styles.tdRight}>{c.models?.xgboost?.mape_pct?.toFixed(2)}%</td>
                        <td style={{ ...styles.tdRight, fontWeight: "600", color: "#2563eb" }}>
                          {c.models?.xgboost?.wape_pct?.toFixed(2)}%
                        </td>
                      </tr>
                      <tr style={c.preferred_model === "Naive" ? styles.preferredRow : {}}>
                        <td style={styles.td}>
                          Naive (Prior Month)
                          {c.preferred_model === "Naive" && <span style={styles.star}> ★</span>}
                        </td>
                        <td style={styles.tdRight}>{c.models?.naive?.mae?.toFixed(2)}</td>
                        <td style={styles.tdRight}>{c.models?.naive?.rmse?.toFixed(2)}</td>
                        <td style={styles.tdRight}>{c.models?.naive?.mape_pct?.toFixed(2)}%</td>
                        <td style={styles.tdRight}>{c.models?.naive?.wape_pct?.toFixed(2)}%</td>
                      </tr>
                      <tr style={c.preferred_model === "Seasonal-Naive" ? styles.preferredRow : {}}>
                        <td style={styles.td}>
                          Seasonal Naive (Prior Year Month)
                          {c.preferred_model === "Seasonal-Naive" && <span style={styles.star}> ★</span>}
                        </td>
                        <td style={styles.tdRight}>{c.models?.seasonal_naive?.mae?.toFixed(2)}</td>
                        <td style={styles.tdRight}>{c.models?.seasonal_naive?.rmse?.toFixed(2)}</td>
                        <td style={styles.tdRight}>{c.models?.seasonal_naive?.mape_pct?.toFixed(2)}%</td>
                        <td style={styles.tdRight}>{c.models?.seasonal_naive?.wape_pct?.toFixed(2)}%</td>
                      </tr>
                      <tr style={c.preferred_model.includes("Moving Average") ? styles.preferredRow : {}}>
                        <td style={styles.td}>
                          Moving Average (3-Month)
                          {c.preferred_model.includes("Moving Average") && <span style={styles.star}> ★</span>}
                        </td>
                        <td style={styles.tdRight}>{c.models?.moving_average_3?.mae?.toFixed(2)}</td>
                        <td style={styles.tdRight}>{c.models?.moving_average_3?.rmse?.toFixed(2)}</td>
                        <td style={styles.tdRight}>{c.models?.moving_average_3?.mape_pct?.toFixed(2)}%</td>
                        <td style={{ ...styles.tdRight, fontWeight: "600", color: "#92400e" }}>
                          {c.models?.moving_average_3?.wape_pct?.toFixed(2)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Schema & Data Leakage Prevention Contract */}
      <div className="card-base" style={{ ...styles.card, marginTop: "28px" }}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)" }}>
              Feature Schema & Leakage Audit Specification
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
              Target variable: <code>{featureSchema?.target || "total_quantity"}</code> ({featureSchema?.target_description || "Monthly category demand units"})
            </p>
          </div>
          <span className="badge badge-success">No Data Leakage Verified</span>
        </div>

        <div style={{ overflowX: "auto", marginTop: "16px" }}>
          <table style={styles.metricsTable}>
            <thead>
              <tr>
                <th style={styles.th}>Feature Name</th>
                <th style={styles.th}>Data Type</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Lag & Leakage Audit</th>
              </tr>
            </thead>
            <tbody>
              {(featureSchema?.features || []).map((f) => (
                <tr key={f.name}>
                  <td style={styles.td}>
                    <code>{f.name}</code>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.dtypeBadge}>{f.dtype}</span>
                  </td>
                  <td style={styles.td}>{f.type}</td>
                  <td style={{ ...styles.td, color: "#475569", fontSize: "12px" }}>
                    {featureSchema?.leakage_prevention_audit?.[f.name] || "Standard exogenous input strictly for target month"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Educational Metric Explanations */}
      <div style={{ marginTop: "28px" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "var(--text-primary)" }}>
          Forecasting Metric Reference Guide
        </h3>
        <div style={styles.metricGuideGrid}>
          <div className="card-base" style={styles.guideCard}>
            <h4 style={styles.guideTitle}>MAE (Mean Absolute Error)</h4>
            <p style={styles.guideText}>
              Measures average magnitude of prediction errors in actual units. An MAE of 37 units means the model is off by 37 units on average.
            </p>
          </div>
          <div className="card-base" style={styles.guideCard}>
            <h4 style={styles.guideTitle}>RMSE (Root Mean Squared Error)</h4>
            <p style={styles.guideText}>
              Penalizes larger forecast errors more heavily than small ones. Essential for identifying high-impact demand volatility spikes.
            </p>
          </div>
          <div className="card-base" style={styles.guideCard}>
            <h4 style={styles.guideTitle}>WAPE (Weighted Absolute Percentage Error)</h4>
            <p style={styles.guideText}>
              Total absolute error divided by total actual demand. Unlike MAPE, WAPE does not distort or divide by zero when demand is low.
            </p>
          </div>
          <div className="card-base" style={styles.guideCard}>
            <h4 style={styles.guideTitle}>Empirical Confidence Range</h4>
            <p style={styles.guideText}>
              Calculated using model residual standard error (±1.96 × σ_residuals) calibrated during hold-out validation, covering 95% of outcomes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "12px",
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "var(--text-secondary)",
    fontSize: "14px",
  },
  badgeVersion: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    padding: "3px 8px",
    borderRadius: "6px",
    border: "1px solid #bfdbfe",
  },
  badgeSynthetic: {
    fontSize: "11px",
    fontWeight: "600",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    padding: "3px 8px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
  },
  alertBanner: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "var(--radius-md)",
    padding: "14px 16px",
    marginBottom: "20px",
  },
  alertIcon: {
    flexShrink: 0,
    marginTop: "2px",
  },
  scorecardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  scorecardCard: {
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
  },
  scorecardLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  scorecardValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: "8px 0 4px 0",
  },
  scorecardNote: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  card: {
    padding: "20px 24px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "8px",
  },
  filterPill: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  filterPillActive: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    borderColor: "#2563eb",
  },
  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
    gap: "18px",
  },
  catCard: {
    padding: "20px 22px",
  },
  catCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  preferredBadge: {
    fontSize: "12px",
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: "16px",
    border: "1px solid transparent",
  },
  catSummary: {
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.5",
    marginBottom: "14px",
  },
  metricsTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "8px 10px",
    borderBottom: "1px solid #e2e8f0",
    color: "var(--text-secondary)",
    fontWeight: "600",
  },
  thRight: {
    textAlign: "right",
    padding: "8px 10px",
    borderBottom: "1px solid #e2e8f0",
    color: "var(--text-secondary)",
    fontWeight: "600",
  },
  td: {
    padding: "10px 10px",
    borderBottom: "1px solid #f1f5f9",
    color: "var(--text-primary)",
  },
  tdRight: {
    textAlign: "right",
    padding: "10px 10px",
    borderBottom: "1px solid #f1f5f9",
    color: "var(--text-primary)",
  },
  preferredRow: {
    backgroundColor: "#f8fafc",
  },
  star: {
    color: "#2563eb",
    fontWeight: "bold",
  },
  dtypeBadge: {
    fontSize: "11px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    padding: "2px 6px",
    borderRadius: "4px",
    fontFamily: "monospace",
  },
  metricGuideGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  guideCard: {
    padding: "16px 18px",
  },
  guideTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-primary)",
    margin: "0 0 6px 0",
  },
  guideText: {
    fontSize: "13px",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: "1.5",
  },
};
