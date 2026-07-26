# AGENTS.md — MarketLens Coding Rules

Mọi AI coding agent hoặc lập trình viên phải đọc `README.md` và tuân thủ toàn bộ
quy tắc dưới đây trước khi sửa code.

## Non-negotiable rules

1. Giữ nguyên stack: React + Vite + TypeScript; FastAPI + pandas; Supabase Hosted Auth/Postgres.
2. Không thêm Next.js, Django, NestJS, MySQL, Redis, Celery, Kafka hoặc microservice.
3. Không training/fine-tune AI hoặc ML model.
4. KPI phải được backend tính bằng deterministic code.
5. Forecast phải dùng deterministic code; không dùng LLM forecast.
6. AI API chỉ viết report từ aggregate JSON; không nhận raw rows hoặc PII.
7. Upload phải đi qua Import V2: adapter MarketLens/Shopee/TikTok hoặc custom
   mapping đã được backend chuẩn hóa về canonical schema. Không hứa nhận mọi
   file và không được bỏ qua bước xác nhận khi nhận diện không chắc chắn.
8. Frontend không được chứa `SUPABASE_SECRET_KEY`.
9. Mọi protected API phải verify Supabase access token.
10. Backend phải lấy `user_id` từ verified token, không tin `user_id` do client gửi.
11. Repository queries bằng secret key phải filter theo verified `user_id`.
12. Không lưu raw upload hoặc từng order trong MVP; chỉ lưu result JSONB.
13. API prefix là `/api/v1` và phải giữ error contract thống nhất.
14. Làm theo thứ tự công việc bên dưới; không cắt chức năng feature-complete V1.
15. Không hiển thị mock data sau khi API thật đã được nối.
16. Không log raw DataFrame, token, secret hoặc customer data.
17. Không thêm dependency mới nếu chức năng làm được bằng dependency đã chốt.
18. Mỗi thay đổi phải giữ app chạy được và không phá API contract.

## Required work sequence

1. Foundation + auth.
2. File validation.
3. Analytics.
4. Supabase persistence.
5. Dashboard pages.
6. Forecast.
7. Rule-based report.
8. External AI report + PDF.
9. Forgot/reset password + Profile + History.
10. Responsive, testing, security, deploy.

## Definition of done

Một task chỉ hoàn tất khi code chạy, xử lý error/empty/loading thích hợp, tuân thủ
ownership, không lộ secret và đã được kiểm thử phù hợp với phạm vi thay đổi.
