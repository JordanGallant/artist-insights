 const StatCard = ({ title, value, subtitle, color = "#FF8C00" }: { 
    title: string, 
    value: string | number, 
    subtitle: string, 
    color?: string 
  }) => (
    <div
      style={{
        padding: "16px",
        borderRadius: "8px",
        backgroundColor: "#f8f9fa",
        border: "1px solid #e9ecef",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          color: "#6c757d",
          marginBottom: "4px",
        }}
      >
        {title}
      </div>
      <div
        style={{ fontSize: "24px", fontWeight: "bold", color }}
      >
        {value}
      </div>
      <div style={{ fontSize: "12px", color: "#6c757d" }}>{subtitle}</div>
    </div>
  );
  export default StatCard