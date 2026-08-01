// backend/src/controllers/aiExamController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const prisma = require("../services/prisma");
const {
  safeParseJSON,
  autoWrapMath,
  shuffleArray,
} = require("../utils/aiHelpers");

const generateExam = async (req, res) => {
  try {
    const { text, customPrompt, existingQuestions } = req.body;
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

    // 👉 Chống trùng lặp: Parse danh sách câu hỏi đã có (nếu là đợt bổ sung)
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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2, // Giữ độ sáng tạo thấp để AI bám sát văn bản
      },
    });

    const safeContent = combinedContent.substring(0, 35000);

    // 👉 ĐÃ NÂNG CẤP LUẬT THÉP: Chặn đứng tình trạng "Cố đấm ăn xôi" bịa thông tin
    const prompt = `
NỘI DUNG TÀI LIỆU CỦA NGƯỜI DÙNG:
==================================================
${safeContent}
==================================================

NHIỆM VỤ CỦA BẠN:
Đóng vai một giáo viên chuyên nghiệp. Dựa CHỈ VÀO nội dung tài liệu phía trên, hãy tạo một ĐỀ THI TRẮC NGHIỆM. 
YÊU CẦU CỤ THỂ TỪ NGƯỜI DÙNG: 
"${customPrompt || "Tạo 10 câu hỏi đa dạng"}"
${antiDuplicationPrompt}

⚠️ QUY TẮC ÉP BUỘC CHỐNG BỊA ĐẶT (RẤT QUAN TRỌNG):
- NẾU tài liệu quá ngắn hoặc không chứa đủ lượng thông tin học thuật để sinh ra đúng số lượng câu hỏi yêu cầu, bạn HÃY DỪNG LẠI và CHỈ TẠO RA SỐ LƯỢNG TỐI ĐA có thể rút ra từ văn bản. 
- TUYỆT ĐỐI KHÔNG bịa đặt kiến thức bên ngoài. Nếu tài liệu vô nghĩa hoặc quá ngắn, hãy trả về mảng "questions" RỖNG [].

⚠️ QUY TẮC ÉP BUỘC ĐỊNH DẠNG CÂU HỎI:
1. Phân biệt CHÍNH XÁC "question_type" và "correct_answers":
   - SINGLE_CHOICE: Trắc nghiệm 1 đáp án đúng. "correct_answers" ghi 1 chữ cái (Ví dụ: "A").
   - MULTIPLE_CHOICE: Trắc nghiệm TỪ 2 ĐÁP ÁN ĐÚNG TRỞ LÊN. "correct_answers" ghi các chữ cái cách nhau (Ví dụ: "A,C").
   - TRUE_FALSE: Đúng/Sai. Mảng options luôn là ["A. True", "B. False"].
   - FILL_BLANK: Điền khuyết. Để mảng options RỖNG []. "correct_answers" ghi chính xác từ cần điền.
2. CHỐNG HALLUCINATION & HỖ TRỢ HỌC TẬP:
   - "source_reference": Trích dẫn chính xác đoạn văn gốc.
   - "explanation": Giải thích chi tiết tại sao đáp án đúng.
   - "keywords": 2-4 từ khóa, cách nhau bằng dấu phẩy.
3. Mảng "options" BẮT BUỘC phải có tiền tố "A. ", "B. ", "C. ", "D. " ở đầu.

⚠️ QUY TẮC ÉP BUỘC TRẢ VỀ JSON:
Bạn PHẢI trả về ĐÚNG MỘT OBJECT JSON duy nhất:
{
  "message": "Đã tạo đề thi thành công!",
  "questions": [
    {
      "question": "Nội dung...",
      "question_type": "SINGLE_CHOICE",
      "difficulty": "MEDIUM",
      "category": "THEORY",
      "options": ["A. Đáp án 1", "B. Đáp án 2", "C. Đáp án 3", "D. Đáp án 4"],
      "correct_answers": "B",
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
          .replace(/```json/gi, "")
          .replace(/```/gi, "")
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

    if (generatedQuestions.length > 0 && !existingQuestions) {
      generatedQuestions = shuffleArray(generatedQuestions);
    }

    // 👉 Kiểm duyệt gắt gao: Nếu AI trả về rỗng vì không bóc được thông tin
    if (generatedQuestions.length === 0) {
      return res.status(200).json({
        success: false,
        message:
          "Nội dung tài liệu quá ngắn hoặc không đủ dữ kiện để AI tạo thêm câu hỏi. Bạn vui lòng bổ sung thêm tài liệu nhé!",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: aiResponse.message || "Đã tạo đề thi thành công!",
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

// 👉 TÍNH NĂNG MỚI: CHỈNH SỬA CÂU HỎI BẰNG AI CỰC KỲ THÔNG MINH
const editQuestionWithAI = async (req, res) => {
  try {
    const { questionData, editPrompt } = req.body;

    if (!questionData || !editPrompt) {
      return res
        .status(400)
        .json({
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
      }, // Gần như bằng 0 để tránh bịa đặt
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
  "difficulty": "...",
  "category": "...",
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
      let cleanText = rawText
        .replace(/```json/gi, "")
        .replace(/```/gi, "")
        .trim();
      editedQuestion = JSON.parse(
        cleanText.substring(
          cleanText.indexOf("{"),
          cleanText.lastIndexOf("}") + 1,
        ),
      );
    }

    if (!editedQuestion || !editedQuestion.question) {
      return res
        .status(400)
        .json({
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
      return res
        .status(429)
        .json({
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
    const { topic, questions } = req.body;
    const userId = req.user.id;

    if (!questions || questions.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Không có câu hỏi để lưu!" });

    const deckName = topic || "Đề thi tự động bởi AI";

    const deck = await prisma.decks.create({
      data: {
        title: deckName,
        user_id: userId,
        description: "Đề thi tạo bằng AI",
        is_public: false,
        is_exam: true,
      },
    });

    const flashcardsData = questions.map((q) => ({
      deck_id: deck.id,
      question: q.question,
      answer: q.correct_answers,
      question_type: q.question_type,
      difficulty: q.difficulty,
      category: q.category || "GENERAL",
      options: JSON.stringify(q.options || []),
      correct_answers: q.correct_answers,
      source_reference: q.source_reference || "",
      keywords: q.keywords || "",
      explanation: q.explanation || "",
    }));

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
  saveGeneratedExam,
  editQuestionWithAI, // 👉 KHAI BÁO HÀM MỚI Ở ĐÂY ĐỂ ROUTER GỌI ĐƯỢC
};
