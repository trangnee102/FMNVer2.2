// frontend/src/components/Cards/ConfigProgressBars.jsx
import React from "react";

const ConfigProgressBars = ({ questionsConfig }) => {
  const totalQuestions = questionsConfig.length;
  if (totalQuestions === 0) return null;

  // --- TÍNH TOÁN ĐỘ KHÓ ---
  const totalEasy = questionsConfig.filter(
    (q) => q.difficulty === "EASY",
  ).length;
  const totalMed = questionsConfig.filter(
    (q) => q.difficulty === "MEDIUM",
  ).length;
  const totalHard = questionsConfig.filter(
    (q) => q.difficulty === "HARD",
  ).length;

  // 👉 ĐÃ THÊM: Tính số lượng Chưa gán (Màu xám)
  const totalUnassignedDiff = totalQuestions - totalEasy - totalMed - totalHard;

  const easyPct = (totalEasy / totalQuestions) * 100;
  const medPct = (totalMed / totalQuestions) * 100;
  const hardPct = (totalHard / totalQuestions) * 100;
  const unassignedDiffPct = (totalUnassignedDiff / totalQuestions) * 100;

  // --- TÍNH TOÁN LOẠI CÂU HỎI ---
  const totalSingle = questionsConfig.filter(
    (q) => q.type === "SINGLE_CHOICE",
  ).length;
  const totalMulti = questionsConfig.filter(
    (q) => q.type === "MULTIPLE_CHOICE",
  ).length;
  const totalTF = questionsConfig.filter((q) => q.type === "TRUE_FALSE").length;
  const totalBlank = questionsConfig.filter(
    (q) => q.type === "FILL_BLANK",
  ).length;

  // 👉 ĐÃ THÊM: Tính số lượng Chưa gán (Màu xám)
  const totalUnassignedType =
    totalQuestions - totalSingle - totalMulti - totalTF - totalBlank;

  const singlePct = (totalSingle / totalQuestions) * 100;
  const multiPct = (totalMulti / totalQuestions) * 100;
  const tfPct = (totalTF / totalQuestions) * 100;
  const blankPct = (totalBlank / totalQuestions) * 100;
  const unassignedTypePct = (totalUnassignedType / totalQuestions) * 100;

  return (
    <div className="cei-progress-box">
      {/* Phân bổ Độ khó */}
      <div>
        <div className="cei-progress-header">
          <span style={{ color: "var(--text-dark)" }}>
            <i
              className="fa-solid fa-chart-simple"
              style={{ color: "#8b5cf6", marginRight: "5px" }}
            ></i>{" "}
            Phân bổ Độ Khó:
          </span>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ color: "#10b981" }}>
              Dễ: {Math.round(easyPct)}% ({totalEasy})
            </span>
            <span style={{ color: "#f59e0b" }}>
              Vừa: {Math.round(medPct)}% ({totalMed})
            </span>
            <span style={{ color: "#ef4444" }}>
              Khó: {Math.round(hardPct)}% ({totalHard})
            </span>
            {/* Nhãn cho phần chưa gán */}
            {totalUnassignedDiff > 0 && (
              <span style={{ color: "#9ca3af", fontWeight: "bold" }}>
                Chưa gán: {Math.round(unassignedDiffPct)}% (
                {totalUnassignedDiff})
              </span>
            )}
          </div>
        </div>
        <div className="cei-progress-track">
          <div
            style={{
              width: `${easyPct}%`,
              backgroundColor: "#10b981",
              transition: "width 0.3s ease",
            }}
          ></div>
          <div
            style={{
              width: `${medPct}%`,
              backgroundColor: "#f59e0b",
              transition: "width 0.3s ease",
            }}
          ></div>
          <div
            style={{
              width: `${hardPct}%`,
              backgroundColor: "#ef4444",
              transition: "width 0.3s ease",
            }}
          ></div>
          {/* Thanh màu xám đứt nét cho phần chưa gán */}
          <div
            style={{
              width: `${unassignedDiffPct}%`,
              backgroundColor: "#e5e7eb",
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 10px, #d1d5db 10px, #d1d5db 20px)",
              transition: "width 0.3s ease",
            }}
          ></div>
        </div>
      </div>

      {/* Phân bổ Loại câu hỏi */}
      <div>
        <div className="cei-progress-header">
          <span style={{ color: "var(--text-dark)" }}>
            <i
              className="fa-solid fa-shapes"
              style={{ color: "#3b82f6", marginRight: "5px" }}
            ></i>{" "}
            Phân bổ Loại Câu:
          </span>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {totalSingle > 0 && (
              <span style={{ color: "#3b82f6" }}>
                1 ĐA: {Math.round(singlePct)}% ({totalSingle})
              </span>
            )}
            {totalMulti > 0 && (
              <span style={{ color: "#8b5cf6" }}>
                Nhiều ĐA: {Math.round(multiPct)}% ({totalMulti})
              </span>
            )}
            {totalTF > 0 && (
              <span style={{ color: "#14b8a6" }}>
                Đ/S: {Math.round(tfPct)}% ({totalTF})
              </span>
            )}
            {totalBlank > 0 && (
              <span style={{ color: "#f43f5e" }}>
                Điền: {Math.round(blankPct)}% ({totalBlank})
              </span>
            )}
            {/* Nhãn cho phần chưa gán */}
            {totalUnassignedType > 0 && (
              <span style={{ color: "#9ca3af", fontWeight: "bold" }}>
                Chưa gán: {Math.round(unassignedTypePct)}% (
                {totalUnassignedType})
              </span>
            )}
          </div>
        </div>
        <div className="cei-progress-track">
          <div
            style={{
              width: `${singlePct}%`,
              backgroundColor: "#3b82f6",
              transition: "width 0.3s ease",
            }}
          ></div>
          <div
            style={{
              width: `${multiPct}%`,
              backgroundColor: "#8b5cf6",
              transition: "width 0.3s ease",
            }}
          ></div>
          <div
            style={{
              width: `${tfPct}%`,
              backgroundColor: "#14b8a6",
              transition: "width 0.3s ease",
            }}
          ></div>
          <div
            style={{
              width: `${blankPct}%`,
              backgroundColor: "#f43f5e",
              transition: "width 0.3s ease",
            }}
          ></div>
          {/* Thanh màu xám đứt nét cho phần chưa gán */}
          <div
            style={{
              width: `${unassignedTypePct}%`,
              backgroundColor: "#e5e7eb",
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 10px, #d1d5db 10px, #d1d5db 20px)",
              transition: "width 0.3s ease",
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ConfigProgressBars;