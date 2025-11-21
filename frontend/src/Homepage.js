// Homepage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Homepage() {
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const TEMP_THRESHOLD = 35;
  const HUM_THRESHOLD = 100;
  const MQ135_AIR_THRESHOLD = 30;
  const MQ2_GAS_THRESHOLD = 50;

  const getStatus = (value, threshold) => {
    if (value > threshold) return { comment: "Bad", color: "#ff4d4d" };
    if (value > threshold * 0.7) return { comment: "Moderate", color: "#ffcc00" };
    return { comment: "Good", color: "#4CAF50" };
  };

  const fetchLatest = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/sensor/latest");
      const latest = await response.json();
      setLatestData(latest);
    } catch (error) {
      console.error("Error fetching latest:", error);
      setLatestData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
    const interval = setInterval(fetchLatest, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div style={styles.loaderContainer}>
        <p>Fetching live data...</p>
      </div>
    );

  if (!latestData)
    return (
      <h3 style={{ textAlign: "center", color: "gray" }}>
        No sensor data available.
      </h3>
    );

  const temperature = latestData.temperature ?? "N/A";
  const humidity = latestData.humidity ?? "N/A";
  const mq135 = latestData.mq135 ?? "N/A";
  const mq2 = latestData.mq2 ?? "N/A";
  const timestamp = latestData.timestamp;

  const tempStatus = getStatus(temperature, TEMP_THRESHOLD);
  const humStatus = getStatus(humidity, HUM_THRESHOLD);
  const airStatus = getStatus(mq135, MQ135_AIR_THRESHOLD);
  const gasStatus = getStatus(mq2, MQ2_GAS_THRESHOLD);

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>Smart Environment Dashboard</h1>

        <p style={styles.subtitle}>
          Real-Time Monitoring of Temperature, Humidity, Air Quality, and Gas Levels
        </p>

        <div style={styles.grid}>
          <HoverCard
            title="Temperature"
            value={`${temperature} °C`}
            comment={tempStatus.comment}
            color={tempStatus.color}
            onClick={() => navigate("/history/temperature")}
          />

          <HoverCard
            title="Humidity"
            value={`${humidity} %`}
            comment={humStatus.comment}
            color={humStatus.color}
            onClick={() => navigate("/history/humidity")}
          />

          <HoverCard
            title="Air Quality (MQ135)"
            value={`${mq135} ppm`}
            comment={airStatus.comment}
            color={airStatus.color}
            onClick={() => navigate("/history/air")}
          />

          <HoverCard
            title="Gas Level (MQ2)"
            value={`${mq2} ppm`}
            comment={gasStatus.comment}
            color={gasStatus.color}
            onClick={() => navigate("/history/gas")}
          />
        </div>

        {timestamp && (
          <p style={styles.timestamp}>
            Last Updated:{" "}
            <span style={{ fontWeight: "600" }}>
              {new Date(timestamp).toLocaleString("en-IN", { hour12: true })}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

// 🔥 Hover-enabled Card Component
const HoverCard = ({ title, value, comment, color, onClick }) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        ...styles.card,
        ...(hover ? styles.cardHover : {}),
        borderTop: `6px solid ${color}`,
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <h2 style={{ margin: "8px 0", color: "#333" }}>{title}</h2>
      <p style={{ fontSize: "24px", fontWeight: "bold", margin: "4px 0" }}>{value}</p>
      <p style={{ color: color, fontWeight: "600" }}>{comment}</p>
    </div>
  );
};

const styles = {
  wrapper: {
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
  },
  container: {
    textAlign: "center",
    fontFamily: "Poppins, sans-serif",
    padding: "40px",
    background: "linear-gradient(to bottom right, #eef2f3, #ffffff)",
    height: "100%",
    boxSizing: "border-box",
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#222",
    marginBottom: "10px",
  },
  subtitle: {
    color: "#555",
    marginBottom: "25px",
    fontSize: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "25px",
    padding: "0 40px",
  },

  // 🔥 Base card design
  card: {
    backgroundColor: "#fff",
    padding: "25px",
    borderRadius: "14px",
    boxShadow: "0px 4px 20px rgba(0,0,0,0.1)",
    transition: "0.3s ease",
    cursor: "pointer",
    transform: "scale(1)",
  },

  // ✨ Hover effect applied when hovered
  cardHover: {
    transform: "scale(1.06)",
    boxShadow: "0px 6px 25px rgba(0,0,0,0.18)",
  },

  timestamp: {
    marginTop: "20px",
    color: "#555",
    fontSize: "15px",
  },
  loaderContainer: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#555",
  },
};

export default Homepage;
