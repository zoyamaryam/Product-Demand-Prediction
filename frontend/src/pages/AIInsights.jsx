import { useEffect, useState, useMemo } from "react";
import { getInsights, getStructuredInsights } from "../api";

export default function AIInsights() {
  const [executiveBriefing, setExecutiveBriefing] = useState(null);
  const [provider, setProvider] = useState("DemandIQ Intelligence Engine");
  const [structuredInsights, setStructuredInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadData = () => {
    setLoading(true);
    setError(null);

    Promise.all([
      getInsights(),
      getStructuredInsights(selectedCategory !== "all" ? selectedCategory : undefined),
    ])
      .then(([briefingData, structuredData]) => {
        setExecutiveBriefing(briefingData.insight);
        if (briefingData.provider) setProvider(briefingData.provider);
        setStructuredInsights(structuredData.insights || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getInsights(),
      getStructuredInsights(selectedCategory !== "all" ? selectedCategory : undefined),
    ])
      .then(([briefingData, structuredData]) => {
        if (!isMounted) return;
        setExecutiveBriefing(briefingData.insight);
        if (briefingData.provider) setProvider(briefingData.provider);
        setStructuredInsights(structuredData.insights || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  const handleCopy = () => {
    if (!executiveBriefing) return;
    navigator.clipboard.writeText(executiveBriefing);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filter structured insights
  const filteredInsights = useMemo(() => {
    return structuredInsights.filter((ins) => {
      const matchSeverity = severityFilter === "all" || ins.severity.toLowerCase() === severityFilter.toLowerCase();
      const matchType = typeFilter === "all" || ins.category.toLowerCase() === typeFilter.toLowerCase();
      return matchSeverity && matchType;
    });
  }, [structuredInsights, severityFilter, typeFilter]);

  const criticalCount = useMemo(() => {
    return structuredInsights.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH").length;
  }, [structuredInsights]);

  const renderSeverityBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return <span className="badge badge-danger">CRITICAL SEVERITY</span>;
      case "HIGH":
        return <span className="badge badge-danger">HIGH PRIORITY</span>;
      case "MEDIUM":
        return <span className="badge badge-warning">MEDIUM PRIORITY</span>;
      case "LOW":
        return <span className="badge badge-primary">LOW SEVERITY</span>;
      case "INFO":
      default:
        return <span className="badge badge-neutral">INFORMATIONAL</span>;
    }
  };

  const renderEvidenceQualityBadge = (quality) => {
    switch (quality) {
      case "HIGH_EMPIRICAL":
        return <span style={styles.qualityEmpirical}>High Empirical (48-Mo Baseline)</span>;
      case "MODEL_BENCHMARK":
        return <span style={styles.qualityModel}>Model Hold-out Benchmark</span>;
      case "ESTIMATED_RUN_RATE":
        return <span style={styles.qualityRunRate}>Estimated Run-Rate Policy</span>;
      default:
        return <span style={styles.qualityGeneral}>{quality?.replace(/_/g, " ") || "Verified Data"}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
            <h1 style={{ margin: 0 }}>Evidence-Grounded AI Insights</h1>
            <span style={styles.provenanceBadge}>Data Through 2024-12 • Prototype 2025-01</span>
          </div>
          <p style={styles.subtitle}>
            Structured, verifiable business insights generated from cross-sector predictive models, inventory run-rates, and historical transactions without hallucinated metrics.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {executiveBriefing && (
            <button className="btn-secondary" onClick={handleCopy} disabled={loading}>
              {copied ? "✓ Copied to Clipboard" : "Copy Briefing"}
            </button>
          )}
          <button className="btn-primary" onClick={loadData} disabled={loading}>
            {loading ? "Synthesizing..." : "↻ Refresh Insights"}
          </button>
        </div>
      </div>

      {/* Advisory Notice Banner */}
      <div style={styles.advisoryBanner}>
        <span style={{ fontSize: "18px" }}>🛡️</span>
        <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.45 }}>
          <strong>Decision-Support Notice:</strong> All replenishment quantities and inventory alerts are advisory decision-support recommendations.
          DemandIQ <strong>never places purchase orders automatically</strong>. Supplier lead times are approximated at 14 days, and all pricing insights reflect empirical historical correlations without causal profit claims.
        </div>
      </div>

      {/* Executive Briefing Card */}
      <div className="card-base" style={styles.mainCard}>
        <div style={styles.cardTopMeta}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={styles.aiSparkle}>✦</span>
            <span style={styles.modelTag}>{provider}</span>
          </div>
          <span className="badge badge-primary">Historical Horizon: Jan 2021 – Dec 2024</span>
        </div>

        {loading && !executiveBriefing && (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={{ color: "var(--text-secondary)", marginTop: "14px", fontSize: "14px" }}>
              Computing structured insights across demand trends, inventory risks, and model benchmarks...
            </p>
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            <strong>Synthesis Error:</strong> {error}
            <button className="btn-secondary" onClick={loadData} style={{ marginTop: "10px", alignSelf: "flex-start" }}>
              Retry
            </button>
          </div>
        )}

        {executiveBriefing && (
          <div style={styles.contentBody}>
            <div style={styles.quoteBar} />
            <div style={styles.insightTextWrapper}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "15px", color: "var(--text-primary)" }}>
                Executive Business Synthesis
              </h3>
              <p style={styles.insightText}>{executiveBriefing}</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div style={styles.kpiStrip}>
        <div className="card-base" style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Total Structured Insights</span>
          <span style={styles.kpiVal}>{structuredInsights.length}</span>
          <span style={styles.kpiSub}>Cross-sector findings</span>
        </div>
        <div className="card-base" style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Critical Vulnerabilities</span>
          <span style={{ ...styles.kpiVal, color: criticalCount > 0 ? "var(--danger)" : "var(--success)" }}>
            {criticalCount}
          </span>
          <span style={styles.kpiSub}>Urgent replenishment flags</span>
        </div>
        <div className="card-base" style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Dataset Verified Boundary</span>
          <span style={styles.kpiVal}>2024-12</span>
          <span style={styles.kpiSub}>48 consecutive months</span>
        </div>
        <div className="card-base" style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Prototype Forecast Cycle</span>
          <span style={{ ...styles.kpiVal, color: "#8b5cf6" }}>2025-01</span>
          <span style={styles.kpiSub}>Historical evaluation</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card-base" style={styles.filterToolbar}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={styles.selectInput}
          >
            <option value="all">All Categories</option>
            <option value="Clothing">Clothing</option>
            <option value="Beauty">Beauty</option>
            <option value="Electronics">Electronics</option>
            <option value="Home">Home</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Severity:</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={styles.selectInput}
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFO">Informational</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Insight Domain:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={styles.selectInput}
          >
            <option value="all">All Domains</option>
            <option value="inventory_risk">Inventory Risk</option>
            <option value="demand_trends">Demand Trends</option>
            <option value="pricing_promotion">Pricing &amp; Promotions</option>
            <option value="forecast_limitations">Forecast Limitations</option>
            <option value="seasonality">Seasonality</option>
          </select>
        </div>

        <div style={{ marginLeft: "auto", fontSize: "12.5px", color: "var(--text-secondary)" }}>
          Showing <strong>{filteredInsights.length}</strong> of {structuredInsights.length} insights
        </div>
      </div>

      {/* Structured Insights Cards Grid */}
      <div style={styles.insightsGrid}>
        {filteredInsights.length === 0 && !loading && (
          <div className="card-base" style={{ padding: "40px", textAlign: "center", gridColumn: "1 / -1" }}>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
              No structured insights match the selected filter combination. Try resetting category or severity filters.
            </p>
          </div>
        )}

        {filteredInsights.map((ins) => (
          <div key={ins.id} className="card-base" style={styles.insightCard}>
            {/* Card Header Meta */}
            <div style={styles.insightCardHeader}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={styles.idBadge}>{ins.id}</span>
                {renderSeverityBadge(ins.severity)}
                <span className="badge badge-neutral" style={{ textTransform: "capitalize" }}>
                  {ins.category.replace(/_/g, " ")}
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {renderEvidenceQualityBadge(ins.evidence_quality)}
                {ins.period && <span style={styles.cardPeriodTag}>{ins.period}</span>}
              </div>
            </div>

            {/* Title & Explanation */}
            <h3 style={styles.insightTitle}>{ins.title}</h3>
            <p style={styles.insightExplanation}>{ins.explanation}</p>

            {/* Supporting Metrics Strip */}
            {ins.supporting_metrics && Object.keys(ins.supporting_metrics).length > 0 && (
              <div style={styles.cardMetricsBox}>
                <div style={styles.cardMetricsLabel}>Grounded Metrics:</div>
                <div style={styles.cardMetricsGrid}>
                  {Object.entries(ins.supporting_metrics).map(([k, v]) => (
                    <div key={k} style={styles.cardMetricChip}>
                      <span style={styles.cardMetricKey}>{k.replace(/_/g, " ")}:</span>
                      <span style={styles.cardMetricVal}>
                        {typeof v === "number"
                          ? Number.isInteger(v)
                            ? v.toLocaleString()
                            : v.toFixed(2)
                          : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Recommendation Box */}
            {ins.recommendation && (
              <div style={styles.cardRecommendationBox}>
                <div style={styles.recHeader}>💡 Recommended Next Step:</div>
                <div style={styles.recContent}>{ins.recommendation}</div>
              </div>
            )}

            {/* Assumptions & Limitations Box */}
            {ins.limitations && ins.limitations.length > 0 && (
              <div style={styles.cardLimitationsBox}>
                <div style={styles.limitationsHeader}>⚠️ Key Limitations &amp; Assumptions:</div>
                <ul style={styles.limitationsList}>
                  {ins.limitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Source Footer */}
            <div style={styles.cardFooter}>
              <span>Data Source: <strong>{ins.data_source}</strong></span>
              {ins.category_name && <span>Category: <strong>{ins.category_name}</strong></span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
  },
  provenanceBadge: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#2563eb",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "3px 8px",
    borderRadius: "12px",
  },
  subtitle: {
    margin: "4px 0 0 0",
    color: "var(--text-secondary)",
    fontSize: "13.5px",
    maxWidth: "850px",
  },
  advisoryBanner: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "var(--radius-sm)",
  },
  mainCard: {
    padding: "20px",
  },
  cardTopMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
    flexWrap: "wrap",
    gap: "10px",
  },
  aiSparkle: {
    color: "#3b82f6",
    fontSize: "16px",
  },
  modelTag: {
    fontWeight: "700",
    fontSize: "13px",
    color: "var(--text-primary)",
  },
  loadingBox: {
    padding: "40px",
    textAlign: "center",
  },
  spinner: {
    width: "28px",
    height: "28px",
    border: "3px solid var(--border)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    margin: "0 auto",
    animation: "spin 1s linear infinite",
  },
  errorBox: {
    padding: "16px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fee2e2",
    borderRadius: "var(--radius-sm)",
    color: "var(--danger)",
    display: "flex",
    flexDirection: "column",
  },
  contentBody: {
    display: "flex",
    gap: "14px",
  },
  quoteBar: {
    width: "4px",
    borderRadius: "4px",
    backgroundColor: "var(--primary)",
    flexShrink: 0,
  },
  insightTextWrapper: {
    flex: 1,
  },
  insightText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: "1.65",
    color: "var(--text-primary)",
  },
  kpiStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
  },
  kpiCard: {
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  kpiLabel: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: "700",
    color: "var(--text-secondary)",
  },
  kpiVal: {
    fontSize: "22px",
    fontWeight: "800",
    color: "var(--text-primary)",
  },
  kpiSub: {
    fontSize: "11px",
    color: "var(--text-secondary)",
  },
  filterToolbar: {
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  filterLabel: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "var(--text-secondary)",
  },
  selectInput: {
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "13px",
  },
  insightsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
    gap: "16px",
  },
  insightCard: {
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  insightCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  idBadge: {
    fontSize: "11px",
    fontWeight: "800",
    padding: "2px 7px",
    borderRadius: "4px",
    backgroundColor: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    letterSpacing: "0.04em",
  },
  qualityEmpirical: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "12px",
    backgroundColor: "#ecfdf5",
    color: "#059669",
    border: "1px solid #a7f3d0",
  },
  qualityModel: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "12px",
    backgroundColor: "#f5f3ff",
    color: "#7c3aed",
    border: "1px solid #ddd6fe",
  },
  qualityRunRate: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "12px",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
  },
  qualityGeneral: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "12px",
    backgroundColor: "var(--bg-subtle)",
    color: "var(--text-secondary)",
  },
  cardPeriodTag: {
    fontSize: "11.5px",
    fontWeight: "600",
    color: "var(--text-secondary)",
  },
  insightTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
    color: "var(--text-primary)",
    lineHeight: "1.3",
  },
  insightExplanation: {
    margin: 0,
    fontSize: "13.5px",
    color: "var(--text-primary)",
    lineHeight: "1.55",
  },
  cardMetricsBox: {
    padding: "10px 12px",
    backgroundColor: "var(--bg-subtle)",
    borderRadius: "6px",
    border: "1px solid var(--border)",
  },
  cardMetricsLabel: {
    fontSize: "10.5px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: "700",
    color: "var(--text-secondary)",
    marginBottom: "6px",
  },
  cardMetricsGrid: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  cardMetricChip: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "11.5px",
    display: "flex",
    gap: "4px",
  },
  cardMetricKey: {
    color: "var(--text-secondary)",
    textTransform: "capitalize",
  },
  cardMetricVal: {
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  cardRecommendationBox: {
    padding: "10px 12px",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "6px",
  },
  recHeader: {
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#1d4ed8",
    marginBottom: "4px",
  },
  recContent: {
    fontSize: "13px",
    color: "#1e3a8a",
    lineHeight: "1.45",
  },
  cardLimitationsBox: {
    padding: "8px 12px",
    backgroundColor: "#fffbeb",
    border: "1px solid #fef3c7",
    borderRadius: "6px",
  },
  limitationsHeader: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#92400e",
    marginBottom: "4px",
  },
  limitationsList: {
    margin: 0,
    paddingLeft: "16px",
    fontSize: "11.5px",
    color: "#78350f",
    lineHeight: "1.4",
  },
  cardFooter: {
    marginTop: "auto",
    paddingTop: "10px",
    borderTop: "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11.5px",
    color: "var(--text-secondary)",
  },
};