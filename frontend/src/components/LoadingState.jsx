export default function LoadingState({ message = "Loading data from DemandIQ API..." }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "360px",
        padding: "40px 20px",
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "3px solid #e2e8f0",
          borderTop: "3px solid var(--primary)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p
        style={{
          marginTop: "16px",
          color: "var(--text-secondary)",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        {message}
      </p>
    </div>
  );
}
