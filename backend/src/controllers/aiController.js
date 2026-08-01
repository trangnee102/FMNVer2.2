// backend/src/controllers/aiController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const prisma = require("../services/prisma");
// Nhúng các hàm phụ trợ vào
const {
  safeParseJSON,
  shuffleArray,
  autoWrapMath,
} = require("../utils/aiHelpers");

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
        return res
          .status(500)
          .json({ success: false, message: "Lỗi đọc file!" });
      }
    }

    const combinedContent = `${text || ""} ${fileContent || ""}`.trim();

    if (!imagePart && combinedContent.length < 10) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập nội dung hợp lệ!" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const prompt = `
NỘI DUNG TÀI LIỆU CỦA NGƯỜI DÙNG:
==================================================
${combinedContent}
==================================================

NHIỆM VỤ CỦA BẠN:
Dựa vào nội dung tài liệu phía trên, hãy thực hiện yêu cầu sau: "${customPrompt || "Tạo bộ thẻ Flashcard"}"

⚠️ QUY TẮC ÉP BUỘC:
1. Đa dạng hóa câu hỏi (So sánh, Điền khuyết, Tại sao...).
2. CHỐNG ẢO GIÁC: CHỈ sử dụng kiến thức có trong tài liệu gốc, không tự bịa đặt.
3. Cố gắng giữ lại các ký hiệu toán học LaTeX sẵn có.

HÃY TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU:
{
  "message": "Đã tạo thẻ bám sát tài liệu thành công!",
  "cards": [
    {
      "front": "Câu hỏi...",
      "back": "Đáp án..."
    }
  ]
}
    `;

    const contents = imagePart ? [prompt, imagePart] : [prompt];
    const result = await model.generateContent(contents);

    if (
      !result ||
      !result.response ||
      typeof result.response.text !== "function"
    ) {
      throw new Error("Phản hồi từ Google AI bị rỗng hoặc lỗi kết nối.");
    }

    const fallback = {
      message: "Hệ thống AI xử lý xong nhưng bị lệch định dạng!",
      cards: [],
    };
    const aiResponse = safeParseJSON(result.response.text(), fallback);
    let generatedCards = aiResponse.cards || [];

    generatedCards = generatedCards.map((card) => ({
      front: autoWrapMath(card.front),
      back: autoWrapMath(card.back),
    }));

    if (generatedCards.length > 0) {
      generatedCards = shuffleArray(generatedCards);
    }

    return res.status(200).json({
      success: true,
      message: aiResponse.message || "Tớ đã tạo xong bộ thẻ cho cậu!",
      data: generatedCards,
    });
  } catch (error) {
    console.error("❌ Lỗi AI Generate:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Hệ thống AI đang kẹt mạng, cậu thử lại sau nhé!",
      });
  }
};

const saveGeneratedCards = async (req, res) => {
  try {
    const { topic, cards } = req.body;
    // 🛠️ CHỐT CHẶN POSTGRESQL: Ép kiểu user.id về số nguyên tuyệt đối
    const userId = parseInt(req.user.id, 10);

    if (!cards || cards.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Không có thẻ để lưu!" });

    const deckName = topic || "Thẻ AI tự tạo";
    let deck = await prisma.decks.findFirst({
      where: { title: deckName, user_id: userId, is_exam: false }, // Đảm bảo không lưu lộn vào bảng đề thi
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

    // 🛠️ CHỐT CHẶN POSTGRESQL: Đảm bảo deck_id truyền vào bảng flashcards cũng là số nguyên
    const flashcardsData = cards.map((card) => ({
      deck_id: parseInt(deck.id, 10),
      question: card.front,
      answer: card.back,
    }));
    await prisma.flashcards.createMany({ data: flashcardsData });

    // ĐÃ SỬA: Bỏ các dấu gạch chéo ngược (\)
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
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const prompt = `
Dữ liệu thẻ hiện tại: ${JSON.stringify(currentCards)}. 
Lệnh yêu cầu: "${refinePrompt}". 

QUY TẮC ÉP BUỘC: 
1. CHỐNG ẢO GIÁC: Chỉ áp dụng lệnh sửa chữa lên dữ liệu có sẵn, KHÔNG tự bịa thêm kiến thức mới.

JSON OUTPUT BẮT BUỘC:
{
  "message": "Viết 1 câu thông báo...",
  "cards": [
    { "front": "...", "back": "..." }
  ]
}
    `;
    const result = await model.generateContent(prompt);

    if (
      !result ||
      !result.response ||
      typeof result.response.text !== "function"
    ) {
      throw new Error("Phản hồi từ Google AI bị rỗng.");
    }

    const fallback = { message: "Lỗi sửa chữa!", cards: [] };
    const aiResponse = safeParseJSON(result.response.text(), fallback);
    let refinedCards = aiResponse.cards || [];

    refinedCards = refinedCards.map((card) => ({
      front: autoWrapMath(card.front),
      back: autoWrapMath(card.back),
    }));

    // ĐÃ SỬA: Bỏ các dấu gạch chéo ngược (\)
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

module.exports = {
  generateFlashcards,
  saveGeneratedCards,
  refineGeneratedCards,
};
