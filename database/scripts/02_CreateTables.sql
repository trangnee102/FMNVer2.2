-- Chạy đoạn lệnh này trong Database [ForgetMeNotDB] của cậu trên SSMS 22

-- 1. Bảng Users (Quản lý tài khoản)
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student'
);

-- 2. Bảng Decks (Quản lý bộ thẻ)
-- Một user có thể tạo nhiều bộ thẻ (Quan hệ 1:N)
CREATE TABLE Decks (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL, -- NVARCHAR để hỗ trợ tiếng Việt có dấu
    description NVARCHAR(MAX),
    is_public BIT DEFAULT 0,      -- 0 là Private, 1 là Public
    user_id INT NOT NULL,
    CONSTRAINT FK_Decks_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- 3. Bảng Flashcards (Chứa nội dung học)
-- Một bộ thẻ có nhiều flashcard (Quan hệ 1:N)
CREATE TABLE Flashcards (
    id INT IDENTITY(1,1) PRIMARY KEY,
    deck_id INT NOT NULL,
    question NVARCHAR(MAX) NOT NULL,
    answer NVARCHAR(MAX) NOT NULL,
    CONSTRAINT FK_Flashcards_Decks FOREIGN KEY (deck_id) REFERENCES Decks(id) ON DELETE CASCADE
);

-- 4. Bảng StudyProgress (Theo dõi tiến độ học & SRS)
-- Mỗi người dùng có một tiến độ riêng cho từng thẻ cụ thể
CREATE TABLE StudyProgress (
    id INT IDENTITY(1,1) PRIMARY KEY,
    flashcard_id INT NOT NULL,
    user_id INT NOT NULL,
    ease_factor FLOAT DEFAULT 2.5,
    interval INT DEFAULT 0,
    repetitions INT DEFAULT 0,
    next_review_date DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_StudyProgress_Flashcards FOREIGN KEY (flashcard_id) REFERENCES Flashcards(id) ON DELETE CASCADE,
    CONSTRAINT FK_StudyProgress_Users FOREIGN KEY (user_id) REFERENCES Users(id)
    -- Xóa CASCADE ở Users để tránh xung đột đa luồng xóa (Multiple cascade paths)
);