Vì giới hạn của nền tảng chat, mình không thể trực tiếp tạo và gửi file tải về đuôi .docx cho bạn. Tuy nhiên, mình đã loại bỏ các ký hiệu code Markdown và trình bày lại thành văn bản chuẩn ngay bên dưới.

👉 Cách xử lý nhanh nhất: Bạn chỉ cần bôi đen toàn bộ nội dung từ đường kẻ ngang trở xuống -> Copy (Ctrl + C) -> Mở Microsoft Word hoặc Google Docs -> Paste (Ctrl + V). Toàn bộ định dạng (tiêu đề, in đậm, gạch đầu dòng) sẽ được giữ nguyên hoàn hảo để bạn lưu lại ngay lập tức!

ForgetMeNot - Nền tảng Học tập & Ghi nhớ Thông minh
ForgetMeNot là một ứng dụng web học tập toàn diện được thiết kế để tối ưu hóa quá trình ghi nhớ kiến thức. Hệ thống kết hợp phương pháp Lặp lại ngắt quãng (Spaced Repetition), Trí tuệ nhân tạo (AI) và các tính năng tương tác cộng đồng thời gian thực, mang đến trải nghiệm học tập hiện đại, trực quan và hiệu quả.

I. Tính năng cốt lõi (Key Features)
1. Học tập & Ôn luyện (Study)

Flashcard & Spaced Repetition: Ghi nhớ kiến thức qua thẻ lật với thuật toán tối ưu hóa thời điểm ôn tập (dựa trên SM2).

Luyện Đề (Exam Mode): Làm bài thi trắc nghiệm (Multiple Choice) và Điền khuyết (Fill-in-the-blank) với hệ thống chấm điểm tự động.

Lò Luyện (Cram Mode): Ép xung học tập trước kỳ thi, buộc người dùng ôn tập lại các thẻ/câu hỏi sai cho đến khi thuộc toàn bộ.

Dashboard Thống kê: Theo dõi tiến độ ghi nhớ (Retention rate), thời gian học trong ngày và số lượng học liệu đến hạn bằng biểu đồ trực quan.

2. Trí tuệ nhân tạo (AI Integration)

AI Auto-Generation: Tự động trích xuất và tạo các bộ Flashcard hoặc bộ câu hỏi Trắc nghiệm từ tài liệu/văn bản người dùng cung cấp.

3. QuickTest (Phòng thi trực tuyến)

Host & Join: Giáo viên/Host có thể tạo phòng thi trực tiếp, học sinh nhập mã (Room Code) để tham gia.

Real-time Leaderboard: Bảng xếp hạng cập nhật thời gian thực dựa trên tốc độ và độ chính xác của người trả lời thông qua WebSocket.

Thống kê chi tiết: Hiển thị biểu đồ phổ điểm và phân tích tỷ lệ chọn đáp án cho từng câu hỏi sau khi kết thúc bài thi.

4. Cộng đồng (Community)

Khám phá (Discovery): Chia sẻ và clone các bộ thẻ/đề thi công khai từ người dùng khác.

Nhắn tin & Nhóm học tập: Trò chuyện 1-1, kết bạn, tạo Group chat để thảo luận và trao đổi học liệu thời gian thực.

II. Công nghệ sử dụng (Tech Stack)
Phía Frontend (Giao diện người dùng):

ReactJS (Vite): Xây dựng giao diện dựa trên Component.

React Router DOM: Quản lý luồng điều hướng trang.

React Query (TanStack): Quản lý trạng thái Server, bộ nhớ đệm (Caching) và tối ưu hóa các lượt gọi API.

Axios: Xử lý các yêu cầu HTTP.

CSS3 / CSS Modules: Thiết kế giao diện Minimalist, hiện đại và tối ưu trải nghiệm người dùng (UX).

Phía Backend (Hệ thống máy chủ):

Node.js & Express.js: Xây dựng hệ thống RESTful API.

Prisma ORM: Giao tiếp và truy vấn cơ sở dữ liệu an toàn, hiệu năng cao.

PostgreSQL: Hệ quản trị cơ sở dữ liệu quan hệ.

Socket.io: Cung cấp khả năng giao tiếp thời gian thực cho hệ thống nhắn tin và phòng thi QuickTest.

JWT (JSON Web Tokens): Xác thực bảo mật và phân quyền người dùng.

III. Hướng dẫn cài đặt hệ thống (Getting Started)
Yêu cầu hệ thống
Node.js (Phiên bản v16.x hoặc cao hơn)

PostgreSQL (Đang chạy tại Local hoặc trên Cloud)

Các bước triển khai môi trường Local
Bước 1: Tải mã nguồn dự án
Clone repository dự án về máy và di chuyển vào thư mục gốc.

Bước 2: Cài đặt và cấu hình Backend

Di chuyển vào thư mục backend và chạy lệnh npm install để cài đặt thư viện.

Tạo file .env với các cấu hình cơ bản gồm: Cổng chạy server (PORT), Chuỗi kết nối Database (DATABASE_URL), Khóa bí mật (JWT_SECRET) và Đường dẫn Frontend.

Chạy lệnh npx prisma generate và npx prisma db push để khởi tạo cấu trúc cơ sở dữ liệu.

Khởi động Server Backend bằng lệnh npm run dev.

Bước 3: Cài đặt và cấu hình Frontend

Mở một Terminal mới, di chuyển vào thư mục frontend và chạy lệnh npm install.

Tạo file .env cấu hình đường dẫn gọi API (VITE_API_URL) và Socket (VITE_SOCKET_URL) trỏ về Backend.

Khởi động giao diện bằng lệnh npm run dev. Ứng dụng sẽ có thể truy cập thông qua trình duyệt tại địa chỉ được cấp.
