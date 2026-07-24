# Cấu hình Supabase Auth cho MarketLens

Tài liệu này dùng cho đăng ký, đăng nhập, quên mật khẩu, đặt lại mật khẩu,
cập nhật hồ sơ và đổi mật khẩu.

## 1. URL Configuration

Trong Supabase Dashboard, mở:

```text
Authentication > URL Configuration
```

Khi phát triển local:

```text
Site URL: http://localhost:5173
Redirect URLs:
http://localhost:5173/reset-password
```

Khi deploy, thêm URL chính xác của frontend production:

```text
https://YOUR_FRONTEND_DOMAIN/reset-password
```

Không xóa URL local nếu vẫn cần kiểm thử trên máy.

## 2. Email và mật khẩu

Trong:

```text
Authentication > Sign In / Providers > Email
```

Kiểm tra:

- Email provider đang bật.
- Quyết định rõ có yêu cầu xác nhận email khi đăng ký hay không.
- Password policy của Supabase không yếu hơn validation trên MarketLens.

MarketLens yêu cầu mật khẩu từ 8 đến 72 ký tự, có chữ thường, chữ hoa, chữ số
và không chứa khoảng trắng.

## 3. Email khôi phục

Frontend gọi `resetPasswordForEmail` và luôn hiển thị thông báo trung tính để
không tiết lộ email có tồn tại trong hệ thống.

Link hợp lệ phải quay về:

```text
/reset-password
```

Form đặt lại mật khẩu chỉ mở khi Supabase phát sự kiện
`PASSWORD_RECOVERY`. Một session đăng nhập thông thường không đủ để mở form
recovery.

## 4. SMTP production

Dịch vụ email mặc định của Supabase chỉ phù hợp để thử nghiệm và có giới hạn
gửi. Trước production, cấu hình SMTP riêng tại:

```text
Project Settings > Authentication > SMTP Settings
```

Sau khi cấu hình, kiểm tra bằng một email do bạn sở hữu:

1. Mở `/forgot-password`.
2. Gửi yêu cầu khôi phục.
3. Mở link trong email.
4. Đặt mật khẩu mới.
5. Xác nhận mật khẩu cũ không còn đăng nhập được.
6. Xác nhận mật khẩu mới đăng nhập thành công.

Không dùng email của người khác để smoke test.

## 5. Profile

- Email chỉ hiển thị, không chỉnh sửa trong V1.
- Tên hiển thị lưu tại `user_metadata.display_name`.
- Tên hiển thị không dùng cho authorization.
- Đổi mật khẩu trong Profile yêu cầu `current_password`.
- Đăng xuất xóa session phía Supabase và trạng thái recovery cục bộ.

## 6. Lưu ý về key

- Frontend chỉ chứa publishable key.
- Secret key chỉ đặt trong `backend/.env`.
- Không gửi secret key qua chat, log hoặc screenshot.
- Không dùng publishable/secret key thay cho user access token trong Bearer
  header của API MarketLens.

