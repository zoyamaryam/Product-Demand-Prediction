import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getTrendingProducts, getCategoryTrends } from "../api";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

export default function Trends() {
  const [trending, setTrending] = useState(null);
  const [categories, setCategories] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const loadTrends = () => {
    setLoading(true);
    setError(null);
    Promise.all([getTrendingProducts(), getCategoryTrends()])
      .then(([trendingData, categoryData]) => {
        setTrending(trendingData);
        setCategories(categoryData);
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
    Promise.all([getTrendingProducts(), getCategoryTrends()])
      .then(([trendingData, categoryData]) => {
        if (isMounted) {
          setTrending(trendingData);
          setCategories(categoryData);
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
    return <LoadingState message="Calculating month-over-month and annual growth velocity..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Sales Velocity & Trends"
        message={error}
        onRetry={loadTrends}
      />
    );
  }


  if (!trending || !categories) return null;

  // Filter products by search query and category
  const matchesFilter = (p) => {
    const matchesText = p.product_name.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesCat =
      selectedCategory === "all" ||
      (p.product_category && p.product_category.toLowerCase() === selectedCategory.toLowerCase());
    return matchesText && matchesCat;
  };

  const filteredUp = (trending.trending_up || []).filter(matchesFilter);
  const filteredDown = (trending.trending_down || []).filter(matchesFilter);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={{ margin: 0 }}>Sales Velocity & Product Trends</h1>
          <p style={styles.subtitle}>
            Comparing active sales volume in <strong>{trending.latest_month}</strong> against prior period{" "}
            <strong>{trending.prior_month}</strong>.
          </p>
        </div>
        <div style={styles.filtersGroup}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={styles.selectInput}
            aria-label="Filter by Category"
          >
            <option value="all">All Categories</option>
            <option value="Beauty">Beauty</option>
            <option value="Clothing">Clothing</option>
            <option value="Electronics">Electronics</option>
            <option value="Home">Home</option>
          </select>
          <input
            type="text"
            placeholder="Filter products..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={styles.searchInput}
            aria-label="Search products"
          />
        </div>
      </div>

      {/* Category Annual Growth Chart */}
      <div className="card-base" style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px" }}>Category Year-over-Year Momentum</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
              Annual compound volume trajectory across retail categories
            </p>
          </div>
          <span className="badge badge-primary">YoY Growth %</span>
        </div>

        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories} margin={{ top: 15, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="category" stroke="#475569" fontSize={13} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                formatter={(val) => [`${val}%`, "YoY Growth"]}
                contentStyle={styles.tooltipBox}
              />
              <Bar dataKey="yoy_growth_pct" radius={[6, 6, 0, 0]}>
                {categories.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.yoy_growth_pct >= 0 ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Product Trend Tables */}
      <div className="two-col-grid-responsive">
        {/* Trending Up */}
        <div className="card-base" style={{ overflow: "hidden" }}>
          <div style={{ ...styles.cardTitleBar, borderBottom: "2px solid #10b981" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={styles.upDot}>▲</span>
              <h3 style={{ margin: 0, fontSize: "15px", color: "var(--text-primary)" }}>
                Fastest Accelerating Products
              </h3>
            </div>
            <span className="badge badge-success">MoM Momentum</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Sector</th>
                  <th>{trending.latest_month}</th>
                  <th>{trending.prior_month}</th>
                  <th>MoM Delta</th>
                </tr>
              </thead>
              <tbody>
                {filteredUp.map((item) => (
                  <tr key={item.product_name}>
                    <td><strong>{item.product_name}</strong></td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: "11px" }}>
                        {item.product_category || "Retail"}
                      </span>
                    </td>
                    <td>{item.latest} units</td>
                    <td style={{ color: "var(--text-muted)" }}>{item.prior}</td>
                    <td>
                      <span className="badge badge-success">
                        +{item.growth_pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredUp.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                      No matching accelerating products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trending Down */}
        <div className="card-base" style={{ overflow: "hidden" }}>
          <div style={{ ...styles.cardTitleBar, borderBottom: "2px solid #ef4444" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={styles.downDot}>▼</span>
              <h3 style={{ margin: 0, fontSize: "15px", color: "var(--text-primary)" }}>
                Decelerating / Declining Products
              </h3>
            </div>
            <span className="badge badge-danger">Contraction Watch</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Sector</th>
                  <th>{trending.latest_month}</th>
                  <th>{trending.prior_month}</th>
                  <th>MoM Delta</th>
                </tr>
              </thead>
              <tbody>
                {filteredDown.map((item) => (
                  <tr key={item.product_name}>
                    <td><strong>{item.product_name}</strong></td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: "11px" }}>
                        {item.product_category || "Retail"}
                      </span>
                    </td>
                    <td>{item.latest} units</td>
                    <td style={{ color: "var(--text-muted)" }}>{item.prior}</td>
                    <td>
                      <span className="badge badge-danger">
                        {item.growth_pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredDown.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                      No matching decelerating products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
    marginBottom: "24px",
    gap: "20px",
    flexWrap: "wrap",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    marginTop: "6px",
  },
  filtersGroup: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  selectInput: {
    padding: "8px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    fontSize: "13.5px",
    backgroundColor: "#ffffff",
    color: "var(--text-primary)",
    outline: "none",
    cursor: "pointer",
  },
  searchInput: {
    padding: "8px 14px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    fontSize: "13.5px",
    width: "200px",
    outline: "none",
    backgroundColor: "#ffffff",
  },
  chartCard: {
    padding: "24px",
    marginBottom: "28px",
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "24px",
  },
  cardTitleBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    backgroundColor: "#ffffff",
  },
  upDot: {
    color: "#10b981",
    fontSize: "14px",
    fontWeight: "800",
  },
  downDot: {
    color: "#ef4444",
    fontSize: "14px",
    fontWeight: "800",
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
};