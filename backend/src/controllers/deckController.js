const prisma = require("../services/prisma");

// 1. LẤY DANH SÁCH BỘ THẺ CỦA NGƯỜI DÙNG
const getMyDecks = async (req, res) => {
  try {
    // 👉 VÁ LỖI: Ép kiểu an toàn đề phòng ID bị truyền dạng String
    const userId = parseInt(req.user.id) || req.user.id;

    const decks = await prisma.decks.findMany({
      where: { user_id: userId },
      orderBy: { id: "desc" },
    });

    res.json({ success: true, data: decks });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy dữ liệu!",
      error: error.message,
    });
  }
};

// 2. TẠO BỘ THẺ MỚI
const createDeck = async (req, res) => {
  try {
    // 👉 ĐÃ THÊM: Nhận thêm cờ is_anonymous
    const { title, description, is_public, is_anonymous } = req.body;
    const userId = parseInt(req.user.id) || req.user.id;

    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Tên bộ thẻ không được để trống!" });
    }

    const newDeck = await prisma.decks.create({
      data: {
        title: title,
        description: description || null,
        is_public: is_public || false,
        is_anonymous: is_anonymous || false, // 👉 ĐÃ THÊM: Lưu trạng thái ẩn danh
        user_id: userId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Tạo bộ thẻ thành công!",
      data: newDeck,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo bộ thẻ!",
      error: error.message,
    });
  }
};

// 3. CẬP NHẬT/SỬA TÊN BỘ THẺ
const updateDeck = async (req, res) => {
  try {
    const deckId = parseInt(req.params.id);
    // 👉 ĐÃ THÊM: Nhận cờ is_anonymous từ Frontend gửi xuống
    const { title, description, is_public, is_anonymous } = req.body;
    const userId = parseInt(req.user.id) || req.user.id;

    const existingDeck = await prisma.decks.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!existingDeck) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bộ thẻ hoặc bạn không có quyền sửa!",
      });
    }

    const updatedDeck = await prisma.decks.update({
      where: { id: deckId },
      data: {
        title: title || existingDeck.title,
        description:
          description !== undefined ? description : existingDeck.description,
        is_public: is_public !== undefined ? is_public : existingDeck.is_public,
        // 👉 ĐÃ THÊM: Cập nhật trạng thái ẩn danh vào CSDL
        is_anonymous:
          is_anonymous !== undefined ? is_anonymous : existingDeck.is_anonymous,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật thành công!",
      data: updatedDeck,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật bộ thẻ!",
      error: error.message,
    });
  }
};

// 4. XÓA BỘ THẺ
const deleteDeck = async (req, res) => {
  try {
    const deckId = parseInt(req.params.id);
    const userId = parseInt(req.user.id) || req.user.id;

    const existingDeck = await prisma.decks.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!existingDeck) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bộ thẻ hoặc bạn không có quyền xóa!",
      });
    }

    await prisma.decks.delete({
      where: { id: deckId },
    });

    res.json({ success: true, message: "Đã xóa bộ thẻ thành công!" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa bộ thẻ!",
      error: error.message,
    });
  }
};

module.exports = { getMyDecks, createDeck, updateDeck, deleteDeck };
