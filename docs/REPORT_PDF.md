# MarketLens — Dedicated Report and PDF Contract

> Trạng thái: E5 `LOCKED`
> Hành vi đã chọn: browser print với nhãn chính xác
> `Print / Save as PDF` / `In / Lưu thành PDF`.

## 1. Mục tiêu

Trang `/report` có hai lớp độc lập:

1. Lớp thao tác trên màn hình: tiêu đề trang, nút tạo AI report và nút in.
2. Tài liệu `#business-report`: phần duy nhất được đưa vào bản in/PDF.

PDF không phải ảnh chụp toàn màn hình. Sidebar, mobile navigation, analysis
selector, action buttons và notification đều bị loại bằng print stylesheet.

## 2. Nội dung tài liệu

Tài liệu dùng cùng Report V2 cho nguồn AI và rule-based fallback:

- MarketLens branding và nhãn private business report.
- Nguồn report, version, file nguồn, kỳ dữ liệu, kích thước dataset, thời điểm
  tạo và generator.
- 4-6 KPI từ evidence backend.
- Data-quality note.
- Biểu đồ 30 ngày doanh thu thực tế.
- Biểu đồ 7 ngày thực tế so với forecast và empirical interval.
- Bốn nhóm phân tích có evidence.
- Risk signals.
- Khuyến nghị có priority, action, success metric và evidence.
- Disclaimer.

Không đưa raw order rows hoặc customer identity vào tài liệu.

## 3. Quy tắc render và phân trang

- `@page`: A4, margin 12 mm.
- Màu nền/đường nét được in bằng `print-color-adjust: exact`.
- Page 1: executive cover, KPI và data quality.
- Page 2: revenue evidence và business analysis.
- Page 3 bắt đầu bằng risk signals; report fallback ba recommendation dùng
  lưới ba cột để giữ action/evidence trên cùng trang.
- Report dài hơn được phép tăng số trang; từng card/chart không bị cắt giữa
  trang.
- Evidence label được wrap đầy đủ trong bản in, không ellipsis.
- Biểu đồ tài liệu dùng SVG deterministic thay vì canvas hoặc
  `ResponsiveContainer`, nên kích thước và nét vẽ ổn định khi print reflow.

Browser print được chọn thay cho server-side renderer vì chức năng đã đáp ứng
contract, không cần gửi report sang dịch vụ khác và không thêm dependency
PDF nặng. Vì đây không phải download trực tiếp, UI không dùng nhãn
`Download PDF`.

## 4. Kiểm thử tái lập

Cài Chromium cho Playwright một lần:

```bash
cd frontend
npx playwright install --with-deps chromium
cd ..
```

Sau khi `backend/.env` có Supabase dev credentials, chạy:

```bash
.venv/bin/python scripts/run_report_e2e.py
```

Script:

1. Tạo một Supabase user đã confirm với credential ngẫu nhiên.
2. Đăng nhập và upload dataset demo qua protected FastAPI endpoint.
3. Khởi động backend/frontend bằng Playwright.
4. Đăng nhập qua UI và mở report đã persist.
5. Xác nhận Report V2, data quality, recommendations và bốn SVG series.
6. Chuyển sang print media, xác nhận A4, report isolation và chart geometry.
7. Xuất PDF thật; fallback demo phải tạo đúng ba trang A4.
8. Luôn xóa analysis và Auth user tạm trong `finally`.

Artifacts kiểm thử nằm trong `frontend/test-results/playwright/` và không được
commit. Test không in email, password, token hoặc Supabase key ra output.

## 5. Manual acceptance

Trước release, kiểm tra Chrome và Edge:

- Chọn `Print / Save as PDF`.
- Destination là `Save as PDF`, paper `A4`, background graphics bật.
- Không có sidebar/action buttons.
- Biểu đồ, evidence, action và success metric đọc được.
- Không có heading mồ côi hoặc card bị cắt giữa trang.
- Thử cả English và Tiếng Việt, report rule-based và report AI.
