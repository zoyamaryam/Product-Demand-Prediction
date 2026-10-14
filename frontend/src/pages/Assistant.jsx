import { useState, useRef, useEffect } from "react";
import { askAssistant } from "../api";

const SUGGESTED_QUESTIONS = [
  "Which categories show the greatest inventory risk?",
  "Which products need replenishment, and why?",
  "What demand patterns appear in the available history?",
  "What limitations should I consider when using these forecasts?",
  "What promotion and pricing patterns are observed?",
  "Summarize the most important findings for a business review.",
];

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Welcome to DemandIQ Business Assistant. I am directly grounded in your 48 months of historical retail transactions (through December 2024) and XGBoost January 2025 prototype forecasting models. Ask me about inventory stockout risks, replenishment requirements, historical seasonality, observational pricing patterns, or model limitations.",
      provider: "DemandIQ Business Assistant Engine",
      dataType: "HISTORICAL_OBSERVATION",
      period: "Data through 2024-12",
      recommendations: [
        "Select a quick inquiry below or ask a specific question regarding inventory health, demand history, or model governance."
      ],
      limitations: [
        "Synthetic transactional dataset concludes on December 31, 2024.",
        "Supplier lead times are approximated at 14 days run-rate; automated purchasing is disabled."
      ]
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (question) => {
    const text = (question ?? input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text, category: selectedCategory }]);
    setInput("");
    setLoading(true);

    try {
      const data = await askAssistant(text, selectedCategory);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer,
          provider: data.provider || "DemandIQ Business Assistant Engine",
          intent: data.intent,
          dataType: data.data_type,
          period: data.period,
          supportingMetrics: data.supporting_metrics,
          recommendations: data.recommendations,
          limitations: data.limitations,
          clarifyingQuestion: data.clarifying_question,
          disclaimer: data.disclaimer,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ Communication error: ${err.message}. Please verify the FastAPI backend is operational.`,
          dataType: "ERROR",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        text: "Conversation cleared. How can I help you evaluate your inventory, demand trends, or pricing insights?",
        provider: "DemandIQ Business Assistant Engine",
      },
    ]);
  };

  const renderDataTypeBadge = (type) => {
    switch (type) {
      case "HISTORICAL_OBSERVATION":
        return <span className="badge badge-primary">Historical Baseline (Dec 2024)</span>;
      case "MODEL_FORECAST":
        return <span className="badge badge-purple">Prototype Forecast (Jan 2025)</span>;
      case "INVENTORY_POLICY":
        return <span className="badge badge-danger">Inventory Policy (Advisory)</span>;
      case "LIMITATION":
        return <span className="badge badge-neutral">Model &amp; Data Constraint</span>;
      case "UNAVAILABLE":
        return <span className="badge badge-warning">Unavailable Metric</span>;
      case "AMBIGUOUS":
        return <span className="badge badge-warning">Clarification Needed</span>;
      default:
        return null;
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
            <h1 style={{ margin: 0 }}>Business Intelligence Assistant</h1>
            <span style={styles.provenanceBadge}>Grounded in 5,000 Verified Transactions</span>
          </div>
          <p style={styles.subtitle}>
            Data-grounded conversational decision support. Evaluates verified sales through Dec 2024 and Jan 2025 prototype models without hallucinated metrics.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={styles.categorySelect}
            aria-label="Scope assistant inquiry to category"
          >
            <option value="all">Scope: All Categories</option>
            <option value="Clothing">Clothing</option>
            <option value="Beauty">Beauty</option>
            <option value="Electronics">Electronics</option>
            <option value="Home">Home</option>
          </select>
          <button className="btn-secondary" onClick={clearChat} style={{ fontSize: "12.5px" }}>
            Clear Chat
          </button>
        </div>
      </div>

      {/* Advisory & Non-Automated Purchasing Notice */}
      <div style={styles.advisoryBanner}>
        <span style={{ fontSize: "16px" }}>🛡️</span>
        <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
          <strong>Decision-Support Guardrail:</strong> DemandIQ produces advisory reorder recommendations and empirical correlations. The system <strong>never executes automated purchase orders</strong>, assumes a 14-day proportional lead time, and disclaims causal profit guarantees.
        </div>
      </div>

      {/* Suggested Questions Bar */}
      <div style={styles.suggestionsContainer}>
        <span style={styles.suggestionLabel}>Suggested Inquiries:</span>
        <div style={styles.suggestionChips}>
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              style={styles.chip}
              onClick={() => sendMessage(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Box */}
      <div className="card-base" style={styles.chatBox}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              ...styles.messageRow,
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {m.role === "assistant" && (
              <div style={styles.assistantAvatar}>AI</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "85%", minWidth: "300px" }}>
              <div
                style={{
                  ...styles.bubble,
                  ...(m.role === "user" ? styles.userBubble : styles.assistantBubble),
                }}
              >
                {/* Assistant Metadata Badges */}
                {m.role === "assistant" && (m.dataType || m.period) && (
                  <div style={styles.badgeRow}>
                    {renderDataTypeBadge(m.dataType)}
                    {m.period && <span style={styles.periodTag}>Period: {m.period}</span>}
                  </div>
                )}

                {/* Primary Response Text */}
                <div style={styles.messageText}>{m.text}</div>

                {/* Clarifying Question Callout */}
                {m.clarifyingQuestion && (
                  <div style={styles.clarificationBox}>
                    <strong>❓ Clarification Request:</strong> {m.clarifyingQuestion}
                  </div>
                )}

                {/* Supporting Metrics Badges */}
                {m.supportingMetrics && Object.keys(m.supportingMetrics).length > 0 && (
                  <div style={styles.metricsBox}>
                    <div style={styles.metricsBoxTitle}>Supporting Evidence Metrics:</div>
                    <div style={styles.metricsGrid}>
                      {Object.entries(m.supportingMetrics).map(([k, v]) => (
                        <div key={k} style={styles.metricChip}>
                          <span style={styles.metricChipKey}>{k.replace(/_/g, " ")}:</span>
                          <span style={styles.metricChipVal}>
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

                {/* Recommendations Callout */}
                {m.recommendations && m.recommendations.length > 0 && (
                  <div style={styles.recommendationsBox}>
                    <div style={styles.recBoxTitle}>💡 Advisory Next Steps:</div>
                    <ul style={styles.recList}>
                      {m.recommendations.map((rec, rIdx) => (
                        <li key={rIdx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Limitations & Assumptions Accordion */}
                {m.limitations && m.limitations.length > 0 && (
                  <details style={styles.limitationsDetails}>
                    <summary style={styles.limitationsSummary}>
                      ⚠️ Documented Assumptions &amp; Constraints ({m.limitations.length})
                    </summary>
                    <ul style={styles.limitationsList}>
                      {m.limitations.map((lim, lIdx) => (
                        <li key={lIdx}>{lim}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>

              {/* Attribution Footer */}
              {m.role === "assistant" && m.provider && (
                <div style={styles.providerTagRow}>
                  <span>Source: <strong>{m.provider}</strong></span>
                  <button
                    style={styles.copyAnswerBtn}
                    onClick={() => {
                      navigator.clipboard.writeText(m.text);
                      setCopiedIdx(idx);
                      setTimeout(() => setCopiedIdx(null), 2000);
                    }}
                    title="Copy response to clipboard"
                  >
                    {copiedIdx === idx ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>
            {m.role === "user" && (
              <div style={styles.userAvatar}>You</div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
            <div style={styles.assistantAvatar}>AI</div>
            <div style={{ ...styles.bubble, ...styles.assistantBubble, display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Verifying analytics &amp; computing answer...</span>
              <span style={styles.typingDot} />
              <span style={{ ...styles.typingDot, animationDelay: "0.2s" }} />
              <span style={{ ...styles.typingDot, animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <div style={styles.inputArea}>
        <textarea
          rows={2}
          placeholder="Ask a question about stockout risks, replenishment quantities, demand trends, or forecast limitations... (Press Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={styles.textarea}
          disabled={loading}
          aria-label="Ask assistant a question"
        />
        <button
          className="btn-primary"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={styles.sendBtn}
        >
          {loading ? "Evaluating..." : "Send Question"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    height: "calc(100vh - 110px)",
    minHeight: "680px",
  },
  header: {
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
  },
  categorySelect: {
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "13px",
  },
  advisoryBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "var(--radius-sm)",
  },
  suggestionsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  suggestionLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  suggestionChips: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  chip: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "5px 11px",
    fontSize: "12px",
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  chatBox: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    backgroundColor: "var(--bg-surface)",
  },
  messageRow: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
  },
  assistantAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "12px",
    flexShrink: 0,
    boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "11px",
    flexShrink: 0,
  },
  bubble: {
    padding: "14px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    lineHeight: "1.55",
  },
  assistantBubble: {
    backgroundColor: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  },
  userBubble: {
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    fontWeight: "500",
  },
  badgeRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "8px",
  },
  periodTag: {
    fontSize: "11.5px",
    color: "var(--text-secondary)",
    fontWeight: "600",
  },
  messageText: {
    fontSize: "14px",
    lineHeight: "1.6",
  },
  clarificationBox: {
    marginTop: "10px",
    padding: "8px 12px",
    backgroundColor: "#fffbeb",
    border: "1px solid #fef3c7",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#92400e",
  },
  metricsBox: {
    marginTop: "10px",
    padding: "10px 12px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
  },
  metricsBoxTitle: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-secondary)",
    marginBottom: "6px",
  },
  metricsGrid: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  metricChip: {
    backgroundColor: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    padding: "3px 8px",
    fontSize: "11.5px",
    display: "flex",
    gap: "4px",
  },
  metricChipKey: {
    color: "var(--text-secondary)",
    textTransform: "capitalize",
  },
  metricChipVal: {
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  recommendationsBox: {
    marginTop: "10px",
    padding: "10px 12px",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
  },
  recBoxTitle: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#1e40af",
    marginBottom: "4px",
  },
  recList: {
    margin: 0,
    paddingLeft: "18px",
    fontSize: "13px",
    color: "#1e3a8a",
    lineHeight: "1.45",
  },
  limitationsDetails: {
    marginTop: "10px",
    fontSize: "12px",
    borderTop: "1px dashed var(--border)",
    paddingTop: "6px",
  },
  limitationsSummary: {
    cursor: "pointer",
    fontWeight: "600",
    color: "var(--text-secondary)",
  },
  limitationsList: {
    margin: "6px 0 0 0",
    paddingLeft: "18px",
    color: "var(--text-secondary)",
    lineHeight: "1.4",
  },
  providerTagRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11.5px",
    color: "var(--text-secondary)",
    paddingLeft: "4px",
  },
  copyAnswerBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  typingDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    display: "inline-block",
    animation: "pulse 1s infinite alternate",
  },
  inputArea: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "14px",
    resize: "none",
    fontFamily: "inherit",
    lineHeight: "1.4",
  },
  sendBtn: {
    height: "56px",
    padding: "0 22px",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
};