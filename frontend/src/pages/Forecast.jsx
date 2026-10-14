import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getAllPredictions, getModelMetrics, trainModels } from "../api";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

export default function Forecast() {
  const [predictions, setPredictions] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [selectedCat, setSelectedCat] = useState("all");
  const [error, setError] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainSuccess, setTrainSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [predsData, metricsData] = await Promise.all([
        getAllPredictions(),
        getModelMetrics(),
      ]);
      setPredictions(predsData);
      setMetrics(metricsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getAllPredictions(), getModelMetrics()])
      .then(([predsData, metricsData]) => {
        if (isMounted) {
          setPredictions(predsData);
          setMetrics(metricsData);
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





  const handleRetrain = async () => {
    setTraining(true);
    setError(null);
    setTrainSuccess(false);
    try {
      await trainModels();
      await loadData();
      setTrainSuccess(true);
      setTimeout(() => setTrainSuccess(false), 5000);
    } catch (err) {
      setError(`Retraining failed: ${err.message}`);
    } finally {
      setTraining(false);
    }
  };

  if (loading && !predictions) {
    return <LoadingState message="Loading predictive ML models and forecasts..." />;
  }

  if (error && (!predictions || predictions.length === 0)) {
    return (
      <ErrorState
        title="Failed to Load Forecasts"
        message={error}
        onRetry={loadData}
      />
    );
  }

  // Models have not been trained yet
  if (!loading && (!predictions || predictions.length === 0)) {
    return (
      <div className="animate-fade-in">
        <div style={styles.headerRow}>
          <div>
            <h1 style={{ margin: 0 }}>Demand Forecasting & Model Evaluation</h1>
            <p style={styles.subtitle}>
              XGBoost machine learning models predicting next-month unit demand with 95% confidence bounds.
            </p>
          </div>
        </div>
        {error && <div style={styles.errorBanner}>{error}</div>}

        <div className="card-base" style={{ padding: "64px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "52px", marginBottom: "16px" }}>🤖</div>
          <h2 style={{ marginBottom: "8px" }}>XGBoost Models Not Yet Trained</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "28px", maxWidth: "480px", margin: "0 auto 28px auto" }}>
            No trained models were found for any category. Click below to train all 4 XGBoost regressors
            on the historical sales dataset.
          </p>
          <button className="btn-primary" onClick={handleRetrain} disabled={training}>
            {training ? (
              <>
                <div style={styles.btnSpinner} />
                <span>Training XGBoost Models...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                <span>Train All Models Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Active category metrics if detailed view selected
  const activeMetrics =
    selectedCat !== "all" && metrics
      ? metrics.find((m) => m.category.toLowerCase() === selectedCat.toLowerCase())
      : null;

  const barChartData = predictions
    ? predictions.map((p) => ({
        category: p.category,
        predicted: p.predicted_demand,
        lower: p.confidence_range.lower,
        upper: p.confidence_range.upper,
      }))
    : [];

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={{ margin: 0 }}>Demand Forecasting & Model Evaluation</h1>
          <p style={styles.subtitle}>
            XGBoost machine learning models predicting next-month unit demand with 95% confidence bounds.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {trainSuccess && (
            <span className="badge badge-success animate-fade-in">
              ✓ Models retrained successfully
            </span>
          )}
          <button className="btn-primary" onClick={handleRetrain} disabled={training}>
            {training ? (
              <>
                <div style={styles.btnSpinner} />
                <span>Training XGBoost Models...</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                <span>Retrain All Models</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Synthetic Prototype Notice Banner */}
      <div style={styles.syntheticNotice}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={styles.badgeSynthetic}>Synthetic Prototype Dataset (2021–2024)</span>
          <span style={styles.badgeHorizon}>Historical Prototype Period: {predictions?.[0]?.forecast_period || "2025-01"}</span>
          <span style={styles.badgeModelVersion}>Model v{predictions?.[0]?.model_version || "2.0.0"}</span>
        </div>
        <p style={{ margin: "6px 0 0 0", fontSize: "12.5px", color: "#334155", lineHeight: "1.5" }}>
          Demand estimates reflect the historical prototype forecast period ({predictions?.[0]?.forecast_period || "2025-01"}) based on completed historical sequences through December 2024 ({predictions?.[0]?.based_on_period || "2024-12"}).
          This is an evaluation benchmark calculated from the 2021–2024 synthetic dataset, not an active forecast for current real-world dates in 2026.
          Confidence ranges represent ±1.96σ residual standard error calibrated on chronological test data.
        </p>
      </div>

      {/* Category View Tabs */}
      <div style={styles.categoryTabs}>
        <button
          style={{
            ...styles.tabBtn,
            ...(selectedCat === "all" ? styles.tabBtnActive : {}),
          }}
          onClick={() => setSelectedCat("all")}
        >
          All Categories Overview
        </button>
        {predictions &&
          predictions.map((p) => (
            <button
              key={p.category}
              style={{
                ...styles.tabBtn,
                ...(selectedCat === p.category ? styles.tabBtnActive : {}),
              }}
              onClick={() => setSelectedCat(p.category)}
            >
              {p.category} Evaluation
            </button>
          ))}
      </div>

      {/* Main View: Overview or Detailed Category Evaluation */}
      {selectedCat === "all" ? (
        <>
          {/* Demand Prediction Bar Chart */}
          <div className="card-base" style={styles.chartCard}>
            <div style={styles.chartCardHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px" }}>Predicted Unit Demand by Category</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                  Point estimate forecasts for historical prototype period 2025-01 (based on sequences through 2024-12)
                </p>
              </div>
              <span className="badge badge-primary">Model: XGBRegressor (Lag1, Lag2, Roll3)</span>
            </div>

            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="category" stroke="#475569" fontSize={13} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val) => [`${Number(val).toFixed(1)} units`, "Predicted Demand"]}
                    contentStyle={styles.tooltipBox}
                  />
                  <Bar dataKey="predicted" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cards with Range Trackers */}
          <div style={styles.cardsGrid}>
            {predictions &&
              predictions.map((p) => (
                <ForecastCard
                  key={p.category}
                  prediction={p}
                  metrics={metrics ? metrics.find((m) => m.category === p.category) : null}
                  onSelect={() => setSelectedCat(p.category)}
                />
              ))}
          </div>

          {/* Model Diagnostic Summary Table */}
          {metrics && (
            <div className="card-base" style={{ marginTop: "24px", overflow: "hidden" }}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
                <h3 style={{ margin: 0, fontSize: "15px" }}>Cross-Category Model Performance Matrix</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "var(--text-secondary)" }}>
                  Validation performance evaluated on unseen test periods
                </p>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Mean Abs Error (MAE)</th>
                    <th>Root Mean Sq Error (RMSE)</th>
                    <th>MAPE %</th>
                    <th>Train / Test Split</th>
                    <th>Model Diagnostics</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.category}>
                      <td><strong>{m.category}</strong></td>
                      <td>{m.mae} units</td>
                      <td>{m.rmse}</td>
                      <td>
                        <span className="badge badge-primary">{m.mape_pct}%</span>
                      </td>
                      <td>{m.n_train} train / {m.n_test} test</td>
                      <td>
                        <button
                          className="btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                          onClick={() => setSelectedCat(m.category)}
                        >
                          View Validation Curve →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        activeMetrics ? (
          <div className="animate-fade-in">
            {/* Metric KPI Highlights */}
            <div style={styles.detailKpiRow}>
              <div className="card-base" style={styles.detailKpiCard}>
                <span style={styles.detailKpiLabel}>Mean Absolute Error</span>
                <span style={styles.detailKpiVal}>{activeMetrics.mae} units</span>
                <span style={styles.detailKpiSub}>Avg deviation per month</span>
              </div>
              <div className="card-base" style={styles.detailKpiCard}>
                <span style={styles.detailKpiLabel}>Root Mean Squared Error</span>
                <span style={styles.detailKpiVal}>{activeMetrics.rmse}</span>
                <span style={styles.detailKpiSub}>Penalizes outlier deviations</span>
              </div>
              <div className="card-base" style={styles.detailKpiCard}>
                <span style={styles.detailKpiLabel}>Validation MAPE</span>
                <span style={styles.detailKpiVal}>{activeMetrics.mape_pct}%</span>
                <span style={styles.detailKpiSub}>Percentage error on test set</span>
              </div>
              <div className="card-base" style={styles.detailKpiCard}>
                <span style={styles.detailKpiLabel}>Test Sample Size</span>
                <span style={styles.detailKpiVal}>{activeMetrics.n_test} months</span>
                <span style={styles.detailKpiSub}>Held-out evaluation periods</span>
              </div>
            </div>

            {/* Actual vs Predicted Timeline Line Chart */}
            <div className="card-base" style={styles.chartCard}>
              <div style={styles.chartCardHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px" }}>
                    {selectedCat}: Actual Demand vs. XGBoost Prediction Curve
                  </h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                    Comparing actual historical unit sales against model predictions over the test split
                  </p>
                </div>
                <button className="btn-secondary" onClick={() => setSelectedCat("all")}>
                  ← Back to Overview
                </button>
              </div>

              <div style={{ width: "100%", height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={activeMetrics.validation_chart || []}
                    margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={styles.tooltipBox} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual Demand"
                      stroke="#0f172a"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      name="Model Predicted"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-base" style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              No detailed metrics found for category <strong>{selectedCat}</strong>.
            </p>
            <button
              className="btn-secondary"
              onClick={() => setSelectedCat("all")}
              style={{ marginTop: "16px" }}
            >
              ← Back to All Categories
            </button>
          </div>
        )
      )}

      {/* Forecast Methodology & Limitations Callout */}
      <div style={styles.methodologyBox}>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "16px" }}>ℹ️</span>
          <div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "13.5px", color: "var(--text-primary)" }}>
              Forecasting Model Methodology &amp; Operational Boundaries
            </h4>
            <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Category forecasts are estimated by dedicated XGBoost Regressors utilizing lag-1, lag-2, and 3-month rolling mean sales volumes. The 95% confidence intervals represent parametric error spreads calculated from cross-validation residuals. Forecasts reflect expected baseline trajectory and may not anticipate extreme external macroeconomic disruptions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


function ForecastCard({ prediction, metrics, onSelect }) {
  const {
    category,
    predicted_demand,
    confidence_range,
    based_on_period,
    forecast_period,
    model_version,
    model_used,
    preferred_model,
  } = prediction;
  const rangeWidth = confidence_range.upper - confidence_range.lower;
  const predictedPosition =
    rangeWidth > 0
      ? ((predicted_demand - confidence_range.lower) / rangeWidth) * 100
      : 50;

  return (
    <div className="card-base" style={styles.forecastCard}>
      <div style={styles.forecastHeader}>
        <div>
          <span style={styles.categoryName}>{category}</span>
          <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
            <span style={styles.miniBadgePeriod}>Target: {forecast_period || "2025-01"}</span>
            <span style={styles.miniBadgeVersion}>v{model_version || "2.0.0"}</span>
          </div>
        </div>
        {metrics && (
          <span className="badge badge-primary">
            MAE: {metrics.mae}
          </span>
        )}
      </div>

      <div style={styles.forecastValue}>
        {predicted_demand.toFixed(1)} <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-secondary)" }}>units</span>
      </div>

      <div style={styles.rangeMeta}>
        <span>95% Confidence Interval (±1.96σ)</span>
      </div>

      <div style={styles.rangeBarTrack}>
        <div
          style={{
            ...styles.rangeBarDot,
            left: `${Math.min(100, Math.max(0, predictedPosition))}%`,
          }}
        />
      </div>

      <div style={styles.rangeLabels}>
        <span>Lower: {confidence_range.lower.toFixed(1)}</span>
        <span>Upper: {confidence_range.upper.toFixed(1)}</span>
      </div>

      {/* Business plain-language interpretation */}
      <p style={styles.plainExplanation}>
        Projected demand of <strong>{predicted_demand.toFixed(0)} units</strong> based on historical sequences through {based_on_period || "2024-12"}. Recommended baseline order buffer spans {confidence_range.lower.toFixed(0)} to {confidence_range.upper.toFixed(0)} units.
      </p>

      <div style={styles.cardFooter}>
        <span style={styles.basedOn}>Engine: {preferred_model || model_used || "XGBoost"}</span>
        <button style={styles.cardDetailLink} onClick={onSelect}>
          Validation Details →
        </button>
      </div>
    </div>
  );
}

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
    gap: "20px",
    flexWrap: "wrap",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    marginTop: "6px",
  },
  syntheticNotice: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "var(--radius-md)",
    padding: "14px 18px",
    marginBottom: "20px",
  },
  badgeSynthetic: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    padding: "3px 8px",
    borderRadius: "4px",
  },
  badgeHorizon: {
    fontSize: "11px",
    fontWeight: "600",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "3px 8px",
    borderRadius: "4px",
    border: "1px solid #cbd5e1",
  },
  badgeModelVersion: {
    fontSize: "11px",
    fontWeight: "600",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    padding: "3px 8px",
    borderRadius: "4px",
  },
  miniBadgePeriod: {
    fontSize: "10.5px",
    fontWeight: "600",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  miniBadgeVersion: {
    fontSize: "10.5px",
    fontWeight: "500",
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  plainExplanation: {
    fontSize: "12px",
    color: "#475569",
    lineHeight: "1.5",
    margin: "12px 0 0 0",
    backgroundColor: "#f8fafc",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #f1f5f9",
  },
  btnSpinner: {
    width: "14px",
    height: "14px",
    border: "2px solid #ffffff",
    borderTop: "2px solid transparent",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  categoryTabs: {
    display: "flex",
    gap: "8px",
    borderBottom: "1px solid var(--border)",
    paddingBottom: "12px",
    marginBottom: "24px",
    overflowX: "auto",
  },
  tabBtn: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    border: "1px solid transparent",
    borderRadius: "8px",
    color: "var(--text-secondary)",
    fontSize: "13.5px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  tabBtnActive: {
    backgroundColor: "#ffffff",
    borderColor: "var(--border)",
    color: "var(--primary)",
    boxShadow: "var(--shadow-xs)",
  },
  chartCard: {
    padding: "24px",
    marginBottom: "24px",
  },
  chartCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "12px",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "18px",
  },
  forecastCard: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  },
  forecastHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  categoryName: {
    fontSize: "15px",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  forecastValue: {
    fontSize: "28px",
    fontWeight: "800",
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    marginBottom: "12px",
  },
  rangeMeta: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    marginBottom: "8px",
  },
  rangeBarTrack: {
    position: "relative",
    height: "6px",
    backgroundColor: "#e2e8f0",
    borderRadius: "3px",
    marginBottom: "8px",
  },
  rangeBarDot: {
    position: "absolute",
    top: "-4px",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    backgroundColor: "#2563eb",
    transform: "translateX(-50%)",
    border: "2px solid #ffffff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },
  rangeLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11.5px",
    color: "var(--text-secondary)",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "16px",
    paddingTop: "12px",
    borderTop: "1px solid var(--border-light)",
  },
  basedOn: {
    fontSize: "11.5px",
    color: "var(--text-muted)",
  },
  cardDetailLink: {
    background: "none",
    border: "none",
    color: "var(--primary)",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    padding: 0,
  },
  detailKpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },
  detailKpiCard: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  },
  detailKpiLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
  },
  detailKpiVal: {
    fontSize: "24px",
    fontWeight: "800",
    color: "var(--text-primary)",
    margin: "8px 0 4px 0",
  },
  detailKpiSub: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  tooltipBox: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "13px",
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
    marginBottom: "20px",
  },
  methodologyBox: {
    marginTop: "28px",
    padding: "18px 20px",
    backgroundColor: "#f8fafc",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
  },
};