# MarketLens V1 Completion Audit

Ngày rà soát: 2026-07-25.

Tài liệu này đối chiếu implementation hiện tại với
`docs/MARKETLENS_MASTER_PLAN.md`. Trạng thái `VERIFIED` nghĩa là đã có code và
bằng chứng local/real-service tương ứng; `EXTERNAL GATE` là phần chỉ có thể xác
nhận sau khi cung cấp credential hoặc URL production.

## Kết luận

Toàn bộ chức năng V1 đã có implementation. Không có chức năng nghiệp vụ nào bị
cắt. Phase 5 đã được khóa bằng Gemini API và Supabase thật. Các gate còn mở
không phải phần code còn thiếu:

1. Kích hoạt Render deploy để có frontend/backend URL production.
2. SMTP/inbox production để kiểm tra email thật.

Ứng dụng vẫn dùng được khi Gemini hết quota hoặc tạm lỗi: backend trả report
rule-based và UI ghi đúng nguồn.

## Ma trận chức năng

| Nhóm | Yêu cầu V1 | Trạng thái | Bằng chứng |
|---|---|---|---|
| Landing | Brand, hero, CTA, ba lợi ích | VERIFIED | Light white/blue system, word reveal có reduced-motion, CTA và responsive layout |
| Auth | Register, login, logout, protected route | VERIFIED REAL SUPABASE | Supabase Auth, professional light layout, validation và confirm logout |
| Account | Forgot/reset password, profile, đổi tên/mật khẩu | VERIFIED REAL SUPABASE | Recovery link, recovery session, password cũ/mới và metadata đã smoke-test |
| Upload | Single hoặc combined 2-10 CSV/XLSX, fixed template, first sheet, UTF-8, tổng 10 MB/50k rows | VERIFIED REAL SUPABASE | Validator/API tests và browser journey upload đơn + gộp/dedup/persist/cleanup |
| Upload UX | Chọn file, drag-drop, danh sách/bỏ file, sample, idle/loading/success/error | VERIFIED LOCAL | `/upload` có mode single/combined và lỗi chỉ rõ file nguồn |
| Dashboard | 4 KPI, daily revenue, top products/customers, segments | VERIFIED | API data thật; không có mock fallback |
| Sales | Daily/monthly/category/product và ba bảng sản phẩm | VERIFIED | `/sales` dùng persisted analysis |
| Customers | New/returning/VIP/potential/top customers | VERIFIED | Segment disjoint, potential loại VIP và sort theo rule |
| Forecast | 7 ngày, candidate selection, backtest, baseline, uncertainty, insufficient warning, non-negative | VERIFIED REAL SUPABASE | DS Core V3 oracle tests và protected persistence smoke |
| Report fallback | Report V2: KPI, quality, sections, risks, recommendations có evidence/action/success metric | VERIFIED | Strict Pydantic/TypeScript và grounding tests |
| External AI | Evidence-catalog only, strict draft, reference validation, hydrate, persist, fallback | VERIFIED REAL GEMINI + SUPABASE | Gemini thật trả Report 2.0; protected endpoint persist report tiếng Việt và cleanup đạt |
| PDF | Dedicated Report V2, biểu đồ và Save as PDF | VERIFIED REAL BROWSER E2E | Print isolation, A4, SVG geometry và PDF ba trang được Playwright xác nhận với user/data Supabase tạm |
| Persistence | Create/list/get/delete, source metadata và restore latest analysis | VERIFIED REAL SUPABASE | Browser journey tạo hai analysis, đổi selection, reload/list/delete cả hai và cleanup |
| History | List, pagination, open, global selector, confirm delete, responsive states | VERIFIED LOCAL | Selection Context theo user, selector giữ route, API/repository ownership tests |
| Responsive/UX | Desktop/tablet/mobile, loading/error/empty/success | VERIFIED REAL BROWSER E2E | Journey kiểm tra mobile/desktop và không horizontal document overflow |
| Language | UI, validation, API errors và reports | VERIFIED | Runtime copy đồng bộ tiếng Anh; VND/date formatting giữ chính xác |
| Security | Secret isolation, CORS, validation, headers, ownership | VERIFIED LOCAL | Production fail-fast, tested XLSX guards, reproducible secret scan, repository filters |
| Error handling | Stable contract, no stack trace/PII, internal request ID | VERIFIED | Mọi response có `X-Request-ID`; server errors log request ID; UI hiển thị mã để đối chiếu |
| Deployment | Render/Docker config, env wiring, smoke/rollback docs | READY; EXTERNAL GATE | GitHub/Render đã liên kết; `render.yaml`, `Dockerfile`, production start và smoke script sẵn sàng |

## Những mục có điều kiện hoặc ngoài phạm vi

- Bộ lọc thời gian là mục có điều kiện “nếu contract hỗ trợ”. V1 chỉ lưu
  aggregate hoàn chỉnh của mỗi lần upload, không lưu raw orders để tính lại
  toàn bộ product/customer metrics theo khoảng tùy ý, nên không bật filter giả
  hoặc chỉ lọc riêng chart.
- Không kết nối trực tiếp Shopee/TikTok, không phân tích lợi nhuận, quảng cáo
  hoặc tồn kho vì các trường đó không có trong data contract V1.
- Không training, fine-tune hay vận hành model riêng. Forecast dùng thống kê;
  AI provider chỉ viết báo cáo từ aggregate.
- PDF dùng dedicated `#business-report` và print stylesheet/Save as PDF theo
  contract đã duyệt; không có server-side PDF renderer.

## Bằng chứng kiểm thử gần nhất

Chạy gần nhất ngày 2026-07-25:

```text
Backend:       154 passed
Frontend:      59 passed / 13 files
Browser E2E:   1 passed; single + combined + selector + full account/history
Report E2E:    1 passed; PDF A4 3 pages; Supabase cleanup pass
50k benchmark: 3.844579s; peak RSS 161.83 MB
Python deps:   no broken requirements
Python compile: pass
Frontend lint: pass
Frontend build: pass
npm audit:     0 vulnerabilities
Secret scan:   pass
Render YAML:   pass
```

Frontend đã clean-cut từ `react-router-dom@7.18.1` sang
`react-router@8.3.0`, bản vá advisory RSC. MarketLens vẫn chỉ dùng client-side
`BrowserRouter`; unit, lint, production build, protected journey và PDF E2E
đều pass sau major upgrade.

Đã có smoke test Supabase thật cho auth, profile, password, persistence,
history và ownership. Production boot giả lập đã trả health 200 cùng CSP, HSTS,
no-store, frame/content/referrer/permissions headers, CORS expose request ID;
Swagger/OpenAPI đều tắt.

Gemini Free Tier thật đã trả `source = "ai"`. Luồng end-to-end với Supabase
thật đã xác nhận auth, upload, AI generation, persistence và cleanup.

DS Core V3 đã smoke lại bằng protected API thật:
upload → persist → list → reload → delete; contract trả `3.0`, user/analysis
tạm đã cleanup và `public.analyses` trở về `0` record.

Flow combined đã được kiểm tra bằng browser/Supabase thật với bộ dữ liệu hai
phần: 21 dòng nguồn, 20 dòng hiệu lực, 1 đơn trùng được loại. Analysis selector
đổi lại file 60 ngày đúng KPI; hai records được xóa và cleanup hoàn toàn.

## External gate để khóa deployment

1. Push predeploy baseline đã commit lên branch release.
2. Điền secret env đúng service và kích hoạt Render deploy.
3. Cập nhật Supabase Site URL/Redirect URLs và SMTP.
4. Chạy `scripts/smoke_production.py`.
5. Chạy checklist browser/inbox trong `docs/DEPLOYMENT.md`.

Dockerfile là phương án deploy backend tùy chọn. MarketLens đang dùng Render
Python runtime nên việc Docker Desktop chưa bật không chặn gate production.
