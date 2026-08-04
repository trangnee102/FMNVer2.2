// backend/src/controllers/aiController.js
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const prisma = require("../services/prisma");

// Nhập hàm từ utils (Nhưng sẽ bọc an toàn phòng hờ utils báo lỗi)
const aiHelpers = require("../utils/aiHelpers");

// Cấu hình tắt toàn bộ màng lọc an toàn nhạy cảm của Google
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

const generateFlashcards = async (req, res) => {
  try {
    const { text, topic, customPrompt } = req.body;
    let fileContent = "";
    let imagePart = null;

    if (req.file) {
      console.log(`📂 Đang đọc file: ${req.file.originalname}`);
      try {
        if (req.file.mimetype === "application/pdf") {
          const pdfData = await pdfParse(req.file.buffer);
          fileContent = pdfData.text;
        } else if (
          req.file.mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          req.file.mimetype === "application/msword"
        ) {
          try {
            const docxData = await mammoth.extractRawText({
              buffer: req.file.buffer,
            });
            fileContent = docxData.value || "";
          } catch (wordErr) {
            console.error("Lỗi parse Word:", wordErr);
            throw new Error("Không thể đọc được văn bản từ file Word này.");
          }
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
        console.log(
          `📄 Độ dài tài liệu gửi cho AI: ${fileContent.length} ký tự`,
        );
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: `Lỗi đọc file! Chi tiết: ${err.message}`,
        });
      }
    }

    const combinedContent = `${text || ""} ${fileContent || ""}`.trim();

    if (!imagePart && combinedContent.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập nội dung hợp lệ (ít nhất 10 ký tự)!",
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite", // 👉 Giữ nguyên bản chuẩn của sếp
      safetySettings,
      generationConfig: {
        temperature: 0.1, // Bỏ responseMimeType để lấy text thô tự bóc tách cho an toàn
      },
    });

    const prompt = `
NỘI DUNG TÀI LIỆU CỦA NGƯỜI DÙNG:
==================================================
${combinedContent}
==================================================

NHIỆM VỤ CỦA BẠN:
Dựa vào nội dung tài liệu phía trên, hãy thực hiện yêu cầu sau: "${customPrompt || "Tạo bộ thẻ Flashcard"}"

⚠️ QUY TẮC ÉP BUỘC (NẾU VI PHẠM SẼ BỊ HỦY KẾT QUẢ):
1. Đa dạng hóa câu hỏi (So sánh, Điền khuyết, Tại sao...).
2. CHỐNG ẢO GIÁC: CHỈ sử dụng kiến thức có trong tài liệu gốc, không tự bịa đặt.
3. Cố gắng giữ lại các ký hiệu toán học LaTeX sẵn có.
4. BẠN PHẢI SỬ DỤNG CHÍNH XÁC 2 TỪ KHÓA LÀ "front" VÀ "back" CHO MỖI THẺ. Tuyệt đối không dùng "question", "answer", "câu hỏi" hay "đáp án".

HÃY TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU (Tuyệt đối không bọc trong \`\`\`json):
{
  "message": "Đã tạo thẻ bám sát tài liệu thành công!",
  "cards": [
    {
      "front": "Nội dung câu hỏi mặt trước thẻ",
      "back": "Nội dung đáp án mặt sau thẻ"
    }
  ]
}
    `;

    console.log("🚀 Đang gửi dữ liệu cho Google AI...");
    const contents = imagePart ? [prompt, imagePart] : [prompt];

    let result;
    try {
      result = await model.generateContent(contents);
    } catch (aiCallErr) {
      console.error("Lỗi khi kết nối Google AI:", aiCallErr);
      return res.status(500).json({
        success: false,
        message: "Google AI từ chối xử lý (Lỗi kết nối hoặc Key).",
      });
    }

    const responseText = result?.response?.text ? result.response.text() : null;
    if (!responseText) {
      throw new Error(
        "Google AI đã trả kết quả nhưng không thể trích xuất văn bản.",
      );
    }

    console.log("✅ Google AI đã phản hồi thành công!");

    // 👉 LỚP PHÒNG THỦ 1: Lột trần Markdown (Bắt đúng bệnh)
    let cleanText = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // 👉 LỚP PHÒNG THỦ 2: Bọc Try-Catch ép JSON an toàn
    let aiResponse = { cards: [] };
    try {
      if (aiHelpers && typeof aiHelpers.safeParseJSON === "function") {
        aiResponse = aiHelpers.safeParseJSON(cleanText, { cards: [] });
      } else {
        aiResponse = JSON.parse(cleanText);
      }
    } catch (parseError) {
      console.error("🚨 Lỗi Parse JSON! AI Text:", cleanText);
      return res.status(500).json({
        success: false,
        message:
          "Hệ thống AI xử lý xong nhưng trả về dữ liệu bị lệch định dạng. Cậu thử tạo lại nhé!",
      });
    }

    let generatedCards = aiResponse.cards || [];
    if (!Array.isArray(generatedCards)) generatedCards = [];

    // 👉 LỚP PHÒNG THỦ 3: Ép kiểu String để autoWrapMath không bị đột tử
    generatedCards = generatedCards
      .map((card) => {
        let f = String(card.front || card.question || "").trim();
        let b = String(card.back || card.answer || "").trim();

        try {
          if (aiHelpers && typeof aiHelpers.autoWrapMath === "function") {
            f = aiHelpers.autoWrapMath(f);
            b = aiHelpers.autoWrapMath(b);
          }
        } catch (wrapErr) {
          console.warn("Bỏ qua lỗi bọc LaTeX:", wrapErr.message);
        }

        return { front: f, back: b };
      })
      .filter((c) => c.front !== "" && c.back !== "");

    // 👉 LỚP PHÒNG THỦ 4: Shuffle an toàn tuyệt đối
    if (generatedCards.length > 0) {
      try {
        if (aiHelpers && typeof aiHelpers.shuffleArray === "function") {
          generatedCards = aiHelpers.shuffleArray(generatedCards);
        } else {
          generatedCards.sort(() => Math.random() - 0.5);
        }
      } catch (shuffleErr) {
        console.warn("Bỏ qua lỗi trộn thẻ:", shuffleErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: aiResponse.message || "Tớ đã tạo xong bộ thẻ cho cậu!",
      data: generatedCards,
    });
  } catch (error) {
    console.error("❌ Lỗi AI Generate chung:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "Hệ thống AI đang kẹt mạng, cậu thử lại sau nhé!",
    });
  }
};

const saveGeneratedCards = async (req, res) => {
  try {
    const { topic, cards } = req.body;
    const userId = req.user.id;

    if (!cards || cards.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Không có thẻ để lưu!" });

    const deckName = topic || "Thẻ AI tự tạo";
    let deck = await prisma.decks.findFirst({
      where: { title: deckName, user_id: userId, is_exam: false },
    });

    if (!deck) {
      deck = await prisma.decks.create({
        data: {
          title: deckName,
          user_id: userId,
          description: "Bộ thẻ tự động bởi AI",
          is_public: false,
          is_exam: false,
        },
      });
    }

    const flashcardsData = cards.map((card) => ({
      deck_id: deck.id,
      question: card.front,
      answer: card.back,
    }));
    await prisma.flashcards.createMany({ data: flashcardsData });

    return res
      .status(200)
      .json({ success: true, message: `Lưu thành công ${cards.length} thẻ!` });
  } catch (error) {
    console.error("❌ Lỗi Save Cards:", error);
    return res
      .status(500)
      .json({ success: false, message: "Có lỗi khi lưu dữ liệu!" });
  }
};

const refineGeneratedCards = async (req, res) => {
  try {
    const { currentCards, refinePrompt } = req.body;
    if (!currentCards)
      return res
        .status(400)
        .json({ success: false, message: "Chưa có thẻ nào để sửa!" });
    if (!refinePrompt)
      return res
        .status(400)
        .json({ success: false, message: "Chưa có lệnh sửa!" });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite", // 👉 Giữ nguyên
      safetySettings,
      generationConfig: { temperature: 0.1 },
    });

    const prompt = `
Dữ liệu thẻ hiện tại: ${JSON.stringify(currentCards)}. 
Lệnh yêu cầu: "${refinePrompt}". 

QUY TẮC ÉP BUỘC: 
1. CHỐNG ẢO GIÁC: Chỉ áp dụng lệnh sửa chữa lên dữ liệu có sẵn, KHÔNG tự bịa thêm kiến thức mới.

JSON OUTPUT BẮT BUỘC (Không bọc trong markdown):
{
  "message": "Viết 1 câu thông báo...",
  "cards": [
    { "front": "...", "back": "..." }
  ]
}
    `;
    const result = await model.generateContent(prompt);

    const responseText = result?.response?.text ? result.response.text() : null;
    if (!responseText) throw new Error("Phản hồi rỗng");

    let cleanText = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let aiResponse = { cards: [] };
    try {
      if (aiHelpers && typeof aiHelpers.safeParseJSON === "function") {
        aiResponse = aiHelpers.safeParseJSON(cleanText, { cards: [] });
      } else {
        aiResponse = JSON.parse(cleanText);
      }
    } catch (parseError) {
      return res.status(500).json({
        success: false,
        message: "Lỗi sửa thẻ do định dạng AI trả về không hợp lệ!",
      });
    }

    let refinedCards = aiResponse.cards || [];
    refinedCards = refinedCards.map((card) => {
      let f = String(card.front || "").trim();
      let b = String(card.back || "").trim();
      try {
        if (aiHelpers && typeof aiHelpers.autoWrapMath === "function") {
          f = aiHelpers.autoWrapMath(f);
          b = aiHelpers.autoWrapMath(b);
        }
      } catch (e) {}
      return { front: f, back: b };
    });

    return res.status(200).json({
      success: true,
      message:
        aiResponse.message ||
        `✨ Đã áp dụng lệnh '${refinePrompt}' thành công!`,
      data: refinedCards,
    });
  } catch (error) {
    console.error("❌ Lỗi AI Refine:", error);
    return res
      .status(500)
      .json({ success: false, message: "AI đang kẹt mạng, thử lại sau nhé!" });
  }
};

const askAIMentor = async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question) {
      return res
        .status(400)
        .json({ success: false, message: "Câu hỏi không được để trống!" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite", // 👉 Giữ nguyên
      safetySettings,
      generationConfig: { temperature: 0.4 },
    });

    const prompt = `
Bạn là AI Mentor (Gia sư ảo cá nhân) của hệ thống học tập trực tuyến FORGETMENOT. 
Nhiệm vụ của bạn là giải thích bài tập, làm rõ khái niệm, và hướng dẫn sinh viên học tập một cách kiên nhẫn, thân thiện (xưng hô Tớ/Cậu hoặc AI Mentor/Bạn).

NGỮ CẢNH BÀI HỌC (Nếu có):
${context ? `"""\n${context}\n"""` : "Người dùng đang tự hỏi tự do."}

CÂU HỎI CỦA NGƯỜI DÙNG:
"${question}"

HƯỚNG DẪN TRẢ LỜI:
1. Trả lời DỄ HIỂU, KHÔNG QUÁ DÀI DÒNG. Đi thẳng vào trọng tâm.
2. Nếu ngữ cảnh có chứa câu hỏi trắc nghiệm hoặc flashcard, hãy giải thích MỘT CÁCH SƯ PHẠM (Ví dụ: Tại sao đáp án A đúng mà B lại sai).
3. KHÔNG sử dụng Markdown quá phức tạp. Chỉ dùng in đậm, in nghiêng, và danh sách gạch đầu dòng cơ bản.
    `;

    const result = await model.generateContent(prompt);
    const replyText = result?.response?.text ? result.response.text() : null;

    if (!replyText) throw new Error("Lỗi Mentor.");

    return res.status(200).json({
      success: true,
      message: "Phản hồi từ AI Mentor thành công",
      reply: replyText,
    });
  } catch (error) {
    console.error("❌ Lỗi AI Mentor:", error);
    return res.status(500).json({
      success: false,
      message: "AI Mentor đang bận hoặc quá tải lượt gọi, cậu thử lại sau nhé!",
    });
  }
};

module.exports = {
  generateFlashcards,
  saveGeneratedCards,
  refineGeneratedCards,
  askAIMentor,
};