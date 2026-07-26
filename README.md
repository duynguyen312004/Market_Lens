# MarketLens

MarketLens là ứng dụng web phân tích dữ liệu bán hàng từ file CSV/XLSX. Hệ
thống chuẩn hóa dữ liệu từ mẫu MarketLens, Shopee, TikTok Shop hoặc custom
mapping; tính KPI bằng code deterministic; lưu kết quả tổng hợp trong Supabase
và hỗ trợ báo cáo rule-based hoặc báo cáo viết lại bằng AI.

## Tính năng chính

- Đăng ký, đăng nhập, đăng xuất, quên/đặt lại mật khẩu và cập nhật hồ sơ bằng
  Supabase Auth.
- Upload một file hoặc gộp 2–10 file CSV/XLSX.
- Preview cấu trúc, nhận diện nguồn, mapping cột/trạng thái và lưu import
  profile theo từng tài khoản.
- Dashboard doanh thu, đơn hàng, khách hàng và sản phẩm.
- Sales Analytics: doanh thu theo thời gian, danh mục, sản phẩm, weekday,
  discount, ABC/Pareto, association và động lực tăng trưởng tháng/năm.
- Customer Analytics: khách quay lại, segment, RFM và cohort retention.
- Forecast doanh thu 7/30 ngày với rolling-origin evaluation, baseline,
  deterministic model selection và empirical uncertainty.
- Báo cáo song ngữ English/Tiếng Việt, rule-based fallback, AI provider tùy
  chọn và Print/Save as PDF.
- History, phân trang, lựa chọn phiên phân tích và xóa kết quả.

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6, Tailwind CSS 4 |
| Data fetching | Axios, TanStack Query |
| Forms | React Hook Form, Zod |
| Charts | Recharts |
| Backend | FastAPI, pandas, NumPy, Pydantic |
| Auth/Database | Supabase Hosted Auth và PostgreSQL |
| Testing | pytest, Vitest, Playwright |
| Deployment | Render Blueprint hoặc Docker |

Ứng dụng là một frontend và một FastAPI service, không dùng microservice,
Redis, Celery hay pipeline training ML.

## Nguyên tắc dữ liệu và bảo mật

- KPI và forecast được backend tính bằng code deterministic; AI không tính KPI.
- AI provider chỉ nhận evidence aggregate, không nhận raw order, customer ID,
  customer name, email hoặc user UUID.
- Backend xác minh Supabase access token cho mọi API dữ liệu.
- `user_id` luôn lấy từ token đã xác minh; repository query luôn filter theo
  verified user.
- Frontend chỉ dùng Supabase publishable key. Không đặt
  `SUPABASE_SECRET_KEY` hoặc `AI_API_KEY` trong frontend.
- File upload được xử lý trong memory và không được lưu. Database chỉ lưu
  analysis result JSONB và import profile.
- Cache frontend được phân vùng theo tài khoản và được xóa khi đổi phiên đăng
  nhập.
- Production fail-fast nếu API/Supabase URL thiếu, dùng localhost, HTTP hoặc
  placeholder key.

## Cấu trúc repository

```text
backend/
  app/
    core/           Cấu hình, auth, error contract và request limits
    repositories/   Supabase persistence có ownership filter
    routers/        API /api/v1
    schemas/        Pydantic request/response contracts
    services/       Import, analytics, forecast và report
  tests/            Backend unit/API/repository tests
frontend/
  e2e/              Playwright browser journeys
  public/           Ảnh và file mẫu tải từ giao diện
  src/              React application
sample_data/        Dataset demo, scenario và validation fixtures
scripts/            Benchmark, smoke, evidence và security checks
supabase/           Hosted PostgreSQL schema và development reset
Dockerfile          FastAPI container tùy chọn
render.yaml         Render Blueprint cho backend/frontend
```

## Yêu cầu local

- Python 3.14
- Node.js 24
- npm 11
- Một Supabase project nếu cần chạy auth, persistence hoặc browser E2E

## 1. Cài backend

Từ thư mục gốc:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt
cp backend/.env.example backend/.env
```

`backend/requirements.txt` chỉ chứa dependency production.
`backend/requirements-dev.txt` bổ sung pytest cho môi trường phát triển.

### Biến môi trường backend

| Biến | Bắt buộc | Ý nghĩa |
|---|---:|---|
| `APP_ENV` | Có | `development` hoặc `production` |
| `FRONTEND_ORIGINS` | Có | Danh sách exact frontend origins, phân cách bằng dấu phẩy |
| `SUPABASE_URL` | Với API protected | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Với auth | Publishable key |
| `SUPABASE_SECRET_KEY` | Với persistence/E2E | Secret key, chỉ đặt ở backend |
| `MAX_UPLOAD_MB` | Không | Mặc định 10 MB |
| `MAX_UPLOAD_ROWS` | Không | Mặc định 50.000 dòng |
| `MAX_UPLOAD_FILES` | Không | Mặc định 10 file |
| `MAX_ANALYSIS_PERIOD_DAYS` | Không | Mặc định 1.826 ngày |
| `AI_REPORT_ENABLED` | Không | Bật external AI report |
| `AI_PROVIDER` | Khi bật AI | `gemini` hoặc `openai` |
| `AI_MODEL` | Khi bật AI | Model của provider |
| `AI_API_BASE_URL` | Khi bật AI | Official provider endpoint |
| `AI_API_KEY` | Khi bật AI | Secret key, chỉ đặt ở backend |

Không commit `backend/.env`.

## 2. Tạo Supabase schema

1. Tạo một Supabase project.
2. Mở SQL Editor.
3. Chạy toàn bộ `supabase/schema.sql`.
4. Xác nhận có:
   - `public.analyses`
   - `public.import_profiles`
   - RLS policies cho hai bảng
   - function `public.set_analysis_report`
5. Trong Auth URL Configuration, đặt local Site URL là
   `http://localhost:5173` và thêm redirect URL
   `http://localhost:5173/reset-password`.
6. Trước khi test đăng ký/quên mật khẩu nhiều lần hoặc mở production, cấu hình
   custom SMTP trong **Authentication → Emails → SMTP Settings**. Email sender
   mặc định của Supabase chỉ dành cho thử nghiệm, có quota rất thấp dùng chung
   giữa đăng ký, khôi phục mật khẩu và đổi email; vì vậy một người có thể gặp
   rate limit ngay ở lần bấm đầu nếu các lần gửi trước đó đã dùng hết quota của
   project.

`supabase/schema.sql` có thể chạy lại khi cập nhật ứng dụng. Function
`set_analysis_report` cập nhật riêng report `en`/`vi` bằng JSONB atomic để hai
request đồng thời không ghi đè nhau.

`supabase/reset_dev_analyses.sql` chỉ dùng để xóa analysis development cũ khi
clean-cut contract. Không chạy script này trên production.

## 3. Chạy backend

```bash
source .venv/bin/activate
fastapi dev backend/app/main.py --port 8000
```

- Health: `http://localhost:8000/api/v1/health`
- Swagger development: `http://localhost:8000/docs`

Health endpoint vẫn hoạt động khi chưa cấu hình Supabase. API protected sẽ trả
error contract rõ ràng cho tới khi có key hợp lệ.

## 4. Cài và chạy frontend

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Frontend chạy tại `http://localhost:5173`.

### Biến môi trường frontend

| Biến | Ý nghĩa |
|---|---|
| `VITE_API_BASE_URL` | Full API URL, ví dụ `http://localhost:8000/api/v1` |
| `VITE_API_ORIGIN` | Production backend origin; frontend tự thêm `/api/v1` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key |

Không đặt backend secret trong biến bắt đầu bằng `VITE_`.

## Dữ liệu đầu vào

### Mẫu MarketLens canonical

File MarketLens phải có đúng 11 cột:

| Cột | Quy tắc |
|---|---|
| `order_id` | Bắt buộc, ổn định trong cùng đơn |
| `order_date` | `YYYY-MM-DD` |
| `customer_id` | Bắt buộc trong canonical template |
| `customer_name` | Bắt buộc trong canonical template |
| `product_id` | Bắt buộc trong canonical template |
| `product_name` | Không rỗng |
| `category` | Không rỗng |
| `quantity` | Số nguyên dương |
| `unit_price` | Số không âm |
| `discount` | Số không âm |
| `order_status` | `completed`, `cancelled` hoặc `returned` |

Backend tính:

```text
line_revenue = quantity × unit_price - discount
```

Doanh thu/KPI bán hàng chỉ tính từ đơn `completed`. Đơn `cancelled` và
`returned` được giữ để tính order health và product issue metrics.

### Shopee, TikTok Shop và custom file

- Nhận diện nguồn dựa trên header, không dựa trên tên file.
- Adapter Shopee/TikTok chỉ cam kết các header alias đã có fixture regression.
- Custom mapping tối thiểu cần order ID, order date, product name, quantity,
  order status và `line_revenue` hoặc `unit_price`.
- Nếu thiếu customer identifier, Customer Analytics được đánh dấu unavailable.
- Nếu thiếu category, hệ thống dùng `Chưa phân loại`.
- Trạng thái được khớp theo toàn bộ giá trị đã normalize, không dùng substring.
  Trạng thái pending/processing/shipping được bỏ khỏi analysis; trạng thái lạ
  phải được user xác nhận mapping.
- Combined analysis preview từng file và auto-detect nguồn độc lập. Tất cả file
  phải ready trước khi submit.

Giới hạn cho một request:

- CSV hoặc XLSX
- tối đa 10 MB
- tối đa 50.000 source rows
- combined từ 2 đến 10 file
- khoảng thời gian tối đa 1.826 ngày

Các file mẫu có thể tải trực tiếp tại trang Upload hoặc lấy từ
`sample_data/` và `frontend/public/`.

## Kết quả phân tích

Analysis contract hiện tại là `5.0`.

### Dashboard

- Tổng doanh thu thuần
- Đơn hoàn tất
- Khách hàng và số lượng bán
- Giá trị đơn trung bình
- Tăng trưởng 7 ngày gần nhất
- Trạng thái đơn và xu hướng doanh thu

### Sales Analytics

- Doanh thu ngày/tháng, sản phẩm, danh mục và weekday
- Gross revenue, discount amount/rate
- Revenue concentration và ABC/Pareto
- Product association support/confidence/lift
- Product cancellation/return issue rate
- KPI năm/tháng
- Growth drivers: tháng gần nhất so với tháng trước hoặc năm hiện tại so với
  cùng kỳ năm trước

### Customer Analytics

- Khách mới/quay lại và repeat-customer rate
- Customer value segments
- RFM
- Cohort retention theo tháng

### Forecast

- Hai horizon độc lập: 7 và 30 ngày
- Candidate methods: moving average, seasonal naive, weekday average và linear
  trend
- Rolling-origin evaluation với baseline
- Model selection deterministic và simplicity tolerance
- Prediction interval từ empirical backtest residuals
- Forecast không phải cam kết doanh thu

## Báo cáo và AI

Rule-based report luôn khả dụng. Khi bật AI, backend gửi evidence catalog tổng
hợp đến Gemini hoặc OpenAI và yêu cầu provider viết lại nội dung theo strict
JSON schema.

Backend từ chối toàn bộ AI response nếu:

- JSON sai schema;
- evidence key không tồn tại hoặc sai domain;
- nội dung chứa số không khớp evidence;
- risk/recommendation suy đoán về lợi nhuận, tồn kho, quảng cáo, đối thủ hoặc
  giá thị trường;
- nội dung chứa thuật ngữ nội bộ hoặc cách viết số gây hiểu sai.

Khi provider lỗi, timeout, hết quota hoặc trả nội dung không hợp lệ, API trả
rule-based fallback kèm warning. Mỗi analysis lưu riêng report English và
Tiếng Việt.

Kiểm tra provider thật:

```bash
source .venv/bin/activate
.venv/bin/python scripts/smoke_ai_provider.py --language en
.venv/bin/python scripts/smoke_ai_provider.py --language vi
```

## API

Tất cả endpoint dưới đây dùng prefix `/api/v1`.

| Method | Endpoint | Chức năng |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/auth/me` | Identity từ verified access token |
| `POST` | `/imports/preview` | Preview và validate import mapping |
| `GET` | `/import-profiles` | Danh sách profile của current user |
| `POST` | `/import-profiles` | Tạo import profile |
| `PATCH` | `/import-profiles/{id}` | Cập nhật import profile |
| `DELETE` | `/import-profiles/{id}` | Xóa import profile |
| `POST` | `/analyses` | Upload một file |
| `POST` | `/analyses/combined` | Upload combined |
| `GET` | `/analyses` | Lịch sử của current user |
| `GET` | `/analyses/{id}` | Analysis detail |
| `POST` | `/analyses/{id}/ai-report` | Tạo report theo `language=en\|vi` |
| `DELETE` | `/analyses/{id}` | Xóa analysis |

Mọi lỗi dùng một contract:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Readable message",
    "details": null
  }
}
```

## Sample data

| Đường dẫn | Mục đích |
|---|---|
| `sample_data/sample_sales_template.csv` | Canonical template nhỏ |
| `sample_data/sample_sales_demo_60_days.csv` | Regression, API smoke và forecast |
| `sample_data/marketlens_ds_demo_365_days.csv` | Demo đầy đủ analytics/forecast |
| `sample_data/platform_samples/` | Synthetic Shopee/TikTok exports |
| `sample_data/test_cases/` | Boundary, conflict và invalid input fixtures |
| `sample_data/ds_scenarios/` | Forecast, association và cohort ground truth |
| `sample_data/DATASET_MANIFEST.json` | Hash và expected outcome |

Các dataset được tạo tổng hợp và không chứa dữ liệu khách hàng thật.

Regenerate hoặc xác minh dataset:

```bash
.venv/bin/python scripts/generate_ds_demo_data.py
.venv/bin/python scripts/generate_ds_demo_data.py --check
```

## Kiểm thử

### Backend

```bash
.venv/bin/pytest -q
.venv/bin/python -m compileall -q backend scripts
.venv/bin/pip check
```

### Frontend

```bash
cd frontend
npm run lint
npm test
npm run build
npm audit --omit=dev
```

### Dataset, evidence, secret và performance

```bash
.venv/bin/python scripts/generate_ds_demo_data.py --check
.venv/bin/python scripts/verify_academic_evidence.py --check
.venv/bin/python scripts/check_secrets.py
.venv/bin/python scripts/benchmark_analysis.py --max-seconds 30
git diff --check
```

Baseline local gần nhất:

- 225 backend tests passed
- 92 frontend tests passed
- lint, TypeScript production build và dependency checks passed
- benchmark 50.000 dòng khoảng 3,8 giây, peak RSS khoảng 163 MB
- browser journey và report/PDF A4 3 trang passed

### Browser E2E

Cài Chromium và system dependencies:

```bash
cd frontend
npx playwright install --with-deps chromium
cd ..
```

Sau khi `backend/.env` có Supabase keys:

```bash
.venv/bin/python scripts/run_browser_journey_e2e.py
.venv/bin/python scripts/run_report_e2e.py
```

Các runner tạo user Supabase tạm và cleanup user/analysis trong `finally`.

## Deploy

### Render

Repository có `render.yaml` tạo:

- `marketlens-api`: Python web service
- `marketlens-web`: Vite static site

Các bước:

1. Push repository.
2. Tạo Render Blueprint từ `render.yaml`.
3. Điền các backend secret: Supabase keys và `AI_API_KEY`.
4. Điền frontend Supabase URL/publishable key.
5. Cập nhật Supabase Site URL/Redirect URLs sang frontend production URL.
6. Cấu hình SMTP riêng cho email confirmation/password recovery.
7. Chạy production smoke.

```bash
SMOKE_API_ORIGIN=https://your-api.example.com \
SMOKE_FRONTEND_ORIGIN=https://your-web.example.com \
SMOKE_SUPABASE_URL=https://your-project.supabase.co \
SMOKE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx \
SMOKE_TEST_EMAIL=your-test-account@example.com \
SMOKE_TEST_PASSWORD='your-test-password' \
.venv/bin/python scripts/smoke_production.py
```

### Docker

```bash
docker build -t marketlens-api .
docker run --env-file backend/.env -p 8000:8000 marketlens-api
```

## Giới hạn hiện tại

- Chỉ hỗ trợ file order-level ở cấp dòng sản phẩm; không hỗ trợ inventory,
  advertising report, accounting statement hoặc mọi biến thể export của sàn.
- Shopee/TikTok adapter cần thêm regression fixture trước khi mở rộng alias.
- PDF dùng browser Print/Save as PDF, không có server-side PDF renderer.
- AI report cần external provider nhưng rule-based report luôn hoạt động.
- Production release chỉ được xem là hoàn tất sau khi browser E2E, SMTP và
  smoke test URL thật đều đạt.
