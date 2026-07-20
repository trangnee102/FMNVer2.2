// backend/src/controllers/aiController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const prisma = require("../services/prisma");

// 👉 KHIÊN BẢO VỆ JSON
const safeParseJSON = (rawText) => {
  try {
    let cleanText = rawText
      .replace(/```json/gi, "")
      .replace(/```/gi, "")
      .trim();
    cleanText = cleanText.replace(/(?<!\\)\\(?!["\\/bfnrt])/g, "\\\\");
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Lỗi parse JSON:", error);
    return {
      message: "Hệ thống AI xử lý xong nhưng bị lệch định dạng đôi chút!",
      cards: [],
    };
  }
};

const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// 🛡️ VŨ KHÍ TỐI THƯỢNG: Tự động lùng sục mọi chữ có dấu gạch chéo (\) và bọc $ vào nếu chưa có
const autoWrapMath = (text) => {
  if (!text) return "";
  let processed = text;

  // Nếu chuỗi đã có dấu $ rồi thì giữ nguyên, còn nếu chứa các từ khóa toán học mà trần trụi thì tự động bọc $
  // Quét các từ khóa phổ biến: \sin, \cos, \tan, \alpha, \beta, \pi, \frac, \left, \right
  const mathKeywords =
    /\\(sin|cos|tan|cot|arcsin|arccos|arctan|alpha|beta|gamma|theta|pi|varphi|sigma|frac|left|right|sqrt|sum|int|cdot|pm|mp|leq|geq|neq|approx|infty)/g;

  if (mathKeywords.test(processed) && !processed.includes("$")) {
    // Tạm thời bao toàn bộ chuỗi hoặc tách các cụm chứa lệnh latex để bọc $
    // Cách an toàn nhất cho Flashcard học tập: Nếu có lệnh toán học mà chưa có $, bọc cả câu hoặc đoạn công thức đó vào $
    processed = `$${processed}$`;
  }

  return processed;
};

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
3. Cố gắng giữ lại các ký hiệu toán học LaTeX sẵn có từ tài liệu gốc.

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

    const aiResponse = safeParseJSON(result.response.text());

    let generatedCards = aiResponse.cards || [];

    // 🛡️ TỰ ĐỘNG BỌC TOÁN HỌC CHO TỪNG THẺ TRƯỚC KHI TRẢ VỀ FRONTEND
    generatedCards = generatedCards.map((card) => ({
      front: autoWrapMath(card.front),
      back: autoWrapMath(card.back),
    }));

    if (generatedCards.length > 0) {
      generatedCards = shuffleArray(generatedCards);
    }

    const finalMessage =
      aiResponse.message || "Tớ đã tạo xong bộ thẻ liên kết chéo cho cậu!";

    return res.status(200).json({
      success: true,
      message: finalMessage,
      data: generatedCards,
    });
  } catch (error) {
    console.error("❌ Lỗi AI Generate:", error);
    return res.status(500).json({
      success: false,
      message:
        "Hệ thống AI đang kẹt mạng hoặc hết lượt dùng, cậu thử lại sau vài giây nhé!",
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
      where: { title: deckName, user_id: userId },
    });

    if (!deck) {
      deck = await prisma.decks.create({
        data: {
          title: deckName,
          user_id: userId,
          description: "Bộ thẻ tự động bởi AI",
          is_public: false,
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
      throw new Error("Phản hồi từ Google AI bị rỗng hoặc lỗi kết nối.");
    }

    const aiResponse = safeParseJSON(result.response.text());

    let refinedCards = aiResponse.cards || [];
    refinedCards = refinedCards.map((card) => ({
      front: autoWrapMath(card.front),
      back: autoWrapMath(card.back),
    }));

    const finalMessage =
      aiResponse.message || `✨ Đã áp dụng lệnh '${refinePrompt}' thành công!`;

    return res.status(200).json({
      success: true,
      message: finalMessage,
      data: refinedCards,
    });
  } catch (error) {
    console.error("❌ Lỗi AI Refine:", error);
    return res.status(500).json({
      success: false,
      message: "AI đang kẹt mạng hoặc hết lượt dùng, thử lại sau vài giây nhé!",
    });
  }
};

module.exports = {
  generateFlashcards,
  saveGeneratedCards,
  refineGeneratedCards,
};
