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
    const { examId, title, duration } = req.body;

    const roomCode = await generateRoomCode();

    const room = await prisma.quickTestRoom.create({
      data: {
        roomCode,
        teacherId,
        examId: examId ? parseInt(examId) : null,
        title: title || "Bài kiểm tra nhanh",
        duration: duration ? parseInt(duration) : 15 * 60,
        status: "WAITING",
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
          select: { title: true, Flashcards: { select: { id: true, question: true, options: true, question_type: true } } }
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

    const question = await prisma.flashcards.findUnique({
      where: { id: parseInt(questionId) },
      select: { correct_answers: true, answer: true },
    });

    if (!question) {
      return res.status(404).json({ success: false, message: "Không tìm thấy câu hỏi!" });
    }

    // 👉 Chấm điểm ở server, bỏ qua hoàn toàn giá trị "isCorrect" client tự gửi lên
    const isCorrect = gradeAnswer(selectedAnswer, question.correct_answers || question.answer);

    await prisma.quickTestAnswer.create({
      data: {
        participantId,
        questionId: parseInt(questionId),
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
      data: { newScore: updatedParticipant.score, addedPoints: points } 
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ success: false, message: "Lỗi ghi nhận điểm" });
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
  submitAnswer
};