// File: backend/src/services/flashcardService.js
const prisma = require("./prisma"); // Nằm cùng thư mục services nên chỉ cần './prisma'

// 1. Lấy danh sách thẻ
const getCards = async (deckId, userId) => {
  const deck = await prisma.decks.findFirst({
    where: { id: deckId, user_id: userId },
  });
  if (!deck)
    throw new Error("Bộ thẻ không tồn tại hoặc bạn không có quyền xem!");

  return await prisma.flashcards.findMany({
    where: { deck_id: deckId },
    orderBy: { id: "asc" },
  });
};

// 2. Thêm thẻ mới
const createCard = async (deckId, userId, question, answer) => {
  const deck = await prisma.decks.findFirst({
    where: { id: deckId, user_id: userId },
  });
  if (!deck)
    throw new Error("Bộ thẻ không tồn tại hoặc bạn không có quyền thêm thẻ!");

  return await prisma.flashcards.create({
    data: { deck_id: deckId, question, answer },
  });
};

// 3. Sửa thẻ
const updateCard = async (cardId, userId, question, answer) => {
  const existingCard = await prisma.flashcards.findFirst({
    where: { id: cardId, Decks: { user_id: userId } },
  });
  if (!existingCard)
    throw new Error("Không tìm thấy thẻ hoặc bạn không có quyền sửa!");

  return await prisma.flashcards.update({
    where: { id: cardId },
    data: {
      question: question || existingCard.question,
      answer: answer || existingCard.answer,
    },
  });
};

// 4. Xóa thẻ
const deleteCard = async (cardId, userId) => {
  const existingCard = await prisma.flashcards.findFirst({
    where: { id: cardId, Decks: { user_id: userId } },
  });
  if (!existingCard)
    throw new Error("Không tìm thấy thẻ hoặc bạn không có quyền xóa!");

  return await prisma.flashcards.delete({ where: { id: cardId } });
};

module.exports = { getCards, createCard, updateCard, deleteCard };
