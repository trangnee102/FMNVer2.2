const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const prisma = require("../services/prisma");
const {
  safeParseJSON,
  autoWrapMath,
  shuffleArray,
  verifyQuestionsGrounding,
  flagDifficultyMismatch,
} = require("../utils/aiHelpers");
// 👉 flagDifficultyMismatch vẫn được dùng ở generateAdaptiveExam (đề thích ứng vẫn cần
// difficulty để nhắm điểm yếu học viên) — chỉ generateExam (luồng "Tạo đề bằng AI") bỏ hẳn
// thuộc tính độ khó, vì đây chính là nơi AI đánh giá không đáng tin cậy.

const generateExam = async (req, res) => {
  try {
    const {
      text,
      customPrompt,
      existingQuestions,
      totalQuestions = 50,
      questionsConfig,
    } = req.body;

    let fileContent = "";
    let imagePart = null;

    if (req.file) {
      console.log(`📂 Đang đọc file thi: ${req.file.originalname}`);
      try {
        if (req.file.mimetype === "application/pdf") {
          const pdfData = await pdfParse(req.file.buffer);
          fileContent = pdfData.text;
        } else if (
          req.file.mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          req.file.mimetype === "application/msword"
        ) {
          const docxData = await mammoth.extractRawText({
            buffer: req.file.buffer,
          });
          fileContent = docxData.value;
        } else if (req.file.mimetype.startsWith("image/")) {
          imagePart = {
            inlineData: {
              data: req.file.buffer.toString("base64"),
              mimeType: req.file.mimetype,
            },
          };
        } else {
          return res
            .status(400)
            .json({ success: false, message: "Định dạng file không hỗ trợ!" });
        }
      } catch (err) {
        console.error("Lỗi đọc file:", err);
        return res
          .status(500)
          .json({ success: false, message: "Lỗi đọc file!" });
      }
    }

    const combinedContent = `${text || ""} ${fileContent || ""}`.trim();

    console.log(
      `📄 Độ dài tài liệu gửi cho AI: ${combinedContent.length} ký tự`,
    );

    if (!imagePart && combinedContent.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp nội dung đủ dài để tạo đề!",
      });
    }

    let parsedExisting = [];
    if (existingQuestions) {
      try {
        parsedExisting = JSON.parse(existingQuestions);
      } catch (e) {
        console.log("Không có dữ liệu câu hỏi cũ hợp lệ.");
      }
    }
    const antiDuplicationPrompt =
      parsedExisting.length > 0
        ? `\n⚠️ CÁC CÂU HỎI ĐÃ CÓ (BẮT BUỘC KHÔNG ĐƯỢC TẠO TRÙNG NỘI DUNG/Ý NGHĨA VỚI CÁC CÂU NÀY):\n${parsedExisting.map((q) => "- " + q.question).join("\n")}\n`
        : "";

    let matrixRules = "";
    if (questionsConfig) {
      try {
        const configArray = JSON.parse(questionsConfig);
        matrixRules =
          "MA TRẬN CẤU TRÚC ĐỀ THI (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT THỨ TỰ NÀY):\n";
        configArray.forEach((q, index) => {
          matrixRules += `- Câu ${index + 1}: Thể loại: ${q.type}.\n`;
        });
      } catch (e) {
        console.log("Lỗi parse questionsConfig:", e);
      }
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const safeContent = combinedContent.substring(0, 35000);

    const prompt = `
NỘI DUNG TÀI LIỆU CỦA NGƯỜI DÙNG:
==================================================
${safeContent}
==================================================

NHIỆM VỤ CỦA BẠN:
Đóng vai một giáo viên chuyên nghiệp. Dựa CHỈ VÀO nội dung tài liệu phía trên, hãy tạo một ĐỀ THI TRẮC NGHIỆM. 
YÊU CẦU CỤ THỂ TỪ NGƯỜI DÙNG: 
"${customPrompt || "Tạo câu hỏi dựa trên cấu trúc tài liệu"}"

${matrixRules}
${antiDuplicationPrompt}

⚠️ 1. CHỐNG ẢO GIÁC & CHỐNG TRÙNG LẶP:
- Mọi câu hỏi, đáp án, và lời giải thích PHẢI được trích xuất 100% từ tài liệu cung cấp. KHÔNG ĐƯỢC BỊA ĐẶT.
- NẾU tài liệu quá ngắn, hãy dừng việc tạo câu hỏi lại khi hết kiến thức. KHÔNG CỐ TẠO CHO ĐỦ SỐ LƯỢNG NẾU PHẢI BỊA THÊM.

⚠️ 2. QUY TẮC ÉP BUỘC ĐỊNH DẠNG THEO TỪNG LOẠI CÂU HỎI:
- Loại SINGLE_CHOICE: "options" có đúng 4 phần tử. "correct_answers" ghi đúng 1 chữ cái (Vd: "A").
- Loại MULTIPLE_CHOICE: "options" có đúng 4 phần tử. "correct_answers" ghi TỪ 2 chữ cái trở lên cách nhau bằng dấu phẩy (Vd: "A,C").
- Loại TRUE_FALSE: "options" CHỈ CÓ ĐÚNG 2 phần tử là ["A. Đúng", "B. Sai"]. "correct_answers" ghi "A" hoặc "B".
- Loại FILL_BLANK: "options" BẮT BUỘC RỖNG []. "correct_answers" ghi chính xác từ/cụm từ cần điền.

⚠️ 3. QUY TẮC BẮT BUỘC VỀ ĐẦU RA JSON:
BẠN PHẢI TRẢ VỀ ĐÚNG 1 OBJECT JSON VỚI CẤU TRÚC SAU:
{
  "message": "Thông báo trạng thái...",
  "questions": [
    {
      "question": "Nội dung câu hỏi",
      "question_type": "SINGLE_CHOICE hoặc MULTIPLE_CHOICE hoặc TRUE_FALSE hoặc FILL_BLANK",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answers": "A",
      "source_reference": "Đoạn văn trích...",
      "explanation": "Giải thích...",
      "keywords": "từ khóa 1, từ khóa 2"
    }
  ]
}
    `;

    const contents = imagePart ? [prompt, imagePart] : [prompt];
    const result = await model.generateContent(contents);

    let rawText = result.response.text();
    let aiResponse = { message: "Lỗi định dạng", questions: [] };

    try {
      aiResponse = JSON.parse(rawText);
    } catch (e1) {
      try {
        let cleanText = rawText
          .replace(new RegExp("```json", "gi"), "")
          .replace(new RegExp("```", "gi"), "")
          .trim();
        const firstBrace = cleanText.indexOf("{");
        const lastBrace = cleanText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanText = cleanText.substring(firstBrace, lastBrace + 1);
          aiResponse = JSON.parse(cleanText);
        }
      } catch (e2) {
        console.error("❌ Cứu hộ JSON thất bại:", e2.message);
      }
    }

    let generatedQuestions = aiResponse.questions || [];

    generatedQuestions = generatedQuestions.map((q) => ({
      ...q,
      question: autoWrapMath(q.question),
      options: (q.options || []).map((opt) => autoWrapMath(opt)),
    }));

    // 👉 Kiểm tra "bám sát tài liệu" bằng string-matching thuần (không tốn thêm lệnh gọi
    // AI nào) — so source_reference AI trả về với NGUYÊN VĂN tài liệu người dùng cung cấp,
    // đánh dấu groundingSuspicious cho câu nào trích dẫn không thật sự khớp, để giáo viên
    // biết đường xem lại trước khi lưu (prompt chỉ NHẮC AI đừng bịa, không RÀNG BUỘC được)
    generatedQuestions = verifyQuestionsGrounding(generatedQuestions, combinedContent);

    if (generatedQuestions.length === 0) {
      return res.status(200).json({
        success: false,
        message:
          "Nội dung tài liệu quá ngắn hoặc không đủ dữ kiện để AI tạo thêm câu hỏi. Bạn vui lòng bổ sung thêm tài liệu nhé!",
        data: [],
      });
    }

    const suspiciousCount = generatedQuestions.filter((q) => q.groundingSuspicious).length;

    let responseMessage = aiResponse.message || "Đã tạo đề thi thành công!";
    if (generatedQuestions.length < totalQuestions) {
      responseMessage = `Đã tạo được ${generatedQuestions.length}/${totalQuestions} câu. Các câu còn lại đã bị hủy vì tài liệu không đủ dữ kiện học thuật (Nhằm tránh AI bịa đặt kiến thức).`;
    }
    if (suspiciousCount > 0) {
      responseMessage += ` ⚠️ ${suspiciousCount} câu có trích dẫn không khớp rõ với tài liệu gốc, hãy kiểm tra lại trước khi lưu.`;
    }

    return res.status(200).json({
      success: true,
      message: responseMessage,
      data: generatedQuestions,
    });
  } catch (error) {
    console.error("❌ Lỗi AI Generate Exam:", error);
    if (
      error.status === 429 ||
      (error.message && error.message.includes("429"))
    ) {
      return res.status(429).json({
        success: false,
        message:
          "⏳ Hệ thống AI đang quá tải lượt miễn phí. Vui lòng thử lại sau!",
      });
    }
    return res.status(500).json({ success: false, message: "Lỗi máy chủ AI!" });
  }
};

const generateAdaptiveExam = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { deckId } = req.params;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Chưa xác thực người dùng!" });
    }

    const userLogs = await prisma.studyLogs.findMany({
      where: { user_id: userId, deck_id: parseInt(deckId) },
      include: { Flashcards: true },
    });

    const weakKeywordsMap = {};
    userLogs.forEach((log) => {
      if (log.rating <= 2 && log.Flashcards?.keywords) {
        const kws = log.Flashcards.keywords.split(",").map((k) => k.trim());
        kws.forEach((kw) => {
          weakKeywordsMap[kw] = (weakKeywordsMap[kw] || 0) + 1;
        });
      }
    });

    const weakKeywords = Object.keys(weakKeywordsMap);

    const deckCards = await prisma.flashcards.findMany({
      where: { deck_id: parseInt(deckId) },
    });

    if (deckCards.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Bộ thẻ trống, không thể tạo đề thích ứng!",
      });
    }

    const sourceMaterial = deckCards
      .map((c) => `Q: ${c.question} - A: ${c.answer} (Keywords: ${c.keywords})`)
      .join("\n");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const adaptivePrompt = `
Dựa vào ngân hàng câu hỏi gốc của bộ thẻ:
${sourceMaterial}

DỮ LIỆU PHÂN TÍCH HỌC TẬP CỦA HỌC VIÊN:
- Học viên đang gặp nhiều khó khăn (hay trả lời sai/quên) ở các chủ đề/từ khóa sau: ${weakKeywords.length > 0 ? weakKeywords.join(", ") : "Chưa có dữ liệu yếu cụ thể, hãy tạo đề cân bằng các mức độ"}.

NHIỆM VỤ THÍCH ỨNG (ADAPTIVE LEARNING):
Hãy tạo ra một đề thi ôn tập gồm 10 câu hỏi trắc nghiệm tập trung khắc phục điểm yếu của học viên:
1. Ưu tiên sinh thêm câu hỏi xoáy sâu vào các từ khóa học viên đang yếu.
2. Điều chỉnh độ khó phù hợp (từ EASY lên MEDIUM) để củng cố kiến thức. Phân loại độ khó theo
   ĐÚNG 3 mức sau, không tự ý phán đoán: EASY = chỉ cần nhớ lại trực tiếp 1 định nghĩa/sự kiện
   có sẵn nguyên văn; MEDIUM = cần hiểu và liên kết từ 2 chi tiết trở lên; HARD = cần suy luận
   hoặc áp dụng khái niệm, nhưng vẫn dựa hoàn toàn trên ngân hàng câu hỏi gốc.
3. Chống ảo giác: Chỉ sử dụng thông tin từ ngân hàng câu hỏi gốc.
4. TỰ KIỂM TRA (độc lập với "difficulty", không dùng để tự sửa "difficulty"): với mỗi câu, tự
   hỏi "Nếu bỏ hết tên riêng/số liệu cụ thể đi, câu này có còn cần suy luận không?" và ghi câu
   trả lời trung thực vào "requires_reasoning" (true/false) — giữ nguyên "difficulty" dù 2
   trường này không khớp nhau.

Trả về JSON đúng cấu trúc sau:
{
  "message": "Đã tạo đề thi thích ứng dựa trên điểm yếu của bạn!",
  "questions": [
    {
      "question": "...",
      "question_type": "SINGLE_CHOICE",
      "difficulty": "MEDIUM",
      "requires_reasoning": true,
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answers": "A",
      "source_reference": "...",
      "explanation": "...",
      "keywords": "..."
    }
  ]
}
    `;

    const result = await model.generateContent(adaptivePrompt);
    const aiResponse = JSON.parse(result.response.text());
    // 👉 Đề thích ứng lấy nguồn từ chính ngân hàng câu hỏi của bộ thẻ (sourceMaterial),
    // không phải tài liệu gốc — kiểm tra bám sát + dò nhãn khó giả tương tự generateExam
    let groundedQuestions = verifyQuestionsGrounding(aiResponse.questions || [], sourceMaterial);
    groundedQuestions = flagDifficultyMismatch(groundedQuestions);

    return res.status(200).json({
      success: true,
      message: aiResponse.message || "Tạo đề thích ứng thành công!",
      data: groundedQuestions,
    });
  } catch (error) {
    console.error("❌ Lỗi Adaptive Exam:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống khi tạo đề thích ứng!" });
  }
};

const editQuestionWithAI = async (req, res) => {
  try {
    const { questionData, editPrompt } = req.body;

    if (!questionData || !editPrompt) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu câu hỏi hoặc yêu cầu chỉnh sửa!",
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const prompt = `
Bạn là một trợ lý AI chuyên nghiệp giúp giáo viên biên tập câu hỏi trắc nghiệm.
Dưới đây là một câu hỏi trắc nghiệm hiện tại (định dạng JSON):
${JSON.stringify(questionData, null, 2)}

YÊU CẦU CHỈNH SỬA CỦA GIÁO VIÊN: "${editPrompt}"

NHIỆM VỤ CỦA BẠN:
1. Hãy chỉnh sửa câu hỏi trên theo đúng yêu cầu của giáo viên (Ví dụ: Đổi đáp án, sửa lỗi chính tả, thay đổi câu hỏi...).
2. Nếu việc đổi đáp án làm sai lệch kiến thức, hãy CẬP NHẬT LẠI trường "explanation" (giải thích) cho phù hợp với đáp án mới.
3. TUYỆT ĐỐI GIỮ NGUYÊN cấu trúc các key của JSON.

BẠN PHẢI TRẢ VỀ ĐÚNG 1 OBJECT JSON ĐÃ ĐƯỢC CHỈNH SỬA (Không thêm chữ nào khác):
{
  "question": "...",
  "question_type": "...",
  "options": ["A. ...", "B. ..."],
  "correct_answers": "...",
  "source_reference": "...",
  "explanation": "...",
  "keywords": "..."
}
    `;

    const result = await model.generateContent(prompt);
    let rawText = result.response.text();
    let editedQuestion = null;

    try {
      editedQuestion = JSON.parse(rawText);
    } catch (e1) {
      try {
        let cleanText = rawText
          .replace(new RegExp("```json", "gi"), "")
          .replace(new RegExp("```", "gi"), "")
          .trim();
        editedQuestion = JSON.parse(
          cleanText.substring(
            cleanText.indexOf("{"),
            cleanText.lastIndexOf("}") + 1,
          ),
        );
      } catch (e2) {
        console.error("❌ Cứu hộ Edit JSON thất bại:", e2.message);
      }
    }

    if (!editedQuestion || !editedQuestion.question) {
      return res.status(400).json({
        success: false,
        message: "AI không thể xử lý yêu cầu chỉnh sửa này.",
      });
    }

    return res.status(200).json({ success: true, data: editedQuestion });
  } catch (error) {
    console.error("❌ Lỗi AI Edit Question:", error);
    if (
      error.status === 429 ||
      (error.message && error.message.includes("429"))
    ) {
      return res.status(429).json({
        success: false,
        message: "Hệ thống AI đang bận, vui lòng thử lại sau!",
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Có lỗi khi nhờ AI chỉnh sửa!" });
  }
};

const saveGeneratedExam = async (req, res) => {
  try {
    const { topic, description, is_public, questions } = req.body;
    const userId = parseInt(req.user.id, 10) || req.user.id;

    if (!questions || questions.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Không có câu hỏi để lưu!" });

    const deckName = topic || "Đề thi tự động bởi AI";

    let deck = await prisma.decks.findFirst({
      where: {
        title: deckName,
        user_id: userId,
        is_exam: true,
      },
    });

    if (!deck) {
      deck = await prisma.decks.create({
        data: {
          title: deckName,
          user_id: userId,
          description: description || "Đề thi tạo bằng AI hoặc tạo thủ công",
          is_public: is_public || false,
          is_exam: true,
        },
      });
    } else {
      console.log(
        `♻️ Đã tìm thấy Đề thi cũ "${deckName}", tiến hành gộp dữ liệu...`,
      );
    }

    const validQuestionTypes = ["FLASHCARD", "TRUE_FALSE", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "FILL_BLANK"];
    const validDifficulties = ["EASY", "MEDIUM", "HARD"];
    const validCategories = ["THEORY", "PRACTICE"];

    const flashcardsData = questions.map((q) => {
      let safeType = "SINGLE_CHOICE";
      if (q.question_type && validQuestionTypes.includes(q.question_type.toUpperCase())) {
        safeType = q.question_type.toUpperCase();
      } else if (q.question_type) {
        const upType = q.question_type.toUpperCase();
        if (upType.includes("MULTIPLE")) safeType = "MULTIPLE_CHOICE";
        else if (upType.includes("TRUE") || upType.includes("FALSE"))
          safeType = "TRUE_FALSE";
        else if (upType.includes("BLANK") || upType.includes("FILL"))
          safeType = "FILL_BLANK";
      }

      let safeDiff = "MEDIUM";
      if (q.difficulty && validDifficulties.includes(q.difficulty.toUpperCase())) {
        safeDiff = q.difficulty.toUpperCase();
      } else if (q.difficulty) {
        const upDiff = q.difficulty.toUpperCase();
        if (upDiff.includes("EASY") || upDiff.includes("DỄ")) safeDiff = "EASY";
        else if (upDiff.includes("HARD") || upDiff.includes("KHÓ"))
          safeDiff = "HARD";
      }

      let safeCat = "THEORY";
      if (q.category && validCategories.includes(q.category.toUpperCase())) {
        safeCat = q.category.toUpperCase();
      }

      let safeKeywords = "";
      if (q.keywords) {
        if (Array.isArray(q.keywords)) {
          safeKeywords = q.keywords.join(", ");
        } else {
          safeKeywords = String(q.keywords);
        }
      }

      const optionsString = Array.isArray(q.options) 
        ? JSON.stringify(q.options) 
        : String(q.options || "[]");

      return {
        deck_id: deck.id,
        question: String(q.question || ""),
        answer: String(q.correct_answers || ""),
        question_type: safeType,
        difficulty: safeDiff,
        category: safeCat,
        options: optionsString,
        correct_answers: String(q.correct_answers || ""),
        source_reference: String(q.source_reference || ""),
        explanation: String(q.explanation || ""),
        keywords: safeKeywords,
      };
    });

    await prisma.flashcards.createMany({ data: flashcardsData });

    return res.status(200).json({
      success: true,
      message: `Lưu thành công đề thi với ${questions.length} câu hỏi!`,
    });
  } catch (error) {
    console.error("❌ Lỗi Save Exam:", error);
    return res
      .status(500)
      .json({ success: false, message: "Có lỗi khi lưu đề thi!" });
  }
};

module.exports = {
  generateExam,
  generateAdaptiveExam,
  saveGeneratedExam,
  editQuestionWithAI,
};