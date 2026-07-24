# MarketLens Phase Status

Tài liệu này ghi trạng thái triển khai thực tế. Phạm vi và contract vẫn lấy từ
`docs/MARKETLENS_MASTER_PLAN.md`.

## Quy ước

- `LOCKED`: gate của phase đã đạt. Chỉ sửa regression, security hoặc thay đổi
  contract đã được duyệt.
- `ACTIVE`: phase đang được triển khai.
- `PENDING`: chưa bắt đầu đầy đủ, không được xem placeholder là hoàn thành.

## Trạng thái hiện tại

| Phase | Trạng thái | Bằng chứng chính |
|---|---|---|
| Phase 1 - Foundation và auth | LOCKED | Landing, auth, protected route, shell, FastAPI health và token verification hoạt động |
| Phase 2 - File pipeline và analytics | LOCKED | CSV/XLSX validation, analytics, persistence, ownership và upload UI; backend test suite pass |
| Phase 3 - Dashboard và analytics pages | LOCKED | Dashboard, Sales Analytics, Customer Analytics dùng API thật; latest analysis restore; loading/error/empty/success; frontend test/lint/build pass |
| Phase 4 - Forecast và report fallback | LOCKED | Forecast đủ/thiếu lịch sử, actual/forecast chart, 7 điểm dự báo và report rule-based có source trung thực; backend/frontend gates pass |
| Phase 5 - AI Report và PDF | ACTIVE | Gemini/OpenAI adapters, mock-provider tests, fallback persistence và print/PDF đã xong; còn cấu hình Gemini Free Tier key và smoke-test thật trước khi lock |
| Phase 6 - Full account và history | LOCKED | Forgot/reset recovery, Profile và History dùng Supabase/API thật; frontend/backend gates và smoke test Supabase thật đạt |
| Phase 7 - Security, polish và deploy | ACTIVE | Security hardening, production fail-fast, Render/Docker và smoke script đã xong; còn deploy/smoke trên URL thật |

## Gate Phase 3 đã khóa

- Không còn mock data trong Dashboard, Sales Analytics và Customer Analytics.
- Cả ba trang dùng chung analysis hiện tại từ `GET /analyses/{id}`.
- Refresh ưu tiên `marketlens:lastAnalysisId`; ID cũ bị xóa sẽ fallback về
  analysis completed mới nhất từ `GET /analyses`.
- Dashboard có 4 KPI, revenue chart, top products, top customers, customer
  segmentation và quick actions.
- Sales Analytics có daily/monthly/category/product charts cùng ba bảng xếp
  hạng sản phẩm.
- Customer Analytics có segment metrics/chart, potential customers và top
  customers.
- Có loading skeleton, error retry, empty CTA và success state.
- Layout đọc và thao tác được trên desktop, tablet và mobile; bảng rộng có
  horizontal overflow chủ động.
- Tiền, số, phần trăm và date-only được format nhất quán theo `vi-VN`.

## Gate Phase 4 đã khóa

- Dưới 14 ngày hiển thị trạng thái chưa đủ dữ liệu, số ngày hiện có, số ngày
  còn thiếu và CTA upload file dài hơn.
- Từ 14 ngày trở lên hiển thị forecast 7 ngày theo đúng method backend đã chọn.
- Actual dùng đường liền, forecast dùng đường nét đứt và màu riêng.
- Forecast page hiển thị tổng dự báo, thay đổi với 7 ngày thực tế gần nhất,
  method, history days, bảng đủ 7 điểm và disclaimer.
- Sample 60 ngày dùng `linear_trend_30_days`, có đúng 7 điểm và tổng
  `15.450.331 VND`.
- Forecast backend có test MA7, linear trend, insufficient history và clip giá
  trị âm về 0.
- Report page hiển thị summary, highlights, trend, tối đa 3 recommendations và
  disclaimer từ backend.
- Fallback hiển thị `Nguồn: Quy tắc tự động`; chỉ hiển thị nhãn AI khi response
  có `source = "ai"`.
- Test report kiểm tra KPI mẫu và không chứa các kết luận về quảng cáo, đối thủ,
  tồn kho hoặc lợi nhuận khi dữ liệu không cung cấp các trường đó.

## Tiến độ Phase 5, chưa khóa

- Có Gemini Interactions API adapter và OpenAI Responses API adapter với
  Structured Outputs.
- Mặc định dùng Gemini Free Tier, model GA `gemini-3.5-flash-lite`, thinking
  minimal và `store = false`; OpenAI vẫn là provider tùy chọn.
- Payload chỉ chứa aggregate; test xác nhận không có customer ID/name, order
  ID, filename hoặc email.
- Gemini không nhận user ID/hash; OpenAI tùy chọn dùng privacy-preserving
  `safety_identifier`, không gửi user UUID gốc.
- Endpoint `POST /analyses/{id}/ai-report` verify ownership, validate response
  và lưu report mới vào `result_json`.
- Có fallback cho disabled, missing config, unsupported provider, timeout,
  rate limit/quota, invalid response/refusal và HTTP/network error.
- UI có tạo/tạo lại report, trạng thái pending/success/warning/error và source
  trung thực.
- Print stylesheet và nút `Xuất PDF` đã hoạt động theo browser Save as PDF.
- Mock providers đã cover Gemini/OpenAI success, privacy contract, invalid
  JSON, incomplete response, rate limit, timeout và fallback.
- Supabase thật đã smoke-test upload, AI-disabled fallback, persistence và
  cleanup.
- Còn thiếu duy nhất gate bắt buộc: cấu hình Gemini Free Tier key thật và xác
  nhận response `source = "ai"`.

## Gate Phase 6 đã khóa

- Forgot password gọi Supabase `resetPasswordForEmail`, dùng thông báo trung
  tính và không tiết lộ email có tồn tại.
- Recovery link redirect đúng `/reset-password`; form chỉ mở khi có session
  từ sự kiện `PASSWORD_RECOVERY`, không mở bằng session đăng nhập thông thường.
- Mật khẩu mới có validation đầy đủ, sau khi reset thì đăng xuất và quay về
  trang đăng nhập.
- Profile hiển thị email, cập nhật `user_metadata.display_name`, yêu cầu mật
  khẩu hiện tại khi đổi mật khẩu và cho phép đăng xuất.
- History lấy dữ liệu thật từ `GET /analyses`, có loading, error, empty,
  phân trang, responsive table/card và trạng thái xử lý.
- Mở history cũ cập nhật analysis đang chọn rồi chuyển về Dashboard.
- Xóa analysis có dialog xác nhận, pending/error state, cập nhật cache và xóa
  selected ID nếu cần.
- Backend vẫn filter `id` và verified `user_id`; user khác nhận 404 khi thử mở
  analysis không thuộc quyền sở hữu.
- Supabase thật đã smoke-test cập nhật tên, đổi mật khẩu, đăng nhập lại, tạo,
  list, mở, xóa history, ownership và cleanup.
- Recovery thật đã smoke-test bằng generated link: redirect chính xác, nhận
  recovery session, đổi mật khẩu, mật khẩu cũ bị từ chối và mật khẩu mới đăng
  nhập được.
- SMTP riêng và kiểm tra email inbox thực tế thuộc gate deploy production ở
  Phase 7; hướng dẫn nằm trong `docs/SUPABASE_AUTH_SETUP.md`.

## Tiến độ Phase 7, chưa khóa

- Client tự refresh Supabase session đúng một lần khi API trả 401; nếu vẫn lỗi
  thì xóa local session, quay về login và giữ return path nội bộ an toàn.
- Backend production fail-fast khi Supabase key, AI provider/key/model/base
  URL, HTTPS CORS origin hoặc các giới hạn runtime chưa hợp lệ.
- Backend không còn fallback từ secret key sang publishable key.
- CORS chỉ cho phép origin đã cấu hình cùng GET/POST/DELETE/OPTIONS và các
  header cần thiết; không bật credential cookie.
- API có error contract cho validation/HTTP/unexpected error, no-store và các
  security header cơ bản; mọi response có `X-Request-ID`, server error log
  request ID, UI hiển thị mã để đối chiếu; production tắt Swagger/OpenAPI.
- XLSX có guard số file, tổng dung lượng giải nén, path traversal và encrypted
  archive trước khi openpyxl xử lý.
- Modal xóa history có Escape, focus trap, focus restore và lớp phủ đúng z-index.
- Landing đã được kiểm tra trực quan ở desktop; auth layout được gia cố để
  không tràn ngang ở màn hình nhỏ và giữ thao tác quên mật khẩu luôn đọc được.
- `.env` local đã hạ quyền về `600`; exact secret scan frontend và `npm audit`
  đều pass.
- `httpx2` không sử dụng đã được bỏ khỏi requirements.
- Có `render.yaml` cho frontend static + backend FastAPI, SPA rewrite, static
  headers/CSP, cache assets, dynamic service URL và env secret không commit.
- Production boot với cấu hình Gemini đã được smoke-test trên dynamic `PORT`;
  health trả 200 cùng CSP, HSTS và các security header dự kiến.
- Có Docker backend non-root, dynamic `PORT`, proxy headers và health check.
- Production start command đã smoke-test thành công trên port riêng.
- Có `scripts/smoke_production.py` để kiểm tra frontend/SPA rewrite, security
  headers, CORS, health, auth, upload, KPI, forecast, history, AI persistence
  thật và cleanup.
- Có `scripts/check_secrets.py` để lặp lại secret scan mà không đọc `.env`
  local hoặc in nội dung credential.
- Tài liệu triển khai và rollback nằm trong `docs/DEPLOYMENT.md`.
- Gate local gần nhất: `87` backend tests, `39` frontend tests, lint, production
  build, `pip check`, secret scan và `npm audit --audit-level=high` đều pass.
- Gate còn thiếu: build Docker trong môi trường đã bật Docker engine, deploy
  hai service lên URL thật, cấu hình SMTP/inbox, chạy automated + manual
  production smoke. Docker Desktop hiện chưa bật WSL integration.

## Lệnh gate

```bash
.venv/bin/pytest backend/tests -q
.venv/bin/python scripts/check_secrets.py

cd frontend
npm test
npm run lint
npm run build
```

Ma trận đối chiếu toàn bộ V1 nằm tại `docs/V1_COMPLETION_AUDIT.md`.
