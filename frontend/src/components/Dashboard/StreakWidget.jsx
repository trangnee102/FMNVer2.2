// frontend/src/components/Dashboard/StreakWidget.jsx
import React from "react";

const StreakWidget = ({ streak, lastCheckInDetail, onCheckIn }) => {
  return (
    <div
      className="widget-card streak-widget-new"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "24px",
        background: "linear-gradient(180deg, #fffcf9 0%, #ffffff 100%)",
        borderRadius: "20px",
        border: "1px solid #ffedd5",
        boxShadow: "0 10px 30px rgba(249, 115, 22, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "25px",
        }}
      >
        <div
          style={{
            width: "45px",
            height: "45px",
            background: "#fff",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(249, 115, 22, 0.15)",
            border: "1px solid #ffedd5",
          }}
        >
          <i
            className="fa-solid fa-fire"
            style={{ fontSize: "1.4rem", color: "#f97316" }}
          ></i>
        </div>
        <div>
          <h3
            style={{
              color: "#ea580c",
              fontSize: "1.2rem",
              margin: "0 0 2px 0",
              fontWeight: "800",
              letterSpacing: "-0.5px",
            }}
          >
            Streak
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              color: "#64748b",
              fontWeight: "500",
            }}
          >
            Duy trì thói quen mỗi ngày
          </p>
        </div>
      </div>

      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "35px" }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "baseline",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontSize: "4.5rem",
              fontWeight: "900",
              color: "#f97316",
              lineHeight: "0.8",
              letterSpacing: "-2px",
            }}
          >
            {streak}
          </span>
          <span
            style={{
              fontSize: "1rem",
              color: "#475569",
              lineHeight: "1.2",
              fontWeight: "700",
              textTransform: "lowercase",
            }}
          >
            ngày
            <br />
            liên tiếp
          </span>
        </div>
        <div
          style={{
            width: "2px",
            height: "50px",
            background: "#ffedd5",
            margin: "0 20px",
          }}
        ></div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                background: "#fff7ed",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#f97316",
              }}
            >
              <i
                className="fa-regular fa-calendar-check"
                style={{ fontSize: "0.85rem" }}
              ></i>
            </div>
            <span
              style={{
                fontSize: "0.8rem",
                color: "#1e293b",
                fontWeight: "600",
              }}
            >
              Lần điểm danh gần nhất
            </span>
          </div>
          {lastCheckInDetail ? (
            <>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  color: "#0f172a",
                }}
              >
                {lastCheckInDetail.split("|")[0]}
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#94a3b8",
                  fontWeight: "500",
                }}
              >
                {lastCheckInDetail.split("|")[1]}
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: "0.9rem",
                color: "#94a3b8",
                fontStyle: "italic",
                marginTop: "4px",
              }}
            >
              Chưa có dữ liệu
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          marginBottom: "35px",
          padding: "0 10px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "19px",
            left: "25px",
            right: "25px",
            height: "2px",
            borderTop: "2px dashed #fed7aa",
            zIndex: 1,
          }}
        ></div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            position: "relative",
            zIndex: 2,
          }}
        >
          {[...Array(7)].map((_, i) => {
            const isActive = i < (streak % 7 || (streak === 0 ? 0 : 7));
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: isActive ? "42px" : "38px",
                    height: isActive ? "42px" : "38px",
                    borderRadius: "50%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    background: isActive ? "#fff" : "#f8fafc",
                    border: isActive
                      ? "2px solid #f97316"
                      : "2px solid transparent",
                    boxShadow: isActive
                      ? "0 4px 10px rgba(249, 115, 22, 0.2)"
                      : "none",
                    transition: "all 0.3s ease",
                  }}
                >
                  <i
                    className="fa-solid fa-fire"
                    style={{
                      fontSize: "1.2rem",
                      color: isActive ? "#f97316" : "#cbd5e1",
                    }}
                  ></i>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: isActive ? "700" : "600",
                    color: isActive ? "#ea580c" : "#94a3b8",
                  }}
                >
                  Ngày {i + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        className="btn-checkin-new"
        onClick={onCheckIn}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: "14px",
          border: "none",
          background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
          color: "white",
          fontWeight: "800",
          fontSize: "1rem",
          cursor: "pointer",
          transition: "all 0.3s ease",
          boxShadow: "0 6px 20px rgba(234, 88, 12, 0.3)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginTop: "auto",
        }}
      >
        <i
          className="fa-solid fa-circle-check"
          style={{ fontSize: "1.2rem" }}
        ></i>
        ĐIỂM DANH HÔM NAY
      </button>
      <div
        style={{
          textAlign: "center",
          marginTop: "16px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <i
          className="fa-solid fa-circle-info"
          style={{ color: "#ea580c", fontSize: "0.85rem" }}
        ></i>
        <span
          style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "500" }}
        >
          Bạn có thể điểm danh 1 lần mỗi ngày
        </span>
      </div>
    </div>
  );
};

export default StreakWidget;