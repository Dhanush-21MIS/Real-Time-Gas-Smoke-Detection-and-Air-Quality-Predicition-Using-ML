import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { IoNotificationsOutline } from "react-icons/io5";

const Navbar = () => {
  const location = useLocation();

  const [alertData, setAlertData] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // NEW STATES
  const [badge, setBadge] = useState(false);
  const [lastAlertTime, setLastAlertTime] = useState(null);

  // Hover states
  const [linkHover, setLinkHover] = useState(null);
  const [iconHover, setIconHover] = useState(false);
  const [closeHover, setCloseHover] = useState(false);

  // ---------------- FETCH ALERT STATUS ----------------
  const fetchAlertStatus = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/sensor/latest");
      const latest = await response.json();

      if (!latest || !latest.timestamp) return;

      const GAS_THRESHOLD = 80;
      const AIR_THRESHOLD = 120;

      let condition = "Normal Environment";
      let color = "green";
      let alertDetected = false;

      if (latest.mq2 > 50 || latest.mq135 > 50) {
        condition = "DANGER! Possible Smoke/Gas Leak";
        color = "red";
        alertDetected = true;
      } 
      else if (latest.mq2 > GAS_THRESHOLD || latest.mq135 > AIR_THRESHOLD) {
        condition = "High Gas Concentration Detected";
        color = "orange";
        alertDetected = true;
      }

      setAlertData({ ...latest, condition, color });

      // --- NEW ALERT DETECTION USING TIMESTAMP ---
      const alertTime = new Date(latest.timestamp).getTime();

      if (alertDetected && (!lastAlertTime || alertTime > lastAlertTime)) {
        setBadge(true); // NEW alert → show badge
      }

      // Open popup AFTER checking
      setShowPopup(true);

      // Remove badge only when clicked
      setBadge(false);
      setLastAlertTime(alertTime);

    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- UI ----------------
  return (
    <>
      <nav style={styles.nav}>
        <div style={styles.logo}>AQI Monitor</div>

        <div style={styles.links}>

          {/* HOME */}
          <Link
            to="/"
            onMouseEnter={() => setLinkHover("home")}
            onMouseLeave={() => setLinkHover(null)}
            style={{
              ...styles.link,
              ...(location.pathname === "/" ? styles.active : {}),
              ...(linkHover === "home" ? styles.linkHover : {}),
            }}
          >
            Home
          </Link>

          {/* HISTORY */}
          <Link
            to="/history/temperature"
            onMouseEnter={() => setLinkHover("history")}
            onMouseLeave={() => setLinkHover(null)}
            style={{
              ...styles.link,
              ...(location.pathname.includes("/history") ? styles.active : {}),
              ...(linkHover === "history" ? styles.linkHover : {}),
            }}
          >
            History
          </Link>

          {/* PREDICTIONS */}
          <Link
            to="/predictions"
            onMouseEnter={() => setLinkHover("predictions")}
            onMouseLeave={() => setLinkHover(null)}
            style={{
              ...styles.link,
              ...(location.pathname === "/predictions" ? styles.active : {}),
              ...(linkHover === "predictions" ? styles.linkHover : {}),
            }}
          >
            Predictions
          </Link>

          {/* NOTIFICATION ICON */}
          <div
            style={{
              ...styles.iconWrapper,
              ...(iconHover ? styles.iconHover : {}),
            }}
            onClick={fetchAlertStatus}
            onMouseEnter={() => setIconHover(true)}
            onMouseLeave={() => setIconHover(false)}
          >
            <IoNotificationsOutline size={24} style={styles.icon} />

            {/* 🔴 BADGE ONLY FOR NEW ALERTS */}
            {badge && <span style={styles.dot}></span>}
          </div>
        </div>
      </nav>

      {/* ---------------- POPUP ---------------- */}
      {showPopup && alertData && (
        <div style={styles.popupOverlay} onClick={() => setShowPopup(false)}>
          <div
            style={{
              ...styles.popup,
              borderTop: `6px solid ${alertData.color}`,
              boxShadow: `0px 0px 20px ${alertData.color}55`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: alertData.color, marginBottom: "10px", fontWeight: "700" }}>
              {alertData.condition}
            </h2>

            <div style={styles.dataBox}>
              <p><strong>Temperature:</strong> {alertData.temperature} °C</p>
              <p><strong>Humidity:</strong> {alertData.humidity} %</p>
              <p><strong>MQ2 Gas:</strong> {alertData.mq2} ppm</p>
              <p><strong>MQ135 Air Quality:</strong> {alertData.mq135} ppm</p>
              <p><strong>Time:</strong> {new Date(alertData.timestamp).toLocaleString()}</p>
            </div>

            {/* CLOSE BUTTON */}
            <button
              style={{
                ...styles.closeBtn,
                ...(closeHover ? styles.closeBtnHover : {}),
              }}
              onMouseEnter={() => setCloseHover(true)}
              onMouseLeave={() => setCloseHover(false)}
              onClick={() => setShowPopup(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  nav: {
    height: "55px",
    background: "#3498db",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 25px",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
  },

  logo: {
    fontSize: "18px",
    fontWeight: "700",
  },

  links: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },

  link: {
    color: "white",
    textDecoration: "none",
    fontSize: "15px",
    paddingBottom: "2px",
    transition: "0.25s",
  },

  linkHover: {
    transform: "scale(1.1)",
    color: "#e8f7ff",
  },

  active: {
    borderBottom: "2px solid white",
  },

  iconWrapper: {
    position: "relative",
    cursor: "pointer",
    padding: "5px",
    transition: "0.25s",
  },

  iconHover: {
    transform: "scale(1.15)",
  },

  icon: {
    color: "white",
  },

  dot: {
    position: "absolute",
    top: "0px",
    right: "0px",
    width: "10px",
    height: "10px",
    background: "red",
    borderRadius: "50%",
    boxShadow: "0 0 8px red",
  },

  popupOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(3px)",
    zIndex: 1000,
  },

  popup: {
    background: "#fff",
    padding: "20px",
    borderRadius: "14px",
    width: "360px",
    textAlign: "center",
  },

  dataBox: {
    background: "#eef4ff",
    padding: "12px",
    borderRadius: "10px",
    marginTop: "10px",
    marginBottom: "15px",
    textAlign: "left",
    lineHeight: "1.6",
    boxShadow: "0 0 10px rgba(0,0,0,0.05)",
  },

  closeBtn: {
    padding: "10px",
    background: "#3498db",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
    fontWeight: "600",
    transition: "0.25s",
  },

  closeBtnHover: {
    background: "#2b80ba",
    transform: "scale(1.05)",
  },
};

export default Navbar;
