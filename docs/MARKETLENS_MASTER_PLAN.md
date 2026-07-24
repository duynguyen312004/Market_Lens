# MARKETLENS — MASTER IMPLEMENTATION PLAN

> **Trạng thái:** Kế hoạch kỹ thuật chính thức cho feature-complete MVP  
> **Phiên bản tài liệu:** 1.3  
> **Ngôn ngữ sản phẩm:** Tiếng Việt  
> **Múi giờ nghiệp vụ:** Asia/Ho_Chi_Minh  
> **Repository dự kiến:** `Market_lens/`  
> **Môi trường hiện có:** `.venv` đã được tạo và `fastapi[standard]` đã được cài trong thư mục gốc

---

## 0. Mục đích và cách sử dụng tài liệu

Tài liệu này là **nguồn quyết định kỹ thuật duy nhất** cho phiên bản MVP MarketLens. Con người hoặc AI coding agent phải đọc toàn bộ tài liệu trước khi thay đổi cấu trúc dự án hoặc viết chức năng mới.

### 0.1. Ý nghĩa từ khóa

- **MUST / BẮT BUỘC:** Không được làm khác nếu chưa cập nhật tài liệu và xác nhận lại phạm vi.
- **SHOULD / NÊN:** Có thể thay đổi nếu có lý do kỹ thuật rõ ràng, không phá kiến trúc.
- **MAY / CÓ THỂ:** Tùy thời gian còn lại.
- **OUT OF SCOPE:** Không làm trong feature-complete MVP V1.

### 0.2. Nguyên tắc nguồn sự thật

Thứ tự ưu tiên khi có mâu thuẫn:

1. Phần **Quy tắc bất biến** trong tài liệu này.
2. API contract và data contract trong tài liệu này.
3. `AGENTS.md` tại thư mục gốc.
4. Code hiện tại.
5. Suy đoán của lập trình viên hoặc AI.

### 0.3. Quy tắc bất biến

1. **Không huấn luyện model AI hoặc machine learning riêng.**
2. **Không fine-tune model.**
3. **Không có pipeline training, model registry, GPU hoặc dataset huấn luyện.**
4. Toàn bộ KPI phải được tính bằng code xác định, chủ yếu bằng `pandas`.
5. AI API chỉ dùng để viết lại báo cáo bằng ngôn ngữ tự nhiên; AI không được tự tính KPI.
6. Forecast MVP dùng thuật toán thống kê đơn giản chạy tại thời điểm request; không lưu model đã train.
7. File đầu vào phải đúng template được định nghĩa trong tài liệu.
8. Không hứa hỗ trợ mọi file Shopee/TikTok Shop trong MVP.
9. Frontend không bao giờ được chứa Supabase secret key.
10. Backend phải xác thực access token trước mọi endpoint dữ liệu.
11. Backend không gửi dữ liệu dòng đơn hàng thô hoặc thông tin nhận dạng khách hàng cho AI API.
12. Raw Excel/CSV không được lưu lâu dài trong MVP.
13. Làm theo phase để giữ app chạy end-to-end, nhưng không bỏ chức năng V1 vì
    deadline.
14. Không bổ sung microservice, Redis, Celery, Kafka, WebSocket hoặc Kubernetes trong MVP.
15. Không thay đổi stack đã chốt nếu chưa có quyết định mới bằng văn bản.

### 0.4. Chiến lược feature-complete V1

Phiên bản 1.2 bỏ ràng buộc deadline ba ngày. Mục tiêu là có **đủ chức năng đã
đề xuất ban đầu**, chấp nhận UI và thuật toán ở mức gọn, rõ và đáng tin cậy thay
vì quá cầu kỳ.

V1 bắt buộc có:

- Landing page với hero, CTA và ba nhóm tính năng.
- Đăng ký, đăng nhập, quên mật khẩu, đổi mật khẩu và đăng xuất.
- Dashboard, upload CSV/XLSX, Sales Analytics và Customer Analytics.
- Forecast 7 ngày bằng thuật toán thống kê deterministic.
- AI Report gọi external API từ backend và có rule-based fallback.
- Xuất/lưu báo cáo dạng PDF.
- Profile cơ bản.
- Lịch sử analysis để mở lại kết quả cũ.
- Loading, error, empty state và responsive cơ bản cho mọi luồng.
- Deploy frontend/backend và kiểm tra ownership/security.

Không training, fine-tune hoặc tự xây model. “Đủ chức năng” không đồng nghĩa hỗ
trợ mọi loại file sàn, realtime, multi-shop hoặc production hardening cấp doanh
nghiệp; các nội dung đó vẫn out of scope.

---

# 1. Tổng quan sản phẩm

## 1.1. Tên sản phẩm

**MarketLens**

## 1.2. Mô tả ngắn

MarketLens là web app giúp chủ shop online tải lên file Excel hoặc CSV chứa dữ liệu bán hàng, sau đó nhận dashboard trực quan, phân tích sản phẩm, phân tích khách hàng, dự báo doanh thu ngắn hạn và báo cáo khuyến nghị.

## 1.3. Đối tượng sử dụng

- Chủ shop Shopee.
- Chủ shop TikTok Shop.
- Cửa hàng bán lẻ.
- Doanh nghiệp nhỏ và vừa.
- Người quản lý muốn xem nhanh dữ liệu bán hàng mà không tự thao tác Excel.

## 1.4. Giá trị cốt lõi của MVP

MVP phải chứng minh được luồng:

```text
Đăng ký/Đăng nhập
→ Upload file đúng template
→ Backend kiểm tra và phân tích
→ Dashboard hiển thị dữ liệu thật
→ Sales Analytics
→ Customer Analytics
→ Forecast ngắn hạn
→ Báo cáo tự động
```

## 1.5. Mục tiêu feature-complete MVP

Mục tiêu không phải sản phẩm production hoàn chỉnh. Mục tiêu là một MVP đủ chức
năng, nhất quán và có thể trình diễn hoặc cho nhóm người dùng thử:

- Chạy trọn luồng với một tài khoản thật.
- Phân tích đúng file CSV/XLSX theo template.
- Hiển thị số liệu nhất quán giữa các màn hình.
- Xử lý lỗi file rõ ràng.
- Lưu lịch sử kết quả phân tích vào Supabase PostgreSQL.
- Gọi AI API để viết report từ aggregate data, có fallback khi API lỗi.
- Cho phép xuất báo cáo PDF.
- Cho phép quản lý tài khoản cơ bản.
- Có thể deploy frontend và backend độc lập.

## 1.6. Tiêu chí thành công

MVP được xem là thành công khi:

1. Người dùng đăng ký hoặc đăng nhập bằng Supabase Auth.
2. Người dùng upload một file CSV/XLSX hợp lệ.
3. Backend trả kết quả trong thời gian chấp nhận được với file demo.
4. Dashboard hiển thị đúng 4 KPI chính.
5. Sales Analytics và Customer Analytics hiển thị dữ liệu thật.
6. Forecast trả kết quả hoặc cảnh báo thiếu dữ liệu theo rule.
7. Báo cáo tự động không bịa thêm số liệu.
8. Refresh trang vẫn có thể lấy lại analysis gần nhất từ database.
9. Người dùng A không thể đọc analysis của người dùng B qua API ứng dụng.
10. Không có secret key trong frontend bundle hoặc Git repository.

---

# 2. Phạm vi chức năng V1 và thứ tự triển khai

Mọi mục trong Phase A, B và C đều thuộc feature-complete V1. Phase chỉ thể hiện
thứ tự làm, không phải danh sách được phép cắt.

## 2.1. Phase A — Core analytics end-to-end

### A.0. Landing

- Logo/tên MarketLens.
- Hero, mô tả ngắn và CTA.
- Ba lợi ích chính.
- Nút đăng nhập/đăng ký hoạt động.

Không bắt buộc có bảng giá, blog/CMS hoặc newsletter backend trong V1.

### A.1. Authentication core

- Đăng ký bằng email/mật khẩu.
- Đăng nhập bằng email/mật khẩu.
- Đăng xuất.
- Protected routes.
- Backend xác thực Supabase access token.

Google OAuth, email template tùy biến và role admin không thuộc V1.

### A.2. Upload dữ liệu

- Chấp nhận `.csv` và `.xlsx`.
- Chỉ chấp nhận template cố định.
- Excel chỉ đọc sheet đầu tiên.
- CSV chỉ hỗ trợ UTF-8 hoặc UTF-8-SIG, dấu phân cách dấu phẩy.
- Giới hạn 10 MB.
- Giới hạn 50.000 dòng dữ liệu.
- Có file mẫu tải xuống.
- Có kéo-thả hoặc chọn file.
- Có trạng thái loading và thông báo lỗi rõ ràng.

### A.3. Dashboard

Hiển thị:

- Tổng doanh thu.
- Tổng đơn hàng.
- Tổng khách hàng.
- Tổng sản phẩm đã bán.
- Biểu đồ doanh thu theo ngày.
- Top 5 sản phẩm theo doanh thu.
- Top 5 khách hàng theo doanh thu.
- Phân loại khách hàng.

### A.4. Sales Analytics

Hiển thị:

- Doanh thu theo ngày.
- Doanh thu theo tháng nếu dữ liệu trải qua nhiều tháng.
- Doanh thu theo sản phẩm.
- Doanh thu theo danh mục.
- Top sản phẩm theo doanh thu.
- Top sản phẩm theo số lượng.
- Nhóm sản phẩm có số lượng bán thấp nhất trong file.

### A.5. Customer Analytics

Hiển thị:

- Tổng khách hàng.
- Khách hàng mới theo rule MVP.
- Khách hàng quay lại theo rule MVP.
- Khách hàng VIP theo rule MVP.
- Khách hàng tiềm năng theo rule MVP.
- Top khách hàng theo doanh thu.
- Số đơn và tổng chi tiêu của top khách hàng.

### A.6. Forecast

- Forecast 7 ngày tiếp theo.
- Không có training model riêng.
- Chọn phương pháp dựa trên số ngày dữ liệu.
- Trả cảnh báo nếu dữ liệu không đủ.
- Giá trị dự báo không được âm.
- Hiển thị rõ đây là dự báo tham khảo.

### A.7. Báo cáo fallback

Bản fallback dùng rule/template ở backend để luôn hoạt động:

- Tổng kết doanh thu.
- Điểm nổi bật.
- Xu hướng.
- 3 khuyến nghị dựa trên rule.
- Ghi rõ dữ liệu nào là thực tế và dữ liệu nào là dự báo.

Tên hiển thị fallback là **Báo cáo tự động** hoặc **Báo cáo thông minh**. Dùng
nhãn **AI Report** khi `AI_REPORT_ENABLED=true` và request AI thành công; khi
fallback phải cho người dùng biết báo cáo đang dùng rule/template.

### A.8. Lưu kết quả phân tích

Supabase PostgreSQL lưu:

- Chủ sở hữu.
- Tên file.
- Trạng thái.
- Số dòng.
- Khoảng ngày.
- JSON kết quả.
- Thời điểm tạo.

Không lưu từng dòng order trong MVP.

## 2.2. Phase B — Full product flow, bắt buộc cho V1

- Quên mật khẩu và đặt lại mật khẩu qua Supabase Auth.
- Profile hiển thị email/tên và cho phép đổi tên hiển thị.
- Đổi mật khẩu và đăng xuất.
- Lịch sử upload/analysis.
- Chọn analysis cũ để xem lại.
- Xóa analysis của chính user sau bước xác nhận.
- So sánh 7 ngày gần nhất với 7 ngày trước khi đủ dữ liệu.
- Bộ lọc thời gian cơ bản trên dữ liệu aggregate đã lưu nếu contract hỗ trợ.
- Empty state, loading, error và skeleton cơ bản.

## 2.3. Phase C — AI, PDF và hoàn thiện chức năng, bắt buộc cho V1

- External AI API viết báo cáo tiếng Việt từ aggregate JSON.
- Rule-based report luôn là fallback.
- Nút tạo lại báo cáo khi AI request trước đó thất bại.
- Xuất/lưu report dạng PDF; V1 có thể dùng print stylesheet/browser Save as PDF.
- Responsive cơ bản cho desktop, tablet và mobile.
- Upload drag-and-drop.
- Production deploy và smoke test.

Không yêu cầu trong V1:

- PDF pixel-perfect như tài liệu in chuyên nghiệp.
- Animation cầu kỳ.
- Khoảng tin cậy forecast.
- Offline mode.

## 2.4. OUT OF SCOPE — Không làm trong V1

- Đồng bộ trực tiếp Shopee/TikTok/Lazada.
- Mapping cột tự động.
- Tự nhận mọi loại Excel.
- Nhiều shop trong một tài khoản.
- Phân quyền nhân viên.
- Subscription/thanh toán.
- Dashboard realtime.
- Phân tích lợi nhuận khi không có chi phí.
- Phân tích ROAS, CAC, conversion khi không có dữ liệu marketing.
- Phân tích tồn kho khi không có dữ liệu tồn kho.
- Deep learning.
- Training hoặc fine-tuning model.
- Chatbot hỏi đáp toàn bộ dữ liệu.
- Background queue.
- Email báo cáo định kỳ.
- Lưu raw file lâu dài.

---

# 3. Các quyết định kiến trúc đã chốt

## 3.1. Frontend

- React.
- Vite.
- TypeScript.
- React Router.
- Tailwind CSS.
- Recharts.
- TanStack Query.
- Supabase JavaScript client.
- Phosphor Icons React.
- Axios hoặc một `fetch` wrapper thống nhất; tài liệu ưu tiên Axios để interceptor token rõ ràng.

## 3.2. Backend

- Python.
- FastAPI.
- `pandas` cho xử lý bảng.
- `openpyxl` cho `.xlsx`.
- `numpy` cho forecast tuyến tính.
- `supabase-py` cho Supabase Auth verification và Data API.
- `pydantic-settings` cho environment variables.
- Pydantic models cho request/response.

## 3.3. Database và Auth

- Supabase Hosted.
- Supabase Auth cho email/password.
- Supabase PostgreSQL cho bảng `analyses`.
- Không cài Supabase local trong MVP.
- Không dùng MySQL.
- Không dùng PostgreSQL Docker local cho MVP.

## 3.4. AI

- Không có AI model nội bộ.
- Không training.
- Không fine-tune.
- External AI API là chức năng bắt buộc của V1.
- Backend phải cho phép cấu hình provider/model bằng environment variables.
- AI chỉ nhận dữ liệu aggregate, không nhận raw orders.
- Report template là fallback bắt buộc.

## 3.5. Forecast

- Không dùng ChatGPT để forecast.
- Không xây model machine learning riêng.
- Không lưu model.
- Chạy thuật toán thống kê ngay khi phân tích file.
- Dưới 14 ngày dữ liệu: không forecast.
- Từ 14 đến 29 ngày: Moving Average 7 ngày.
- Từ 30 ngày trở lên: Linear Trend trên tối đa 30 ngày gần nhất.
- Forecast 7 ngày.

## 3.6. Lưu trữ dữ liệu

MVP không lưu raw file và không lưu từng order.

```text
File upload
→ xử lý trong memory/temp file của request
→ tạo result JSON
→ lưu result JSON vào analyses.result_json
→ kết thúc request
```

Lợi ích:

- Ít bảng.
- Không insert hàng chục nghìn records.
- Ít rủi ro trùng dữ liệu.
- Giữ kiến trúc V1 đơn giản và dễ kiểm thử.

## 3.7. Giao tiếp frontend/backend

- REST API.
- Prefix: `/api/v1`.
- JSON cho mọi response trừ upload request.
- Upload dùng `multipart/form-data`.
- Access token truyền qua `Authorization: Bearer <token>`.
- Không dùng WebSocket.
- Xử lý đồng bộ trong request.

---

# 4. Kiến trúc tổng thể

```text
┌──────────────────────────────────────────────┐
│ Browser                                      │
│                                              │
│ React + Vite + TypeScript                    │
│ - Auth UI                                    │
│ - Dashboard                                  │
│ - Upload                                     │
│ - Analytics                                  │
│ - Forecast                                   │
│ - Report                                     │
└───────────────┬───────────────────────┬──────┘
                │                       │
                │ Supabase Auth SDK     │ HTTPS REST + Bearer token
                ▼                       ▼
┌──────────────────────────┐   ┌───────────────────────────────┐
│ Supabase Auth            │   │ FastAPI                       │
│ - Sign up                │   │ - Verify access token         │
│ - Sign in                │   │ - Validate upload             │
│ - Session / JWT          │   │ - pandas analytics            │
└──────────────────────────┘   │ - forecast                    │
                               │ - rule-based report            │
                               │ - optional AI API              │
                               └──────────────┬────────────────┘
                                              │ server-side only
                                              ▼
                               ┌───────────────────────────────┐
                               │ Supabase PostgreSQL/Data API │
                               │ - analyses                   │
                               │ - JSONB result               │
                               └───────────────────────────────┘
```

## 4.1. Trách nhiệm frontend

Frontend chịu trách nhiệm:

- Render giao diện.
- Gọi Supabase Auth để đăng ký/đăng nhập/đăng xuất.
- Lấy access token hiện tại.
- Gửi token tới FastAPI.
- Gửi file tới FastAPI.
- Hiển thị dữ liệu trả về.
- Quản lý loading/error/empty states.
- Format tiền VND và ngày tiếng Việt.

Frontend không được:

- Tính KPI chính thức.
- Tự forecast.
- Chứa Supabase secret key.
- Gọi AI API trực tiếp.
- Tin tưởng `user_id` do UI gửi lên.

## 4.2. Trách nhiệm backend

Backend chịu trách nhiệm:

- Xác thực token và lấy `user_id` từ token.
- Không sử dụng `user_id` do frontend tự truyền làm nguồn tin cậy.
- Validate file và dữ liệu.
- Tính toàn bộ KPI.
- Tạo forecast.
- Tạo report template.
- Gọi external AI API khi feature flag bật; production V1 phải cấu hình bật.
- Lưu và truy xuất analysis theo đúng user.
- Chuẩn hóa lỗi thành error response thống nhất.

## 4.3. Trách nhiệm Supabase

- Quản lý tài khoản Auth.
- Cấp access/refresh token.
- Lưu bảng `analyses` trong PostgreSQL.
- Cung cấp Data API.
- Áp dụng RLS cho truy cập client-side nếu được dùng sau này.

---

# 5. Cấu trúc repository chuẩn

Repository phải có cấu trúc mục tiêu sau:

```text
Market_lens/
├── .venv/                         # Đã có, không commit
├── .gitignore
├── README.md
├── AGENTS.md
├── docs/
│   └── MARKETLENS_MASTER_PLAN.md
├── frontend/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── router.tsx
│   │   │   └── queryClient.ts
│   │   ├── api/
│   │   │   ├── httpClient.ts
│   │   │   └── analysesApi.ts
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── supabase.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── charts/
│   │   │   ├── cards/
│   │   │   ├── tables/
│   │   │   └── feedback/
│   │   ├── features/
│   │   │   ├── dashboard/
│   │   │   ├── upload/
│   │   │   ├── sales/
│   │   │   ├── customers/
│   │   │   ├── forecast/
│   │   │   └── report/
│   │   ├── pages/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── index.css
│   │   └── main.tsx
│   └── public/
│       └── sample_sales_template.csv
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── errors.py
│   │   │   └── logging.py
│   │   ├── dependencies/
│   │   │   └── auth.py
│   │   ├── routers/
│   │   │   ├── health.py
│   │   │   └── analyses.py
│   │   ├── schemas/
│   │   │   ├── common.py
│   │   │   └── analysis.py
│   │   ├── services/
│   │   │   ├── file_reader.py
│   │   │   ├── validator.py
│   │   │   ├── analytics.py
│   │   │   ├── forecast.py
│   │   │   ├── report.py
│   │   │   └── ai_report.py
│   │   └── repositories/
│   │       └── analyses_repository.py
│   └── tests/
│       ├── test_validator.py
│       ├── test_analytics.py
│       ├── test_forecast.py
│       └── test_api.py
├── supabase/
│   └── schema.sql
└── sample_data/
    ├── sample_sales_template.csv
    └── sample_sales_demo_60_days.csv
```

## 5.1. Quy tắc tổ chức code

- Router không chứa logic pandas dài.
- `services/` chứa business logic.
- `repositories/` là nơi duy nhất trực tiếp thao tác bảng Supabase.
- Pydantic schema là contract giữa router và frontend.
- Component frontend không gọi Supabase DB trực tiếp.
- Không tạo abstraction quá sâu trong MVP.
- Một file nên có một trách nhiệm chính.

---

# 6. Thiết lập môi trường

## 6.1. Backend hiện tại

Người phát triển đã có:

- `Market_lens/.venv`
- `fastapi[standard]`

Không tạo virtual environment mới.

### Kích hoạt virtual environment trong WSL

```bash
cd ~/path/to/Market_lens
source .venv/bin/activate
```

### Cài dependency còn thiếu

```bash
pip install pandas openpyxl numpy supabase pydantic-settings pytest httpx httpx2
```

Sau khi ổn định:

```bash
pip freeze > backend/requirements.txt
```

### Chạy backend development

Từ thư mục gốc:

```bash
fastapi dev backend/app/main.py --port 8000
```

API docs:

```text
http://localhost:8000/docs
```

## 6.2. Frontend

Từ thư mục gốc:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-router-dom @supabase/supabase-js @tanstack/react-query axios recharts @phosphor-icons/react zod react-hook-form @hookform/resolvers
npm install tailwindcss @tailwindcss/vite
```

Tailwind với Vite:

- Thêm `@tailwindcss/vite` vào `vite.config.ts`.
- Thêm `@import "tailwindcss";` vào `src/index.css`.

Chạy frontend:

```bash
npm run dev
```

Mặc định:

```text
http://localhost:5173
```

## 6.3. Biến môi trường frontend

`frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Chỉ các biến bắt đầu bằng `VITE_` mới được đưa vào frontend bundle. Vì vậy tuyệt đối không đặt secret key ở đây.

## 6.4. Biến môi trường backend

`backend/.env` hoặc `.env` tại root tùy cách cấu hình, nhưng phải thống nhất một nơi:

```env
APP_ENV=development
APP_NAME=MarketLens API
API_V1_PREFIX=/api/v1
FRONTEND_ORIGINS=http://localhost:5173

SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx

MAX_UPLOAD_MB=10
MAX_UPLOAD_ROWS=50000
AI_REPORT_ENABLED=false
AI_PROVIDER=gemini
AI_MODEL=gemini-3.5-flash-lite
AI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
AI_API_KEY=
AI_TIMEOUT_SECONDS=20
```

Quy tắc:

- `SUPABASE_SECRET_KEY` chỉ có ở backend.
- `.env` không commit.
- `.env.example` không chứa giá trị thật.
- Local foundation có thể để `AI_REPORT_ENABLED=false`.
- Mặc định dùng Gemini Free Tier; OpenAI là provider tùy chọn.
- Trước khi đánh dấu V1 hoàn thành phải cấu hình provider/model/key, bật AI và
  test cả success lẫn fallback.
- Khi AI bật mà thiếu model/key, config phải fail rõ ràng hoặc AI endpoint trả
  fallback có warning; không được âm thầm quảng cáo report là AI.
- Production secrets phải được nhập qua dashboard của nền tảng deploy.

---

# 7. Supabase setup

## 7.1. Tạo project

1. Tạo Supabase hosted project.
2. Chọn region phù hợp gần người dùng.
3. Lấy Project URL.
4. Lấy Publishable key cho frontend.
5. Tạo Secret key riêng cho backend.
6. Không dùng secret key trong browser.

## 7.2. Authentication settings cho MVP

- Bật Email/Password.
- Trong quá trình phát triển có thể tắt email confirmation để demo nhanh.
- Trước production phải quyết định lại email confirmation.
- Redirect URL local: `http://localhost:5173`.
- Redirect URL production thêm sau khi deploy frontend.

## 7.3. Database schema

Chạy toàn bộ file:

```text
supabase/schema.sql
```

Bảng V1 duy nhất: `public.analyses`.

## 7.4. Quy tắc dùng key

### Publishable key

- Dùng trong React.
- Dùng để gọi Supabase Auth.
- Chỉ an toàn khi RLS và policy đúng cho thao tác DB client-side.

### Secret key

- Chỉ dùng trong FastAPI.
- Có quyền cao và bypass RLS.
- Backend bắt buộc tự xác thực user trước khi query.
- Mọi query user data phải có filter `user_id = verified_user_id`.

---

# 8. Data contract của file upload

## 8.1. Định dạng hỗ trợ

- `.csv`
- `.xlsx`

Không hỗ trợ:

- `.xls`
- Google Sheets URL.
- File nén.
- File có mật khẩu.
- Nhiều file trong một request.
- Nhiều sheet phân tích cùng lúc.

## 8.2. Cột bắt buộc

| Cột | Kiểu logic | Bắt buộc | Ví dụ | Ý nghĩa |
|---|---|---:|---|---|
| `order_id` | string | Có | `DH0001` | Mã đơn hàng |
| `order_date` | date | Có | `2026-07-01` | Ngày đơn hàng |
| `customer_id` | string | Có | `C001` | Mã khách hàng |
| `customer_name` | string | Có | `Nguyễn Văn A` | Tên hiển thị |
| `product_id` | string | Có | `P001` | Mã sản phẩm |
| `product_name` | string | Có | `Áo thun basic` | Tên sản phẩm |
| `category` | string | Có | `Thời trang` | Danh mục |
| `quantity` | integer | Có | `2` | Số lượng dòng hàng |
| `unit_price` | number | Có | `150000` | Đơn giá |
| `discount` | number | Có | `20000` | Giảm giá của dòng hàng |
| `order_status` | enum string | Có | `completed` | Trạng thái đơn |

MVP yêu cầu tập tên cột **chính xác** như bảng trên; thứ tự cột có thể khác.
Cột thiếu hoặc cột thừa đều trả `INVALID_FILE_COLUMNS`. Quy tắc nghiêm ngặt này
giữ template dễ kiểm thử và tránh vô tình nhận thêm PII như số điện thoại hoặc
địa chỉ. Mapping/cho phép cột bổ sung là công việc sau MVP.

## 8.3. Quy ước mỗi dòng

Mỗi dòng đại diện cho **một line item**, tức một sản phẩm trong một đơn.

Một đơn có 3 sản phẩm phải có 3 dòng cùng `order_id`.

## 8.4. Giá trị trạng thái hợp lệ

MVP chấp nhận chính xác sau khi trim và lowercase:

- `completed`
- `cancelled`
- `returned`

Chỉ `completed` được tính vào analytics doanh thu.

Không tự động suy đoán status tiếng Việt trong MVP.

## 8.5. Công thức doanh thu dòng

```text
line_revenue = quantity × unit_price - discount
```

Quy tắc:

- `discount` là giảm giá của line item, không phải toàn đơn.
- `line_revenue` không được âm.
- Dòng `cancelled` hoặc `returned` không tính doanh thu.

## 8.6. Quy tắc ngày

- Template chuẩn dùng `YYYY-MM-DD`.
- Backend có thể dùng `pandas.to_datetime` để parse.
- Dòng không parse được ngày là lỗi validation.
- Dữ liệu nghiệp vụ dùng date-only; không tự chuyển timezone cho `order_date`.

## 8.7. Quy tắc số

- `quantity` phải là số nguyên lớn hơn 0.
- `unit_price` phải lớn hơn hoặc bằng 0.
- `discount` phải lớn hơn hoặc bằng 0.
- Không chấp nhận ký hiệu tiền tệ trong ô, ví dụ `150.000đ`.
- Template phải dùng giá trị số thuần, ví dụ `150000`.

## 8.8. Quy tắc string

- Trim khoảng trắng đầu/cuối.
- ID rỗng là lỗi.
- Tên sản phẩm rỗng là lỗi.
- Tên khách hàng rỗng là lỗi.
- Category rỗng là lỗi.
- Không tự merge sản phẩm cùng tên nhưng khác `product_id`.

## 8.11. Quy tắc nhất quán giữa các dòng

Sau khi normalize, backend phải kiểm tra:

- Cùng `order_id` phải có cùng `order_date`, `customer_id` và `order_status`.
- Cùng `product_id` phải có cùng `product_name` và `category`.
- Cùng `customer_id` phải có cùng `customer_name`.

Nếu vi phạm, trả `INVALID_ROW_DATA` và nêu ID/field xung đột nhưng không trả
nguyên dòng dữ liệu. Không tự chọn ngẫu nhiên giá trị đầu/cuối.

## 8.9. Quy tắc CSV

- Encoding UTF-8 hoặc UTF-8-SIG.
- Separator dấu phẩy.
- Có header ở dòng đầu.
- Không có dòng mô tả phía trên header.

## 8.10. Quy tắc Excel

- Đọc sheet đầu tiên.
- Header ở dòng đầu tiên.
- Không merge cell.
- Không có dòng tổng cộng cuối file.
- Không dùng formula làm nguồn dữ liệu bắt buộc.

---

# 9. Pipeline xử lý file

Endpoint upload phải thực hiện theo đúng thứ tự:

```text
1. Authenticate request
2. Validate extension
3. Validate request size
4. Read file
5. Validate row count
6. Normalize column names
7. Check required columns
8. Remove fully empty rows
9. Normalize strings
10. Convert date and numeric columns
11. Validate row values
12. Normalize order_status
13. Calculate line_revenue
14. Build completed-orders dataset
15. Calculate analytics
16. Calculate forecast
17. Build rule-based report
18. Persist analysis result
19. Return API response
```

## 9.1. Normalize column names

Chỉ thực hiện:

- Trim.
- Lowercase.

Không mapping synonym trong MVP.

Ví dụ `Order ID` không tự đổi thành `order_id`; file đó phải báo sai template.

## 9.2. Dòng rỗng

- Dòng hoàn toàn rỗng được bỏ qua.
- Dòng có một số trường rỗng phải validate và báo lỗi.

## 9.3. Dữ liệu trùng

Không tự xóa duplicate line item vì có thể là dữ liệu hợp lệ.

Có thể đưa warning nếu toàn bộ dòng trùng hoàn toàn, nhưng không block MVP.

## 9.4. Lỗi validation

Nên trả tối đa 20 lỗi dòng đầu để response không quá lớn.

Ví dụ:

```json
{
  "error": {
    "code": "INVALID_ROW_DATA",
    "message": "File có dữ liệu không hợp lệ.",
    "details": {
      "errors": [
        {"row": 12, "column": "order_date", "reason": "invalid_date"},
        {"row": 24, "column": "quantity", "reason": "must_be_positive_integer"}
      ],
      "total_error_count": 2
    }
  }
}
```

---

# 10. Business rules và công thức analytics

## 10.1. Dataset analytics

Toàn bộ KPI chính chỉ dùng các dòng:

```text
order_status == "completed"
```

## 10.2. Tổng doanh thu

```text
SUM(line_revenue)
```

## 10.3. Tổng đơn hàng

```text
COUNT DISTINCT order_id
```

Không dùng số dòng.

## 10.4. Tổng khách hàng

```text
COUNT DISTINCT customer_id
```

## 10.5. Tổng sản phẩm đã bán

```text
SUM(quantity)
```

## 10.6. Doanh thu theo ngày

- Group theo `order_date`.
- Sum `line_revenue`.
- Sort tăng dần theo ngày.
- Các ngày thiếu trong khoảng dữ liệu được thêm với revenue bằng 0 cho chart và forecast.

## 10.7. Doanh thu theo tháng

- Group theo `YYYY-MM`.
- Chỉ hiển thị nếu dữ liệu có ít nhất 2 tháng khác nhau.

## 10.8. Product analytics

Group theo `product_id`, kèm tên và category:

- Revenue = sum line revenue.
- Quantity = sum quantity.
- Order count = distinct order_id.

Danh sách:

- Top 5 revenue giảm dần.
- Top 5 quantity giảm dần.
- Bottom 5 quantity tăng dần.

Lưu ý UI không gọi bottom list là “tồn kho bán chậm”. Tên đúng:

> Sản phẩm có lượng bán thấp nhất trong dữ liệu

Vì hệ thống không có dữ liệu tồn kho.

## 10.9. Category analytics

Group theo category:

- Revenue.
- Quantity.
- Revenue share %.

## 10.10. Customer metrics

Group theo `customer_id`, kèm `customer_name`:

- Revenue.
- Distinct order count.
- Quantity purchased.
- First order date.
- Last order date.

## 10.11. Customer segmentation MVP

Các nhóm phải không trùng nhau để biểu đồ tổng bằng tổng khách hàng.

Thứ tự gán nhóm:

1. Tính tổng revenue mỗi customer.
2. Sắp xếp revenue giảm dần, tie-break bằng `customer_id` tăng dần.
3. Số VIP là `max(1, ceil(total_customers × 10%))`.
4. Các customer đầu danh sách → `vip`.
5. Customer không phải VIP và có từ 2 đơn trở lên → `returning`.
6. Customer không phải VIP và chỉ có 1 đơn → `new`.

Quy tắc edge case:

- Nếu có dưới 10 khách hàng, VIP là customer có revenue cao nhất.
- Ít nhất 1 VIP nếu có ít nhất 1 customer.
- Nếu không có completed order, analysis thất bại với `NO_COMPLETED_ORDERS`.

Lưu ý về tên gọi: `new` chỉ có nghĩa là **khách có đúng một đơn trong tập dữ
liệu upload**, không chứng minh đây là lần mua đầu tiên trong toàn bộ lịch sử.
UI phải có tooltip hoặc chú thích “Khách một đơn trong kỳ”. Khi có lịch sử dữ
liệu liên kỳ mới được gọi chắc chắn là khách hàng mới.

## 10.12. Khách hàng tiềm năng

`potential` là một danh sách/nhãn phụ và có thể overlap với `returning`; không
được cộng vào donut ba segment `new/returning/vip`.

Rule:

1. Loại customer đã là VIP.
2. Chỉ giữ customer có ít nhất 2 completed orders.
3. Sắp xếp revenue giảm dần, order count giảm dần, last order date giảm dần,
   rồi `customer_id` tăng dần.
4. Lấy tối đa `max(1, ceil(non_vip_customer_count × 20%))` customer đầu tiên.

UI phải ghi “Tiềm năng theo doanh thu và tần suất trong kỳ”, không khẳng định
khả năng mua trong tương lai như một dự báo cá nhân.

## 10.13. Growth rate

Chỉ tính nếu có ít nhất 14 ngày trong khoảng dữ liệu.

```text
recent_7_days = tổng revenue 7 ngày cuối
previous_7_days = tổng revenue 7 ngày ngay trước đó
```

Nếu `previous_7_days > 0`:

```text
growth_rate = (recent_7_days - previous_7_days) / previous_7_days × 100
```

Nếu previous bằng 0:

- Nếu recent cũng bằng 0 → 0%.
- Nếu recent lớn hơn 0 → trả `null` và warning `NO_COMPARABLE_PREVIOUS_REVENUE` thay vì infinity.

---

# 11. Forecast specification

## 11.1. Mục tiêu

Dự báo tổng doanh thu theo ngày trong 7 ngày tiếp theo để minh họa xu hướng, không bảo đảm kết quả kinh doanh thực tế.

## 11.2. Không thuộc forecast MVP

- Không dự báo từng sản phẩm.
- Không dự báo tồn kho.
- Không seasonality phức tạp.
- Không holiday effect.
- Không AutoML.
- Không neural network.
- Không training model lưu trữ.

## 11.3. Chuẩn bị dữ liệu

1. Lấy completed revenue theo ngày.
2. Tạo dải ngày liên tục từ min date đến max date của **completed orders**.
3. Ngày không có doanh thu gán 0.
4. Số ngày lịch sử là độ dài dải liên tục.

## 11.4. Chọn phương pháp

### Dưới 14 ngày

Không forecast.

Response:

- `available = false`
- `method = null`
- warning: `INSUFFICIENT_HISTORY`

### Từ 14 đến 29 ngày

Dùng **Moving Average 7 ngày**.

- Tính trung bình 7 ngày gần nhất.
- Dự báo mỗi ngày trong 7 ngày tiếp theo bằng giá trị trung bình đó.
- Clip tối thiểu 0.

### Từ 30 ngày trở lên

Dùng **Linear Trend** trên tối đa 30 ngày gần nhất.

- `x = 0..n-1`.
- `y = revenue_by_day`.
- Dùng `numpy.polyfit(x, y, 1)` để lấy slope/intercept.
- Dự báo `x = n..n+6`.
- Clip giá trị âm về 0.

Đây là phép ước lượng thống kê tại request time, không phải pipeline training model riêng.

## 11.5. Forecast response

```json
{
  "available": true,
  "method": "linear_trend_30_days",
  "history_days": 60,
  "forecast_days": 7,
  "forecast_total": 91000000,
  "change_vs_last_7_days_percent": 5.2,
  "points": [
    {"date": "2026-09-01", "predicted_revenue": 12500000}
  ],
  "disclaimer": "Dự báo dựa trên dữ liệu lịch sử và chỉ mang tính tham khảo."
}
```

## 11.6. Quy tắc hiển thị

- Actual và forecast khác kiểu đường.
- Ghi tên method.
- Không dùng từ “độ chính xác cao”.
- Không gọi đây là “AI tự học”.
- Luôn hiển thị disclaimer.

---

# 12. Report specification

## 12.1. Report fallback — Rule-based

Report fallback được tạo hoàn toàn bằng backend template, không phụ thuộc
external AI API.

Cấu trúc:

```json
{
  "title": "Báo cáo tổng quan kinh doanh",
  "summary": "...",
  "highlights": ["...", "..."],
  "trend_analysis": "...",
  "recommendations": [
    {"title": "...", "description": "..."}
  ],
  "disclaimer": "..."
}
```

## 12.2. Rule tạo highlight

Ví dụ:

- Nếu growth > 5% → highlight tăng trưởng tích cực.
- Nếu growth < -5% → highlight doanh thu giảm cần theo dõi.
- Sản phẩm top revenue → highlight đóng góp.
- Returning + VIP rate cao → highlight retention.
- Category có share quá cao → cảnh báo phụ thuộc một danh mục.

## 12.3. Rule recommendation

Recommendation phải liên quan dữ liệu đã có.

Ví dụ hợp lệ:

- Tăng ưu tiên quảng bá top product.
- Chăm sóc VIP/returning customers.
- Kiểm tra sản phẩm có lượng bán thấp.
- Giảm phụ thuộc một category nếu share quá cao.

Ví dụ không hợp lệ khi thiếu dữ liệu:

- “Facebook Ads đang kém hiệu quả.”
- “Giá cao hơn đối thủ.”
- “Tồn kho sắp hết.”
- “Lợi nhuận giảm.”

## 12.4. AI Report V1

Khi `AI_REPORT_ENABLED=true`:

1. Backend tạo aggregate JSON.
2. Loại bỏ customer names và customer IDs.
3. Gửi aggregate JSON tới AI API.
4. Yêu cầu output JSON theo schema.
5. Validate output.
6. Nếu lỗi, dùng report template fallback.
7. Trả `source = "ai"` hoặc `source = "rule_based"` để UI hiển thị trung thực.

AI API không nhận:

- File Excel/CSV.
- Raw rows.
- Email.
- Customer name.
- Customer ID.
- Order ID.

## 12.5. Prompt rules bắt buộc

Prompt phải yêu cầu model:

- Không tự tính lại KPI.
- Chỉ sử dụng dữ liệu đã cung cấp.
- Không đưa ra nguyên nhân như sự thật nếu không có dữ liệu.
- Phân biệt actual và forecast.
- Viết tiếng Việt rõ ràng.
- Trả JSON đúng schema.
- Tối đa 3 khuyến nghị.

---

# 13. Database specification

## 13.1. Bảng `analyses`

| Column | Type | Ý nghĩa |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Chủ sở hữu từ Supabase Auth |
| `file_name` | text | Tên file upload |
| `status` | text | processing/completed/failed |
| `row_count` | integer | Số dòng sau khi bỏ dòng rỗng |
| `date_from` | date nullable | Ngày nhỏ nhất |
| `date_to` | date nullable | Ngày lớn nhất |
| `result_json` | jsonb | Toàn bộ response analysis |
| `error_message` | text nullable | Lỗi xử lý nếu có |
| `created_at` | timestamptz | Thời gian tạo |
| `updated_at` | timestamptz | Thời gian cập nhật |

## 13.2. Không lưu trong database MVP

- Raw Excel/CSV.
- Mỗi order.
- Mỗi line item.
- Model forecast.
- Token người dùng.
- AI API key.

## 13.3. Ownership

Mọi record phải có `user_id` lấy từ verified JWT.

Không chấp nhận `user_id` trong request body để quyết định chủ sở hữu.

## 13.4. Query rules khi backend dùng secret key

Vì secret key bypass RLS:

- `select` phải filter theo verified `user_id`.
- `insert` phải gán verified `user_id`.
- `update/delete` phải filter cả `id` và verified `user_id`.
- Không có repository method kiểu `get_by_id(id)` mà thiếu `user_id`.

Method bắt buộc có dạng:

```python
get_analysis_by_id(*, analysis_id: UUID, user_id: UUID)
```

Không dùng:

```python
get_analysis_by_id(analysis_id)
```

---

# 14. Authentication flow

## 14.1. Frontend sign-in

1. User nhập email/password.
2. React gọi Supabase Auth.
3. Supabase trả session.
4. Frontend giữ session theo Supabase SDK.
5. ProtectedRoute cho phép vào app.

## 14.2. Gọi FastAPI

1. Frontend lấy access token từ session.
2. Thêm header:

```http
Authorization: Bearer eyJ...
```

3. FastAPI dependency đọc Bearer token.
4. FastAPI dùng Supabase `get_claims` hoặc `get_user` để verify.
5. Lấy user id từ claim `sub` hoặc user object.
6. Router nhận một `CurrentUser` đã verified.

## 14.3. Quy tắc token

- API key không phải access token.
- Không gửi publishable key trong Authorization Bearer.
- Khi backend trả 401, frontend thử lấy session mới một lần hoặc redirect login.
- Không log full token.

## 14.4. Quên và đặt lại mật khẩu

1. User nhập email tại `/forgot-password`.
2. Frontend gọi Supabase `resetPasswordForEmail` với redirect URL đã allowlist.
3. User mở link trong email và quay lại `/reset-password`.
4. Frontend kiểm tra recovery session rồi gọi `updateUser` với mật khẩu mới.
5. Hiển thị trạng thái thành công/lỗi nhưng không tiết lộ email có tồn tại hay
   không.

## 14.5. Profile và đổi mật khẩu

- Email lấy từ Supabase Auth user và chỉ hiển thị trong V1.
- Tên hiển thị lưu trong `user_metadata.display_name`.
- Đổi mật khẩu yêu cầu session hợp lệ và gọi Supabase Auth SDK.
- Sau khi đổi mật khẩu thành công, UI thông báo rõ và giữ/refresh session theo
  hành vi Supabase hiện hành.

---

# 15. API contract

Base URL local:

```text
http://localhost:8000/api/v1
```

## 15.1. Health

### `GET /health`

Auth: Không.

Response 200:

```json
{
  "status": "ok",
  "service": "marketlens-api"
}
```

### `GET /auth/me`

Auth: Có.

Mục đích: kiểm tra access token và trả danh tính đã được backend xác minh.

Response 200:

```json
{
  "id": "7b18fa02-e470-41ec-b72e-a53bd955d9a0",
  "email": "shop@example.com"
}
```

## 15.2. Create analysis

### `POST /analyses`

Auth: Có.

Content type:

```text
multipart/form-data
```

Field:

- `file`: một CSV hoặc XLSX.

Response 201:

```json
{
  "id": "uuid",
  "file_name": "sales.xlsx",
  "created_at": "2026-07-24T10:00:00Z",
  "period": {
    "from": "2026-06-01",
    "to": "2026-07-30",
    "history_days": 60
  },
  "summary": {
    "total_revenue": 125000000,
    "total_orders": 489,
    "total_customers": 235,
    "total_quantity_sold": 1526,
    "growth_rate_percent": 12.4
  },
  "revenue_by_date": [
    {"date": "2026-06-01", "revenue": 1200000}
  ],
  "sales": {
    "revenue_by_month": [],
    "revenue_by_category": [],
    "top_products_by_revenue": [],
    "top_products_by_quantity": [],
    "lowest_quantity_products": []
  },
  "customers": {
    "segments": {
      "new": 100,
      "returning": 111,
      "vip": 24
    },
    "potential_count": 20,
    "potential_customers": [],
    "top_customers": []
  },
  "forecast": {},
  "report": {},
  "warnings": []
}
```

## 15.3. List analyses

### `GET /analyses?limit=20&offset=0`

Auth: Có.

Endpoint này thuộc Phase A vì dashboard dùng nó để tìm analysis gần nhất khi
`lastAnalysisId` không tồn tại. History UI dùng cùng endpoint trong Phase B.

Response 200:

```json
{
  "items": [
    {
      "id": "uuid",
      "file_name": "sales.xlsx",
      "status": "completed",
      "row_count": 2000,
      "date_from": "2026-06-01",
      "date_to": "2026-07-30",
      "created_at": "2026-07-24T10:00:00Z"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

## 15.4. Get analysis detail

### `GET /analyses/{analysis_id}`

Auth: Có.

- Chỉ trả record của current user.
- Không tìm thấy hoặc không thuộc user → 404, tránh tiết lộ record tồn tại.

## 15.5. Generate/regenerate AI report

### `POST /analyses/{analysis_id}/ai-report`

Auth: Có.

- Chỉ đọc analysis của current user.
- Chỉ gửi aggregate data đã loại PII tới AI provider.
- Validate JSON output.
- Lưu report mới vào `result_json`.
- Nếu provider lỗi/timeout, trả rule-based fallback với `source` rõ ràng.

Response 200:

```json
{
  "analysis_id": "uuid",
  "source": "ai",
  "report": {
    "title": "Báo cáo tổng quan kinh doanh",
    "summary": "...",
    "highlights": [],
    "trend_analysis": "...",
    "recommendations": [],
    "disclaimer": "..."
  }
}
```

## 15.6. Delete analysis

### `DELETE /analyses/{analysis_id}`

Auth: Có.

Response 204.

## 15.7. Sample template

Khuyến nghị đặt CSV trong frontend `public/` và tải trực tiếp:

```text
/sample_sales_template.csv
```

Không cần backend endpoint riêng trong V1.

---

# 16. Error contract

Mọi lỗi do ứng dụng chủ động trả phải dùng format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Thông báo tiếng Việt cho người dùng.",
    "details": {}
  }
}
```

## 16.1. Danh sách error code chính

| HTTP | Code | Trường hợp |
|---:|---|---|
| 400 | `INVALID_FILE_TYPE` | Không phải CSV/XLSX |
| 400 | `FILE_TOO_LARGE` | Quá 10 MB |
| 400 | `TOO_MANY_ROWS` | Quá 50.000 dòng |
| 400 | `EMPTY_FILE` | File không có dữ liệu |
| 400 | `INVALID_FILE_COLUMNS` | Thiếu/thừa sai template bắt buộc |
| 400 | `INVALID_ROW_DATA` | Dữ liệu dòng không hợp lệ |
| 400 | `NO_COMPLETED_ORDERS` | Không có đơn completed |
| 401 | `UNAUTHORIZED` | Không có/không hợp lệ token |
| 404 | `ANALYSIS_NOT_FOUND` | Không tồn tại hoặc không thuộc user |
| 500 | `ANALYSIS_PROCESSING_FAILED` | Lỗi không dự kiến |
| 503 | `DATABASE_UNAVAILABLE` | Supabase/Data API lỗi |

## 16.2. Security của error

- Production không trả stack trace.
- Không trả secret, token hoặc connection info.
- Không trả raw row chứa PII trong error.
- Log nội bộ dùng request id.

---

# 17. Backend implementation detail

## 17.1. `main.py`

Chịu trách nhiệm:

- Tạo FastAPI app.
- Đăng ký CORS.
- Include routers.
- Exception handlers.
- Không chứa analytics logic.

## 17.2. CORS

Development allow:

```text
http://localhost:5173
```

Production chỉ allow domain frontend thật.

Không dùng wildcard `*` khi gửi Authorization header và credentials.

## 17.3. `config.py`

Dùng `pydantic-settings`.

Settings phải validate lúc app start:

- Supabase URL.
- Publishable key.
- Secret key.
- Origin list.
- Upload limit.

Fail fast nếu thiếu biến bắt buộc.

## 17.4. `auth.py`

Expose dependency:

```python
async def get_current_user(...) -> CurrentUser:
    ...
```

`CurrentUser` tối thiểu:

```python
class CurrentUser(BaseModel):
    id: UUID
    email: str | None = None
```

## 17.5. `file_reader.py`

Chịu trách nhiệm:

- Kiểm tra extension.
- Đọc bytes có giới hạn.
- Parse CSV/XLSX thành DataFrame.
- Không tính KPI.

## 17.6. `validator.py`

Chịu trách nhiệm:

- Check columns.
- Convert/validate date.
- Convert/validate numeric.
- Normalize strings/status.
- Tạo `line_revenue`.
- Trả DataFrame đã chuẩn hóa hoặc raise domain exception.

## 17.7. `analytics.py`

Chịu trách nhiệm:

- Summary.
- Time series.
- Products.
- Categories.
- Customers.
- Growth.

Input phải là validated DataFrame.

## 17.8. `forecast.py`

Chỉ nhận daily revenue series đã aggregate.

Không đọc file và không query DB.

## 17.9. `report.py`

Tạo deterministic report từ analytics output.

## 17.10. `ai_report.py`

Thuộc V1, được gọi khi feature flag bật.

- Có provider adapter/config thay vì hardcode model trong business logic.
- Có timeout.
- Có try/except.
- Validate structured output.
- Fallback report rule-based.

## 17.11. `analyses_repository.py`

Methods tối thiểu:

```python
create_analysis(...)
list_analyses_for_user(user_id, limit, offset)
get_analysis_for_user(analysis_id, user_id)
```

Không trả query object ra ngoài repository.

---

# 18. Frontend implementation detail

## 18.1. Route map

Public:

```text
/                 Landing page
/login
/register
/forgot-password
/reset-password
```

Protected:

```text
/dashboard
/upload
/sales
/customers
/forecast
/report
/profile
/history
```

## 18.2. Auth state

`AuthProvider` quản lý:

- `session`.
- `user`.
- `loading` ban đầu.
- listener auth state change.
- signOut.

ProtectedRoute:

- Nếu auth loading → loading screen.
- Không có user → redirect `/login`.
- Có user → render app.

## 18.3. HTTP client

Axios instance:

- Base URL từ env.
- Trước request lấy current access token.
- Gắn Bearer token.
- 401 → sign out hoặc redirect login.
- Không log token.

## 18.4. Analysis state

Sử dụng TanStack Query:

- `useAnalyses()` cho history.
- `useAnalysis(id)` cho detail.
- `useCreateAnalysis()` cho upload.

Lưu `marketlens:lastAnalysisId` vào localStorage sau upload thành công.

Khi vào dashboard:

1. Nếu có lastAnalysisId → fetch detail.
2. Nếu không có → fetch danh sách và chọn latest.
3. Nếu không có analysis → empty state dẫn tới upload.

Không lưu toàn bộ result JSON vào localStorage.

## 18.5. Trang Upload

UI states:

- Idle.
- File selected.
- Uploading/processing.
- Success.
- Error.

Hỗ trợ cả kéo-thả và nút chọn file; hai cách phải đi qua cùng validation và
upload mutation.

Validation frontend chỉ để UX:

- Extension.
- Size.

Backend vẫn phải validate lại toàn bộ.

## 18.6. Dashboard

Thành phần:

- Header: tên trang + period.
- 4 KPI cards.
- Revenue line chart.
- Top products table/card.
- Top customers table/card.
- Customer segmentation donut/bar.
- Quick actions.

## 18.7. Sales Analytics

- Revenue by date line chart.
- Revenue by category bar chart.
- Top revenue products table.
- Top quantity products table.
- Lowest quantity products table.

## 18.8. Customer Analytics

- 3 segment cards.
- Segment chart.
- Potential customer card/list.
- Top customers table.
- Cột: tên, số đơn, quantity, revenue, segment.

## 18.9. Forecast page

Nếu unavailable:

- Empty/warning state.
- Hiển thị số ngày hiện có.
- Nêu cần tối thiểu 14 ngày.

Nếu available:

- Actual + forecast chart.
- Forecast total.
- Change vs last 7 days.
- Method.
- Disclaimer.

## 18.10. Report page

- Summary.
- Highlights.
- Trend analysis.
- Recommendations.
- Disclaimer.
- Trạng thái `source`: AI hoặc rule-based fallback.
- Nút tạo/tạo lại AI report.
- Nút xuất PDF bằng print stylesheet/browser Save as PDF trong V1.

## 18.11. History page

- Danh sách analysis theo thời gian mới nhất.
- Tên file, khoảng ngày, số dòng và trạng thái.
- Mở một analysis cũ và đặt làm analysis đang xem.
- Xóa analysis sau confirm.
- Pagination offset/limit cơ bản.

## 18.12. Profile page

- Email.
- Tên hiển thị.
- Cập nhật tên.
- Đổi mật khẩu.
- Đăng xuất.

## 18.13. Formatting

Money:

```ts
new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
})
```

Dates:

- Input API là ISO date string.
- Format `dd/MM/yyyy` ở UI.
- Tránh parse date-only qua UTC rồi lệch ngày; xử lý như chuỗi hoặc local date cẩn thận.

---

# 19. UI/UX specification

## 19.1. Brand

- Tên: MarketLens.
- Màu chủ đạo: xanh dương.
- Cảm giác: tin cậy, dữ liệu, gọn, hiện đại.

## 19.2. Design tokens gợi ý

```text
Primary:       #2563EB
Primary dark:  #1D4ED8
Background:    #F8FAFC
Surface:       #FFFFFF
Text primary:  #0F172A
Text muted:    #64748B
Border:        #E2E8F0
Success:       #16A34A
Warning:       #D97706
Danger:        #DC2626
```

## 19.3. Layout

- Desktop-first.
- Sidebar bên trái cho protected app.
- Content max width linh hoạt.
- Cards bo góc vừa phải.
- Không lạm dụng gradient.
- Khoảng trắng rõ ràng.

## 19.4. Required states

Mỗi trang dữ liệu phải có:

- Loading.
- Error.
- Empty.
- Success.

Không hiển thị mock data khi API thất bại.

## 19.5. Accessibility tối thiểu

- Label cho input.
- Nút có text hoặc aria-label.
- Focus state.
- Contrast đủ đọc.
- Không truyền thông tin chỉ bằng màu.

---

# 20. Security và privacy

## 20.1. Dữ liệu nhạy cảm

File có thể chứa customer name hoặc ID. Vì vậy:

- Không log raw file.
- Không log DataFrame.
- Không gửi raw rows tới AI.
- Không lưu raw file trong MVP.
- Chỉ lưu aggregate JSON cần thiết.

## 20.2. Key security

- Publishable key có thể ở frontend.
- Secret key chỉ ở backend.
- Không commit `.env`.
- Nếu secret lộ, rotate ngay.

## 20.3. Authorization

- Frontend route protection không thay thế backend authorization.
- Backend xác thực mọi endpoint analyses.
- Backend lấy user ID từ verified token.
- Repository filter ownership.

## 20.4. Upload security

- Check extension.
- Check file size.
- Giới hạn rows.
- Không thực thi macro.
- Chỉ parse dữ liệu.
- Không dùng filename làm path tùy ý.
- Không tin `content_type` duy nhất; kết hợp extension và parse exception.

## 20.5. CORS

- Allow origins cụ thể.
- Không allow mọi origin production.

## 20.6. AI privacy

Nếu bật AI API:

- Chỉ aggregate metrics.
- Không names/IDs/order IDs.
- Có thể tắt bằng feature flag.
- Có fallback không AI.

---

# 21. Performance limits MVP

Các giới hạn cố định:

- File size: 10 MB.
- Data rows: 50.000.
- Một file/request.
- Xử lý sync.
- Không concurrent job queue.
- API list analyses mặc định 20 records.
- Result JSON không chứa tất cả rows.

Nếu file lớn hơn, trả lỗi rõ ràng thay vì cố xử lý.

---

# 22. Testing strategy

## 22.1. Unit tests backend bắt buộc

### Validator

- Đủ cột → pass.
- Thiếu cột → `INVALID_FILE_COLUMNS`.
- Invalid date → `INVALID_ROW_DATA`.
- Quantity 0/âm → lỗi.
- Price âm → lỗi.
- Discount âm → lỗi.
- Invalid status → lỗi.

### Analytics

- Một order nhiều line item vẫn count 1 order.
- Cancelled không tính revenue.
- Returned không tính revenue.
- Total revenue đúng công thức.
- Customer segmentation không trùng và tổng đúng.
- Potential list không chứa VIP và sort đúng rule.
- Top products sort đúng.

### Forecast

- Dưới 14 ngày unavailable.
- 14–29 dùng moving average.
- Từ 30 dùng linear trend.
- Không có predicted revenue âm.
- Đúng 7 forecast points.

### Report

- Không bịa field ngoài input.
- Luôn có 3 recommendation hoặc ít hơn khi dữ liệu quá ít.
- Có disclaimer.

## 22.2. API tests

- Health 200.
- Không token upload → 401.
- File type sai → 400.
- File hợp lệ → 201.
- User khác lấy ID → 404.

## 22.3. Frontend manual tests

- Register/login/logout.
- Refresh protected page.
- Upload valid CSV.
- Upload invalid CSV.
- Dashboard empty state.
- Dashboard data state.
- Navigate giữa các pages không mất selected analysis.
- Token hết hạn xử lý hợp lý.
- Forgot/reset password.
- Profile cập nhật display name và đổi mật khẩu.
- History mở/xóa analysis đúng ownership.
- AI report success/fallback.
- Report có thể in/lưu PDF.

## 22.4. Test datasets

Dùng:

- `sample_sales_template.csv` cho template ngắn.
- `sample_sales_demo_60_days.csv` cho full demo và linear forecast.
- Tạo thêm file invalid thủ công cho từng test.

---

# 23. Kế hoạch triển khai theo phase

Không gắn phase với deadline cố định. Chỉ chuyển phase khi gate hiện tại đạt,
nhờ đó giữ đủ chức năng mà không phải hy sinh tính đúng đắn.

## Phase 1 — Foundation và vertical slice

### Block 1 — Repository setup

- Copy docs/AGENTS/schema/sample data vào repository.
- Tạo `.gitignore`.
- Tạo backend folder structure.
- Tạo frontend bằng Vite React TS.
- Cài dependencies.
- Tạo env examples.

**Gate:** `npm run dev` và `fastapi dev ...` đều chạy.

### Block 2 — Supabase setup

- Tạo hosted project.
- Lấy URL/publishable/secret keys.
- Bật email/password.
- Chạy `schema.sql`.
- Điền local env.

**Gate:** thấy bảng `analyses` trong Supabase dashboard.

### Block 3 — Auth frontend

- Tạo Supabase client.
- Tạo AuthProvider.
- Login/register pages.
- ProtectedRoute.
- Logout.

**Gate:** register/login thành công, refresh vẫn giữ session.

### Block 4 — Backend foundation

- Config.
- CORS.
- Health route.
- Auth dependency.
- Protected test endpoint tạm thời hoặc analyses list empty.

**Gate:** frontend gửi token và backend trả user ID đã verify.

### Block 5 — UI skeleton

- AppShell/sidebar.
- Routes.
- Empty states.
- Dashboard structure tạm thời; mock phải được xóa khi Phase 3 nối API.

**Gate Phase 1:** auth end-to-end, protected API và application shell đều chạy.

---

## Phase 2 — File pipeline và analytics

### Block 1 — File reader và validator

- Parse CSV.
- Parse XLSX.
- Check size/rows/columns.
- Normalize values.
- Domain errors.
- Unit tests validator.

**Gate:** valid template pass, invalid template trả lỗi đúng.

### Block 2 — Analytics service

- Revenue.
- Orders.
- Customers.
- Quantity.
- Revenue series.
- Products/categories.
- Customer segments.
- Growth.
- Unit tests analytics.

**Gate:** kết quả kiểm tra thủ công khớp Excel/sample expected values.

### Block 3 — Repository và upload endpoint

- Create processing record hoặc chỉ insert completed khi thành công.
- Lưu result_json.
- List/get/delete endpoints.
- Ownership filters.

**Gate:** upload xong thấy record trong Supabase và GET lại được.

**Gate Phase 2:** API upload file demo trả KPI khớp
`sample_data/EXPECTED_DEMO_METRICS.md` và ownership test pass.

---

## Phase 3 — Dashboard và các trang analytics

- HTTP client token interceptor.
- Upload drag-and-drop và mutation.
- Analysis/history queries.
- Latest analysis restore.
- Dashboard thật.
- Sales Analytics.
- Customer Analytics.
- Loading/error/empty states.
- Format tiền/ngày và responsive cơ bản.

**Gate Phase 3:** không còn mock data trong flow analytics; chuyển trang hoặc
refresh không mất selected analysis.

---

## Phase 4 — Forecast và report fallback

### Block 1 — Forecast

- Daily date range fill zero.
- Method selection.
- MA7.
- Linear trend.
- Tests.
- Forecast page.

**Gate:** sample 60 ngày hiển thị 7 forecast points.

### Block 2 — Rule-based fallback

- Summary.
- Highlights.
- Recommendations.
- Disclaimer.
- Report page.

**Gate:** report chỉ sử dụng dữ liệu có thật.

---

## Phase 5 — AI Report và PDF

- Cấu hình AI provider/model qua env.
- Tạo aggregate payload đã loại PII.
- Structured prompt/output validation.
- Timeout và rule-based fallback.
- API tạo/tạo lại report.
- UI hiển thị report source.
- Print stylesheet và nút xuất PDF.
- Test provider success, invalid JSON, timeout và fallback.

**Gate Phase 5:** AI report hoạt động với API thật; khi provider bị tắt/lỗi,
người dùng vẫn nhận report fallback và PDF vẫn xuất được.

---

## Phase 6 — Full account và history

- Forgot/reset password.
- Profile hiển thị/cập nhật tên.
- Đổi mật khẩu và đăng xuất.
- History list/open/delete.
- Confirm và ownership check khi xóa.

**Gate Phase 6:** mọi chức năng trong sitemap ban đầu hoạt động.

---

## Phase 7 — Hoàn thiện chức năng, security và deploy

### Block 1 — UX/error/polish

- Loading.
- Empty.
- Error alerts.
- Number/date formatting.
- Sidebar active state.
- File sample download.
- Responsive desktop/tablet/mobile cơ bản.

### Block 2 — Security/checklist

- Không secret trong frontend.
- `.env` ignored.
- CORS đúng.
- Unauthorized test.
- User ownership test.
- No raw logs.

### Block 3 — Deploy

- Build frontend.
- Tạo backend production command/Dockerfile nếu nền tảng cần.
- Set env production.
- Update CORS.
- Update Supabase redirect URLs.
- Smoke test production.

---

# 24. Quy tắc không cắt chức năng

Không bỏ chức năng V1 để chạy theo deadline. Khi một phần tốn thời gian hơn dự
kiến, giảm **độ cầu kỳ** theo các fallback sau nhưng vẫn giữ khả năng sử dụng:

1. PDF dùng print stylesheet/browser Save as PDF thay vì renderer chuyên dụng.
2. Responsive ưu tiên layout đọc và thao tác được, chưa cần tối ưu từng pixel.
3. AI dùng một provider/model cấu hình sẵn, chưa cần multi-provider UI.
4. Forecast dùng đúng MA7/linear trend, không thêm confidence interval.
5. Profile chỉ có email, display name, đổi mật khẩu và logout.
6. History dùng pagination đơn giản, chưa cần search/sort nâng cao.
7. Landing giữ đúng hero, CTA và ba tính năng; không xây CMS/blog/newsletter.
8. Biểu đồ dùng component Recharts chung, chưa thêm animation phức tạp.

Một chức năng chỉ được coi là có mặt khi happy path, error/loading/empty state
và quyền sở hữu dữ liệu cơ bản đều chạy. Màn hình placeholder không được tính là
hoàn thành.

---

# 25. Definition of Done

Một feature chỉ được đánh dấu hoàn thành khi:

1. Code chạy không lỗi type/runtime trong happy path.
2. Không phá route/feature cũ.
3. Có loading/error/empty state phù hợp nếu là UI.
4. Backend validate input.
5. Endpoint protected nếu chứa dữ liệu user.
6. Không hardcode secret.
7. Response đúng contract.
8. Có test hoặc ít nhất manual test case được ghi lại.
9. Không thêm scope ngoài tài liệu.
10. Cập nhật README nếu command thay đổi.

---

# 26. Git và coding workflow

## 26.1. Branch/commit gợi ý

Trong giai đoạn MVP có thể làm trên một branch chính, nhưng commit nhỏ:

```text
chore: scaffold frontend and backend
feat: add supabase authentication
feat: validate sales upload
feat: calculate dashboard analytics
feat: persist analysis result
feat: add forecast
feat: add report template
fix: handle invalid dates and empty orders
```

## 26.2. Quy tắc dependency

Trước khi thêm dependency, trả lời:

- Có thể làm bằng dependency hiện có không?
- Dependency có phục vụ V1 không?
- Có làm tăng rủi ro deploy không?

Không thêm dependency chỉ để giải quyết vài dòng code đơn giản.

## 26.3. Quy tắc refactor

- Không refactor lớn trong ngày 3 nếu flow đang chạy.
- Ưu tiên fix bug và hoàn thiện demo.
- Không thay đổi API contract sau khi frontend đã tích hợp, trừ lỗi nghiêm trọng.

---

# 27. Deployment architecture

```text
Static frontend host
        │
        │ HTTPS + Bearer token
        ▼
Python/Docker application host
        │
        │ HTTPS Supabase Data/Auth API
        ▼
Supabase Hosted
```

## 27.1. Frontend deploy requirements

- Build command: `npm run build`.
- Output: `dist/`.
- Set VITE env trước build.
- SPA rewrite mọi route về `index.html`.

## 27.2. Backend deploy requirements

Có thể deploy trên PaaS hỗ trợ Python hoặc Docker.

Production command tùy provider, ví dụ:

```bash
fastapi run backend/app/main.py --port "$PORT"
```

Hoặc Docker image dựa trên Python official image.

## 27.3. Production configuration

- `APP_ENV=production`.
- CORS chỉ frontend domain.
- Secret env trên provider dashboard.
- Supabase redirect URL production.
- HTTPS bắt buộc.

## 27.4. Smoke test production

- Health endpoint.
- Register/login.
- Forgot/reset password.
- Upload sample.
- Dashboard.
- Sales/Customers/Forecast.
- AI Report và PDF.
- Profile và History.
- Refresh.
- Logout/login lại và lấy analysis cũ.

---

# 28. Những điều cần nói rõ với khách hàng

1. Hệ thống không training AI/model riêng.
2. KPI được tính bằng backend, không phải AI tự đoán.
3. AI API chỉ tạo văn bản báo cáo/khuyến nghị; report rule-based là fallback.
4. Forecast là thống kê dựa trên lịch sử, chỉ mang tính tham khảo.
5. MVP chỉ hỗ trợ file đúng template.
6. Không kết nối trực tiếp Shopee/TikTok trong phiên bản này.
7. Không phân tích lợi nhuận nếu không có chi phí.
8. Không phân tích quảng cáo/tồn kho nếu file không chứa dữ liệu đó.
9. Khuyến nghị không đồng nghĩa kết luận nguyên nhân.
10. Raw file không được lưu lâu dài trong MVP.

---

# 29. Checklist trước khi bắt đầu code

- [ ] Đọc `AGENTS.md`.
- [ ] Đọc toàn bộ tài liệu này.
- [ ] Xác nhận `.venv` active.
- [ ] Xác nhận FastAPI chạy.
- [ ] Tạo frontend Vite React TS.
- [ ] Tạo Supabase project.
- [ ] Chạy `supabase/schema.sql`.
- [ ] Tạo env local.
- [ ] Kiểm tra `.gitignore`.
- [ ] Chạy health endpoint.
- [ ] Chạy frontend.

# 30. Checklist trước demo

- [ ] Landing và CTA hoạt động.
- [ ] Register/login/logout hoạt động.
- [ ] Forgot/reset/change password hoạt động.
- [ ] Upload valid CSV hoạt động.
- [ ] Upload valid XLSX hoạt động.
- [ ] Drag-and-drop hoạt động.
- [ ] Upload invalid file báo lỗi đẹp.
- [ ] KPI đúng.
- [ ] Cancelled/returned không tính revenue.
- [ ] Dashboard không còn mock data.
- [ ] Sales Analytics và Customer Analytics dùng dữ liệu thật.
- [ ] Potential customers đúng rule và không làm sai tổng segment.
- [ ] Forecast hiển thị hoặc cảnh báo đúng.
- [ ] AI Report dùng aggregate data và không bịa số liệu.
- [ ] AI lỗi thì rule-based fallback hoạt động.
- [ ] Xuất/lưu PDF hoạt động.
- [ ] History mở/xóa analysis hoạt động.
- [ ] Profile cập nhật tên và đổi mật khẩu hoạt động.
- [ ] Refresh vẫn xem được analysis.
- [ ] Responsive cơ bản trên desktop/tablet/mobile.
- [ ] User ownership được test.
- [ ] Không có secret trong Git/frontend.
- [ ] CORS production đúng.
- [ ] File demo 60 ngày sẵn sàng.

---

# 31. Tài liệu chính thức tham chiếu

- React — Build from scratch/Vite: https://react.dev/learn/build-a-react-app-from-scratch
- Vite — Getting Started: https://vite.dev/guide/
- Tailwind CSS with Vite: https://tailwindcss.com/docs/installation/using-vite
- FastAPI request files: https://fastapi.tiangolo.com/tutorial/request-files/
- FastAPI CORS: https://fastapi.tiangolo.com/tutorial/cors/
- FastAPI deployment: https://fastapi.tiangolo.com/deployment/
- Supabase Auth with React: https://supabase.com/docs/guides/auth/quickstarts/react
- Supabase Python Auth get claims: https://supabase.com/docs/reference/python/auth-getclaims
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Python client: https://supabase.com/docs/reference/python/introduction

---

# 32. Quyết định cuối cùng tóm tắt

```text
Frontend:
React + Vite + TypeScript + Tailwind + Recharts

Backend:
FastAPI + pandas + openpyxl + numpy

Auth/Database:
Supabase Hosted Auth + PostgreSQL

Dữ liệu:
Một template CSV/XLSX cố định
Raw file không lưu
Kết quả lưu JSONB trong analyses

Forecast:
<14 ngày: không dự báo
14–29 ngày: Moving Average 7 ngày
>=30 ngày: Linear Trend tối đa 30 ngày
Không training model riêng

AI:
External AI API viết báo cáo
Rule-based report làm fallback
Không gửi raw data/PII
Không fine-tune

Thời gian:
Không khóa deadline
Triển khai theo Phase 1 → 7 và không cắt chức năng V1
```
