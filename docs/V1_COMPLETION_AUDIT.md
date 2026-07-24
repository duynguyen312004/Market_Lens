# MarketLens V1 Completion Audit

Ngày rà soát: 2026-07-24.

Tài liệu này đối chiếu implementation hiện tại với
`docs/MARKETLENS_MASTER_PLAN.md`. Trạng thái `VERIFIED` nghĩa là đã có code và
bằng chứng local/real-service tương ứng; `EXTERNAL GATE` là phần chỉ có thể xác
nhận sau khi cung cấp credential hoặc URL production.

## Kết luận

Toàn bộ chức năng V1 đã có implementation. Không có chức năng nghiệp vụ nào bị
cắt. Các gate còn mở không phải phần code còn thiếu:

1. Gemini API key thật để xác nhận AI report trả `source = "ai"`.
2. Git remote và tài khoản hosting để deploy lên URL production.
3. SMTP/inbox production để kiểm tra email thật.
4. Docker engine để chạy lại image build trên máy hiện tại.

Ứng dụng vẫn dùng được khi Gemini hết quota hoặc tạm lỗi: backend trả report
rule-based và UI ghi đúng nguồn. Điều này không thay thế gate AI thật bắt buộc
trước khi khóa Phase 5.

## Ma trận chức năng

| Nhóm | Yêu cầu V1 | Trạng thái | Bằng chứng |
|---|---|---|---|
| Landing | Brand, hero, CTA, ba lợi ích | VERIFIED | `/`, CTA tới đăng ký/đăng nhập, responsive layout |
| Auth | Register, login, logout, protected route | VERIFIED REAL SUPABASE | Supabase Auth flow và backend token verification đã smoke-test |
| Account | Forgot/reset password, profile, đổi tên/mật khẩu | VERIFIED REAL SUPABASE | Recovery link, recovery session, password cũ/mới và metadata đã smoke-test |
| Upload | CSV/XLSX, fixed template, first sheet, UTF-8, 10 MB, 50k rows | VERIFIED | Validator/reader/API tests và sample CSV/XLSX |
| Upload UX | Chọn file, drag-drop, sample, idle/loading/success/error | VERIFIED | `/upload` dùng chung validation và mutation |
| Dashboard | 4 KPI, daily revenue, top products/customers, segments | VERIFIED | API data thật; không có mock fallback |
| Sales | Daily/monthly/category/product và ba bảng sản phẩm | VERIFIED | `/sales` dùng persisted analysis |
| Customers | New/returning/VIP/potential/top customers | VERIFIED | Segment disjoint, potential loại VIP và sort theo rule |
| Forecast | 7 ngày, MA7/linear trend, insufficient warning, non-negative | VERIFIED | Unit tests cho cả ba nhánh và sample oracle 60 ngày |
| Report fallback | Summary, highlights, trend, tối đa 3 recommendations, disclaimer | VERIFIED | Rule-based report test kiểm tra grounding |
| External AI | Aggregate-only, structured output, validate, persist, fallback | IMPLEMENTED; EXTERNAL GATE | Gemini/OpenAI adapter và mock-provider tests; thiếu Gemini key thật |
| PDF | Xuất báo cáo | VERIFIED MANUAL FLOW | Print stylesheet và browser Save as PDF |
| Persistence | Create/list/get/delete và restore latest analysis | VERIFIED REAL SUPABASE | CRUD, refresh restore, ownership và cleanup đã smoke-test |
| History | List, pagination, open, confirm delete, responsive states | VERIFIED | `/history`, API/repository ownership tests |
| Responsive/UX | Desktop/tablet/mobile, loading/error/empty/success | VERIFIED LOCAL | Data pages có state riêng; frontend test/lint/build pass |
| Security | Secret isolation, CORS, validation, headers, ownership | VERIFIED LOCAL | Production fail-fast, tested XLSX guards, reproducible secret scan, repository filters |
| Error handling | Stable contract, no stack trace/PII, internal request ID | VERIFIED | Mọi response có `X-Request-ID`; server errors log request ID; UI hiển thị mã để đối chiếu |
| Deployment | Render/Docker config, env wiring, smoke/rollback docs | READY; EXTERNAL GATE | `render.yaml`, `Dockerfile`, production start và smoke script |

## Những mục có điều kiện hoặc ngoài phạm vi

- Bộ lọc thời gian là mục có điều kiện “nếu contract hỗ trợ”. V1 chỉ lưu
  aggregate hoàn chỉnh của mỗi lần upload, không lưu raw orders để tính lại
  toàn bộ product/customer metrics theo khoảng tùy ý, nên không bật filter giả
  hoặc chỉ lọc riêng chart.
- Không kết nối trực tiếp Shopee/TikTok, không phân tích lợi nhuận, quảng cáo
  hoặc tồn kho vì các trường đó không có trong data contract V1.
- Không training, fine-tune hay vận hành model riêng. Forecast dùng thống kê;
  AI provider chỉ viết báo cáo từ aggregate.
- PDF V1 dùng print stylesheet/Save as PDF đúng fallback đã duyệt, không có
  server-side PDF renderer.

## Bằng chứng kiểm thử gần nhất

Chạy ngày 2026-07-24:

```text
Backend:       87 passed
Frontend:      39 passed / 10 files
Python deps:   no broken requirements
Python compile: pass
Frontend lint: pass
Frontend build: pass
npm audit:     0 vulnerabilities
Secret scan:   pass
Render YAML:   pass
```

Đã có smoke test Supabase thật cho auth, profile, password, persistence,
history và ownership. Production boot giả lập đã trả health 200 cùng CSP, HSTS,
no-store, frame/content/referrer/permissions headers, CORS expose request ID;
Swagger/OpenAPI đều tắt.

## Điều kiện để khóa hai phase còn lại

### Phase 5

1. Điền Gemini Free Tier key vào `backend/.env`.
2. Bật `AI_REPORT_ENABLED=true`.
3. Restart backend.
4. Chạy `.venv/bin/python -m scripts.smoke_ai_provider`.
5. Xác nhận app trả `source = "ai"` và refresh vẫn giữ report.

### Phase 7

1. Đưa source lên Git remote và tạo Render Blueprint.
2. Điền secret env đúng service.
3. Cập nhật Supabase Site URL/Redirect URLs và SMTP.
4. Chạy `scripts/smoke_production.py`.
5. Chạy checklist browser/inbox trong `docs/DEPLOYMENT.md`.
