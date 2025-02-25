import { TooltipProps } from "recharts";
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  timeRange: "day" | "week" | "month";
  showPreviousPeriod: boolean;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  timeRange,
  showPreviousPeriod,
}: CustomTooltipProps) => {
  if (active && payload && payload.length > 0) {
    const labelDate = new Date(label as string);
    let previousDate = "";
    let formattedLabel = "";

    if (timeRange === "week" || timeRange === "month") {
      const prevDate = new Date(labelDate);
      if (timeRange === "week") {
        prevDate.setDate(prevDate.getDate() - 7);
      } else {
        prevDate.setMonth(prevDate.getMonth() - 1);
      }
      previousDate = prevDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });

      formattedLabel = labelDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    }

    return (
      <div
        style={{
          backgroundColor: "white",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        <p>
          <span style={{ color: "#FF8C00" }}>
            Current Period: {payload[0].value}
          </span>
          <span style={{ color: "#000" }}>
            {formattedLabel ? ` ${formattedLabel}` : ` ${label}`}
          </span>
        </p>
        {showPreviousPeriod && (
          <p>
            <span style={{ color: "#FF8C00" }}>
              Previous Period: {payload[1]?.value || 0}
            </span>
            <span style={{ color: "#000" }}>{previousDate ? ` ${previousDate}` : ""}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default CustomTooltip; 