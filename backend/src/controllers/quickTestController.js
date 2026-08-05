const prisma = require("../services/prisma");

// 👉 Tự chấm điểm ở backend, KHÔNG tin vào cờ "isCorrect" do client gửi lên
// Hỗ trợ cả 2 kiểu lưu đáp án: chữ cái ("A", "A,C") lẫn so khớp nguyên văn (điền từ)
const gradeAnswer = (selectedAnswer, correctAnswersRaw) => {
  const selected = String(selectedAnswer || "").trim();
  const correctList = String(correctAnswersRaw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!selected || correctList.length === 0) return false;

  const selectedLetterMatch = selected.match(/^([A-Za-z])[.)]/);
  const selectedLetter = selectedLetterMatch ? selectedLetterMatch[1].toUpperCase() : null;

  const isLetterMatch =
    !!selectedLetter && correctList.some((c) => c.toUpperCase() === selectedLetter);
  const isExactMatch = correctList.some(
    (c) => c.toLowerCase() === selected.toLowerCase(),
  );

  return isLetterMatch || isExactMatch;
};

const generateRoomCode = async () => {
  let roomCode;
  let isUnique = false;
  while (!isUnique) {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existing = await prisma.quickTestRoom.findUnique({ where: { roomCode } });
    if (!existing) isUnique = true;
  }
  return roomCode;
};

const createRoom = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const {
      examId, title, duration,
      questionCount, difficulty, randomQuestions, randomAnswers,
      resultMode, pacingMode, questionTimeLimit, questionOrder, resolvedOptions,
    } = req.body;

    const roomCode = await generateRoomCode();

    const room = await prisma.quickTestRoom.create({
      data: {
        roomCode,
        teacherId,
        examId: examId ? parseInt(examId) : null,
        title: title || "Bài kiểm tra nhanh",
        duration: duration ? parseInt(duration) : 15 * 60,
        status: "WAITING",
        questionCount: questionCount ? parseInt(questionCount, 10) : undefined,
        difficulty: difficulty || undefined,
        randomQuestions: typeof randomQuestions === "boolean" ? randomQuestions : undefined,
        randomAnswers: typeof randomAnswers === "boolean" ? randomAnswers : undefined,
        resultMode: resultMode || undefined,
        pacingMode: pacingMode === "SYNC" ? "SYNC" : "SELF_PACED",
        questionTimeLimit: questionTimeLimit ? parseInt(questionTimeLimit, 10) : undefined,
        questionOrder: Array.isArray(questionOrder) && questionOrder.length > 0 ? questionOrder : undefined,
        // 👉 Thứ tự đáp án đã chốt CHUNG cho cả phòng (chỉ dùng ở chế độ Đồng bộ) —
        // tránh mỗi người tự trộn riêng khiến "đáp án B" của người này khác người kia
        resolvedOptions: resolvedOptions && typeof resolvedOptions === "object" ? resolvedOptions : undefined,
        currentQuestionIndex: 0,
        isRevealed: false,
      },
    });

    res.status(201).json({ success: true, data: room, message: "Tạo phòng thành công!" });
  } catch (error) {
    console.error("Error creating QuickTest room:", error);
    res.status(500).json({ success: false, message: "Không thể tạo phòng QuickTest" });
  }
};

const getRoom = async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode).toUpperCase().trim();
    
    const room = await prisma.quickTestRoom.findUnique({
      where: { roomCode },
      include: {
        Exam: {
          select: {
            title: true,
            Flashcards: {
              select: {
                id: true,
                question: true,
                options: true,
                question_type: true,
                correct_answers: true,
                answer: true,
              },
            },
          },
        },
        Participants: true
      }
    });

    if (!room) {
      return res.status(404).json({ success: false, message: "Phòng QuickTest không tồn tại" });
    }

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    console.error("Error retrieving QuickTest room:", error);
    res.status(500).json({ success: false, message: "Không thể lấy thông tin phòng QuickTest" });
  }
};

const getMyRoom = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const room = await prisma.quickTestRoom.findFirst({
      where: { teacherId, status: { in: ["WAITING", "IN_PROGRESS"] } },
      orderBy: { createdAt: 'desc' },
      include: { Participants: true }
    });

    if (!room) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng QuickTest đang mở" });
    }

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    console.error("Error fetching my QuickTest room:", error);
    res.status(500).json({ success: false, message: "Không thể lấy phòng QuickTest của bạn" });
  }
};

const joinRoom = async (req, res) => {
  try {
    const { roomCode, participantName, userId } = req.body;
    
    if (!roomCode || !participantName) {
      return res.status(400).json({ success: false, message: "Phải cung cấp mã phòng và tên học sinh" });
    }

    const normalizedCode = String(roomCode).toUpperCase().trim();
    
    const room = await prisma.quickTestRoom.findUnique({ where: { roomCode: normalizedCode } });
    if (!room) {
      return res.status(404).json({ success: false, message: "Phòng QuickTest không tồn tại" });
    }
    if (room.status !== "WAITING") {
      return res.status(400).json({ success: false, message: "Phòng thi đang diễn ra hoặc đã đóng!" });
    }

    const participant = await prisma.quickTestParticipant.create({
      data: {
        roomId: room.id,
        studentName: participantName,
        userId: userId ? parseInt(userId) : null,
        score: 0
      }
    });

    res.status(200).json({ success: true, data: participant, roomData: room });
  } catch (error) {
    console.error("Error joining QuickTest room:", error);
    res.status(500).json({ success: false, message: "Không thể tham gia phòng QuickTest" });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const roomCode = req.query.roomCode ? String(req.query.roomCode).toUpperCase().trim() : null;
    if (!roomCode) return res.status(400).json({ success: false, message: "Thiếu mã phòng" });

    const room = await prisma.quickTestRoom.findUnique({ where: { roomCode } });
    if (!room) return res.status(404).json({ success: false, message: "Phòng không tồn tại" });

    const participants = await prisma.quickTestParticipant.findMany({
      where: { roomId: room.id },
      orderBy: [
        { score: 'desc' },
        { averageAnswerTime: 'asc' }
      ]
    });

    res.status(200).json({ success: true, data: participants });
  } catch (error) {
    console.error("Error retrieving leaderboard:", error);
    res.status(500).json({ success: false, message: "Không thể lấy bảng xếp hạng" });
  }
};

const startRoom = async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode).toUpperCase().trim();

    const existingRoom = await prisma.quickTestRoom.findUnique({ where: { roomCode } });
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: "Phòng QuickTest không tồn tại" });
    }
    if (existingRoom.teacherId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền điều khiển phòng này!" });
    }

    const room = await prisma.quickTestRoom.update({
      where: { roomCode },
      data: {
        status: "IN_PROGRESS",
        startTime: new Date()
      }
    });

    res.status(200).json({ success: true, message: "Đã phát lệnh BẮT ĐẦU thi!", data: room });
  } catch (error) {
    console.error("Error starting room:", error);
    res.status(500).json({ success: false, message: "Lỗi khi bắt đầu bài thi" });
  }
};


const endRoom = async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode).toUpperCase().trim();

    const existingRoom = await prisma.quickTestRoom.findUnique({ where: { roomCode } });
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: "Phòng QuickTest không tồn tại" });
    }
    if (existingRoom.teacherId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền điều khiển phòng này!" });
    }

    const room = await prisma.quickTestRoom.update({
      where: { roomCode },
      data: {
        status: "FINISHED",
        endTime: new Date()
      }
    });

    res.status(200).json({ success: true, message: "Đã thu bài toàn bộ học sinh!", data: room });
  } catch (error) {
    console.error("Error ending room:", error);
    res.status(500).json({ success: false, message: "Lỗi khi kết thúc bài thi" });
  }
};


const submitAnswer = async (req, res) => {
  try {
    const { participantId, questionId, selectedAnswer, answerTime } = req.body;
    const parsedQuestionId = parseInt(questionId, 10);

    const question = await prisma.flashcards.findUnique({
      where: { id: parsedQuestionId },
      select: { correct_answers: true, answer: true },
    });

    if (!question) {
      return res.status(404).json({ success: false, message: "Không tìm thấy câu hỏi!" });
    }

    // 👉 Chế độ Đồng bộ: chặn nộp bài TRỄ sau khi giáo viên đã công bố đáp án cho đúng
    // câu này — tránh lệch số liệu (bảng thống kê của giáo viên là ảnh chụp tại lúc công
    // bố, không tự cập nhật nếu có câu trả lời "lẻn vào" sau đó)
    const participant = await prisma.quickTestParticipant.findUnique({
      where: { id: participantId },
      select: { roomId: true },
    });
    if (participant) {
      const room = await prisma.quickTestRoom.findUnique({ where: { id: participant.roomId } });
      if (room?.pacingMode === "SYNC") {
        const order = Array.isArray(room.questionOrder) ? room.questionOrder : [];
        const currentQuestionId = order[room.currentQuestionIndex ?? 0];
        if (room.isRevealed && currentQuestionId === parsedQuestionId) {
          return res.status(400).json({
            success: false,
            message: "Câu này đã được công bố đáp án, không thể nộp bài nữa!",
            tooLate: true,
          });
        }
      }
    }

    // 👉 Chấm điểm ở server, bỏ qua hoàn toàn giá trị "isCorrect" client tự gửi lên
    const isCorrect = gradeAnswer(selectedAnswer, question.correct_answers || question.answer);

    await prisma.quickTestAnswer.create({
      data: {
        participantId,
        questionId: parsedQuestionId,
        selectedAnswer: selectedAnswer ? String(selectedAnswer) : null,
        isCorrect,
        answerTime: parseInt(answerTime)
      }
    });


    let points = 0;
    if (isCorrect) {
      points = 1000;
      const speedBonus = Math.max(0, 500 - (parseInt(answerTime) * 33)); 
      points += speedBonus;
    }

    const updatedParticipant = await prisma.quickTestParticipant.update({
      where: { id: participantId },
      data: {
        score: { increment: points },
        correctCount: { increment: isCorrect ? 1 : 0 },
        wrongCount: { increment: !isCorrect ? 1 : 0 }
      }
    });

    res.status(200).json({
      success: true,
      message: "Ghi nhận đáp án",
      data: { newScore: updatedParticipant.score, addedPoints: points, isCorrect }
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ success: false, message: "Lỗi ghi nhận điểm" });
  }
};

// 👉 Đếm số học sinh chọn từng đáp án cho 1 câu hỏi, trong phạm vi 1 phòng cụ thể
// (QuickTestAnswer không có cột roomId trực tiếp, phải lọc qua quan hệ Participant.roomId)
const computeQuestionDistribution = async (roomId, questionId) => {
  const answers = await prisma.quickTestAnswer.findMany({
    where: { questionId: parseInt(questionId, 10), Participant: { roomId } },
    select: { selectedAnswer: true, isCorrect: true },
  });

  const distribution = {};
  let correctCount = 0;
  let wrongCount = 0;
  for (const a of answers) {
    const key = a.selectedAnswer || "(Không trả lời)";
    distribution[key] = (distribution[key] || 0) + 1;
    if (a.isCorrect) correctCount += 1;
    else wrongCount += 1;
  }

  return { totalAnswered: answers.length, correctCount, wrongCount, distribution };
};

const advanceQuestion = async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode).toUpperCase().trim();
    const { questionIndex } = req.body;

    const existingRoom = await prisma.quickTestRoom.findUnique({ where: { roomCode } });
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: "Phòng QuickTest không tồn tại" });
    }
    if (existingRoom.teacherId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền điều khiển phòng này!" });
    }

    const room = await prisma.quickTestRoom.update({
      where: { roomCode },
      data: {
        currentQuestionIndex: parseInt(questionIndex, 10) || 0,
        questionStartedAt: new Date(),
        isRevealed: false,
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`quicktest_${roomCode}`).emit("question_changed", {
        questionIndex: room.currentQuestionIndex,
        questionStartedAt: room.questionStartedAt,
      });
    }

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    console.error("Error advancing question:", error);
    res.status(500).json({ success: false, message: "Lỗi khi chuyển câu hỏi" });
  }
};

const revealQuestion = async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode).toUpperCase().trim();
    const { questionId } = req.body;

    const existingRoom = await prisma.quickTestRoom.findUnique({ where: { roomCode } });
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: "Phòng QuickTest không tồn tại" });
    }
    if (existingRoom.teacherId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền điều khiển phòng này!" });
    }

    const stats = await computeQuestionDistribution(existingRoom.id, questionId);
    const room = await prisma.quickTestRoom.update({ where: { roomCode }, data: { isRevealed: true } });

    const payload = { questionIndex: room.currentQuestionIndex, questionId: parseInt(questionId, 10), ...stats };

    const io = req.app.get("io");
    if (io) io.to(`quicktest_${roomCode}`).emit("question_revealed", payload);

    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    console.error("Error revealing question:", error);
    res.status(500).json({ success: false, message: "Lỗi khi công bố đáp án" });
  }
};

const getQuestionStats = async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode).toUpperCase().trim();
    const questionId = parseInt(req.params.questionId, 10);

    const existingRoom = await prisma.quickTestRoom.findUnique({ where: { roomCode } });
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: "Phòng QuickTest không tồn tại" });
    }
    if (existingRoom.teacherId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền điều khiển phòng này!" });
    }

    const stats = await computeQuestionDistribution(existingRoom.id, questionId);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching question stats:", error);
    res.status(500).json({ success: false, message: "Lỗi khi lấy thống kê câu hỏi" });
  }
};

const parseOptionsSafe = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// 👉 Điểm 1 câu đúng nhận được, khớp đúng công thức đang dùng ở submitAnswer (1000 nền +
// speed bonus tối đa 500) — dùng để tính điểm trung bình mỗi câu cho màn thống kê cuối bài.
const computePoints = (isCorrect, answerTime) => {
  if (!isCorrect) return 0;
  return 1000 + Math.max(0, 500 - parseInt(answerTime, 10) * 33);
};

// 👉 Chế độ Tự do: thống kê phân bố đáp án cho TỪNG câu, gộp theo NỘI DUNG đáp án
// (selectedAnswer lưu nguyên văn, không phụ thuộc vị trí A/B/C/D đã bị xáo trộn riêng
// cho từng học sinh) — chỉ tiết lộ sau khi bài thi đã kết thúc để không ai còn đang làm
// bài có thể lợi dụng số liệu này đoán ra đáp án đúng.
const getAllQuestionStats = async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode).toUpperCase().trim();
    const room = await prisma.quickTestRoom.findUnique({
      where: { roomCode },
      include: { Exam: { include: { Flashcards: true } } },
    });

    if (!room) {
      return res.status(404).json({ success: false, message: "Phòng QuickTest không tồn tại" });
    }
    if (room.status !== "FINISHED") {
      return res.status(400).json({ success: false, message: "Bài thi chưa kết thúc, chưa thể xem thống kê." });
    }

    const flashcards = room.Exam?.Flashcards || [];
    const stats = await Promise.all(
      flashcards.map(async (card) => {
        const answers = await prisma.quickTestAnswer.findMany({
          where: { questionId: card.id, Participant: { roomId: room.id } },
          select: { selectedAnswer: true, isCorrect: true, answerTime: true },
        });

        const correctAnswersRaw = card.correct_answers || card.answer;
        const options = parseOptionsSafe(card.options);

        const counts = new Map();
        let correctCount = 0;
        let totalPoints = 0;
        for (const a of answers) {
          const key = a.selectedAnswer || "(Không trả lời)";
          counts.set(key, (counts.get(key) || 0) + 1);
          if (a.isCorrect) correctCount += 1;
          totalPoints += computePoints(a.isCorrect, a.answerTime);
        }

        let distribution;
        if (options.length > 0) {
          // 👉 Trắc nghiệm: hiện ĐỦ mọi phương án gốc (kể cả phương án không ai chọn),
          // theo đúng thứ tự gốc của đề — không chỉ liệt kê những gì học sinh đã chọn
          distribution = options.map((opt) => ({
            answer: opt,
            count: counts.get(opt) || 0,
            isCorrect: gradeAnswer(opt, correctAnswersRaw),
          }));
          const noAnswerCount = counts.get("(Không trả lời)") || 0;
          if (noAnswerCount > 0) {
            distribution.push({ answer: "(Không trả lời)", count: noAnswerCount, isCorrect: false });
          }
        } else {
          // 👉 Điền từ: không có sẵn danh sách phương án cố định, gộp theo nội dung đã gõ
          distribution = Array.from(counts.entries())
            .map(([answer, count]) => ({ answer, count, isCorrect: gradeAnswer(answer, correctAnswersRaw) }))
            .sort((a, b) => b.count - a.count);
        }

        return {
          questionId: card.id,
          question: card.question,
          questionType: card.question_type,
          // 👉 Dự phòng cho điền từ (không có "option" nào để tô xanh) — hiện thẳng đáp án đúng
          correctAnswerText: options.find((opt) => gradeAnswer(opt, correctAnswersRaw)) || correctAnswersRaw || "",
          totalAnswered: answers.length,
          correctCount,
          avgAnswerTime: answers.length > 0 ? answers.reduce((sum, a) => sum + a.answerTime, 0) / answers.length : 0,
          avgPoints: answers.length > 0 ? Math.round(totalPoints / answers.length) : 0,
          distribution,
        };
      }),
    );

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error getting all question stats:", error);
    res.status(500).json({ success: false, message: "Lỗi khi lấy thống kê câu hỏi" });
  }
};

module.exports = {
  createRoom,
  getRoom,
  getMyRoom,
  joinRoom,
  getLeaderboard,
  startRoom,
  endRoom,
  submitAnswer,
  advanceQuestion,
  revealQuestion,
  getQuestionStats,
  getAllQuestionStats,
};