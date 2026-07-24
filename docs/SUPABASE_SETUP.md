# Thiết lập Supabase cho MarketLens

Mục tiêu của bước này là kết nối cùng một Supabase project với React và
FastAPI, sau đó kiểm tra được luồng:

```text
Register/Login → access token → FastAPI /auth/me → verified user
```

## 1. Tạo project

1. Đăng nhập [Supabase Dashboard](https://supabase.com/dashboard).
2. Tạo một hosted project mới và chọn region phù hợp.
3. Chờ project khởi tạo xong.

MarketLens dùng Supabase hosted; không cần cài Supabase CLI hay database local.

## 2. Lấy đúng API keys

Trong phần API Keys của project, lấy:

- Project URL.
- Publishable key, bắt đầu bằng `sb_publishable_`, cho frontend.
- Secret key, bắt đầu bằng `sb_secret_`, chỉ cho backend.

Publishable/secret key là khóa truy cập project, không phải access token đăng
nhập của người dùng. Không đặt secret key vào frontend và không gửi key/token
vào chat.

Tham khảo: [Supabase API keys](https://supabase.com/docs/guides/api/api-keys).

## 3. Tạo env local

Từ thư mục gốc:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Điền backend:

```dotenv
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Điền frontend:

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Hai file local này đã được `.gitignore`; không commit chúng.

## 4. Cấu hình Email/Password

Trong Authentication:

1. Đảm bảo provider Email/Password đang bật.
2. Đặt Site URL local là `http://localhost:5173`.
3. Thêm redirect URL:
   `http://localhost:5173/reset-password`.
4. Nếu mở web bằng IP local, thêm cả:
   `http://127.0.0.1:5173/reset-password`.
5. Trong lúc phát triển, có thể tắt Confirm email để test nhanh.
6. Nếu giữ Confirm email, dùng email thật và bấm link xác nhận trước khi login.

Dịch vụ gửi email mặc định của Supabase chỉ phù hợp để thử nghiệm và có giới
hạn thấp. Trước production cần cấu hình SMTP riêng.

Tham khảo:

- [Password-based authentication](https://supabase.com/docs/guides/auth/passwords)
- [React Auth quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)

## 5. Tạo database schema

1. Mở SQL Editor trong Supabase Dashboard.
2. Dán toàn bộ nội dung `supabase/schema.sql`.
3. Chạy script một lần.
4. Kiểm tra bảng `public.analyses` và các RLS policies đã xuất hiện.

Schema dùng `auth.uid()` để mỗi tài khoản chỉ thấy dữ liệu của mình. Backend
vẫn phải filter theo user ID đã xác minh ở mọi query.

## 6. Chạy và kiểm tra end-to-end

Terminal 1:

```bash
source .venv/bin/activate
fastapi dev backend/app/main.py --port 8000
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Sau đó:

1. Mở `http://localhost:5173/register`.
2. Tạo tài khoản.
3. Xác nhận email nếu project yêu cầu.
4. Đăng nhập tại `/login`.
5. Dashboard phải hiện “Token đã được backend xác minh”.
6. Refresh trang; session vẫn phải còn.
7. Đăng xuất; truy cập `/dashboard` phải bị chuyển về `/login`.
8. Chọn “Quên mật khẩu?”, mở link trong email và đặt mật khẩu mới.

Nếu frontend login thành công nhưng `/auth/me` lỗi:

- kiểm tra backend dùng cùng `SUPABASE_URL` với frontend;
- kiểm tra secret key không có khoảng trắng;
- restart FastAPI sau khi sửa `backend/.env`;
- mở `http://localhost:8000/docs` và kiểm tra `/api/v1/auth/me`.
