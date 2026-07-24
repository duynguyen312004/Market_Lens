# MarketLens

MarketLens là web app phân tích dữ liệu bán hàng từ file CSV/XLSX.

## Yêu cầu local

- Python 3.14.
- Node.js 24.
- npm 11.

## Chạy backend

Từ thư mục gốc:

```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
fastapi dev backend/app/main.py --port 8000
```

Kiểm tra:

- Health: `http://localhost:8000/api/v1/health`
- Swagger: `http://localhost:8000/docs`

Backend health vẫn chạy khi chưa có Supabase key. Các endpoint được bảo vệ sẽ
trả lỗi cấu hình rõ ràng cho tới khi `backend/.env` có key thật.

## Chạy frontend

Mở terminal thứ hai:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend chạy tại `http://localhost:5173`.

## Kết nối Supabase Auth

Làm theo `docs/SUPABASE_SETUP.md`. Sau khi cấu hình:

- Register: `http://localhost:5173/register`
- Login: `http://localhost:5173/login`
- Protected dashboard: `http://localhost:5173/dashboard`
- Backend identity check: `GET /api/v1/auth/me`

## Upload và phân tích dữ liệu

Sau khi đăng nhập, mở `http://localhost:5173/upload`.

Backend hỗ trợ:

- `POST /api/v1/analyses`: upload CSV/XLSX và tạo analysis.
- `GET /api/v1/analyses`: danh sách analysis của current user.
- `GET /api/v1/analyses/{id}`: chi tiết analysis thuộc current user.
- `DELETE /api/v1/analyses/{id}`: xóa analysis thuộc current user.

File phải có đúng 11 cột theo `sample_data/sample_sales_template.csv`, tối đa
10 MB và 50.000 dòng. Chỉ đơn `completed` được tính vào analytics.

## Dashboard và Analytics

Sau khi upload thành công:

- Dashboard: `http://localhost:5173/dashboard`
- Sales Analytics: `http://localhost:5173/sales`
- Customer Analytics: `http://localhost:5173/customers`
- Forecast: `http://localhost:5173/forecast`
- Báo cáo: `http://localhost:5173/report`

Các trang sử dụng dữ liệu analysis thật đã lưu trong Supabase. Khi refresh,
frontend mở lại analysis đã chọn gần nhất; nếu ID đó không còn tồn tại, app tự
phục hồi analysis completed mới nhất của tài khoản.

Forecast là phép ước lượng thống kê và luôn hiển thị disclaimer. Khi report có
`source = "rule_based"`, giao diện ghi rõ đây là báo cáo theo quy tắc và không
gắn nhãn AI.

## AI Report và PDF

Làm theo `docs/AI_REPORT_SETUP.md` để bật Gemini Free Tier ở backend. OpenAI vẫn
là provider tùy chọn. AI chỉ nhận aggregate đã loại PII. Nếu feature flag, key,
quota, provider hoặc response có vấn đề, endpoint trả báo cáo rule-based kèm
warning thay vì làm hỏng flow.

Trang `/report` hỗ trợ tạo/tạo lại report và `Xuất PDF` bằng print stylesheet
cùng chức năng Save as PDF của trình duyệt.

## Kiểm tra

```bash
.venv/bin/pytest backend/tests
.venv/bin/python scripts/check_secrets.py
cd frontend
npm run lint
npm run test
npm run build
```

## Deploy

Repository có `render.yaml` cho frontend/backend và `Dockerfile` tùy chọn cho
FastAPI. Làm theo `docs/DEPLOYMENT.md`; production config sẽ fail-fast nếu còn
localhost, HTTP, placeholder key hoặc AI chưa được bật đầy đủ.

## Tài liệu

- `AGENTS.md`: quy tắc coding bắt buộc.
- `docs/MARKETLENS_MASTER_PLAN.md`: nguồn quyết định kỹ thuật.
- `docs/PHASE_STATUS.md`: phase đã khóa và phase đang triển khai.
- `docs/V1_COMPLETION_AUDIT.md`: ma trận chức năng và các external gate còn mở.
- `docs/SUPABASE_AUTH_SETUP.md`: URL redirect, recovery, Profile và SMTP.
- `docs/AI_REPORT_SETUP.md`: cấu hình Gemini/OpenAI Report và kiểm tra fallback.
- `docs/DEPLOYMENT.md`: Render Blueprint, Docker và production smoke test.
- `docs/PLAN_REVIEW_AND_QUOTE.md`: scope feature-complete MVP.
- `docs/SUPABASE_SETUP.md`: setup Auth và database từng bước.
- `sample_data/EXPECTED_DEMO_METRICS.md`: kết quả chuẩn để test analytics.
