export default function ErrorState({
  title = "Failed to Load Data",
  message,
  onRetry,
}) {
  return (
    <div
      className="card-base animate-fade-in"
      style={{
        padding: "36px 24px",
        textAlign: "center",
        maxWidth: "560px",
        margin: "40px auto",
      }}
      role="alert"
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: "var(--danger-light)",
          color: "var(--danger)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px auto",
          fontSize: "22px",
          border: "1px solid var(--danger-border)",
        }}
      >
        ⚠️
      </div>
      <h3 style={{ fontSize: "18px", marginBottom: "8px", color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: "14px",
          marginBottom: "20px",
          lineHeight: "1.5",
        }}
      >
        {message || "The backend API could not be reached. Please ensure the FastAPI server is running."}
      </p>
      {onRetry && (
        <button className="btn-primary" onClick={onRetry} style={{ margin: "0 auto" }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
}
