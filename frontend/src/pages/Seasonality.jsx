import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getSeasonality } from "../api";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

const MONTH_NAMES = {
  "1": "Jan", "2": "Feb", "3": "Mar", "4": "Apr", "5": "May", "6": "Jun",
  "7": "Jul", "8": "Aug", "9": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

export default function Seasonality() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const loadSeasonality = (cat = selectedCategory) => {
    setLoading(true);
    setError(null);
    getSeasonality(cat === "all" ? null : cat)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
  };

  useEffect(() => {
    let isMounted = true;
    getSeasonality(selectedCategory === "all" ? null : selectedCategory)
      .then((res) => {
        if (isMounted) {
          setData(res);
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
  }, [selectedCategory]);


  if (loading && !data) {
    return <LoadingState message="Analyzing calendar cyclicality and holiday lift metrics..." />;
  }

  // Overlay spinner for category refetch (data already exists)
  const isRefetching = loading && !!data;

  if (error && !data) {
    return (
      <ErrorState
        title="Failed to Load Seasonality Metrics"
        message={error}
        onRetry={() => loadSeasonality(selectedCategory)}
      />
    );
  }



  const monthData = data?.by_month
    ? Object.entries(data.by_month)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([month, avg]) => ({ month: MONTH_NAMES[month] || month, avgDemand: avg }))
    : [];

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayData = data?.by_day_of_week
    ? dayOrder
        .filter((day) => data.by_day_of_week[day] !== undefined)
        .map((day) => ({ day: day.slice(0, 3), avgDemand: data.by_day_of_week[day] }))
    : [];

  const seasonData = data?.by_season
    ? Object.entries(data.by_season).map(([season, avg]) => ({
        season,
        avgDemand: avg,
      }))
    : [];

  const holidayLift =
    data && data.normal_avg_demand > 0
      ? (((data.holiday_avg_demand - data.normal_avg_demand) / data.normal_avg_demand) * 100).toFixed(1)
      : 0;

  return (
    <div className="animate-fade-in" style={{ position: "relative" }}>
      {isRefetching && (
        <div style={styles.refetchOverlay}>
          <div style={styles.spinner} />
        </div>
      )}
      {/* Header with Sector Filter */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={{ margin: 0 }}>Seasonality & Cyclicality Analysis</h1>
          <p style={styles.subtitle}>
            Historical demand distribution across months, days of the week, weather seasons, and holiday events.
          </p>
        </div>

        <div style={styles.categoryFilter}>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Filter Category:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={loading}
            style={styles.select}
            aria-label="Filter seasonality by category"
          >
            <option value="all">All Sectors Combined</option>
            <option value="Beauty">Beauty Sector</option>
            <option value="Clothing">Clothing Sector</option>
            <option value="Electronics">Electronics Sector</option>
            <option value="Home">Home Goods Sector</option>
          </select>
        </div>
      </div>

      {/* Month of Year Trajectory */}
      <ChartCard
        title={`Average Unit Demand by Month (${selectedCategory === "all" ? "All Categories" : selectedCategory})`}
        subtitle="Identifies peak annual purchasing cycles and mid-year inventory dips"
      >
        <BarChart data={monthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="month" stroke="#475569" fontSize={12} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(val) => [`${val} units`, "Avg Demand"]}
            contentStyle={styles.tooltipBox}
          />
          <Bar dataKey="avgDemand" fill="#2563eb" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartCard>

      {/* Day of Week & Season Grid */}
      <div className="two-col-grid-responsive">
        <ChartCard
          title="Demand by Day of Week"
          subtitle="Monitors weekend spikes vs mid-week baseline ordering"
        >
          <BarChart data={dayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="day" stroke="#475569" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(val) => [`${val} units`, "Avg Demand"]}
              contentStyle={styles.tooltipBox}
            />
            <Bar dataKey="avgDemand" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Demand by Meteorological Season"
          subtitle="Aggregates seasonal shifts (Autumn, Spring, Summer, Winter)"
        >
          <BarChart data={seasonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="season" stroke="#475569" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(val) => [`${val} units`, "Avg Demand"]}
              contentStyle={styles.tooltipBox}
            />
            <Bar dataKey="avgDemand" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      {/* Holiday Lift Benchmark Cards */}
      <div style={styles.compareRow}>
        <div className="card-base" style={styles.compareCard}>
          <div style={styles.compareLabel}>Holiday Average Demand</div>
          <div style={{ ...styles.compareValue, color: "var(--primary)" }}>
            {data?.holiday_avg_demand} <span style={{ fontSize: "14px", fontWeight: 500 }}>units/day</span>
          </div>
          <span style={styles.compareSub}>Promotions, Festivals & Special Event Days</span>
        </div>

        <div className="card-base" style={styles.compareCard}>
          <div style={styles.compareLabel}>Standard Day Average Demand</div>
          <div style={styles.compareValue}>
            {data?.normal_avg_demand} <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-muted)" }}>units/day</span>
          </div>
          <span style={styles.compareSub}>Typical baseline business days</span>
        </div>

        <div className="card-base" style={styles.compareCard}>
          <div style={styles.compareLabel}>Holiday Surge Delta</div>
          <div style={{ ...styles.compareValue, color: Number(holidayLift) >= 0 ? "#10b981" : "#ef4444" }}>
            {Number(holidayLift) >= 0 ? `+${holidayLift}%` : `${holidayLift}%`}
          </div>
          <span style={styles.compareSub}>Net change during promotional holiday windows</span>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card-base" style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>{title}</h3>
        {subtitle && <p style={styles.cardSubtitle}>{subtitle}</p>}
      </div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
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
  refetchOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    backgroundColor: "rgba(248, 250, 252, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-lg)",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    marginTop: "6px",
  },
  categoryFilter: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "var(--bg-surface)",
    padding: "8px 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
  },
  select: {
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-primary)",
    backgroundColor: "#ffffff",
    outline: "none",
    cursor: "pointer",
  },
  card: {
    padding: "24px",
    marginBottom: "24px",
  },
  cardHeader: {
    marginBottom: "16px",
  },
  cardTitle: {
    fontSize: "15.5px",
    fontWeight: "700",
    margin: 0,
  },
  cardSubtitle: {
    fontSize: "12.5px",
    color: "var(--text-secondary)",
    marginTop: "4px",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
    gap: "24px",
    marginBottom: "24px",
  },
  compareRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
  },
  compareCard: {
    padding: "22px",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
  },
  compareLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    marginBottom: "8px",
  },
  compareValue: {
    fontSize: "26px",
    fontWeight: "800",
    color: "var(--text-primary)",
    marginBottom: "6px",
  },
  compareSub: {
    fontSize: "12px",
    color: "var(--text-secondary)",
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