import React, { useEffect, useState, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const Predictions = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hover state for button
  const [hover, setHover] = useState(false);

  // Chart refs
  const tempRef = useRef(null);
  const humRef = useRef(null);
  const mq2Ref = useRef(null);
  const mq135Ref = useRef(null);

  const fetchPredictions = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5001/predictions");
      const json = await response.json();

      if (json.next_10_hours) {
        setPredictions(json.next_10_hours);
      } else {
        setError("Prediction data not available.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to prediction server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  if (loading) return <div style={styles.loader}>Loading Predictions...</div>;
  if (error) return <h3 style={{ textAlign: "center", color: "red" }}>{error}</h3>;

  // Extract values
  const timestamps = predictions.map((p) =>
    new Date(p.timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );

  const temp = predictions.map((p) => p.temperature.toFixed(2));
  const hum = predictions.map((p) => p.humidity.toFixed(2));
  const mq2 = predictions.map((p) => p.mq2.toFixed(2));
  const mq135 = predictions.map((p) => p.mq135.toFixed(2));

  // Chart Data Builder
  const createChartData = (label, data, color) => ({
    labels: timestamps,
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: `${color}33`,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
    ],
  });

  // PDF Download
  const downloadPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");

    doc.setFontSize(16);
    doc.text("LSTM Forecast - Next 10 Hours", 14, 15);

    autoTable(doc, {
      startY: 25,
      head: [["Time", "Temperature", "Humidity", "MQ2", "MQ135"]],
      body: predictions.map((p, i) => [
        timestamps[i],
        temp[i],
        hum[i],
        mq2[i],
        mq135[i],
      ]),
    });

    const tempImg = tempRef.current?.toBase64Image();
    const humImg = humRef.current?.toBase64Image();
    const mq2Img = mq2Ref.current?.toBase64Image();
    const mq135Img = mq135Ref.current?.toBase64Image();

    const W = 95;
    const H = 65;

    doc.addPage();

    doc.setFontSize(14);
    doc.text("Temperature", 20, 15);
    doc.text("Humidity", 120, 15);

    doc.addImage(tempImg, "PNG", 10, 20, W, H);
    doc.addImage(humImg, "PNG", 105, 20, W, H);

    doc.text("MQ2", 20, 95);
    doc.text("MQ135", 120, 95);

    doc.addImage(mq2Img, "PNG", 10, 100, W, H);
    doc.addImage(mq135Img, "PNG", 105, 100, W, H);

    doc.save("LSTM_Prediction_Report.pdf");
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerBar}>
        <button
          onClick={downloadPDF}
          style={
            hover
              ? { ...styles.downloadBtn, ...styles.downloadBtnHover }
              : styles.downloadBtn
          }
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          Download Report
        </button>
      </div>

      <h1 style={styles.title}>LSTM Forecast (Next 10 Hours)</h1>

      <div style={styles.grid}>
        <ChartCard
          title="Temperature (°C)"
          data={createChartData("Temperature", temp, "#ff6b6b")}
          chartRef={tempRef}
        />

        <ChartCard
          title="Humidity (%)"
          data={createChartData("Humidity", hum, "#4dabf7")}
          chartRef={humRef}
        />

        <ChartCard
          title="MQ2 Sensor (ppm)"
          data={createChartData("MQ2", mq2, "#f9c74f")}
          chartRef={mq2Ref}
        />

        <ChartCard
          title="MQ135 Sensor (ppm)"
          data={createChartData("MQ135", mq135, "#90be6d")}
          chartRef={mq135Ref}
        />
      </div>
    </div>
  );
};

const ChartCard = ({ title, data, chartRef }) => (
  <div style={styles.card}>
    <h3 style={styles.cardTitle}>{title}</h3>
    <div style={{ height: "250px" }}>
      <Line
        ref={chartRef}
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
        }}
      />
    </div>
  </div>
);

const styles = {
  container: { padding: "40px", background: "#f8fbff", minHeight: "100vh" },

  headerBar: { textAlign: "center", marginBottom: "20px" },

  title: {
    textAlign: "center",
    marginBottom: "30px",
    fontSize: "28px",
    fontWeight: "bold",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "25px",
    width: "90%",
    margin: "auto",
  },

  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },

  cardTitle: {
    textAlign: "center",
    marginBottom: "10px",
    fontWeight: "600",
    fontSize: "18px",
  },

  // Button Base Style
  downloadBtn: {
    padding: "12px 25px",
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "0.25s ease",
  },

  // Hover Style
  downloadBtnHover: {
    background: "#1f8a39",
    transform: "scale(1.07)",
  },

  loader: {
    textAlign: "center",
    marginTop: "20%",
    fontSize: "20px",
  },
};

export default Predictions;
