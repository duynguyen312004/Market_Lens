# MarketLens — Data Science Enhancement Plan

> Trạng thái: kế hoạch cải tiến sau feature-complete V1
> Nguyên tắc: giữ nguyên React/Vite/TypeScript, FastAPI/pandas/numpy và
> Supabase Hosted; không gửi raw rows/PII cho AI; KPI vẫn do backend tính bằng
> deterministic code.

## 1. Mục tiêu

Chương trình cải tiến biến MarketLens từ một data web app đủ chức năng thành
một đồ án có chiều sâu Data Science rõ ràng hơn:

- Có feature engineering và chỉ số giải thích được.
- Có phân tích sản phẩm/khách hàng vượt khỏi top/bottom đơn giản.
- Forecast có backtest và baseline để đánh giá.
- AI Report chỉ diễn giải evidence do backend cung cấp.
- Báo cáo in/PDF có bố cục tài liệu riêng.
- Mọi kết quả có test oracle và mô tả phương pháp.

## 2. Những thứ cần chuẩn bị chung

- Một Supabase project dev riêng; không dùng dữ liệu khách hàng thật.
- Bộ dữ liệu demo hiện tại và thêm datasets cho edge cases.
- Một baseline sạch: backend tests, frontend tests/lint/build, secret scan.
- E1 thiết lập analysis contract V2 sạch và chủ động bỏ tương thích với các
  record V1 trong môi trường dev. Sau E2, dự án thực hiện thêm một clean cut
  đã duyệt để E2 trở thành bắt buộc. Từ baseline E2 trở đi, thay đổi trong V2
  phải backward-compatible trừ khi có quyết định contract mới rõ ràng. DS Core
  V3 là clean-cut decision đó; V2 không còn được runtime hỗ trợ.
- Mọi thuật ngữ phải trung thực với dữ liệu: không gọi quantity thấp là tồn kho
  chậm, không gọi heuristic là dự đoán hành vi cá nhân.

Không cần đổi schema database cho E1-E5 vì kết quả mới tiếp tục nằm trong
`analyses.result_json`. Sau cutover V3, chạy
`supabase/reset_dev_analyses.sql` trên Supabase project dev rồi upload lại dữ
liệu để toàn bộ record dùng contract V3. Script chỉ xóa analysis, không xóa
tài khoản Auth hoặc thay đổi schema.

## 3. E1 — Advanced deterministic analytics

### Phạm vi

E1 thay contract analytics V1 bằng contract V2 có version tường minh:

- `contract_version: "2.0"`.
- `summary`: KPI lõi cùng AOV và revenue/customer.
- `orders`: số đơn distinct theo status, tỷ lệ status và items/completed order.
- `sales`: gross/net/discount, time/category/product breakdown và
  concentration.
- `customers`: segmentation, repeat rate và revenue theo segment.

Backend tách engine theo domain trong `app/services/analytics/`:

- `orders.py`: số đơn theo status, tỷ lệ hoàn tất/hủy/trả.
- `sales.py`: gross revenue, discount, weekday pattern, product/category và
  concentration.
- `customers.py`: segmentation, repeat-customer rate và doanh thu theo
  segment.
- `engine.py`: orchestration, summary và growth.

Frontend:

- Dashboard: business health strip.
- Sales Analytics: commerce metrics, concentration và weekday chart.
- Customer Analytics: repeat rate, revenue/customer và segment revenue.

### Definition of Done

- Metric chỉ dùng dữ liệu đã validate.
- Status metrics dùng distinct order, không dùng số line item.
- Bốn KPI V1 giữ nguyên ý nghĩa trong `summary`, nhưng response cũ không được
  duy trì bằng fallback hoặc field song song.
- Demo oracle và edge-case tests pass.
- Backend schema và frontend type cùng require contract V2.
- Có script reset analysis dev và hướng dẫn upload lại dữ liệu.

## 4. E2 — Customer and product intelligence

### Phạm vi

- RFM features: recency, frequency, monetary.
- RFM score theo empirical quintile và các nhóm
  Champion/Loyal/At Risk/New/Regular loại trừ nhau.
- Giữ segment V1 `new/returning/vip` để không phá contract.
- ABC/Pareto classification cho sản phẩm.
- Cặp sản phẩm thường xuất hiện cùng order; chỉ dùng support/count, không gọi
  là quan hệ nhân quả.
- Phân tích discount theo product/category khi dữ liệu đủ.

### Chuẩn bị

- Dataset có tối thiểu 100 khách hàng với phân phối RFM đa dạng.
- Dataset có order nhiều line item để test product pairs.
- Quy tắc tie-break deterministic cho quantile và ABC.

Contract, công thức, threshold và giới hạn tính toán chi tiết:
`docs/E2_CUSTOMER_PRODUCT_INTELLIGENCE.md`.

### Definition of Done

- RFM/ABC/pairs có unit tests, tie-break rõ ràng và UI giải thích phương pháp.
- Không đưa customer identity vào AI payload.
- Không dùng từ “dự đoán khách sẽ mua” nếu chưa có model dự đoán.
- Sau khi E2 đạt gate, môi trường dev reset toàn bộ analysis E1 và contract
  bắt buộc có RFM/ABC/pairs/discount. Không giữ fallback hoặc field optional
  cho record cũ.

## 5. E3 — DS Core V3

> Trạng thái: runtime đã clean-cut sang contract V3; gate và methodology hiện
> hành ở trạng thái `LOCKED` tại `docs/DS_CORE_V3.md` và
> `docs/E3_FORECAST_EVALUATION.md`.

### Phạm vi

- Giữ `<14` unavailable và `14-27` MA7 fallback; từ 28 ngày chọn candidate
  đủ điều kiện bằng thực nghiệm.
- Tổng quát rolling-origin engine để so sánh seasonal naive, MA7, weekday
  average 4 tuần và linear trend 30 ngày trên cùng validation folds.
- Chọn forecast method theo MAE và simplicity threshold có tài liệu.
- MAE, RMSE, sMAPE và empirical forecast interval khi đủ dữ liệu.
- Reliability label dựa trên rule có tài liệu, không quảng cáo “độ chính xác
  cao”.
- Product association có support, confidence và lift.
- Customer acquisition cohort có retention, revenue và order count.
- UI hiển thị model leaderboard, interval, association rules, cohort heatmap
  và limitation.

### Chuẩn bị

- Giữ demo oracle 60 ngày và thêm generator synthetic deterministic 365 ngày.
- Thêm scenario fixtures cho weekly forecast, known lift và known retention.
- Không dùng synthetic data để train một model chung.

### Definition of Done

- Không leakage từ future vào training window.
- Metric backtest tái lập được và có oracle.
- Forecast fallback cũ vẫn hoạt động khi chưa đủ model-selection history.
- Contract V3 bắt buộc ở backend/frontend sau clean cut, không giữ V2 fallback.
- Không thêm bảng database; reset development analyses sau cutover.

## 6. E4 — AI Report V2

> Trạng thái: `LOCKED`. Contract và gate chi tiết tại
> `docs/AI_REPORT_V2.md`.

### Phạm vi

Structured report mới:

- Executive summary.
- KPI snapshot.
- Data-quality note.
- Revenue, product, customer và forecast sections.
- Risk signals.
- Tối đa 5 recommendations; mỗi recommendation có `priority`, `evidence`,
  `action` và `success_metric`.

Backend:

- Payload chỉ gồm aggregate từ E1-E3.
- Evidence dùng metric key/value do backend tạo.
- Validate schema và kiểm tra các metric reference tồn tại.
- Rule-based fallback dùng cùng schema V2.
- Lưu language, source, generated timestamp và provider/model metadata không
  nhạy cảm.

### Definition of Done

- AI không tự tính KPI và không nhận raw rows/PII.
- Invalid evidence/reference phải fallback.
- Report AI và rule-based render bằng cùng một UI.

## 7. E5 — Dedicated report and PDF experience

> Trạng thái: `LOCKED`. Contract, lựa chọn browser print và browser E2E tại
> `docs/REPORT_PDF.md`.

### Phạm vi

- Route/layout in riêng cho một analysis.
- Khổ A4, cover/header, period, source files, KPI, chart, insights,
  recommendations và disclaimer.
- Kiểm soát page break cho table/card/chart.
- Nút phải ghi đúng hành vi:
  - `Print / Save as PDF` nếu dùng browser print; hoặc
  - `Download PDF` nếu đã duyệt thêm PDF renderer thực.

### Chuẩn bị

- Chọn contract browser print hay generated PDF.
- Test Chrome và Edge với report ngắn/dài, English/Vietnamese.

### Definition of Done

- Không in sidebar/navigation/action buttons.
- Không cắt nội dung quan trọng giữa trang.
- PDF đọc được ở A4 và không chứa raw rows/PII.
- Playwright dùng user/data Supabase tạm đã xác nhận đúng ba trang A4 cho
  report fallback chuẩn, chart geometry hợp lệ và cleanup về trạng thái sạch.

## 8. E6 — Product hardening, deploy and academic delivery

> Trạng thái: `PREDEPLOY LOCKED`. Hardening, protected browser journey,
> performance/security gate và academic delivery tại
> `docs/E6_HARDENING.md`; chỉ còn external production gate.

### Phạm vi

- Giới hạn khoảng ngày đầu vào để tránh daily series cực lớn.
- Đưa pandas/openpyxl/Supabase/AI blocking work khỏi async event loop.
- Hoàn thiện dialog accessibility và responsive.
- Thêm component/E2E tests cho auth, upload, analysis selection, AI và print.
- Production deploy, SMTP và automated/manual smoke.
- Tài liệu phương pháp DS: formulas, assumptions, limitations, data dictionary
  và demo script.

### Definition of Done

- Toàn bộ gate local và production pass.
- Worktree sạch, commit/tag release có thể tái lập.
- Có tài liệu thuyết trình giải thích từ data contract đến insight và forecast
  evaluation.

## 9. Thứ tự triển khai

```text
E1 Advanced analytics
→ E2 RFM / ABC / product intelligence
→ E3 DS Core V3
→ E4 AI Report V2
→ E5 Report/PDF
→ E6 Hardening, deploy, academic delivery
```

Không triển khai AI Report V2 trước E1-E3: report chỉ có giá trị khi evidence
định lượng phía backend đủ tốt.
