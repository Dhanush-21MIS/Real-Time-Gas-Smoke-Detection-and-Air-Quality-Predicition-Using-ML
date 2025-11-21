import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function History() {
  const navigate = useNavigate();

  const [hourlyData, setHourlyData] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);

  // Hover states
  const [backHover, setBackHover] = useState(false);
  const [downloadHover, setDownloadHover] = useState(false);
  const [dropdownHover, setDropdownHover] = useState(false);

  // Chart refs
  const tempRef = useRef(null);
  const humRef = useRef(null);
  const mq135Ref = useRef(null);
  const mq2Ref = useRef(null);

  // Fetch dates: latest → oldest
  const fetchDateList = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/dates");
      const json = await res.json();

      const sortedDates = json.sort((a, b) => new Date(b) - new Date(a));
      setAvailableDates(sortedDates);

      setSelectedDate(sortedDates[0]); // Auto-select newest

    } catch (err) {
      console.error("Error loading dates:", err);
    }
  }, []);

  // Fetch hourly history
  const fetchHistory = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/history/${selectedDate}`);
      const json = await res.json();

      const mapped = json.map((entry) => ({
        time: new Date(entry._id).toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        temperature: entry.temperature?.toFixed(2) || 0,
        humidity: entry.humidity?.toFixed(2) || 0,
        mq135: entry.mq135?.toFixed(2) || 0,
        mq2: entry.mq2?.toFixed(2) || 0,
      }));

      setHourlyData(mapped.slice(-12));
    } catch (err) {
      console.error("Error loading history:", err);
    }

    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchDateList();
  }, [fetchDateList]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Chart data factory
  const createChartData = (label, values, color) => ({
    labels: hourlyData.map((d) => d.time),
    datasets: [
      {
        label,
        data: values,
        borderColor: color,
        backgroundColor: `${color}33`,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 2,
      },
    ],
  });

  // PDF Export
  const downloadPDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");

    doc.setFontSize(16);
    doc.text(`Environment Report - ${selectedDate}`, 14, 15);

    const rows = hourlyData.map((d) => [
      d.time, d.temperature, d.humidity, d.mq135, d.mq2
    ]);

    autoTable(doc, {
      startY: 25,
      head: [["Time", "Temp (°C)", "Humidity (%)", "MQ135", "MQ2"]],
      body: rows,
    });

    const tempImg = tempRef.current?.toBase64Image();
    const humImg = humRef.current?.toBase64Image();
    const mq135Img = mq135Ref.current?.toBase64Image();
    const mq2Img = mq2Ref.current?.toBase64Image();

    doc.addPage();

    const W = 95;
    const H = 65;

    doc.text("Temperature", 20, 15);
    doc.text("Humidity", 120, 15);
    doc.addImage(tempImg, "PNG", 10, 20, W, H);
    doc.addImage(humImg, "PNG", 105, 20, W, H);

    doc.text("MQ135", 20, 95);
    doc.text("MQ2", 120, 95);
    doc.addImage(mq135Img, "PNG", 10, 100, W, H);
    doc.addImage(mq2Img, "PNG", 105, 100, W, H);

    doc.save(`History_Report_${selectedDate}.pdf`);
  };

  if (loading)
    return <h3 style={{ textAlign: "center" }}>Loading...</h3>;

  return (
    <div style={styles.page}>
      <h2 style={styles.header}>Environment History</h2>

      <div style={styles.controls}>

        {/* BACK BUTTON */}
        <button
          onClick={() => navigate("/")}
          style={backHover ? { ...styles.btnBack, ...styles.btnBackHover } : styles.btnBack}
          onMouseEnter={() => setBackHover(true)}
          onMouseLeave={() => setBackHover(false)}
        >
          Back
        </button>

        {/* DROPDOWN */}
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={dropdownHover ? { ...styles.dropdown, ...styles.dropdownHover } : styles.dropdown}
          onMouseEnter={() => setDropdownHover(true)}
          onMouseLeave={() => setDropdownHover(false)}
        >
          {availableDates.map((date) => (
            <option key={date}>{date}</option>
          ))}
        </select>

        {/* DOWNLOAD BUTTON */}
        <button
          onClick={downloadPDF}
          style={downloadHover ? { ...styles.btnDownload, ...styles.btnDownloadHover } : styles.btnDownload}
          onMouseEnter={() => setDownloadHover(true)}
          onMouseLeave={() => setDownloadHover(false)}
        >
          Download Report
        </button>

      </div>

      <div style={styles.grid}>

        <ChartCard
          title="Temperature (°C)"
          data={createChartData("Temperature", hourlyData.map(d => d.temperature), "#ff5733")}
          chartRef={tempRef}
        />

        <ChartCard
          title="Humidity (%)"
          data={createChartData("Humidity", hourlyData.map(d => d.humidity), "#3498db")}
          chartRef={humRef}
        />

        <ChartCard
          title="Air Quality (MQ135 ppm)"
          data={createChartData("MQ135", hourlyData.map(d => d.mq135), "#8e44ad")}
          chartRef={mq135Ref}
        />

        <ChartCard
          title="Gas Level (MQ2 ppm)"
          data={createChartData("MQ2", hourlyData.map(d => d.mq2), "#27ae60")}
          chartRef={mq2Ref}
        />

      </div>
    </div>
  );
}

const ChartCard = ({ title, data, chartRef }) => (
  <div style={styles.card}>
    <h3 style={styles.cardTitle}>{title}</h3>
    <div style={styles.chartContainer}>
      <Line ref={chartRef} data={data} options={{ responsive: true, maintainAspectRatio: false }} />
    </div>
  </div>
);

const styles = {
  page: {
    fontFamily: "Poppins",
    height: "100vh",
    overflow: "hidden",
    paddingTop: "70px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  header: {
    marginBottom: "10px",
    fontSize: "22px",
    fontWeight: "600",
  },

  controls: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "10px",
  },

  // BACK BUTTON
  btnBack: {
    padding: "8px 14px",
    background: "#007bff",
    color: "#fff",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    transition: "0.25s ease",
  },

  btnBackHover: {
    background: "#0063d1",
    transform: "scale(1.05)",
  },

  // DOWNLOAD BUTTON
  btnDownload: {
    padding: "8px 14px",
    background: "#28a745",
    color: "#fff",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    transition: "0.25s ease",
  },

  btnDownloadHover: {
    background: "#1f8a39",
    transform: "scale(1.05)",
  },

  // DROPDOWN
  dropdown: {
    padding: "8px",
    borderRadius: 6,
    border: "1px solid #888",
    cursor: "pointer",
    transition: "0.25s",
  },

  dropdownHover: {
    borderColor: "#007bff",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows: "1fr 1fr",
    gap: "15px",
    width: "95%",
    height: "calc(100vh - 165px)",
    padding: "0 10px",
  },

  card: {
    background: "#fff",
    padding: "10px",
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },

  cardTitle: {
    textAlign: "center",
    marginBottom: "5px",
    fontWeight: "600",
  },

  chartContainer: {
    flex: 1,
    height: "100%",
  },
};

export default History;
