import { useEffect, useState, useMemo } from "react";
import {
  getInventoryIntelligence,
  getPricingInsights,
  getProductInventory,
} from "../api";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";

const CATEGORIES = ["all", "Beauty", "Clothing", "Electronics", "Home"];

export default function InventoryRisk() {
  const [activeTab, setActiveTab] = useState("inventory"); // "inventory" | "pricing"
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [intelligence, setIntelligence] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [products, setProducts] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Status filters for SKU inventory table
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      getInventoryIntelligence(categoryFilter),
      getPricingInsights(categoryFilter),
      getProductInventory(categoryFilter),
    ])
      .then(([intelRes, pricingRes, prodsRes]) => {
        setIntelligence(intelRes);
        setPricingData(pricingRes);
        setProducts(prodsRes);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load inventory intelligence and pricing insights.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getInventoryIntelligence(categoryFilter),
      getPricingInsights(categoryFilter),
      getProductInventory(categoryFilter),
    ])
      .then(([intelRes, pricingRes, prodsRes]) => {
        if (isMounted) {
          setIntelligence(intelRes);
          setPricingData(pricingRes);
          setProducts(prodsRes);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load inventory intelligence and pricing insights.");
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
  }, [categoryFilter]);

  // Filter products for the SKU table
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch =
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" ||
        p.product_category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        p.inventory_status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, statusFilter, categoryFilter]);

  const handleExportCSV = () => {
    if (!filteredProducts.length) return;
    const headers = [
      "SKU",
      "Product Name",
      "Category",
      "Current Stock",
      "Safety Stock",
      "Reorder Threshold",
      "Unit Price ($)",
      "Inventory Status",
      "Recommended Reorder (Units)",
    ];
    const rows = filteredProducts.map((p) => [
      p.sku_id,
      `"${p.product_name.replace(/"/g, '""')}"`,
      p.product_category,
      p.current_inventory,
      p.safety_stock,
      p.reorder_point,
      `$${p.unit_price.toFixed(2)}`,
      `"${p.inventory_status}"`,
      p.recommended_reorder_qty,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_replenishment_audit_${categoryFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <LoadingState message="Evaluating inventory replenishment buffers, lead times, and pricing observations..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Inventory & Pricing Intelligence"
        message={error}
        onRetry={loadData}
      />
    );
  }

  if (!intelligence || !pricingData) {
    return <EmptyState title="No Inventory Data" message="No inventory or pricing records could be retrieved." />;
  }

  const { summary, category_risks } = intelligence;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: "40px" }}>
      {/* Historical Prototype Forecast Notice Banner */}
      <div style={styles.prototypeNoticeBanner}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={styles.badgeSynthetic}>Historical Prototype Evaluation (2021–2024)</span>
          <span style={styles.badgeHorizon}>Forecast Evaluation Cycle: 2025-01 (based on data through 2024-12)</span>
          <span style={styles.badgeAdvisory}>Advisory Decision Support — No Automated Purchasing</span>
        </div>
        <p style={styles.prototypeNoticeText}>
          Inventory replenishment and stockout indicators are calculated against the historical prototype forecast for period <strong>2025-01</strong>, derived from records through <strong>December 2024</strong>.
          These calculations represent historical scenario evaluations, not live 2026 supply chain transactions.
        </p>
      </div>

      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>Inventory Intelligence & Pricing Insights</h1>
          <p style={styles.subtitle}>
            Empirical stockout prevention, lead-time replenishment policies, and observational pricing patterns.
          </p>
        </div>

        {/* Category Filter Selector */}
        <div style={styles.headerControls}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>Sector Filter:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="all">All Sectors ({CATEGORIES.length - 1})</option>
              {CATEGORIES.filter((c) => c !== "all").map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div style={styles.tabContainer}>
        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          style={activeTab === "inventory" ? styles.tabActive : styles.tabInactive}
        >
          📦 Inventory Intelligence & Replenishment
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pricing")}
          style={activeTab === "pricing" ? styles.tabActive : styles.tabInactive}
        >
          🏷️ Pricing & Markdown Insights
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: INVENTORY INTELLIGENCE & REPLENISHMENT */}
      {/* ==================================================== */}
      {activeTab === "inventory" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Summary KPI Scorecard */}
          <div style={styles.kpiGrid}>
            <div className="card-base" style={styles.kpiCard}>
              <span style={styles.kpiLabel}>Sectors Evaluated</span>
              <span style={styles.kpiValue}>{summary.total_categories}</span>
              <span style={styles.kpiSub}>Multi-category retail catalog</span>
            </div>
            <div className="card-base" style={styles.kpiCard}>
              <span style={styles.kpiLabel}>Stockout Priority Flags</span>
              <span style={{ ...styles.kpiValue, color: summary.stockout_risk_count > 0 ? "#dc2626" : "#059669" }}>
                {summary.stockout_risk_count}
              </span>
              <span style={styles.kpiSub}>Exceeding on-hand stock or lead-time run-rate</span>
            </div>
            <div className="card-base" style={styles.kpiCard}>
              <span style={styles.kpiLabel}>Potential Overstock Sectors</span>
              <span style={{ ...styles.kpiValue, color: summary.overstock_risk_count > 0 ? "#d97706" : "var(--text-primary)" }}>
                {summary.overstock_risk_count}
              </span>
              <span style={styles.kpiSub}>Inventory &gt; 1.5x upper-bound demand</span>
            </div>
            <div className="card-base" style={styles.kpiCard}>
              <span style={styles.kpiLabel}>Suggested Reorder Units</span>
              <span style={{ ...styles.kpiValue, color: "#2563eb" }}>
                {summary.total_suggested_reorder_units.toLocaleString()}
              </span>
              <span style={styles.kpiSub}>Advisory recommendation (review only)</span>
            </div>
          </div>

          {/* Category Diagnostics Grid */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", color: "var(--text-primary)" }}>
                  Category Replenishment Diagnostics
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                  Comparing projected demand against on-hand inventory, safety buffers, and vendor lead-time run-rates.
                </p>
              </div>
            </div>

            <div style={styles.grid}>
              {category_risks.map((risk) => (
                <InventoryCard key={risk.category} risk={risk} />
              ))}
            </div>
          </div>

          {/* SKU-Level Inventory Table */}
          <div className="card-base" style={{ overflow: "hidden" }}>
            <div style={styles.tableHeaderSection}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px" }}>SKU Level Inventory Monitor</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                  Inspect item stockouts, reorder triggers, and holding positions across catalog SKUs
                </p>
              </div>

              {/* Search & Export */}
              <div style={styles.controlsRow}>
                <input
                  type="text"
                  placeholder="Search product or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleExportCSV}
                  style={{ padding: "8px 14px", fontSize: "12.5px" }}
                  title="Download CSV report of current inventory position"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div style={styles.tabRow}>
              {[
                { key: "all", label: `All (${products?.length || 0})` },
                {
                  key: "Critical Stockout",
                  label: `Critical Stockouts (${products?.filter((p) => p.inventory_status === "Critical Stockout").length || 0})`,
                },
                {
                  key: "Reorder Required",
                  label: `Reorder Required (${products?.filter((p) => p.inventory_status === "Reorder Required").length || 0})`,
                },
                {
                  key: "Overstock",
                  label: `Overstock (${products?.filter((p) => p.inventory_status === "Overstock").length || 0})`,
                },
                {
                  key: "Healthy",
                  label: `Healthy (${products?.filter((p) => p.inventory_status === "Healthy").length || 0})`,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  style={{
                    ...styles.filterPill,
                    ...(statusFilter === tab.key ? styles.filterPillActive : {}),
                  }}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU ID</th>
                    <th>Product Name</th>
                    <th>Sector</th>
                    <th>Current Stock</th>
                    <th>Safety Stock</th>
                    <th>Reorder Threshold</th>
                    <th>Unit Price</th>
                    <th>Inventory Status</th>
                    <th>Replenishment Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.sku_id}>
                      <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary)" }}>
                        {p.sku_id}
                      </td>
                      <td><strong>{p.product_name}</strong></td>
                      <td>{p.product_category}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: p.stockout_risk ? "#b91c1c" : "inherit" }}>
                          {p.current_inventory} units
                        </span>
                      </td>
                      <td>{p.safety_stock}</td>
                      <td>{p.reorder_point}</td>
                      <td>${p.unit_price.toFixed(2)}</td>
                      <td>
                        <StatusBadge status={p.inventory_status} />
                      </td>
                      <td>
                        {p.recommended_reorder_qty > 0 ? (
                          <span className="badge badge-danger">
                            Reorder +{p.recommended_reorder_qty} units
                          </span>
                        ) : p.overstock_risk ? (
                          <span className="badge badge-warning">Markdown Review</span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Adequate</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "40px 20px" }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "12px" }}>
                          No SKU items found matching the current search query or status filter.
                        </div>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                            setCategoryFilter("all");
                          }}
                          style={{ fontSize: "12.5px" }}
                        >
                          Clear All Filters
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Replenishment Policy Assumptions Box */}
          <div style={styles.assumptionsCard}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "18px" }}>📦</span>
              <div>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", color: "var(--text-primary)" }}>
                  Replenishment Policy &amp; Lead-Time Assumptions
                </h4>
                <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                  • <strong>Single-Month Horizon Approximation:</strong> Lead-time demand is approximated as a proportional daily run-rate from the 1-month forecast (<code>Demand × Lead Time Days / 30</code>). Speculative multi-month lead-time forecasts are not assumed.<br />
                  • <strong>Confirmed Incoming Orders:</strong> Not recorded in the historical retail dataset; assumed to be 0 units.<br />
                  • <strong>Safety Stock Buffer:</strong> Sized against historical monthly demand variance.<br />
                  • <strong>Advisory Only:</strong> DemandIQ never places automated supplier orders. Buyers must review suggestions against supplier Minimum Order Quantities (MOQs) and shelf space.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: PRICING & MARKDOWN INSIGHTS */}
      {/* ==================================================== */}
      {activeTab === "pricing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Methodological Alert Banner */}
          <div style={styles.pricingDisclaimerBanner}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "20px" }}>⚖️</span>
              <div style={{ flex: 1, fontSize: "13px", lineHeight: "1.6", color: "#1e3a8a" }}>
                <strong>Observational Pricing Notice:</strong> Price and promotion observations reflect empirical associations in historical transactions.
                <strong> Product wholesale costs, gross margins, and price elasticity curves are absent from this dataset.</strong>
                DemandIQ strictly avoids causal profit claims and does not claim any price point is optimal. All markdown suggestions are intended to evaluate inventory carrying turnover, not profit maximization.
              </div>
            </div>
          </div>

          {/* Category Pricing Insights Cards */}
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", color: "var(--text-primary)" }}>
                Empirical Category Pricing &amp; Promotion Observations
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                Observed price levels, recorded discount depths, and empirical sales volume lifts during promotional periods.
              </p>
            </div>

            <div style={styles.grid}>
              {pricingData.category_insights.map((insight) => (
                <PricingCard key={insight.category} insight={insight} />
              ))}
            </div>
          </div>

          {/* SKU-Level Markdown Review Candidates */}
          <div className="card-base" style={{ overflow: "hidden" }}>
            <div style={styles.tableHeaderSection}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px" }}>SKU Markdown &amp; Clearance Candidates</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                  Catalog products currently exhibiting overstock status where promotional discounting or bundles can be evaluated
                </p>
              </div>
              <span className="badge badge-warning">
                {pricingData.sku_markdown_candidates.length} Candidate SKUs
              </span>
            </div>

            {pricingData.sku_markdown_candidates.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU ID</th>
                      <th>Product Name</th>
                      <th>Sector</th>
                      <th>Current Price</th>
                      <th>Current Stock</th>
                      <th>Reorder Point</th>
                      <th>Inventory Status</th>
                      <th>Observation &amp; Markdown Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingData.sku_markdown_candidates.map((sku) => (
                      <tr key={sku.sku_id}>
                        <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary)" }}>
                          {sku.sku_id}
                        </td>
                        <td><strong>{sku.product_name}</strong></td>
                        <td>{sku.category}</td>
                        <td><strong>${sku.unit_price.toFixed(2)}</strong></td>
                        <td>
                          <span style={{ fontWeight: 600, color: "#d97706" }}>
                            {sku.current_inventory} units
                          </span>
                        </td>
                        <td>{sku.reorder_point}</td>
                        <td>
                          <span className="badge badge-warning">Overstock</span>
                        </td>
                        <td style={{ fontSize: "12.5px", color: "var(--text-secondary)", maxWidth: "340px" }}>
                          {sku.observation_summary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-secondary)" }}>
                No catalog items in the selected sector currently meet the criteria for clearance markdown review.
              </div>
            )}
          </div>

          {/* Explicit Limitations Card */}
          <div style={styles.limitationsCard}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#991b1b" }}>
              Data Limitations &amp; Boundary Conditions
            </h4>
            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#7f1d1d", lineHeight: "1.6" }}>
              {pricingData.data_limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryCard({ risk }) {
  const isStockout = risk.stockout_risk;
  const isOverstock = risk.overstock_risk;

  const badgeClass = isStockout
    ? "badge-danger"
    : isOverstock
    ? "badge-warning"
    : "badge-success";

  return (
    <div className="card-base" style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <span style={styles.categoryBadge}>{risk.category}</span>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "17px", color: "var(--text-primary)" }}>
            {risk.category} Inventory Position
          </h3>
        </div>
        <span className={`badge ${badgeClass}`}>{risk.inventory_status}</span>
      </div>

      <div style={styles.statsGrid}>
        <Stat label="Current Stock" value={`${risk.current_inventory.toFixed(0)} units`} />
        <Stat label="1-Mo Forecast" value={`${risk.forecast_demand.toFixed(0)} units`} highlight />
        <Stat label="Lead Time Demand" value={`~${risk.lead_time_demand.toFixed(0)} units`} />
        <Stat label="Safety Buffer" value={`${risk.safety_stock.toFixed(0)} units`} />
      </div>

      {/* Suggested Replenishment Callout */}
      <div
        style={{
          ...styles.replenishBox,
          backgroundColor: risk.suggested_replenishment_qty > 0 ? "#eff6ff" : "var(--bg-subtle)",
          borderColor: risk.suggested_replenishment_qty > 0 ? "#bfdbfe" : "var(--border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
              Suggested Replenishment
            </span>
            <div style={{ fontSize: "19px", fontWeight: 800, color: risk.suggested_replenishment_qty > 0 ? "#1d4ed8" : "var(--text-primary)" }}>
              {risk.suggested_replenishment_qty > 0 ? `+${risk.suggested_replenishment_qty} units` : "0 units (Covered)"}
            </div>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Priority: <strong>{risk.stockout_severity}</strong>
          </span>
        </div>
      </div>

      {/* Explanation Box */}
      <div style={styles.reasonsBox}>
        <div style={styles.reasonsTitle}>Strategic Supply Assessment:</div>
        <p style={styles.reasonText}>{risk.strategic_explanation}</p>
        <div style={{ marginTop: "10px", fontSize: "11.5px", color: "var(--text-muted)" }}>
          {risk.assumptions[0]}
        </div>
      </div>
    </div>
  );
}

function PricingCard({ insight }) {
  const isReview = insight.pricing_review_recommended;

  return (
    <div className="card-base" style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <span style={styles.categoryBadge}>{insight.category}</span>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "17px", color: "var(--text-primary)" }}>
            {insight.category} Pricing Profile
          </h3>
        </div>
        <span className={`badge ${isReview ? "badge-warning" : "badge-primary"}`}>
          {insight.recommended_action}
        </span>
      </div>

      <div style={styles.statsGrid}>
        <Stat label="Average Unit Price" value={`$${insight.avg_unit_price.toFixed(2)}`} />
        <Stat label="Average Discount" value={`${insight.avg_discount_pct.toFixed(1)}%`} />
        <Stat label="Promotions / Month" value={`${insight.promo_days_avg.toFixed(1)} days`} />
        <Stat
          label="Empirical Promo Lift"
          value={insight.promo_volume_lift_pct !== null ? `+${insight.promo_volume_lift_pct}%` : "N/A"}
          highlight={insight.promo_volume_lift_pct !== null && insight.promo_volume_lift_pct > 15}
        />
      </div>

      <div style={{ ...styles.replenishBox, backgroundColor: isReview ? "#fffbeb" : "var(--bg-subtle)", borderColor: isReview ? "#fde68a" : "var(--border)" }}>
        <span style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", color: isReview ? "#92400e" : "var(--text-secondary)" }}>
          Recommendation Rationale:
        </span>
        <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.5" }}>
          {insight.rationale}
        </p>
      </div>

      <div style={styles.reasonsBox}>
        <div style={styles.reasonsTitle}>Observed Historical Facts:</div>
        {insight.empirical_observations.map((obs, i) => (
          <p key={i} style={styles.reasonText}>• {obs}</p>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: highlight ? "var(--primary)" : "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "Critical Stockout") {
    return <span className="badge badge-danger">Critical Stockout</span>;
  }
  if (status === "Reorder Required") {
    return <span className="badge badge-warning">Reorder Required</span>;
  }
  if (status === "Overstock") {
    return <span className="badge badge-warning">Overstock</span>;
  }
  return <span className="badge badge-success">Healthy</span>;
}

const styles = {
  prototypeNoticeBanner: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "var(--radius-md)",
    padding: "14px 18px",
    marginBottom: "20px",
  },
  badgeSynthetic: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#1d4ed8",
    backgroundColor: "#dbeafe",
    padding: "3px 8px",
    borderRadius: "4px",
  },
  badgeHorizon: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#0f766e",
    backgroundColor: "#ccfbf1",
    padding: "3px 8px",
    borderRadius: "4px",
  },
  badgeAdvisory: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#b45309",
    backgroundColor: "#fef3c7",
    padding: "3px 8px",
    borderRadius: "4px",
  },
  prototypeNoticeText: {
    margin: "8px 0 0 0",
    fontSize: "12.5px",
    color: "#1e3a8a",
    lineHeight: "1.5",
  },
  pageHeader: {
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
  headerControls: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  selectFilter: {
    padding: "8px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    outline: "none",
  },
  tabContainer: {
    display: "flex",
    gap: "8px",
    borderBottom: "1px solid var(--border)",
    paddingBottom: "12px",
    marginBottom: "24px",
  },
  tabActive: {
    padding: "9px 18px",
    fontSize: "13.5px",
    fontWeight: "700",
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tabInactive: {
    padding: "9px 18px",
    fontSize: "13.5px",
    fontWeight: "600",
    backgroundColor: "var(--bg-subtle)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "18px",
  },
  kpiCard: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  kpiLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  kpiValue: {
    fontSize: "28px",
    fontWeight: "800",
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
  kpiSub: {
    fontSize: "12px",
    color: "var(--text-muted)",
    marginTop: "2px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
  },
  card: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
  },
  categoryBadge: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--primary)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "18px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    backgroundColor: "var(--bg-subtle)",
    padding: "16px",
    borderRadius: "var(--radius-md)",
    marginBottom: "16px",
  },
  stat: { textAlign: "left" },
  statLabel: { fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" },
  statValue: { fontSize: "16px", fontWeight: "700", marginTop: "3px" },
  replenishBox: {
    border: "1px solid",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
    marginBottom: "16px",
  },
  reasonsBox: {
    borderTop: "1px solid var(--border)",
    paddingTop: "14px",
    marginTop: "auto",
  },
  reasonsTitle: {
    fontSize: "11.5px",
    fontWeight: "700",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    marginBottom: "6px",
    letterSpacing: "0.03em",
  },
  reasonText: {
    fontSize: "12.5px",
    color: "var(--text-secondary)",
    margin: "4px 0",
    lineHeight: "1.45",
  },
  tableHeaderSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid var(--border)",
    flexWrap: "wrap",
    gap: "16px",
  },
  controlsRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  searchInput: {
    padding: "8px 14px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    width: "220px",
    outline: "none",
  },
  tabRow: {
    display: "flex",
    gap: "8px",
    padding: "12px 24px",
    borderBottom: "1px solid var(--border)",
    backgroundColor: "var(--bg-subtle)",
    overflowX: "auto",
  },
  filterPill: {
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "600",
    borderRadius: "20px",
    border: "1px solid transparent",
    backgroundColor: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  filterPillActive: {
    backgroundColor: "var(--bg-card)",
    borderColor: "var(--border)",
    color: "var(--primary)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  assumptionsCard: {
    padding: "18px 20px",
    backgroundColor: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
  },
  pricingDisclaimerBanner: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "var(--radius-md)",
    padding: "16px 20px",
  },
  limitationsCard: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "var(--radius-lg)",
    padding: "20px 24px",
  },
};
