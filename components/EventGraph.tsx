"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { graphqlClient } from "../lib/graphql";
import { EventType } from "../app/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps,
} from "recharts";
import BottomDiv from "./BottomDiv";
import Loader from "./Loader";
import StatCard from "./StatCard"
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

// Move interfaces to their own section for better organization
interface BaseEvent {
  db_write_timestamp: string;
  block_timestamp: number;
  event_name: string;
  contract_name: string;
}

interface EventsResponse {
  raw_events: BaseEvent[];
}

interface EventGraphProps {
  eventTypes: EventType[];
}

// Constants extracted to the top level
const CONTRACT_ADDRESS = "0x20D419a8e12C45f88fDA7c5760bb6923Cee27F98";
const TIME_RANGES = {
  DAY: "day" as const,
  WEEK: "week" as const,
  MONTH: "month" as const,
};

const EventGraph: React.FC<EventGraphProps> = ({ eventTypes }) => {
  // State management
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [previousEventCounts, setPreviousEventCounts] = useState<Record<string, number>>({});
  const [last30MinCount, setLast30MinCount] = useState<number>(0);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">(TIME_RANGES.WEEK);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [showPreviousPeriod, setShowPreviousPeriod] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(false);

  // Memoize the selected event to prevent unnecessary recalculations
  const selectedEventFound = useMemo(() => 
    eventTypes.find((event) => event.id === selectedEvent) || 
    { id: "", eventName: "", label: "", contractType: "" },
  [selectedEvent, eventTypes]);

  // Calculate timestamps based on the current time (memoized to avoid recalculations)
  const timeStamps = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return {
      now,
      oneDayAgo: now - 24 * 60 * 60,
      oneWeekAgo: now - 7 * 24 * 60 * 60,
      oneMonthAgo: now - 30 * 24 * 60 * 60,
      thirtyMinutesAgo: now - 30 * 60
    };
  }, []);

  // Extract the fetchEventsWithPagination function to improve readability
  const fetchEventsWithPagination = useCallback(async (
    eventName: string,
    contractType: string,
    startTime: number,
    endTime?: number
  ) => {
    let allEvents: BaseEvent[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      //Query
      const paginatedQuery = `
        query Events {
          raw_events(
            where: {
              event_name: {_eq: "${eventName}"}, 
              contract_name: {_eq: "${contractType}"},
              block_timestamp: {_gte: ${startTime}${
                endTime ? `, _lt: ${endTime}` : ""
              }}
            }
            order_by: {block_timestamp: asc}
            limit: 1000
            offset: ${offset}
          ) {
            block_timestamp
            event_name
            contract_name
          }
        }
      `;

      try {
        const response = await graphqlClient.request<EventsResponse>(paginatedQuery);
        const events = response.raw_events || [];

        allEvents = [...allEvents, ...events];

        if (events.length < 1000) {
          hasMore = false;
        } else {
          offset += 1000;
        }
      } catch (error) {
        console.error("Error in pagination query:", error);
        hasMore = false;
      }
    }

    return allEvents;
  }, []);

  // Helper function to calculate date ranges
  const getDateRange = useCallback((date: string, daysOffset = 0) => {
    const dateTime = new Date(date);
    dateTime.setDate(dateTime.getDate() + daysOffset);
    dateTime.setHours(0, 0, 0, 0);
    const startOfDay = Math.floor(dateTime.getTime() / 1000);
    const endOfDay = startOfDay + 24 * 60 * 60;
    
    return { startOfDay, endOfDay };
  }, []);

  // Function to initialize time period data structures
  const initializeTimePeriodData = useCallback((timeRange: "day" | "week" | "month", selectedDate: string) => {
    const counts: Record<string, number> = {};
    const previousCounts: Record<string, number> = {};
    const now = new Date();

    if (timeRange === TIME_RANGES.DAY) {
      const { startOfDay } = getDateRange(selectedDate);
      const { startOfDay: prevStartOfDay } = getDateRange(selectedDate, -1);
      
      const selectedDateTime = new Date(startOfDay * 1000);
      const previousDateTime = new Date(prevStartOfDay * 1000);

      // Initialize hours for selected date
      for (let i = 0; i < 24; i++) {
        const date = new Date(selectedDateTime);
        date.setHours(i, 0, 0, 0);
        const hourStr = date.toLocaleString("en-US", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          hour12: true,
        });
        counts[hourStr] = 0;
      }

      // Initialize previous day's hours
      for (let i = 0; i < 24; i++) {
        const date = new Date(previousDateTime);
        date.setHours(i, 0, 0, 0);
        const hourStr = date.toLocaleString("en-US", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          hour12: true,
        });
        previousCounts[hourStr] = 0;
      }
    } else if (timeRange === TIME_RANGES.WEEK) {
      // Create array of last 7 days with exact timestamps
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        date.setHours(0, 0, 0, 0);
        return {
          timestamp: date.getTime(),
          label: date.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
        };
      });

      dates.forEach(({ label }) => {
        counts[label] = 0;
      });

      // Previous 7 days
      const previousDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
        date.setHours(0, 0, 0, 0);
        return {
          timestamp: date.getTime(),
          label: date.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
        };
      });

      previousDates.forEach(({ label }) => {
        previousCounts[label] = 0;
      });
    } else {
      // Month view
      // Initialize current period days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStr = date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        });
        counts[dayStr] = 0;
      }

      // Initialize previous period days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - (i + 30) * 24 * 60 * 60 * 1000);
        const dayStr = date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        });
        previousCounts[dayStr] = 0;
      }
    }

    return { counts, previousCounts };
  }, [getDateRange]);

  // Function to count events and populate data structures
  const countEvents = useCallback((
    events: BaseEvent[], 
    countMap: Record<string, number>,
    timeRange: "day" | "week" | "month"
  ) => {
    events.forEach((event: BaseEvent) => {
      const date = new Date(event.block_timestamp * 1000);
      
      let timeLabel;
      if (timeRange === TIME_RANGES.DAY) {
        timeLabel = date.toLocaleString("en-US", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          hour12: true,
        });
      } else if (timeRange === TIME_RANGES.WEEK) {
        date.setHours(0, 0, 0, 0);
        timeLabel = date.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      } else {
        timeLabel = date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        });
      }
      
      if (countMap[timeLabel] !== undefined) {
        countMap[timeLabel] += 1;
      }
    });
    
    return countMap;
  }, []);

  // Main data fetching function
  useEffect(() => {
    // Skip if no event is selected
    if (!selectedEventFound.eventName) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch last 30 minutes data
        const last30MinEvents = await fetchEventsWithPagination(
          selectedEventFound.eventName,
          selectedEventFound.contractType,
          timeStamps.thirtyMinutesAgo
        );
        setLast30MinCount(last30MinEvents.length);

        // Calculate time ranges for queries
        let currentStart, currentEnd, previousStart, previousEnd;
        
        if (timeRange === TIME_RANGES.DAY && selectedDate) {
          const { startOfDay, endOfDay } = getDateRange(selectedDate);
          const { startOfDay: previousStartOfDay, endOfDay: previousEndOfDay } = getDateRange(selectedDate, -1);
          
          currentStart = startOfDay;
          currentEnd = endOfDay;
          previousStart = previousStartOfDay;
          previousEnd = previousEndOfDay;
        } else {
          currentStart = 
            timeRange === TIME_RANGES.DAY 
              ? timeStamps.oneDayAgo 
              : timeRange === TIME_RANGES.WEEK 
                ? timeStamps.oneWeekAgo 
                : timeStamps.oneMonthAgo;
          
          const periodLength = 
            timeRange === TIME_RANGES.DAY 
              ? 24 * 60 * 60 
              : timeRange === TIME_RANGES.WEEK 
                ? 7 * 24 * 60 * 60 
                : 30 * 24 * 60 * 60;
          
          previousStart = currentStart - periodLength;
          previousEnd = currentStart;
        }

        // Fetch current and previous period events
        const [currentEvents, previousEvents] = await Promise.all([
          fetchEventsWithPagination(
            selectedEventFound.eventName,
            selectedEventFound.contractType,
            currentStart,
            currentEnd
          ),
          fetchEventsWithPagination(
            selectedEventFound.eventName,
            selectedEventFound.contractType,
            previousStart,
            previousEnd
          )
        ]);

        // Initialize data structures
        const { counts, previousCounts } = initializeTimePeriodData(timeRange, selectedDate);

        // Count events
        const updatedCounts = countEvents(currentEvents, counts, timeRange);
        const updatedPreviousCounts = countEvents(previousEvents, previousCounts, timeRange);

        setPreviousEventCounts(updatedPreviousCounts);
        setEventCounts(updatedCounts);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange, selectedEventFound, selectedDate, fetchEventsWithPagination, 
      getDateRange, initializeTimePeriodData, countEvents, timeStamps]);

  // Process chart data (memoized to avoid recalculations)
  const chartData = useMemo(() => {
    // Transform the data for Recharts
    const data = Object.entries(eventCounts)
      .map(([timeLabel, count]) => ({
        timeLabel,
        count:
          timeRange === TIME_RANGES.DAY
            ? new Date(timeLabel).getHours() > new Date().getHours()
              ? 0
              : count
            : count,
        hour:
          timeRange === TIME_RANGES.DAY
            ? (new Date(timeLabel).getHours() + 1) % 24
            : new Date(timeLabel).getTime(),
      }))
      .sort((a, b) => {
        if (timeRange === TIME_RANGES.DAY) {
          const currentHour = (new Date().getHours() + 1) % 24;
          const hourA = (a.hour as number - currentHour + 24) % 24;
          const hourB = (b.hour as number - currentHour + 24) % 24;
          return hourA - hourB;
        } else {
          return (
            new Date(a.timeLabel).getTime() - new Date(b.timeLabel).getTime()
          );
        }
      });

    const previousData = Object.entries(previousEventCounts)
      .map(([timeLabel, count]) => ({
        timeLabel,
        previousCount:
          timeRange === TIME_RANGES.DAY
            ? new Date(timeLabel).getHours() > new Date().getHours()
              ? 0
              : count
            : count,
        hour:
          timeRange === TIME_RANGES.DAY
            ? (new Date(timeLabel).getHours() + 1) % 24
            : new Date(timeLabel).getTime(),
      }))
      .sort((a, b) => {
        if (timeRange === TIME_RANGES.DAY) {
          const currentHour = (new Date().getHours() + 1) % 24;
          const hourA = (a.hour as number - currentHour + 24) % 24;
          const hourB = (b.hour as number - currentHour + 24) % 24;
          return hourA - hourB;
        } else {
          return (
            new Date(a.timeLabel).getTime() - new Date(b.timeLabel).getTime()
          );
        }
      });

    // Merge current and previous data
    return timeRange === TIME_RANGES.DAY
      ? data.map((current, index) => ({
          timeLabel: current.timeLabel,
          count: current.count,
          previousCount: previousData[index]?.previousCount || 0,
        }))
      : data.map((current, index) => ({
          timeLabel: current.timeLabel,
          count: data[data.length - 1 - index].count,
          previousCount:
            previousData[previousData.length - 1 - index]?.previousCount || 0,
        }));
  }, [eventCounts, previousEventCounts, timeRange]);

  // Calculate total events and percentage change
  const totals = useMemo(() => {
    const currentTotal = Object.values(eventCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    const previousTotal = Object.values(previousEventCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    const percentageChange =
      previousTotal === 0
        ? currentTotal > 0 ? 100 : 0
        : ((currentTotal - previousTotal) / previousTotal) * 100;

    return {
      currentTotal,
      previousTotal,
      percentageChange,
      isPositive: percentageChange > 0
    };
  }, [eventCounts, previousEventCounts]);

  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length > 0) {
      const labelDate = new Date(label as string);
      let previousDate = "";
      let formattedLabel = "";

      if (timeRange === TIME_RANGES.WEEK || timeRange === TIME_RANGES.MONTH) {
        const prevDate = new Date(labelDate);
        if (timeRange === TIME_RANGES.WEEK) {
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

  // Handle date selection
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setTimeRange(TIME_RANGES.DAY); // Automatically switch to day view when date is selected
  };

  return (
    <div>
      <div
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
          backgroundColor: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            Ostium Event Dashboard -{" "}
            <a href={`https://arbiscan.io/address/${CONTRACT_ADDRESS}#events`}>
              {CONTRACT_ADDRESS}
            </a>
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          {/* Last 30min Stats */}
          <StatCard
            title="Last 30 Minutes"
            value={last30MinCount}
            subtitle="events"
          />

          {/* Current Period Stats */}
          <StatCard
            title={`Total ${selectedEventFound.eventName} Events`}
            value={totals.currentTotal}
            subtitle="current period"
          />

          {/* Percentage Change Stats */}
          {showPreviousPeriod && (
            <StatCard
              title="Period over Period"
              value={totals.currentTotal === 0 && totals.previousTotal === 0 
                ? "0%" 
                : `${totals.isPositive ? "+" : ""}${totals.percentageChange.toFixed(1)}% ${totals.isPositive ? "↑" : "↓"}`}
              subtitle="change"
              color={totals.currentTotal === 0 && totals.previousTotal === 0 
                ? "#6c757d" 
                : totals.isPositive ? "#22c55e" : "#ef4444"}
            />
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "14px", color: "#666" }}>Event Type:</span>
          <select
            value={selectedEventFound.id}
            onChange={(e) => setSelectedEvent(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #e0e0e0",
              fontSize: "14px",
              backgroundColor: "white",
              cursor: "pointer",
              outline: "none",
              minWidth: "120px",
            }}
          >
            {eventTypes.map((event) => (
              <option key={event.label} value={event.id}>
                {event.label}
              </option>
            ))}
          </select>

          <span style={{ fontSize: "14px", color: "#666", marginLeft: "12px" }}>
            Time Range:
          </span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as "day" | "week" | "month")}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #e0e0e0",
              fontSize: "14px",
              backgroundColor: "white",
              cursor: "pointer",
              outline: "none",
              minWidth: "120px",
            }}
            // Option drop down
          >
            <option value={TIME_RANGES.DAY}>Last 24 Hours</option>
            <option value={TIME_RANGES.WEEK}>Last Week</option>
            <option value={TIME_RANGES.MONTH}>Last Month</option>
          </select>

          <span style={{ fontSize: "14px", color: "#666", marginLeft: "12px" }}>
            Date:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #e0e0e0",
              fontSize: "14px",
              backgroundColor: "white",
              cursor: "pointer",
              outline: "none",
              minWidth: "120px",
            }}
          />
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            color: showPreviousPeriod ? "#FF8C00" : "#666",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "6px",
            transition: "all 0.2s ease",
            marginTop: "12px",
          }}
        >
          <input
            type="checkbox"
            checked={showPreviousPeriod}
            onChange={(e) => setShowPreviousPeriod(e.target.checked)}
            style={{
              cursor: "pointer",
              accentColor: "#FF8C00",
            }}
          />
          Compare with Previous Period
        </label>
      </div>
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#333",
          }}
        >
          {selectedEventFound.label || "Event"} Events
        </h1>
        <p>
          View the number of{" "}
          <span style={{ color: "#FF8C00" }}>{selectedEventFound.label || selectedEvent}</span> events over
          time.
        </p>
      </div>
      <div style={{ width: "100%", height: 400 }}>
        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Loader />
          </div>
        ) : (
          <ResponsiveContainer>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis
                dataKey="timeLabel"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              {timeRange === TIME_RANGES.DAY && (
                <ReferenceLine
                  x={new Date().toLocaleString("en-US", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    hour12: true,
                  })}
                  stroke="#666"
                  strokeDasharray="3 3"
                  label={{
                    value: "Current Time",
                    position: "top",
                    fill: "#666",
                    fontSize: 12,
                  }}
                />
              )}
              <Tooltip content={CustomTooltip} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#FF8C00"
                name="Current Period"
              />
              {showPreviousPeriod && (
                <Line
                  type="monotone"
                  dataKey="previousCount"
                  stroke="#FF8C00"
                  strokeDasharray="5 5"
                  name="Previous Period"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div style={{ marginBottom: "64px" }}>
        <BottomDiv />
      </div>
    </div>
  );
};

export default EventGraph;