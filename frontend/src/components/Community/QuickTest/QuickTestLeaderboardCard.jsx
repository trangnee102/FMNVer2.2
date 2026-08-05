import { useEffect, useMemo, useState } from "react";

const RANK_META = {
  1: { medal: "🥇", standHeight: 130, bg: "linear-gradient(180deg, #fde68a 0%, #f59e0b 100%)", ring: "#f59e0b" },
  2: { medal: "🥈", standHeight: 90, bg: "linear-gradient(180deg, #e2e8f0 0%, #94a3b8 100%)", ring: "#94a3b8" },
  3: { medal: "🥉", standHeight: 65, bg: "linear-gradient(180deg, #fed7aa 0%, #ea580c 100%)", ring: "#ea580c" },
};

const CONFETTI_COLORS = ["#f59e0b", "#4f46e5", "#10b981", "#ef4444", "#3b82f6", "#ec4899"];

// 👉 Confetti thuần CSS (không cần thư viện ngoài) — chỉ hiện khi hạng 1 vừa xuất hiện.
// Sinh vị trí ngẫu nhiên trong effect (không phải lúc render) để tuân thủ quy tắc "render
// phải thuần" của React — Math.random() là hàm không thuần, gọi trực tiếp lúc render sẽ bị
// react-hooks/purity cảnh báo.
const Confetti = () => {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    setPieces(
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.6 + Math.random() * 0.9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
      })),
    );
  }, []);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="quicktest-confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
};

const getRankIcon = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
};

const getName = (item) => item.studentName || item.userName || "---";

const QuickTestLeaderboardCard = ({ results = [], onSelectStudent }) => {
  const sorted = useMemo(() => [...results].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), [results]);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const [searchQuery, setSearchQuery] = useState("");
  const [revealedRanks, setRevealedRanks] = useState([]);

  // 👉 Lộ dần hạng 3 -> 2 -> 1 (kiểu Kahoot) thay vì hiện hết cùng lúc, tạo cảm giác hồi hộp
  useEffect(() => {
    if (top3.length === 0) return undefined;
    setRevealedRanks([]);
    const order = top3.length === 3 ? [3, 2, 1] : top3.length === 2 ? [2, 1] : [1];
    const timers = order.map((rank, idx) =>
      setTimeout(() => setRevealedRanks((prev) => [...prev, rank]), (idx + 1) * 550),
    );
    return () => timers.forEach(clearTimeout);
  }, [top3.length, results.length]);

  const showConfetti = revealedRanks.includes(1);

  const filteredRest = rest.filter((item) => getName(item).toLowerCase().includes(searchQuery.trim().toLowerCase()));

  // 👉 Thứ tự đứng trên bục thật (bạc trái - vàng giữa - đồng phải), không phải thứ tự hạng
  const podiumRanks = [2, 1, 3].filter((rank) => top3[rank - 1]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6" style={{ position: "relative", overflow: "hidden" }}>
      {showConfetti && <Confetti />}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-indigo-500">QuickTest</p>
          <h2 className="text-2xl font-bold text-slate-900">Kết quả QuickTest</h2>
        </div>
        <span className="rounded-3xl bg-indigo-50 px-4 py-2 text-indigo-700 font-semibold">
          Tổng: {results.length} học sinh
        </span>
      </div>

      {top3.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "16px", margin: "16px 0 32px", minHeight: "230px" }}>
          {podiumRanks.map((rank) => {
            const item = top3[rank - 1];
            const meta = RANK_META[rank];
            const isRevealed = revealedRanks.includes(rank);
            return (
              <div
                key={item.participantId || item.id || rank}
                className={isRevealed ? "quicktest-podium-step" : ""}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "140px",
                  cursor: onSelectStudent ? "pointer" : "default",
                  visibility: isRevealed ? "visible" : "hidden",
                }}
                onClick={() => onSelectStudent && onSelectStudent(item)}
              >
                {rank === 1 && (
                  <span className="quicktest-crown-bounce" style={{ fontSize: "1.8rem", marginBottom: "2px" }}>
                    👑
                  </span>
                )}
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: meta.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.6rem",
                    fontWeight: 900,
                    color: "#fff",
                    border: `3px solid ${meta.ring}`,
                    boxShadow: `0 6px 16px ${meta.ring}55`,
                  }}
                >
                  {getName(item).charAt(0).toUpperCase()}
                </div>
                <div
                  style={{
                    marginTop: "10px",
                    fontWeight: 800,
                    color: "#1e293b",
                    fontSize: "0.95rem",
                    textAlign: "center",
                    maxWidth: "130px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getName(item)}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#4f46e5", fontWeight: 700 }}>{item.score ?? 0} đ</div>
                <div
                  style={{
                    marginTop: "10px",
                    width: "100%",
                    height: `${meta.standHeight}px`,
                    background: meta.bg,
                    borderRadius: "12px 12px 0 0",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    paddingTop: "10px",
                    boxShadow: "inset 0 3px 6px rgba(0,0,0,0.12)",
                  }}
                >
                  <span style={{ fontSize: "2rem" }}>{meta.medal}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Tìm học sinh theo tên..."
            style={{ width: "100%", padding: "10px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "0.95rem", outline: "none" }}
          />
        </div>
      )}

      {(rest.length > 0 || results.length === 0) && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-600 text-white text-xs uppercase tracking-[0.18em]">
                <th className="py-3 px-4 rounded-tl-xl">Hạng</th>
                <th className="py-3 px-4">Tên</th>
                <th className="py-3 px-4">Điểm</th>
                <th className="py-3 px-4">Đúng</th>
                <th className="py-3 px-4">Sai</th>
                <th className="py-3 px-4 rounded-tr-xl">Tốc độ TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {results.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 font-medium">
                    Chưa có dữ liệu bảng xếp hạng.
                  </td>
                </tr>
              ) : filteredRest.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">
                    Không tìm thấy học sinh nào khớp &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              ) : (
                filteredRest.map((item, index) => {
                  const rank = sorted.indexOf(item) + 1;
                  return (
                    <tr
                      key={item.participantId || item.id || index}
                      className="hover:bg-slate-50 transition-colors"
                      style={{ cursor: onSelectStudent ? "pointer" : "default" }}
                      onClick={() => onSelectStudent && onSelectStudent(item)}
                    >
                      <td className="py-4 px-4 font-semibold text-indigo-600">{getRankIcon(rank)}</td>
                      <td className="py-4 px-4 font-medium text-slate-900">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: "#eef2ff",
                              color: "#4338ca",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.85rem",
                              flexShrink: 0,
                            }}
                          >
                            {getName(item).charAt(0).toUpperCase()}
                          </span>
                          {getName(item)}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-700">{item.score ?? 0}</td>
                      <td className="py-4 px-4 font-medium text-emerald-600">{item.correctCount ?? 0}</td>
                      <td className="py-4 px-4 font-medium text-rose-600">{item.wrongCount ?? 0}</td>
                      <td className="py-4 px-4 text-slate-600">{item.averageAnswerTime?.toFixed?.(1) ?? item.averageAnswerTime ?? "0.0"}s</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuickTestLeaderboardCard;
