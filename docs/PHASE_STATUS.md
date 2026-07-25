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
| Phase 2 - File pipeline và analytics | LOCKED | Single/combined CSV/XLSX validation, dedup/conflict checks, analytics, persistence, ownership và upload UI; backend test suite pass |
| Phase 3 - Dashboard và analytics pages | LOCKED | Dashboard, Sales Analytics, Customer Analytics dùng API thật; latest analysis restore; loading/error/empty/success; frontend test/lint/build pass |
| Phase 4 - Forecast và report fallback | LOCKED | Forecast đủ/thiếu lịch sử, actual/forecast chart, 7 điểm dự báo và report rule-based có source trung thực; backend/frontend gates pass |
| Phase 5 - AI Report và PDF | LOCKED | Gemini thật trả `source=ai`; protected endpoint, Supabase persistence, fallback, privacy contract và print/PDF đều đạt gate |
| Phase 6 - Full account và history | LOCKED | Forgot/reset recovery, Profile và History dùng Supabase/API thật; frontend/backend gates và smoke test Supabase thật đạt |
| Phase 7 - Security, polish và deploy | ACTIVE | Predeploy security/polish/performance/browser gates đã khóa; Render/Docker/smoke script sẵn sàng, còn deploy/SMTP/smoke URL thật |

## Chương trình cải tiến Data Science sau V1

Roadmap chi tiết nằm tại `docs/DS_ENHANCEMENT_PLAN.md`.

| Enhancement phase | Trạng thái | Phạm vi |
|---|---|---|
| E1 - Advanced deterministic analytics | LOCKED | Contract V2, domain analytics engine, order health, commerce, weekday pattern, concentration, customer health và test oracle |
| E2 - RFM / ABC / product intelligence | LOCKED | RFM empirical quintile, ABC 80/95, product-pair support, discount breakdown, privacy test và UI giải thích phương pháp |
| E3 - DS Core V3 | LOCKED | Contract V3, candidate selection, backtest, uncertainty, confidence/lift, cohort/retention, deterministic datasets và Supabase smoke đều đạt |
| E4 - AI Report V2 | LOCKED | Shared strict schema, backend-owned evidence, structured risks/recommendations, bilingual UI, real Gemini và protected Supabase persistence smoke đều đạt |
| E5 - Dedicated report/PDF | LOCKED | Tài liệu riêng 3 trang A4, SVG print-safe, browser PDF E2E và Supabase cleanup đều đạt |
| E6 - Hardening/deploy/academic delivery | PREDEPLOY LOCKED | 50k benchmark, E2E toàn luồng, dependency/security gate và academic delivery đạt; production là external gate |

Clean baseline trước E3:

- E2 là contract bắt buộc ở backend và frontend; không còn compatibility
  branch cho analysis E1.
- Supabase development `public.analyses` đã reset từ 3 records về 0 records;
  Auth users và schema được giữ nguyên.
- Repository-wide dead-code audit đã xóa plan-pack `Market_lens_plan/` stale,
  hai frontend API module không có caller, một schema export không dùng, 27
  translation entries và 10 CSS design tokens không được tham chiếu.
- Runtime source graph không còn frontend module unreachable; dependency,
  sample, smoke/deploy script và tài liệu còn lại đều có caller hoặc vai trò
  vận hành được ghi rõ.
- Gate local trước E3: `115` backend tests, `54` frontend tests, lint, production build,
  `pip check`, compile, secret scan và diff check pass.

## Gate DS Core V3 đã khóa

- Runtime backend/frontend bắt buộc `contract_version = "3.0"`; không còn
  compatibility branch cho V2.
- Forecast so sánh Seasonal Naive, MA7, Weekday Average 4 tuần và Linear
  Trend 30 ngày trên cùng tối đa 8 rolling-origin fold, không leakage.
- Primary metric là MAE; simplicity tolerance 5% và tie-break deterministic.
- Evaluation so sánh selected method với seasonal-naive baseline bằng MAE,
  RMSE, sMAPE, cải thiện MAE và reliability công khai.
- Empirical uncertainty target 80% dùng tối thiểu 28 absolute residual; bounds
  nằm trực tiếp trên từng forecast point.
- Product association trả support, directional confidence, lift và toàn bộ
  denominator/threshold cần để giải thích.
- Customer acquisition cohort trả distinct-customer retention, revenue và
  order count; zero quan sát được khác future cell chưa quan sát.
- Generator seed `20260725` tạo rich demo 365 ngày và ba scenario oracle;
  `--check` xác nhận file committed khớp byte-for-byte.
- Supabase development đã reset sạch. Protected API smoke thật đạt
  `upload → persist → list → reload → delete`; analysis count cuối bằng `0`.
- Gate local: `145` backend tests, `57` frontend tests, frontend lint/build,
  `pip check`, compile, secret scan và diff check pass.
- Methodology: `docs/DS_CORE_V3.md` và
  `docs/E3_FORECAST_EVALUATION.md`.

## Gate AI Report V2 đã khóa

- Report fallback và AI dùng chung `report_version = "2.0"`; không còn field
  V1 hoặc compatibility renderer.
- Backend tạo evidence catalog có key/value/unit/context; provider chỉ trả
  narrative và exact evidence keys.
- Strict draft schema, reference-existence check, section-domain check và
  final Pydantic validation chạy trước khi nhận `source = "ai"`.
- Invalid/unknown/unrelated evidence bắt buộc fallback toàn bộ.
- Report có executive summary, 4-6 KPI, data-quality note, bốn section cố
  định, tối đa 5 risk signals và 1-5 recommendation có
  priority/evidence/action/success metric.
- TypeScript contract bắt buộc; UI render metadata, KPI, quality, evidence,
  risks và recommendation cho cả English/Vietnamese.
- Payload không có raw rows, file/email/order/customer identity. Gemini không
  nhận user identifier; OpenAI chỉ nhận safety hash.
- Gemini provider thật pass Report 2.0 và evidence gate.
- Protected Supabase smoke thật đạt upload fallback V2 → AI tiếng Việt →
  persist → reload → delete; user/analysis tạm đã cleanup và count cuối bằng
  `0`.
- Methodology: `docs/AI_REPORT_V2.md`.

## Gate Dedicated Report/PDF đã khóa

- `/report` tách rõ action UI và `#business-report`; print media chỉ hiển thị
  tài liệu, không in sidebar, navigation, selector, nút hoặc notice.
- Header có MarketLens branding, privacy label, source files, period, dataset
  size, generated time và generator; nội dung dùng Report V2 có evidence.
- Có SVG deterministic cho 30 ngày actual và actual/forecast/empirical
  interval; không phụ thuộc responsive chart reflow khi Chrome tạo PDF.
- A4 margin 12 mm, print color chính xác, evidence không ellipsis, card/chart
  không bị cắt giữa trang và các section chính có page boundary chủ đích.
- Nút ghi đúng hành vi `Print / Save as PDF` / `In / Lưu thành PDF`; không giả
  là download trực tiếp.
- Playwright thật tạo user Supabase tạm, upload protected dataset, đăng nhập
  qua UI, xác nhận print isolation/chart geometry, xuất PDF ba trang rồi
  cleanup user/analysis. Database trở về sạch sau mỗi run.
- Reproducible runner: `scripts/run_report_e2e.py`; contract và manual
  acceptance: `docs/REPORT_PDF.md`.

## Tiến độ E6 hardening

- Input period bị chặn inclusive ở tối đa `1.826` ngày bằng
  `MAX_ANALYSIS_PERIOD_DAYS`; single và combined đều trả
  `DATE_RANGE_TOO_LARGE` trước daily expansion.
- Toàn bộ protected analysis route có pandas/openpyxl/Supabase/AI blocking
  work đã chuyển thành sync path operation để FastAPI chạy trong threadpool.
- Auth return-path race đã được sửa tại `PublicOnlyRoute`; internal path được
  sanitize trước redirect.
- Dashboard/analytics/forecast chart tắt Recharts animation để deterministic
  và tránh motion/render artifact.
- Protected Playwright journey thật pass mobile + desktop:
  login return path → single upload → combined upload/dedup → active analysis
  selection → Dashboard/Sales/Customer/Forecast → AI-disabled fallback →
  Profile name/password → xóa hai History records → logout → login bằng mật
  khẩu mới.
- Runner tạo/cleanup Supabase user và analysis tạm; count sau run bằng `0`.
- Academic delivery gồm data dictionary, methodology, reproducible experiment
  results và demo/defense script; evidence JSON được production pipeline verify.
- Benchmark đúng trần 50.000 dòng đạt khoảng `3,84s`, peak RSS khoảng `162 MB`.
- React Router clean-cut lên `8.3.0`; `npm audit --omit=dev` trả
  `0 vulnerabilities`, unit/build/browser/PDF gates đều pass sau upgrade.
- Gate predeploy gần nhất: `154` backend tests, `59` frontend tests,
  dependency/compile/secret/dataset/evidence/lint/build/diff đều pass.
- Contract và phần còn lại: `docs/E6_HARDENING.md`.

## Gate Phase 3 đã khóa

- Không còn mock data trong Dashboard, Sales Analytics và Customer Analytics.
- Cả ba trang dùng chung analysis hiện tại từ `GET /analyses/{id}`.
- Refresh ưu tiên `marketlens:lastAnalysisId:<user_id>`; ID cũ bị xóa sẽ fallback về
  analysis completed mới nhất từ `GET /analyses`.
- Sidebar và mobile header có selector dùng chung React Context; đổi analysis
  cập nhật trang hiện tại mà không đổi route.
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
- V1 report baseline từng dùng summary/highlight/trend; runtime hiện đã
  clean-cut sang Report V2 theo gate E4 ở trên.
- Fallback hiển thị `Nguồn: Quy tắc tự động`; chỉ hiển thị nhãn AI khi response
  có `source = "ai"`.
- Test report kiểm tra KPI mẫu và không chứa các kết luận về quảng cáo, đối thủ,
  tồn kho hoặc lợi nhuận khi dữ liệu không cung cấp các trường đó.

## Gate Phase 5 đã khóa

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
- Gemini Free Tier thật đã smoke-test trực tiếp thành công với
  `gemini-3.5-flash-lite`.
- Luồng end-to-end bằng tài khoản Supabase tạm đã đạt: auth → upload demo →
  protected AI endpoint → `source = "ai"` → đọc lại report đã persist →
  cleanup analysis và user.
- Sau smoke thật, toàn bộ backend/frontend test, lint, build, audit và secret
  scan vẫn pass.

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
- History và selector hiển thị analysis gộp cùng số file nguồn.
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
- Toàn bộ runtime UI/API/report copy đã đồng bộ sang tiếng Anh; format VND và
  date-only giữ logic hiện có.
- Giao diện đã khóa light theme trắng/xanh; landing có word reveal tôn trọng
  reduced motion; Landing, Auth, sidebar và các panel tối đã được đồng bộ.
- Mọi nút đăng xuất ở app shell và Profile đều mở dialog xác nhận có Escape,
  click backdrop, focus trap và focus restore.
- `.env` local đã hạ quyền về `600`; exact secret scan frontend pass.
- React Router đã clean-cut từ `react-router-dom@7.18.1` sang bản vá
  `react-router@8.3.0`. Unit/build/browser/PDF gates đều pass và
  `npm audit --omit=dev` trả `0 vulnerabilities`.
- `httpx2` không sử dụng đã được bỏ khỏi requirements.
- Có `render.yaml` cho frontend static + backend FastAPI, SPA rewrite, static
  headers/CSP, cache assets, dynamic service URL và env secret không commit.
- Git repository đã có branch `main`, remote GitHub và đã được liên kết vào
  Render; chưa kích hoạt deploy.
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
- Gate local gần nhất: `154` backend tests, `59` frontend tests, lint,
  production build, `pip check`, compile, dataset/evidence checks, benchmark
  50k và secret scan pass. Browser journey/PDF E2E đều pass.
- Gate còn thiếu: deploy hai service lên URL thật, cấu hình SMTP/inbox, chạy
  automated + manual production smoke. Dockerfile là phương án deploy tùy
  chọn; Render Python runtime không phụ thuộc Docker Desktop.

## Lệnh gate

```bash
.venv/bin/pytest backend/tests -q
.venv/bin/python scripts/generate_ds_demo_data.py --check
.venv/bin/python scripts/verify_academic_evidence.py --check
.venv/bin/python scripts/benchmark_analysis.py --max-seconds 30
.venv/bin/python scripts/check_secrets.py

cd frontend
npm audit --omit=dev
npm test
npm run lint
npm run build
```

Ma trận đối chiếu toàn bộ V1 nằm tại `docs/V1_COMPLETION_AUDIT.md`.
