import { useState, useEffect } from "react";
import { predictCustom, getCategoryDefaults, predictBatch } from "../api";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

const CATEGORIES = ["Beauty", "Clothing", "Electronics", "Home"];

const MONTH_NAMES = [
  "January (1)",
  "February (2)",
  "March (3)",
  "April (4)",
  "May (5)",
  "June (6)",
  "July (7)",
  "August (8)",
  "September (9)",
  "October (10)",
  "November (11)",
  "December (12)",
];

const INITIAL_BATCH_ITEMS = [
  {
    request_id: "BATCH-SCENARIO-BEAUTY",
    category: "Beauty",
    month_num: 1,
    avg_price: 32.5,
    promo_days: 4,
    holiday_days: 1,
    lag1: 145.0,
    lag2: 138.0,
    rolling3: 140.0,
    current_inventory: 120,
  },
  {
    request_id: "BATCH-SCENARIO-CLOTHING",
    category: "Clothing",
    month_num: 1,
    avg_price: 49.99,
    promo_days: 5,
    holiday_days: 2,
    lag1: 210.0,
    lag2: 195.0,
    rolling3: 200.0,
    current_inventory: 250,
  },
  {
    request_id: "BATCH-SCENARIO-ELECTR",
    category: "Electronics",
    month_num: 1,
    avg_price: 85.0,
    promo_days: 6,
    holiday_days: 1,
    lag1: 175.0,
    lag2: 160.0,
    rolling3: 168.0,
    current_inventory: 90,
  },
  {
    request_id: "BATCH-SCENARIO-HOME",
    category: "Home",
    month_num: 1,
    avg_price: 64.0,
    promo_days: 3,
    holiday_days: 1,
    lag1: 130.0,
    lag2: 125.0,
    rolling3: 128.0,
    current_inventory: 140,
  },
];

export default function PredictDemand() {
  const [activeTab, setActiveTab] = useState("single"); // "single" | "batch"

  // ----------------------------------------------------
  // Single Prediction State
  // ----------------------------------------------------
  const [category, setCategory] = useState("Clothing");
  const [formData, setFormData] = useState({
    month_num: 9,
    avg_price: 49.99,
    promo_days: 5,
    holiday_days: 2,
    lag1: 120,
    lag2: 110,
    rolling3: 115,
    current_inventory: 100,
  });

  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // ----------------------------------------------------
  // Batch Prediction State
  // ----------------------------------------------------
  const [batchItems, setBatchItems] = useState(INITIAL_BATCH_ITEMS);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResponse, setBatchResponse] = useState(null);
  const [batchError, setBatchError] = useState(null);

  // Fetch baseline historical defaults when category changes (single tab)
  const fetchDefaultsForCategory = (cat) => {
    setLoadingDefaults(true);
    setApiError(null);
    getCategoryDefaults(cat)
      .then((data) => {
        if (data) {
          setFormData({
            month_num: data.month_num ?? 9,
            avg_price: data.avg_price ?? 50.0,
            promo_days: data.promo_days ?? 0,
            holiday_days: data.holiday_days ?? 0,
            lag1: data.lag1 ?? 100,
            lag2: data.lag2 ?? 100,
            rolling3: data.rolling3 ?? 100,
            current_inventory: data.current_inventory ?? 150,
          });
        }
      })
      .catch((err) => {
        console.warn("Could not load category defaults:", err);
      })
      .finally(() => {
        setLoadingDefaults(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    getCategoryDefaults("Clothing")
      .then((data) => {
        if (isMounted && data) {
          setFormData({
            month_num: data.month_num ?? 9,
            avg_price: data.avg_price ?? 50.0,
            promo_days: data.promo_days ?? 0,
            holiday_days: data.holiday_days ?? 0,
            lag1: data.lag1 ?? 100,
            lag2: data.lag2 ?? 100,
            rolling3: data.rolling3 ?? 100,
            current_inventory: data.current_inventory ?? 150,
          });
        }
      })
      .catch((err) => {
        if (isMounted) console.warn("Could not load initial defaults:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingDefaults(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setCategory(newCat);
    fetchDefaultsForCategory(newCat);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const errors = {};
    if (!category) errors.category = "Category is required.";

    const monthNum = parseInt(formData.month_num, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      errors.month_num = "Month must be between 1 and 12.";
    }

    const price = parseFloat(formData.avg_price);
    if (isNaN(price) || price <= 0) {
      errors.avg_price = "Average unit price must be greater than 0.";
    }

    const monthMaxDays = {
      1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30,
      7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
    };
    const maxDays = monthMaxDays[monthNum] || 31;

    const promo = parseInt(formData.promo_days, 10);
    if (isNaN(promo) || promo < 0 || promo > maxDays) {
      errors.promo_days = `Promo days must be between 0 and ${maxDays} for selected month.`;
    }

    const holiday = parseInt(formData.holiday_days, 10);
    if (isNaN(holiday) || holiday < 0 || holiday > maxDays) {
      errors.holiday_days = `Holiday days must be between 0 and ${maxDays} for selected month.`;
    }

    const l1 = parseFloat(formData.lag1);
    if (isNaN(l1) || l1 < 0) {
      errors.lag1 = "Lag 1 volume cannot be negative.";
    }

    const l2 = parseFloat(formData.lag2);
    if (isNaN(l2) || l2 < 0) {
      errors.lag2 = "Lag 2 volume cannot be negative.";
    }

    if (formData.rolling3 !== "" && formData.rolling3 !== null) {
      const r3 = parseFloat(formData.rolling3);
      if (isNaN(r3) || r3 < 0) {
        errors.rolling3 = "Rolling 3-month volume cannot be negative.";
      }
    }

    if (formData.current_inventory !== "" && formData.current_inventory !== null) {
      const inv = parseInt(formData.current_inventory, 10);
      if (isNaN(inv) || inv < 0) {
        errors.current_inventory = "Inventory cannot be negative.";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setPredicting(true);
    setApiError(null);

    const payload = {
      category,
      month_num: parseInt(formData.month_num, 10),
      avg_price: parseFloat(formData.avg_price),
      promo_days: parseInt(formData.promo_days, 10),
      holiday_days: parseInt(formData.holiday_days, 10),
      lag1: parseFloat(formData.lag1),
      lag2: parseFloat(formData.lag2),
      rolling3:
        formData.rolling3 !== "" && formData.rolling3 !== null
          ? parseFloat(formData.rolling3)
          : (parseFloat(formData.lag1) + parseFloat(formData.lag2)) / 2,
      current_inventory:
        formData.current_inventory !== "" && formData.current_inventory !== null
          ? parseInt(formData.current_inventory, 10)
          : null,
      request_id: `SIM-${category.toUpperCase()}-${Date.now().toString().slice(-4)}`,
    };

    try {
      const res = await predictCustom(payload);
      setPredictionResult(res);
    } catch (err) {
      setApiError(err.message || "Failed to execute custom ML prediction.");
    } finally {
      setPredicting(false);
    }
  };

  // ----------------------------------------------------
  // Batch Operations
  // ----------------------------------------------------
  const handleBatchFieldChange = (index, field, value) => {
    setBatchItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddBatchRow = (cat = "Clothing") => {
    setBatchItems((prev) => [
      ...prev,
      {
        request_id: `BATCH-${cat.toUpperCase()}-${prev.length + 1}`,
        category: cat,
        month_num: 1,
        avg_price: 50.0,
        promo_days: 0,
        holiday_days: 0,
        lag1: 150.0,
        lag2: 140.0,
        rolling3: 145.0,
        current_inventory: 150,
      },
    ]);
  };

  const handleAddInvalidTestRow = () => {
    setBatchItems((prev) => [
      ...prev,
      {
        request_id: `TEST-INVALID-SECTOR-${prev.length + 1}`,
        category: "InvalidCategory",
        month_num: 1,
        avg_price: 99.0,
        promo_days: 2,
        holiday_days: 0,
        lag1: 100,
        lag2: 100,
        rolling3: 100,
        current_inventory: 50,
      },
    ]);
  };

  const handleRemoveBatchRow = (index) => {
    setBatchItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchSubmit = async () => {
    if (batchItems.length === 0) {
      setBatchError("Please include at least one scenario item in the batch.");
      return;
    }

    setBatchRunning(true);
    setBatchError(null);

    const payloadItems = batchItems.map((item, idx) => ({
      request_id: item.request_id || `REQ-ITEM-${idx + 1}`,
      category: item.category,
      month_num: parseInt(item.month_num, 10),
      avg_price: parseFloat(item.avg_price),
      promo_days: parseInt(item.promo_days, 10),
      holiday_days: parseInt(item.holiday_days, 10),
      lag1: parseFloat(item.lag1),
      lag2: parseFloat(item.lag2),
      rolling3:
        item.rolling3 !== "" && item.rolling3 !== null
          ? parseFloat(item.rolling3)
          : (parseFloat(item.lag1) + parseFloat(item.lag2)) / 2,
      current_inventory:
        item.current_inventory !== "" && item.current_inventory !== null
          ? parseInt(item.current_inventory, 10)
          : null,
    }));

    try {
      const res = await predictBatch({ items: payloadItems });
      setBatchResponse(res);
    } catch (err) {
      setBatchError(err.message || "Failed to execute batch prediction API.");
    } finally {
      setBatchRunning(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: "40px" }}>
      {/* Synthetic Dataset Notice Banner */}
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
          <strong>Synthetic Prototype Inference:</strong> Predictions are generated by persisting trained XGBoost models (version <code>v2.0.0</code>) loaded directly from disk via FastAPI. Inputs map to validated ML features.
        </div>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Predict Demand</h1>
          <p style={styles.subtitle}>
            Interactive ML inference engine powered by category-specific trained XGBoost models.
            Simulate commercial levers (promotions, price, lags) and assess immediate stockout and replenishment needs.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.metaBadge}>Engine: XGBoost Regressor</span>
          <span style={styles.metaBadgeOutline}>Features: 7 Regressors</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={styles.tabContainer}>
        <button
          type="button"
          onClick={() => setActiveTab("single")}
          style={activeTab === "single" ? styles.tabActive : styles.tabInactive}
        >
          ⚡ Single Scenario Simulator
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("batch")}
          style={activeTab === "batch" ? styles.tabActive : styles.tabInactive}
        >
          📋 Multi-Category Batch Comparison
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: SINGLE SCENARIO SIMULATOR */}
      {/* ==================================================== */}
      {activeTab === "single" && (
        <>
          {apiError && (
            <div style={{ marginBottom: "24px" }}>
              <ErrorState
                title="Inference Error"
                message={apiError}
                onRetry={handleSubmit}
              />
            </div>
          )}

          <div style={styles.mainGrid}>
            {/* Form Container */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardHeaderLeft}>
                  <div style={styles.iconCircle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div>
                    <h2 style={styles.cardTitle}>Inference Parameters</h2>
                    <p style={styles.cardSubtitle}>
                      Features fed directly to the trained XGBoost model pipeline
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fetchDefaultsForCategory(category)}
                  disabled={loadingDefaults || predicting}
                  style={styles.resetBtn}
                  title="Reload actual historical baseline values for this category"
                >
                  {loadingDefaults ? "Loading..." : "↺ Reset to Baseline"}
                </button>
              </div>

              <form onSubmit={handleSubmit} style={styles.form}>
                {/* Category Selector */}
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="cat-select">
                    Product Category <span style={styles.required}>*</span>
                  </label>
                  <select
                    id="cat-select"
                    value={category}
                    onChange={handleCategoryChange}
                    style={styles.select}
                    disabled={predicting}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <span style={styles.helpText}>
                    Loads dedicated model: <code>model_{category}.pkl</code>
                  </span>
                </div>

                {/* Target Month & Unit Price */}
                <div style={styles.twoCol}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="month-select">
                      Target Prediction Month <span style={styles.required}>*</span>
                    </label>
                    <select
                      id="month-select"
                      value={formData.month_num}
                      onChange={(e) => handleInputChange("month_num", parseInt(e.target.value, 10))}
                      style={styles.select}
                      disabled={predicting}
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.month_num && (
                      <span style={styles.errorText}>{validationErrors.month_num}</span>
                    )}
                    <span style={styles.helpText}>Feature: <code>month_num</code> (1-12)</span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="price-input">
                      Average Price ($) <span style={styles.required}>*</span>
                    </label>
                    <input
                      id="price-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.avg_price}
                      onChange={(e) => handleInputChange("avg_price", e.target.value)}
                      style={validationErrors.avg_price ? styles.inputError : styles.input}
                      disabled={predicting}
                      placeholder="e.g. 49.99"
                    />
                    {validationErrors.avg_price && (
                      <span style={styles.errorText}>{validationErrors.avg_price}</span>
                    )}
                    <span style={styles.helpText}>Feature: <code>avg_price</code></span>
                  </div>
                </div>

                {/* Promo Days & Holiday Days */}
                <div style={styles.twoCol}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="promo-input">
                      Promotional Days in Month
                    </label>
                    <input
                      id="promo-input"
                      type="number"
                      min="0"
                      max="31"
                      value={formData.promo_days}
                      onChange={(e) => handleInputChange("promo_days", e.target.value)}
                      style={validationErrors.promo_days ? styles.inputError : styles.input}
                      disabled={predicting}
                      placeholder="0 to 31"
                    />
                    {validationErrors.promo_days && (
                      <span style={styles.errorText}>{validationErrors.promo_days}</span>
                    )}
                    <span style={styles.helpText}>Feature: <code>promo_days</code></span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="holiday-input">
                      Holidays in Month
                    </label>
                    <input
                      id="holiday-input"
                      type="number"
                      min="0"
                      max="31"
                      value={formData.holiday_days}
                      onChange={(e) => handleInputChange("holiday_days", e.target.value)}
                      style={validationErrors.holiday_days ? styles.inputError : styles.input}
                      disabled={predicting}
                      placeholder="0 to 31"
                    />
                    {validationErrors.holiday_days && (
                      <span style={styles.errorText}>{validationErrors.holiday_days}</span>
                    )}
                    <span style={styles.helpText}>Feature: <code>holiday_days</code></span>
                  </div>
                </div>

                {/* Historical Lags */}
                <div style={styles.sectionDivider}>
                  <span style={styles.dividerLabel}>Historical Demand Autoregressive Lags</span>
                </div>

                <div style={styles.threeCol}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="lag1-input">
                      Prior Month (t-1) <span style={styles.required}>*</span>
                    </label>
                    <input
                      id="lag1-input"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.lag1}
                      onChange={(e) => handleInputChange("lag1", e.target.value)}
                      style={validationErrors.lag1 ? styles.inputError : styles.input}
                      disabled={predicting}
                      placeholder="e.g. 120"
                    />
                    {validationErrors.lag1 && (
                      <span style={styles.errorText}>{validationErrors.lag1}</span>
                    )}
                    <span style={styles.helpText}>Feature: <code>lag1</code></span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="lag2-input">
                      2 Months Ago (t-2) <span style={styles.required}>*</span>
                    </label>
                    <input
                      id="lag2-input"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.lag2}
                      onChange={(e) => handleInputChange("lag2", e.target.value)}
                      style={validationErrors.lag2 ? styles.inputError : styles.input}
                      disabled={predicting}
                      placeholder="e.g. 110"
                    />
                    {validationErrors.lag2 && (
                      <span style={styles.errorText}>{validationErrors.lag2}</span>
                    )}
                    <span style={styles.helpText}>Feature: <code>lag2</code></span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="rolling3-input">
                      3-Mo Rolling Avg
                    </label>
                    <input
                      id="rolling3-input"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.rolling3}
                      onChange={(e) => handleInputChange("rolling3", e.target.value)}
                      style={validationErrors.rolling3 ? styles.inputError : styles.input}
                      disabled={predicting}
                      placeholder="Auto-calculated"
                    />
                    {validationErrors.rolling3 && (
                      <span style={styles.errorText}>{validationErrors.rolling3}</span>
                    )}
                    <span style={styles.helpText}>Feature: <code>rolling3</code></span>
                  </div>
                </div>

                {/* Inventory Section */}
                <div style={styles.sectionDivider}>
                  <span style={styles.dividerLabel}>Operational Inventory Context</span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="inventory-input">
                    Current Stock On Hand (Units)
                  </label>
                  <input
                    id="inventory-input"
                    type="number"
                    min="0"
                    value={formData.current_inventory}
                    onChange={(e) => handleInputChange("current_inventory", e.target.value)}
                    style={validationErrors.current_inventory ? styles.inputError : styles.input}
                    disabled={predicting}
                    placeholder="Optional — for stockout & reorder analysis"
                  />
                  {validationErrors.current_inventory && (
                    <span style={styles.errorText}>{validationErrors.current_inventory}</span>
                  )}
                  <span style={styles.helpText}>
                    Computes shortage/surplus metrics and safety buffer reorder recommendations.
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={styles.formActions}>
                  <button
                    type="submit"
                    disabled={predicting}
                    className="btn-primary"
                    style={styles.submitBtn}
                  >
                    {predicting ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        Running XGBoost Model...
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        Predict Demand
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Results Container */}
            <div style={styles.resultsWrapper}>
              {predicting && (
                <div style={styles.placeholderCard}>
                  <LoadingState message="Executing XGBoost inference and calculating inventory risk buffers..." />
                </div>
              )}

              {!predicting && !predictionResult && (
                <div style={styles.placeholderCard}>
                  <div style={styles.placeholderIcon}>⚡</div>
                  <h3 style={styles.placeholderTitle}>Ready for Prediction</h3>
                  <p style={styles.placeholderText}>
                    Select a category, configure the target parameters or keep the baseline defaults, and click{" "}
                    <strong>&quot;Predict Demand&quot;</strong> to run real-time inference against the trained ML model.
                  </p>
                  <div style={styles.placeholderSteps}>
                    <div style={styles.stepItem}>
                      <span style={styles.stepNum}>1</span>
                      <span>Form inputs map to trained features</span>
                    </div>
                    <div style={styles.stepItem}>
                      <span style={styles.stepNum}>2</span>
                      <span>FastAPI loads category model from disk</span>
                    </div>
                    <div style={styles.stepItem}>
                      <span style={styles.stepNum}>3</span>
                      <span>Displays demand &amp; stock recommendations</span>
                    </div>
                  </div>
                </div>
              )}

              {!predicting && predictionResult && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Primary Output KPI Card */}
                  <div style={styles.resultCard}>
                    <div style={styles.resultHeader}>
                      <div>
                        <span style={styles.badgeCategory}>{predictionResult.category}</span>
                        <h3 style={styles.resultTitle}>Demand Forecast (Cycle: 2025-01 Historical Prototype)</h3>
                      </div>
                      <span style={styles.liveModelBadge}>
                        <span style={styles.dotPulse} /> {predictionResult.model_used || "XGBoost Regressor"} ({predictionResult.model_version || "v2.0.0"})
                      </span>
                    </div>

                    <div style={styles.mainNumberRow}>
                      <div style={styles.predictionNumber}>
                        {predictionResult.predicted_demand.toLocaleString()}{" "}
                        <span style={styles.unitLabel}>units / month</span>
                      </div>
                    </div>

                    {/* Confidence Interval */}
                    {predictionResult.confidence_range && (
                      <div style={styles.confidenceBox}>
                        <div style={styles.confidenceRow}>
                          <span style={styles.confidenceLabel}>95% Parametric Prediction Interval:</span>
                          <strong style={styles.confidenceVal}>
                            {predictionResult.confidence_range.lower} – {predictionResult.confidence_range.upper} units
                          </strong>
                        </div>
                        <p style={styles.confidenceNote}>
                          Statistically calibrated from out-of-sample hold-out test RMSE (σ = {(
                            (predictionResult.confidence_range.upper - predictionResult.predicted_demand) / 1.96
                          ).toFixed(1)} units) achieving ~91%–97% empirical coverage across categories (±1.96σ).
                        </p>
                      </div>
                    )}

                    {/* Features Echo */}
                    <div style={styles.featuresList}>
                      <div style={styles.featureItem}>
                        <span style={styles.fName}>Price</span>
                        <strong style={styles.fVal}>${predictionResult.features_used.avg_price}</strong>
                      </div>
                      <div style={styles.featureItem}>
                        <span style={styles.fName}>Month</span>
                        <strong style={styles.fVal}>M{predictionResult.features_used.month_num}</strong>
                      </div>
                      <div style={styles.featureItem}>
                        <span style={styles.fName}>Promo Days</span>
                        <strong style={styles.fVal}>{predictionResult.features_used.promo_days}d</strong>
                      </div>
                      <div style={styles.featureItem}>
                        <span style={styles.fName}>Lag 1 (t-1)</span>
                        <strong style={styles.fVal}>{predictionResult.features_used.lag1}</strong>
                      </div>
                      <div style={styles.featureItem}>
                        <span style={styles.fName}>Lag 2 (t-2)</span>
                        <strong style={styles.fVal}>{predictionResult.features_used.lag2}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Inventory Shortage & Reorder Calculations */}
                  {predictionResult.inventory_analysis ? (
                    <div style={styles.inventoryCard}>
                      <div style={styles.invHeader}>
                        <div>
                          <span style={styles.calcBadge}>Rule-Based Inventory Calculations</span>
                          <h4 style={styles.invTitle}>Inventory Shortage &amp; Reorder Plan</h4>
                        </div>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(predictionResult.inventory_analysis.status.includes("Stockout") ||
                            predictionResult.inventory_analysis.status.includes("Reorder")
                              ? styles.statusDanger
                              : styles.statusSuccess),
                          }}
                        >
                          {predictionResult.inventory_analysis.status}
                        </span>
                      </div>

                      <div style={styles.invGrid}>
                        <div style={styles.invStat}>
                          <span style={styles.invLabel}>On-Hand Stock</span>
                          <span style={styles.invValue}>
                            {predictionResult.inventory_analysis.current_inventory} units
                          </span>
                        </div>

                        <div style={styles.invStat}>
                          <span style={styles.invLabel}>
                            {predictionResult.inventory_analysis.variance < 0 ? "Projected Shortage" : "Projected Surplus"}
                          </span>
                          <span
                            style={{
                              ...styles.invValue,
                              color:
                                predictionResult.inventory_analysis.variance < 0
                                  ? "var(--danger)"
                                  : "var(--success)",
                            }}
                          >
                            {predictionResult.inventory_analysis.variance < 0
                              ? `-${predictionResult.inventory_analysis.shortage_qty} units`
                              : `+${predictionResult.inventory_analysis.surplus_qty} units`}
                          </span>
                        </div>

                        <div style={styles.invStat}>
                          <span style={styles.invLabel}>Safety Buffer (20%)</span>
                          <span style={styles.invValue}>
                            +{predictionResult.inventory_analysis.safety_buffer} units
                          </span>
                        </div>

                        <div style={styles.invStatHighlight}>
                          <span style={styles.invLabelHighlight}>Recommended Reorder</span>
                          <span style={styles.invValueHighlight}>
                            {predictionResult.inventory_analysis.recommended_reorder > 0
                              ? `${predictionResult.inventory_analysis.recommended_reorder} units`
                              : "0 units (Covered)"}
                          </span>
                        </div>
                      </div>

                      {/* Plain Language Explanation */}
                      <div style={styles.explanationBox}>
                        <p style={styles.explanationText}>
                          {predictionResult.inventory_analysis.explanation}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.infoBanner}>
                      💡 <strong>Note:</strong> Enter current on-hand inventory units in the form above to view
                      automated stockout warnings, safety buffer requirements, and reorder suggestions.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================================================== */}
      {/* TAB 2: MULTI-CATEGORY BATCH COMPARISON */}
      {/* ==================================================== */}
      {activeTab === "batch" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {batchError && (
            <ErrorState
              title="Batch Execution Failed"
              message={batchError}
              onRetry={handleBatchSubmit}
            />
          )}

          {/* Batch Configuration Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardHeaderLeft}>
                <div style={styles.iconCircle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div>
                  <h2 style={styles.cardTitle}>Batch Scenario Matrix</h2>
                  <p style={styles.cardSubtitle}>
                    Configure multiple category scenarios to forecast simultaneously via <code>POST /api/predict/batch</code>.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleAddBatchRow("Clothing")}
                  disabled={batchRunning}
                  style={styles.batchBtnSecondary}
                >
                  + Add Scenario
                </button>
                <button
                  type="button"
                  onClick={handleAddInvalidTestRow}
                  disabled={batchRunning}
                  style={styles.batchBtnWarning}
                  title="Adds an invalid category row to demonstrate item-level partial success and error isolation"
                >
                  ⚠️ Add Error-Test Row
                </button>
              </div>
            </div>

            {/* Editable Batch Table */}
            <div style={{ overflowX: "auto", marginBottom: "20px" }}>
              <table style={styles.batchTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Request ID</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Month</th>
                    <th style={styles.th}>Price ($)</th>
                    <th style={styles.th}>Promo / Hol</th>
                    <th style={styles.th}>Lag 1 / Lag 2</th>
                    <th style={styles.th}>Rolling 3</th>
                    <th style={styles.th}>Stock</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batchItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={styles.td}>
                        <input
                          type="text"
                          value={item.request_id}
                          onChange={(e) => handleBatchFieldChange(idx, "request_id", e.target.value)}
                          style={styles.tableInputSmall}
                          disabled={batchRunning}
                        />
                      </td>
                      <td style={styles.td}>
                        <select
                          value={item.category}
                          onChange={(e) => handleBatchFieldChange(idx, "category", e.target.value)}
                          style={styles.tableSelect}
                          disabled={batchRunning}
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          {item.category === "InvalidCategory" && (
                            <option value="InvalidCategory">InvalidCategory (Test)</option>
                          )}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <select
                          value={item.month_num}
                          onChange={(e) =>
                            handleBatchFieldChange(idx, "month_num", parseInt(e.target.value, 10))
                          }
                          style={styles.tableSelect}
                          disabled={batchRunning}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              M{i + 1}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          step="0.1"
                          value={item.avg_price}
                          onChange={(e) => handleBatchFieldChange(idx, "avg_price", e.target.value)}
                          style={styles.tableInputSmall}
                          disabled={batchRunning}
                        />
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <input
                            type="number"
                            title="Promo Days"
                            placeholder="Promo"
                            value={item.promo_days}
                            onChange={(e) => handleBatchFieldChange(idx, "promo_days", e.target.value)}
                            style={styles.tableInputTiny}
                            disabled={batchRunning}
                          />
                          <input
                            type="number"
                            title="Holiday Days"
                            placeholder="Hol"
                            value={item.holiday_days}
                            onChange={(e) => handleBatchFieldChange(idx, "holiday_days", e.target.value)}
                            style={styles.tableInputTiny}
                            disabled={batchRunning}
                          />
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <input
                            type="number"
                            title="Lag 1 (t-1)"
                            value={item.lag1}
                            onChange={(e) => handleBatchFieldChange(idx, "lag1", e.target.value)}
                            style={styles.tableInputTiny}
                            disabled={batchRunning}
                          />
                          <input
                            type="number"
                            title="Lag 2 (t-2)"
                            value={item.lag2}
                            onChange={(e) => handleBatchFieldChange(idx, "lag2", e.target.value)}
                            style={styles.tableInputTiny}
                            disabled={batchRunning}
                          />
                        </div>
                      </td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          value={item.rolling3}
                          onChange={(e) => handleBatchFieldChange(idx, "rolling3", e.target.value)}
                          style={styles.tableInputSmall}
                          disabled={batchRunning}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          value={item.current_inventory}
                          onChange={(e) =>
                            handleBatchFieldChange(idx, "current_inventory", e.target.value)
                          }
                          style={styles.tableInputSmall}
                          disabled={batchRunning}
                        />
                      </td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          onClick={() => handleRemoveBatchRow(idx)}
                          disabled={batchRunning || batchItems.length <= 1}
                          style={styles.removeRowBtn}
                          title="Remove row"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Batch Submission Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                {batchItems.length} scenario{batchItems.length > 1 ? "s" : ""} queued for execution
              </span>
              <button
                type="button"
                onClick={handleBatchSubmit}
                disabled={batchRunning}
                className="btn-primary"
                style={{ padding: "10px 24px", fontSize: "14px", fontWeight: "700" }}
              >
                {batchRunning ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Processing Batch via FastAPI...
                  </span>
                ) : (
                  <span>Run Batch Predictions ({batchItems.length})</span>
                )}
              </button>
            </div>
          </div>

          {/* Batch Results View */}
          {batchResponse && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Batch Summary Stats */}
              <div style={styles.batchScorecard}>
                <div style={styles.batchStatBox}>
                  <span style={styles.batchStatLabel}>Total Scenarios</span>
                  <span style={styles.batchStatVal}>{batchResponse.total_items}</span>
                </div>
                <div style={styles.batchStatBox}>
                  <span style={styles.batchStatLabel}>Successful</span>
                  <span style={{ ...styles.batchStatVal, color: "#059669" }}>
                    {batchResponse.successful_count}
                  </span>
                </div>
                <div style={styles.batchStatBox}>
                  <span style={styles.batchStatLabel}>Failed / Isolated</span>
                  <span
                    style={{
                      ...styles.batchStatVal,
                      color: batchResponse.failed_count > 0 ? "#dc2626" : "var(--text-secondary)",
                    }}
                  >
                    {batchResponse.failed_count}
                  </span>
                </div>
                <div style={styles.batchStatBox}>
                  <span style={styles.batchStatLabel}>Partial Success Resilience</span>
                  <span style={styles.batchResilienceBadge}>
                    {batchResponse.failed_count === 0 ? "100% Succeeded" : "Item-Level Isolation Active"}
                  </span>
                </div>
              </div>

              {/* Successful Predictions Table */}
              {batchResponse.results.some((r) => r.success) && (
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>Successful Model Predictions</h3>
                    <span style={styles.liveModelBadge}>
                      <span style={styles.dotPulse} /> Verified Model Responses
                    </span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={styles.batchTable}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Request ID</th>
                          <th style={styles.th}>Category</th>
                          <th style={styles.th}>Predicted Demand</th>
                          <th style={styles.th}>95% Confidence Range</th>
                          <th style={styles.th}>Model / Version</th>
                          <th style={styles.th}>Stock Status</th>
                          <th style={styles.th}>Reorder Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResponse.results
                          .filter((r) => r.success && r.prediction)
                          .map((r, i) => {
                            const p = r.prediction;
                            const inv = p.inventory_analysis;
                            return (
                              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={styles.td}>
                                  <code style={styles.codeTag}>{r.request_id || `REQ-${i + 1}`}</code>
                                </td>
                                <td style={styles.td}>
                                  <span style={styles.badgeCategory}>{p.category}</span>
                                </td>
                                <td style={styles.td}>
                                  <strong style={{ fontSize: "15px", color: "var(--primary)" }}>
                                    {p.predicted_demand.toLocaleString()} units
                                  </strong>
                                </td>
                                <td style={styles.td}>
                                  {p.confidence_range ? (
                                    <span style={{ fontSize: "13px" }}>
                                      {p.confidence_range.lower} – {p.confidence_range.upper} units
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td style={styles.td}>
                                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                    {p.model_used || "XGBoost"} ({p.model_version || "v2.0.0"})
                                  </span>
                                </td>
                                <td style={styles.td}>
                                  {inv ? (
                                    <span
                                      style={{
                                        ...styles.statusPill,
                                        ...(inv.status.includes("Stockout") || inv.status.includes("Reorder")
                                          ? styles.statusDanger
                                          : styles.statusSuccess),
                                      }}
                                    >
                                      {inv.status}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td style={styles.td}>
                                  {inv ? (
                                    inv.recommended_reorder > 0 ? (
                                      <strong style={{ color: "#1d4ed8" }}>
                                        +{inv.recommended_reorder} units
                                      </strong>
                                    ) : (
                                      <span style={{ color: "#059669" }}>0 (Covered)</span>
                                    )
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Failed Items Table (if any) */}
              {batchResponse.results.some((r) => !r.success) && (
                <div style={{ ...styles.card, borderColor: "#fca5a5" }}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={{ ...styles.cardTitle, color: "#dc2626" }}>
                        Failed / Unprocessed Items ({batchResponse.failed_count})
                      </h3>
                      <p style={styles.cardSubtitle}>
                        These specific scenarios failed validation while valid items succeeded without data loss.
                      </p>
                    </div>
                    <span
                      style={{
                        backgroundColor: "#fef2f2",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        fontSize: "12px",
                        fontWeight: "600",
                        padding: "4px 10px",
                        borderRadius: "12px",
                      }}
                    >
                      Error Isolated
                    </span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={styles.batchTable}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Request ID</th>
                          <th style={styles.th}>Category</th>
                          <th style={styles.th}>Error Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResponse.results
                          .filter((r) => !r.success)
                          .map((r, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #fee2e2" }}>
                              <td style={styles.td}>
                                <code style={{ ...styles.codeTag, backgroundColor: "#fef2f2", color: "#dc2626" }}>
                                  {r.request_id || `REQ-FAILED-${i + 1}`}
                                </code>
                              </td>
                              <td style={styles.td}>{r.category || "Unknown"}</td>
                              <td style={{ ...styles.td, color: "#dc2626", fontSize: "13px" }}>
                                {r.error || "Unknown validation or inference failure."}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "16px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "800",
    color: "var(--text-primary)",
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    margin: 0,
    maxWidth: "750px",
    lineHeight: "1.5",
  },
  headerMeta: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  metaBadge: {
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    padding: "6px 12px",
    borderRadius: "20px",
  },
  metaBadgeOutline: {
    fontSize: "12px",
    fontWeight: "500",
    backgroundColor: "var(--bg-subtle)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    padding: "6px 12px",
    borderRadius: "20px",
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
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1fr",
    gap: "28px",
    alignItems: "start",
  },
  card: {
    backgroundColor: "var(--bg-card)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border)",
    padding: "24px",
    boxShadow: "var(--shadow-sm)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "18px",
    borderBottom: "1px solid var(--border)",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "12px",
  },
  cardHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconCircle: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: "17px",
    fontWeight: "700",
    margin: 0,
    color: "var(--text-primary)",
  },
  cardSubtitle: {
    fontSize: "12px",
    color: "var(--text-secondary)",
    margin: 0,
  },
  resetBtn: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--primary)",
    backgroundColor: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "6px 12px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  required: {
    color: "var(--danger)",
  },
  select: {
    padding: "10px 12px",
    fontSize: "14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    outline: "none",
    width: "100%",
  },
  input: {
    padding: "10px 12px",
    fontSize: "14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  inputError: {
    padding: "10px 12px",
    fontSize: "14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--danger)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  helpText: {
    fontSize: "11px",
    color: "var(--text-muted)",
    lineHeight: "1.3",
  },
  errorText: {
    fontSize: "11px",
    color: "var(--danger)",
    fontWeight: "500",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  threeCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
  },
  sectionDivider: {
    position: "relative",
    textAlign: "center",
    margin: "10px 0 4px 0",
    borderTop: "1px dashed var(--border)",
    paddingTop: "12px",
  },
  dividerLabel: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--text-muted)",
  },
  formActions: {
    marginTop: "12px",
    display: "flex",
    justifyContent: "flex-end",
  },
  submitBtn: {
    width: "100%",
    padding: "13px",
    fontSize: "15px",
    fontWeight: "700",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },
  resultsWrapper: {
    minHeight: "400px",
  },
  placeholderCard: {
    backgroundColor: "var(--bg-card)",
    borderRadius: "var(--radius-lg)",
    border: "1px dashed var(--border)",
    padding: "48px 28px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    fontSize: "42px",
    marginBottom: "12px",
  },
  placeholderTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: "0 0 8px 0",
  },
  placeholderText: {
    fontSize: "13.5px",
    color: "var(--text-secondary)",
    maxWidth: "420px",
    lineHeight: "1.5",
    marginBottom: "24px",
  },
  placeholderSteps: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    textAlign: "left",
    width: "100%",
    maxWidth: "340px",
  },
  stepItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "12.5px",
    color: "var(--text-secondary)",
    backgroundColor: "var(--bg-subtle)",
    padding: "8px 12px",
    borderRadius: "8px",
  },
  stepNum: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "700",
    flexShrink: 0,
  },
  resultCard: {
    backgroundColor: "var(--bg-card)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid #bfdbfe",
    boxShadow: "0 4px 16px rgba(37, 99, 235, 0.08)",
    padding: "24px",
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  badgeCategory: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--primary)",
    backgroundColor: "#eff6ff",
    padding: "3px 8px",
    borderRadius: "4px",
  },
  resultTitle: {
    fontSize: "18px",
    fontWeight: "800",
    margin: "6px 0 0 0",
    color: "var(--text-primary)",
  },
  liveModelBadge: {
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#059669",
    backgroundColor: "#ecfdf5",
    border: "1px solid #a7f3d0",
    padding: "4px 10px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  dotPulse: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
  },
  mainNumberRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    margin: "12px 0 16px 0",
  },
  predictionNumber: {
    fontSize: "44px",
    fontWeight: "900",
    color: "var(--primary)",
    lineHeight: 1,
    letterSpacing: "-0.03em",
  },
  unitLabel: {
    fontSize: "18px",
    fontWeight: "600",
    color: "var(--text-secondary)",
  },
  confidenceBox: {
    backgroundColor: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
    marginBottom: "18px",
  },
  confidenceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
  },
  confidenceLabel: {
    color: "var(--text-secondary)",
    fontWeight: "500",
  },
  confidenceVal: {
    color: "var(--text-primary)",
  },
  confidenceNote: {
    fontSize: "11px",
    color: "var(--text-muted)",
    margin: "6px 0 0 0",
    lineHeight: "1.3",
  },
  featuresList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
    gap: "8px",
    paddingTop: "14px",
    borderTop: "1px solid var(--border)",
  },
  featureItem: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  fName: {
    fontSize: "10.5px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--text-muted)",
  },
  fVal: {
    fontSize: "13px",
    color: "var(--text-primary)",
  },
  inventoryCard: {
    backgroundColor: "var(--bg-card)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border)",
    padding: "24px",
    boxShadow: "var(--shadow-sm)",
  },
  invHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "18px",
    flexWrap: "wrap",
    gap: "10px",
  },
  calcBadge: {
    fontSize: "10.5px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#6b7280",
    backgroundColor: "var(--bg-subtle)",
    padding: "3px 8px",
    borderRadius: "4px",
  },
  invTitle: {
    fontSize: "16px",
    fontWeight: "700",
    margin: "6px 0 0 0",
    color: "var(--text-primary)",
  },
  statusPill: {
    fontSize: "12px",
    fontWeight: "700",
    padding: "4px 10px",
    borderRadius: "16px",
  },
  statusDanger: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
  },
  statusSuccess: {
    backgroundColor: "#ecfdf5",
    color: "#059669",
    border: "1px solid #a7f3d0",
  },
  invGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    marginBottom: "16px",
  },
  invStat: {
    backgroundColor: "var(--bg-subtle)",
    padding: "12px 14px",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  invStatHighlight: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "12px 14px",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  invLabel: {
    fontSize: "11px",
    color: "var(--text-secondary)",
    fontWeight: "500",
  },
  invValue: {
    fontSize: "16px",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  invLabelHighlight: {
    fontSize: "11px",
    color: "#1d4ed8",
    fontWeight: "600",
  },
  invValueHighlight: {
    fontSize: "17px",
    fontWeight: "800",
    color: "#1d4ed8",
  },
  explanationBox: {
    backgroundColor: "var(--bg-subtle)",
    borderLeft: "3px solid var(--primary)",
    padding: "12px 14px",
    borderRadius: "0 6px 6px 0",
  },
  explanationText: {
    fontSize: "12.5px",
    color: "var(--text-primary)",
    lineHeight: "1.5",
    margin: 0,
  },
  infoBanner: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e40af",
    fontSize: "13px",
    padding: "14px 16px",
    borderRadius: "var(--radius-md)",
    lineHeight: "1.4",
  },
  batchBtnSecondary: {
    padding: "7px 14px",
    fontSize: "12.5px",
    fontWeight: "600",
    color: "var(--primary)",
    backgroundColor: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    cursor: "pointer",
  },
  batchBtnWarning: {
    padding: "7px 14px",
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#b45309",
    backgroundColor: "#fef3c7",
    border: "1px solid #fde68a",
    borderRadius: "6px",
    cursor: "pointer",
  },
  batchTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    backgroundColor: "var(--bg-subtle)",
    color: "var(--text-secondary)",
    fontWeight: "600",
    fontSize: "12px",
    borderBottom: "1px solid var(--border)",
  },
  td: {
    padding: "10px 12px",
    verticalAlign: "middle",
  },
  tableInputSmall: {
    padding: "6px 8px",
    fontSize: "13px",
    borderRadius: "4px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    width: "100%",
    minWidth: "70px",
    boxSizing: "border-box",
  },
  tableInputTiny: {
    padding: "6px 8px",
    fontSize: "13px",
    borderRadius: "4px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    width: "48px",
    boxSizing: "border-box",
  },
  tableSelect: {
    padding: "6px 8px",
    fontSize: "13px",
    borderRadius: "4px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    boxSizing: "border-box",
  },
  removeRowBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#dc2626",
    fontSize: "14px",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  batchScorecard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
  },
  batchStatBox: {
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  batchStatLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  batchStatVal: {
    fontSize: "26px",
    fontWeight: "800",
    color: "var(--text-primary)",
  },
  batchResilienceBadge: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#059669",
    marginTop: "6px",
  },
  codeTag: {
    fontFamily: "monospace",
    fontSize: "12px",
    backgroundColor: "var(--bg-subtle)",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "var(--text-primary)",
  },
};
