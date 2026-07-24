# Thiết lập AI Report

MarketLens mặc định dùng Gemini Free Tier từ FastAPI. OpenAI vẫn là provider
tùy chọn. API key chỉ được đặt ở backend, không đặt trong frontend hoặc biến
bắt đầu bằng `VITE_`.

## 1. Tạo Gemini API key miễn phí

1. Mở `https://aistudio.google.com/apikey`.
2. Tạo hoặc chọn một project đang ở `Free Tier`.
3. Chọn `Create API key`.
4. Không bật billing nếu mục tiêu là không phát sinh chi phí.
5. Không gửi key qua chat và không commit key vào repository.

Free Tier có giới hạn request/token. Khi chạm quota, MarketLens trả báo cáo
theo quy tắc và cho phép thử lại sau. Free Tier có thể dùng prompt/response để
cải thiện sản phẩm của Google; MarketLens chỉ gửi aggregate đã loại PII.

## 2. Cấu hình local

Mở `backend/.env` và đặt:

```env
AI_REPORT_ENABLED=true
AI_PROVIDER=gemini
AI_MODEL=gemini-3.5-flash-lite
AI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
AI_API_KEY=YOUR_GEMINI_API_KEY
AI_TIMEOUT_SECONDS=20
AI_MAX_OUTPUT_TOKENS=1200
```

`gemini-3.5-flash-lite` là model GA ưu tiên chi phí và throughput, hỗ trợ
Interactions API cùng structured output. Request chạy stateless với
`store=false`.

Sau khi sửa env, restart backend:

```bash
fastapi dev backend/app/main.py --port 8000
```

Chạy smoke provider không cần Supabase:

```bash
.venv/bin/python -m scripts.smoke_ai_provider
```

Kết quả bắt buộc là `AI provider smoke: PASS`. Script không in key, payload
aggregate hoặc nội dung report.

## 3. Smoke test trên app

1. Đăng nhập MarketLens.
2. Upload `sample_data/sample_sales_demo_60_days.csv`.
3. Mở `/report`.
4. Chọn `Tạo báo cáo AI`.
5. Khi thành công, source phải đổi thành `Nguồn: External AI`.
6. Refresh trang; report AI phải vẫn còn vì endpoint đã lưu vào
   `analyses.result_json`.
7. Chọn `Xuất PDF`, sau đó chọn `Save as PDF`.

## 4. Fallback

Endpoint luôn trả báo cáo sử dụng được:

- `AI_DISABLED`: feature flag đang tắt.
- `AI_NOT_CONFIGURED`: thiếu model hoặc API key.
- `AI_PROVIDER_UNSUPPORTED`: provider không được hỗ trợ.
- `AI_TIMEOUT`: provider quá thời gian.
- `AI_RATE_LIMITED`: hết quota/rate limit tạm thời.
- `AI_INVALID_RESPONSE`: response không đúng JSON/schema hoặc bị từ chối.
- `AI_PROVIDER_ERROR`: lỗi mạng hoặc HTTP từ provider.

Trong các trường hợp này, response có `source = "rule_based"` và UI hiển thị
warning tương ứng.

## 5. Dữ liệu gửi tới provider

Chỉ gửi aggregate:

- Period và summary KPI.
- 14 điểm doanh thu ngày gần nhất.
- Tổng hợp sản phẩm và danh mục.
- Số lượng segment khách hàng.
- Forecast aggregate.
- Warning codes.

Không gửi file, raw rows, email, filename, order ID, customer ID hoặc customer
name. Gemini không nhận user ID hoặc hash user ID. Adapter OpenAI tùy chọn chỉ
gửi `safety_identifier` là hash một chiều, không gửi UUID gốc.

## 6. OpenAI tùy chọn

Nếu sau này muốn dùng OpenAI, đặt:

```env
AI_PROVIDER=openai
AI_MODEL=YOUR_OPENAI_MODEL
AI_API_BASE_URL=https://api.openai.com/v1
AI_API_KEY=YOUR_OPENAI_API_KEY
```

Không cần thay đổi frontend hoặc API contract.

## 7. Tài liệu chính thức

- Gemini pricing: `https://ai.google.dev/gemini-api/docs/pricing`
- Gemini billing: `https://ai.google.dev/gemini-api/docs/billing`
- Interactions API: `https://ai.google.dev/gemini-api/docs/interactions-overview`
- Structured output: `https://ai.google.dev/gemini-api/docs/structured-output`
