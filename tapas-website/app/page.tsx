export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--surface)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          backgroundColor: "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "2rem",
        }}
      >
        <span
          style={{
            color: "var(--on-primary)",
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            fontStyle: "italic",
          }}
        >
          T
        </span>
      </div>

      {/* Brand name */}
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.8rem",
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--secondary)",
          marginBottom: "1rem",
        }}
      >
        Tapas Reading Cafe
      </p>

      {/* Heading */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
          fontWeight: 500,
          fontStyle: "italic",
          color: "var(--primary)",
          lineHeight: 1.15,
          marginBottom: "1.25rem",
          maxWidth: "640px",
        }}
      >
        Something wonderful
        <br />is on its way.
      </h1>

      {/* Divider */}
      <div
        style={{
          width: "48px",
          height: "2px",
          backgroundColor: "var(--secondary)",
          marginBottom: "1.25rem",
          borderRadius: "1px",
        }}
      />

      {/* Subtext */}
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "1.05rem",
          color: "var(--on-surface-variant)",
          maxWidth: "420px",
          lineHeight: 1.7,
          marginBottom: "2.5rem",
        }}
      >
        We are building your cozy corner for books, coffee, and community.
        Come back soon — the doors open shortly.
      </p>

      {/* Footer note */}
      <p
        style={{
          position: "fixed",
          bottom: "2rem",
          fontFamily: "var(--font-body)",
          fontSize: "0.75rem",
          color: "var(--outline)",
          letterSpacing: "0.05em",
        }}
      >
        tapasreadingcafe.com
      </p>
    </main>
  );
}
