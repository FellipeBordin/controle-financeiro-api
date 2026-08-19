export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#020617",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "32px",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            marginBottom: "12px",
          }}
        >
          FinanControl API
        </h1>

        <p
          style={{
            color: "#94a3b8",
            fontSize: "16px",
          }}
        >
          API funcionando corretamente.
        </p>

        <p
          style={{
            color: "#22c55e",
            fontSize: "14px",
            marginTop: "16px",
          }}
        >
          Status: Online
        </p>
      </div>
    </main>
  );
}
