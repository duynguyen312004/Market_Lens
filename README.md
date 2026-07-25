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

Nếu database được tạo trước tính năng phân tích gộp, chạy lại toàn bộ
`supabase/schema.sql` trong Supabase SQL Editor. Script idempotent sẽ thêm
`upload_mode` và `source_file_count` mà không cần lưu raw order.

Backend hỗ trợ:

- `POST /api/v1/analyses`: upload CSV/XLSX và tạo analysis.
- `POST /api/v1/analyses/combined`: gộp 2-10 file CSV/XLSX thành một analysis.
- `GET /api/v1/analyses`: danh sách analysis của current user.
- `GET /api/v1/analyses/{id}`: chi tiết analysis thuộc current user.
- `DELETE /api/v1/analyses/{id}`: xóa analysis thuộc current user.

Mỗi file phải có đúng 11 cột theo `sample_data/sample_sales_template.csv`.
Giới hạn 10 MB và 50.000 dòng áp dụng cho toàn bộ một request. Mode gộp xử lý
atomically, loại đơn lặp hoàn toàn giữa các file và từ chối ID có dữ liệu xung
đột. Doanh thu, sản phẩm và khách hàng chỉ dùng đơn `completed`; order health
dùng distinct order của cả ba trạng thái hợp lệ.

Analytics hiện dùng contract V3 (`contract_version: "3.0"`): order health,
commerce metrics, RFM, ABC/Pareto, association support/confidence/lift,
cohort retention, forecast model selection và empirical uncertainty. Mọi
analysis mới bắt buộc có đầy đủ contract V3, không có fallback cho record cũ.
Khi nâng một Supabase project dev từ V1/V2, chạy
`supabase/reset_dev_analyses.sql` rồi upload lại file; script chỉ xóa analysis,
không xóa tài khoản Auth.

## Dashboard và Analytics

Sau khi upload thành công:

- Dashboard: `http://localhost:5173/dashboard`
- Sales Analytics: `http://localhost:5173/sales`
- Customer Analytics: `http://localhost:5173/customers`
- Forecast: `http://localhost:5173/forecast`
- Báo cáo: `http://localhost:5173/report`

Các trang sử dụng dữ liệu analysis thật đã lưu trong Supabase. Khi refresh,
frontend mở lại analysis đã chọn gần nhất theo từng tài khoản; nếu ID đó không
còn tồn tại, app tự phục hồi analysis completed mới nhất. Bộ chọn ở sidebar
hoặc mobile header cho phép đổi dữ liệu trên trang hiện tại.

Forecast so sánh các candidate bằng rolling-origin backtest, chọn method theo
MAE/simplicity rule và hiển thị empirical interval khi đủ residual. Forecast
luôn có disclaimer. Khi report có
`source = "rule_based"`, giao diện ghi rõ đây là báo cáo theo quy tắc và không
gắn nhãn AI.

## AI Report và PDF

Làm theo `docs/AI_REPORT_SETUP.md` để bật Gemini Free Tier ở backend. OpenAI vẫn
là provider tùy chọn. AI chỉ nhận aggregate đã loại PII. Nếu feature flag, key,
quota, provider hoặc response có vấn đề, endpoint trả báo cáo rule-based kèm
warning thay vì làm hỏng flow.

Sau khi cấu hình provider, có thể kiểm tra trực tiếp mà không cần tạo record
database:

```bash
.venv/bin/python scripts/smoke_ai_provider.py
```

Trang `/report` hỗ trợ tạo/tạo lại report và `Print / Save as PDF`. Bản in là
tài liệu A4 riêng có metadata, KPI, data quality, hai biểu đồ SVG, evidence,
risk và recommendation; sidebar/nút thao tác không được in.

Chạy browser E2E bằng user/data Supabase tạm:

```bash
.venv/bin/python scripts/run_browser_journey_e2e.py
.venv/bin/python scripts/run_report_e2e.py
```

Chi tiết contract, cài Chromium và manual acceptance:
`docs/REPORT_PDF.md`.

## Ngôn ngữ

Giao diện hỗ trợ đầy đủ English và Tiếng Việt, bao gồm navigation, auth,
validation, trạng thái tải/lỗi/rỗng, số tiền, ngày tháng, analytics, forecast,
history, profile và upload diagnostics. Lựa chọn ngôn ngữ được lưu trên trình
duyệt và cập nhật thuộc tính `lang` của tài liệu.

Mỗi analysis lưu riêng báo cáo `en` và `vi`. Endpoint
`POST /api/v1/analyses/{analysis_id}/ai-report?language=en|vi` chỉ thay thế bản
báo cáo của ngôn ngữ được yêu cầu; bản còn lại được giữ nguyên. Gemini/OpenAI
được yêu cầu viết đúng ngôn ngữ nhưng vẫn chỉ nhận aggregate không chứa PII.

## Kiểm tra

```bash
.venv/bin/pytest backend/tests
.venv/bin/python scripts/generate_ds_demo_data.py --check
.venv/bin/python scripts/verify_academic_evidence.py --check
.venv/bin/python scripts/benchmark_analysis.py --max-seconds 30
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
- `docs/REPORT_PDF.md`: contract A4, print isolation, browser E2E và checklist
  kiểm tra PDF.
- `docs/E6_HARDENING.md`: input complexity guard, threadpool contract và
  protected browser journey.
- `docs/DATA_DICTIONARY.md`: fixed input contract, output groups, status
  semantics, persistence và privacy boundary.
- `docs/ACADEMIC_METHODOLOGY.md`: phương pháp DS, công thức, assumptions,
  limitations và reproducibility.
- `docs/EXPERIMENT_RESULTS.md`: kết quả forecast/uncertainty/association/cohort
  tái lập từ production pipeline.
- `docs/DEMO_DEFENSE_SCRIPT.md`: kịch bản demo và câu trả lời phản biện.
- `docs/DEPLOYMENT.md`: Render Blueprint, Docker và production smoke test.
- `docs/E2_CUSTOMER_PRODUCT_INTELLIGENCE.md`: công thức và giới hạn của
  RFM, ABC, product association và discount analysis.
- `docs/E3_FORECAST_EVALUATION.md`: rolling-origin backtest, baseline, error
  metrics và reliability rules của forecast.
- `docs/DS_CORE_V3.md`: target contract, dataset strategy và methodology cho
  model selection, uncertainty, association và cohort.
- `docs/AI_REPORT_V2.md`: evidence contract, privacy boundary, strict AI
  validation và cấu trúc report dùng chung.
- `docs/PLAN_REVIEW_AND_QUOTE.md`: scope feature-complete MVP.
- `docs/SUPABASE_SETUP.md`: setup Auth và database từng bước.
- `frontend/public/marketlens_ds_demo_365_days.csv`: rich demo synthetic có thể
  tải trực tiếp từ ứng dụng để test toàn bộ DS Core và report.
- `sample_data/sample_sales_demo_60_days.csv`: bộ oracle 60 ngày dùng cho test
  tự động và production smoke.
- `sample_data/EXPECTED_DEMO_METRICS.md`: kết quả chuẩn để test analytics.
- `sample_data/DS_DATASETS.md`: manifest, ground truth và cách regenerate bộ
  dữ liệu synthetic DS Core.

Regenerate bộ dữ liệu DS deterministic:

```bash
.venv/bin/python scripts/generate_ds_demo_data.py
```
