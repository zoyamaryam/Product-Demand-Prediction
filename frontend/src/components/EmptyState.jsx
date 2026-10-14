export default function EmptyState({
  title = "No Data Available",
  message = "There are currently no records matching this query or active filter criteria.",
  actionText,
  onAction,
}) {
  return (
    <div
      className="card-base animate-fade-in"
      style={{
        padding: "36px 24px",
        textAlign: "center",
        maxWidth: "560px",
        margin: "30px auto",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: "var(--bg-subtle)",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px auto",
          fontSize: "22px",
          border: "1px solid var(--border)",
        }}
      >
        📊
      </div>
      <h3 style={{ fontSize: "17px", marginBottom: "8px", color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: "14px",
          marginBottom: actionText ? "20px" : "0",
          lineHeight: "1.5",
        }}
      >
        {message}
      </p>
      {actionText && onAction && (
        <button className="btn-secondary" onClick={onAction} style={{ margin: "0 auto" }}>
          {actionText}
        </button>
      )}
    </div>
  );
}
