// frontend/src/components/Cards/AddMoreMatrix.jsx
import React, { useState, useRef, useEffect } from "react";
import api from "../../services/api";

const AddMoreMatrix = ({
  totalQ,
  targetCounts,
  originalText,
  originalFile,
  existingQuestions,
  onAdded,
  docCapacity,
  updateDocCapacity,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [useOriginalDoc, setUseOriginalDoc] = useState(true);

  const missingTotal = Math.max(0, (targetCounts?.total || 0) - totalQ);

  const [addCount, setAddCount] = useState(missingTotal > 0 ? missingTotal : 1);
  const [addConfig, setAddConfig] = useState([]);

  const [addCustomPrompt, setAddCustomPrompt] = useState("");
  const [addText, setAddText] = useState("");
  const [addFile, setAddFile] = useState(null);
  const addFileInputRef = useRef(null);

  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (totalQ > 0 && missingTotal > 0 && !isAdding) {
      setIsAdding(true);
      setAddCount(missingTotal);
    }
  }, [missingTotal, totalQ, isAdding]);

  useEffect(() => {
    const validCount = Math.min(Math.max(1, addCount || 1), 50);
    setAddConfig((prev) => {
      if (validCount > prev.length) {
        const newItems = Array.from(
          { length: validCount - prev.length },
          (_, i) => ({
            id: prev.length + i + 1,
            type: "SINGLE_CHOICE",
            difficulty: "MEDIUM",
          }),
        );
        return [...prev, ...newItems];
      }
      if (validCount < prev.length) {
        return prev.slice(0, validCount);
      }
      return prev;
    });
  }, [addCount]);

  const handleConfigChange = (index, field, value) => {
    const newConfig = [...addConfig];
    newConfig[index][field] = value;
    setAddConfig(newConfig);
  };

  const handleApplyAllType = (e) => {
    const newType = e.target.value;
    if (!newType) return;
    setAddConfig(addConfig.map((q) => ({ ...q, type: newType })));
    e.target.value = "";
  };

  const handleApplyAllDifficulty = (e) => {
    const newDiff = e.target.value;
    if (!newDiff) return;
    setAddConfig(addConfig.map((q) => ({ ...q, difficulty: newDiff })));
    e.target.value = "";
  };

  const handleAddCountChange = (e) => {
    let val = e.target.value;
    if (val.length > 1 && val.startsWith("0")) {
      val = val.replace(/^0+/, "");
    }
    setAddCount(Number(val));
  };

  // 👉 File/text gõ ở ô "tài liệu mới" trùng y hệt tài liệu ban đầu — chỉ để BÁO cho người
  // dùng biết (không chặn): existingQuestions đã lo chống trùng nội dung rồi.
  const isFileSameAsOriginal =
    !!addFile && !!originalFile && addFile.name === originalFile.name && addFile.size === originalFile.size;
  const isTextSameAsOriginal =
    !!addText.trim() && !!originalText?.trim() && addText.trim() === originalText.trim();

  const handleAddMore = async () => {
    const currentAddTotal = addConfig.length;

    if (currentAddTotal === 0) {
      setAddError("Hãy cấu hình ít nhất 1 câu hỏi để bổ sung!");
      return;
    }

    if (!useOriginalDoc && !addText.trim() && !addFile) {
      setAddError("Vui lòng cung cấp tài liệu mới để hệ thống xử lý!");
      return;
    }

    // 👉 Dùng lại tài liệu gốc + đã BIẾT CHẮC tài liệu không đủ dữ kiện cho từng này câu nữa
    // (từng thử và bị hụt ở lần trước) — chặn ngay tại đây, KHÔNG gọi AI cho tốn công.
    if (useOriginalDoc && docCapacity !== null && existingQuestions.length >= docCapacity) {
      setAddError(
        `Tài liệu ban đầu đã đạt giới hạn ở khoảng ${docCapacity} câu — không thể tạo thêm nữa từ tài liệu này. Hãy chuyển sang "Tài liệu mới".`,
      );
      return;
    }

    setAddLoading(true);
    setAddError("");

    try {
      const formData = new FormData();
      formData.append("topic", "Bổ sung câu hỏi");

      // 👉 2 chế độ tách biệt hẳn: "Dùng tài liệu cũ" gửi NGUYÊN VĂN tài liệu ban đầu, không
      // pha trộn gì thêm (để dữ liệu quan sát "trần năng lực" luôn đúng với đúng 1 tài liệu
      // cố định); "Tài liệu mới" gửi hẳn nội dung mới do người dùng cung cấp ở ô bên dưới.
      if (useOriginalDoc) {
        if (originalText?.trim()) formData.append("text", originalText.trim());
        if (originalFile) formData.append("file", originalFile);
      } else {
        if (addText.trim()) formData.append("text", addText.trim());
        if (addFile) formData.append("file", addFile);
      }

      formData.append("existingQuestions", JSON.stringify(existingQuestions));

      const totalAddEasy = addConfig.filter(
        (q) => q.difficulty === "EASY",
      ).length;
      const totalAddMed = addConfig.filter(
        (q) => q.difficulty === "MEDIUM",
      ).length;
      const totalAddHard = addConfig.filter(
        (q) => q.difficulty === "HARD",
      ).length;

      formData.append("totalQuestions", currentAddTotal);
      formData.append("easyCount", totalAddEasy);
      formData.append("mediumCount", totalAddMed);
      formData.append("hardCount", totalAddHard);

      let configText = "";
      addConfig.forEach((q, index) => {
        const typeLabel =
          q.type === "SINGLE_CHOICE"
            ? "Trắc nghiệm 1 đáp án"
            : q.type === "MULTIPLE_CHOICE"
              ? "Nhiều đáp án"
              : q.type === "TRUE_FALSE"
                ? "Đúng/Sai"
                : "Điền khuyết";
        const diffLabel =
          q.difficulty === "EASY"
            ? "DỄ"
            : q.difficulty === "MEDIUM"
              ? "VỪA"
              : "KHÓ";
        configText += `- Câu ${index + 1}: Thể loại: ${typeLabel} (${q.type}), Độ khó: ${diffLabel}.\n`;
      });

      let rules = `
⚠️ LUẬT BỔ SUNG BẮT BUỘC:
1. Tạo CHÍNH XÁC thêm ${currentAddTotal} câu. KHÔNG TẠO TRÙNG LẶP VỚI CÁC CÂU CŨ.
2. CẤU TRÚC ĐỀ THI (TẠO ĐÚNG THỨ TỰ SAU):
${configText}
3. NẾU KHÔNG ĐỦ THÔNG TIN, TẠO ÍT HƠN YÊU CẦU. TUYỆT ĐỐI KHÔNG BỊA ĐẶT KIẾN THỨC.
4. 🎓 DỮ LIỆU HỌC THUẬT: Đầy đủ source_reference, explanation và keywords.
      `;

      const finalPrompt = `Số lượng cần tạo: ${currentAddTotal} câu. Yêu cầu thêm: ${addCustomPrompt}. \n\n${rules}`;
      formData.append("customPrompt", finalPrompt);

      const res = await api.post("/ai/generate-exam", formData);
      let newQuestions =
        res?.data ||
        res?.questions ||
        res?.result ||
        (Array.isArray(res) ? res : []);
      if (!Array.isArray(newQuestions)) newQuestions = [];

      if (newQuestions.length === 0) {
        setAddError(
          "Hệ thống không tìm thấy đủ dữ kiện để tạo thêm câu. Bạn thử tài liệu khác nhé!",
        );
      } else {
        // 👉 Chỉ cập nhật "trần năng lực" khi dùng lại tài liệu gốc — đây là thông tin gắn
        // riêng với đúng 1 tài liệu cố định, tài liệu mới có năng lực hoàn toàn khác, không
        // liên quan gì đến trần đã biết của tài liệu cũ.
        if (useOriginalDoc) {
          updateDocCapacity(currentAddTotal, newQuestions.length, existingQuestions.length);
        }
        onAdded(newQuestions);
        setIsAdding(false);
        setAddText("");
        setAddFile(null);
        setAddCustomPrompt("");
        setAddCount(1);
      }
    } catch (err) {
      setAddError(err.message || "Lỗi kết nối khi tạo câu hỏi bổ sung.");
    } finally {
      setAddLoading(false);
    }
  };

  const currentAddTotal = addConfig.length;
  const totalAddEasy = addConfig.filter((q) => q.difficulty === "EASY").length;
  const totalAddMed = addConfig.filter((q) => q.difficulty === "MEDIUM").length;
  const totalAddHard = addConfig.filter((q) => q.difficulty === "HARD").length;

  const easyPct =
    currentAddTotal > 0 ? (totalAddEasy / currentAddTotal) * 100 : 0;
  const medPct =
    currentAddTotal > 0 ? (totalAddMed / currentAddTotal) * 100 : 0;
  const hardPct =
    currentAddTotal > 0 ? (totalAddHard / currentAddTotal) * 100 : 0;

  const totalSingle = addConfig.filter(
    (q) => q.type === "SINGLE_CHOICE",
  ).length;
  const totalMulti = addConfig.filter(
    (q) => q.type === "MULTIPLE_CHOICE",
  ).length;
  const totalTF = addConfig.filter((q) => q.type === "TRUE_FALSE").length;
  const totalBlank = addConfig.filter((q) => q.type === "FILL_BLANK").length;

  const singlePct =
    currentAddTotal > 0 ? (totalSingle / currentAddTotal) * 100 : 0;
  const multiPct =
    currentAddTotal > 0 ? (totalMulti / currentAddTotal) * 100 : 0;
  const tfPct = currentAddTotal > 0 ? (totalTF / currentAddTotal) * 100 : 0;
  const blankPct =
    currentAddTotal > 0 ? (totalBlank / currentAddTotal) * 100 : 0;

  return (
    <>
      {missingTotal > 0 ? (
        <div
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            borderLeft: "4px solid #f59e0b",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#b45309",
            animation: "fadeIn 0.3s",
          }}
        >
          <h4 style={{ margin: "0 0 5px 0" }}>
            <i className="fa-solid fa-shield-halved"></i> Cảnh báo chống trùng
            lặp
          </h4>
          <p style={{ margin: "0 0 5px 0", fontSize: "0.95rem" }}>
            Dữ liệu không đủ để tạo câu hỏi mới chất lượng. Đề thi hiện đang
            thiếu {missingTotal} câu so với yêu cầu ban đầu.
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderLeft: "4px solid #10b981",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#065f46",
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold" }}>
            <i className="fa-solid fa-circle-check"></i> Tuyệt vời! Bạn đang có{" "}
            {totalQ} câu hỏi được phân bổ.
          </p>
        </div>
      )}

      <div
        style={{
          marginBottom: "30px",
          border: "1px dashed #8b5cf6",
          borderRadius: "12px",
          padding: "20px",
          backgroundColor: "rgba(139, 92, 246, 0.05)",
        }}
      >
        {!isAdding ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--text-gray)", marginBottom: "15px" }}>
              Đề thi vẫn chưa đủ đô? Cậu có thể bổ sung thêm câu hỏi nhé!
            </p>
            <button
              onClick={() => setIsAdding(true)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#3b82f6",
                color: "white",
                borderRadius: "8px",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              <i className="fa-solid fa-plus"></i> Bổ sung câu hỏi
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              animation: "fadeIn 0.3s ease-in-out",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ color: "#8b5cf6", margin: 0 }}>
                Bổ sung thêm bằng AI
              </h3>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <label
                  style={{
                    fontWeight: "bold",
                    color: "var(--text-dark)",
                    fontSize: "0.9rem",
                  }}
                >
                  Số lượng:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={addCount === 0 ? "" : addCount}
                  onChange={handleAddCountChange}
                  style={{
                    width: "70px",
                    padding: "6px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    textAlign: "center",
                    fontWeight: "bold",
                    color: "#8b5cf6",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {addError && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  padding: "10px",
                  backgroundColor: "#fef2f2",
                  borderRadius: "6px",
                  border: "1px solid #fca5a5",
                }}
              >
                {addError}
              </div>
            )}

            <div>
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--text-dark)",
                }}
              >
                Nguồn tài liệu bổ sung:
              </label>
              <div style={{ display: "flex", gap: "20px", marginBottom: "10px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-dark)" }}>
                  <input
                    type="radio"
                    checked={useOriginalDoc}
                    onChange={() => {
                      setUseOriginalDoc(true);
                      setAddError("");
                    }}
                  />{" "}
                  Dùng lại tài liệu ban đầu
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-dark)" }}>
                  <input
                    type="radio"
                    checked={!useOriginalDoc}
                    onChange={() => {
                      setUseOriginalDoc(false);
                      setAddError("");
                    }}
                  />{" "}
                  Tài liệu mới
                </label>
              </div>

              {useOriginalDoc ? (
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-gray)",
                    padding: "12px 15px",
                    backgroundColor: "var(--bg-main)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  Sẽ dùng nguyên văn tài liệu ban đầu ({originalFile ? `file: ${originalFile.name}` : "văn bản đã dán"}) —
                  không có ô nhập nào ở đây để tránh lỡ tay gửi lại đúng tài liệu cũ mà tưởng là mới.
                  Nếu tài liệu này không đủ dữ kiện, hệ thống sẽ báo ngay bên dưới, không cần chờ AI xử lý.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    padding: "15px",
                    backgroundColor: "var(--bg-main)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <input
                    type="file"
                    ref={addFileInputRef}
                    onChange={(e) => {
                      setAddFile(e.target.files[0]);
                      setAddError("");
                    }}
                  />
                  {addFile && isFileSameAsOriginal && (
                    <div style={{ fontSize: "0.8rem", color: "#0369a1" }}>
                      ℹ️ File này giống hệt file đã dùng ở lần tạo trước. Vẫn tạo được câu hỏi
                      mới nếu cấu hình (loại câu) khác lần trước — hệ thống đã tự chống
                      trùng nội dung câu hỏi rồi, không cần lo lặp lại.
                    </div>
                  )}
                  <textarea
                    rows="3"
                    placeholder="Hoặc dán thêm nội dung vào đây..."
                    value={addText}
                    onChange={(e) => {
                      setAddText(e.target.value);
                      setAddError("");
                    }}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      outline: "none",
                    }}
                  />
                  {isTextSameAsOriginal && (
                    <div style={{ fontSize: "0.8rem", color: "#0369a1" }}>
                      ℹ️ Đoạn văn bản này giống hệt tài liệu đã dùng ở lần tạo trước. Vẫn tạo được
                      câu hỏi mới nếu cấu hình khác lần trước, hệ thống đã tự chống trùng nội dung rồi.
                    </div>
                  )}
                </div>
              )}
            </div>

            {addConfig.length > 0 && (
              <div
                style={{
                  padding: "15px",
                  backgroundColor: "var(--bg-main)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    paddingBottom: "15px",
                    borderBottom: "1px solid var(--border)",
                    marginBottom: "15px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.85rem",
                        fontWeight: "bold",
                        marginBottom: "6px",
                      }}
                    >
                      <span style={{ color: "var(--text-dark)" }}>
                        <i
                          className="fa-solid fa-chart-simple"
                          style={{ color: "#8b5cf6", marginRight: "5px" }}
                        ></i>{" "}
                        Phân bổ Độ Khó (Bổ sung):
                      </span>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <span style={{ color: "#10b981" }}>
                          Dễ: {Math.round(easyPct)}% ({totalAddEasy})
                        </span>
                        <span style={{ color: "#f59e0b" }}>
                          Vừa: {Math.round(medPct)}% ({totalAddMed})
                        </span>
                        <span style={{ color: "#ef4444" }}>
                          Khó: {Math.round(hardPct)}% ({totalAddHard})
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        width: "100%",
                        height: "8px",
                        backgroundColor: "#e5e7eb",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
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
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.85rem",
                        fontWeight: "bold",
                        marginBottom: "6px",
                      }}
                    >
                      <span style={{ color: "var(--text-dark)" }}>
                        <i
                          className="fa-solid fa-shapes"
                          style={{ color: "#3b82f6", marginRight: "5px" }}
                        ></i>{" "}
                        Phân bổ Loại Câu (Bổ sung):
                      </span>
                      <div style={{ display: "flex", gap: "12px" }}>
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
                            Điền khuyết: {Math.round(blankPct)}% ({totalBlank})
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        width: "100%",
                        height: "8px",
                        backgroundColor: "#e5e7eb",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
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
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <label
                    style={{
                      fontWeight: "bold",
                      color: "var(--text-dark)",
                      fontSize: "0.95rem",
                    }}
                  >
                    Cấu hình chi tiết:
                  </label>
                  <div
                    style={{ display: "flex", gap: "5px", fontSize: "0.8rem" }}
                  >
                    <select
                      onChange={handleApplyAllType}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        border: "1px solid var(--border)",
                        outline: "none",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-dark)",
                      }}
                    >
                      <option value="">-- Đổi loại --</option>
                      <option value="SINGLE_CHOICE">1 Đáp án</option>
                      <option value="MULTIPLE_CHOICE">Nhiều đáp án</option>
                      <option value="TRUE_FALSE">Đúng/Sai</option>
                      <option value="FILL_BLANK">Điền khuyết</option>
                    </select>
                    <select
                      onChange={handleApplyAllDifficulty}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        border: "1px solid var(--border)",
                        outline: "none",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-dark)",
                      }}
                    >
                      <option value="">-- Đổi mức độ --</option>
                      <option value="EASY">Tất cả Dễ</option>
                      <option value="MEDIUM">Tất cả Vừa</option>
                      <option value="HARD">Tất cả Khó</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    maxHeight: "250px",
                    overflowY: "auto",
                    paddingRight: "5px",
                  }}
                >
                  <div style={{ display: "grid", gap: "8px" }}>
                    {addConfig.map((q, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px",
                          backgroundColor: "var(--bg-card)",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "bold",
                            color: "#8b5cf6",
                            minWidth: "65px",
                            fontSize: "0.9rem",
                          }}
                        >
                          Câu {totalQ + index + 1}:
                        </span>
                        <select
                          value={q.type}
                          onChange={(e) =>
                            handleConfigChange(index, "type", e.target.value)
                          }
                          style={{
                            flex: 2,
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid var(--border)",
                            outline: "none",
                            fontSize: "0.9rem",
                            backgroundColor: "var(--bg-card)",
                            color: "var(--text-dark)",
                          }}
                        >
                          <option value="SINGLE_CHOICE">🔘 1 Đáp án</option>
                          <option value="MULTIPLE_CHOICE">
                            ☑️ Nhiều đáp án
                          </option>
                          <option value="TRUE_FALSE">⚖️ Đúng/Sai</option>
                          <option value="FILL_BLANK">✍️ Điền khuyết</option>
                        </select>
                        <select
                          value={q.difficulty}
                          onChange={(e) =>
                            handleConfigChange(
                              index,
                              "difficulty",
                              e.target.value,
                            )
                          }
                          style={{
                            flex: 1,
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid var(--border)",
                            outline: "none",
                            fontSize: "0.9rem",
                            backgroundColor: "var(--bg-card)",
                            color:
                              q.difficulty === "EASY"
                                ? "#10b981"
                                : q.difficulty === "MEDIUM"
                                  ? "#f59e0b"
                                  : "#ef4444",
                            fontWeight: "bold",
                          }}
                        >
                          <option value="EASY">Dễ</option>
                          <option value="MEDIUM">Vừa</option>
                          <option value="HARD">Khó</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--text-dark)",
                }}
              >
                Yêu cầu thêm (Tùy chọn):
              </label>
              <textarea
                rows="2"
                placeholder="Vd: Hãy bám sát vào nội dung định nghĩa..."
                value={addCustomPrompt}
                onChange={(e) => setAddCustomPrompt(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                marginTop: "10px",
              }}
            >
              <button
                onClick={() => setIsAdding(false)}
                disabled={addLoading}
                style={{
                  padding: "10px 15px",
                  backgroundColor: "var(--bg-main)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleAddMore}
                disabled={addLoading || !addCount}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: addLoading || !addCount ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {addLoading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                )}
                {addLoading ? "Đang xử lý..." : `Bổ sung ${addCount || 0} câu`}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AddMoreMatrix;
