export default function Loading() {
  return (
    <div aria-label="Loading HomeLab Commander">
      <div
        className="skeleton"
        style={{ width: 240, height: 28, marginBottom: 22 }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
        }}
      >
        {Array.from({ length: 8 }, (_, index) => (
          <div
            className="skeleton"
            style={{ height: index < 4 ? 110 : 250 }}
            key={index}
          />
        ))}
      </div>
    </div>
  );
}
