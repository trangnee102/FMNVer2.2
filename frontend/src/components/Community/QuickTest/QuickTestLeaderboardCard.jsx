import React from "react";

const getRankIcon = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
};

const QuickTestLeaderboardCard = ({ results = [] }) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-indigo-500">QuickTest</p>
          <h2 className="text-2xl font-bold text-slate-900">Kết quả QuickTest</h2>
        </div>
        <span className="rounded-3xl bg-indigo-50 px-4 py-2 text-indigo-700 font-semibold">
          Tổng: {results.length} học sinh
        </span>
      </div>

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
            ) : (
              results.map((item, index) => {
                const rank = item.rank || index + 1;
                return (
                  <tr key={item.id || item.socketId || index} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-semibold text-indigo-600">{getRankIcon(rank)}</td>
                    <td className="py-4 px-4 font-medium text-slate-900">{item.studentName || item.userName || "---"}</td>
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
    </div>
  );
};

export default QuickTestLeaderboardCard;