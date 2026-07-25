# MarketLens — E6 Hardening and Browser Journey

> Trạng thái: `PREDEPLOY LOCKED`
> Phạm vi: hardening trước deploy và academic delivery.

## 1. Input complexity guard

`MAX_UPLOAD_ROWS=50000` không đủ để chặn trường hợp file rất ít dòng nhưng hai
ngày cách nhau hàng chục năm. Analytics phải fill zero theo từng ngày, nên
input như vậy có thể tạo daily series rất lớn.

Contract mới:

```text
MAX_ANALYSIS_PERIOD_DAYS=1826
```

- Tính inclusive: `date_to - date_from + 1`.
- Mặc định 1.826 ngày, tương đương tối đa khoảng năm năm có tính năm nhuận.
- Áp dụng cho single upload, từng file trong combined upload và toàn bộ kỳ sau
  khi combine.
- Vượt giới hạn trả HTTP 400 `DATE_RANGE_TOO_LARGE` trước khi gọi
  `pd.date_range`.
- Error details chỉ có limit, số ngày và hai biên ngày; không có raw row/PII.
- Production config từ chối giá trị dưới 14 ngày.

## 2. Event-loop safety

Pandas, openpyxl, Supabase Python client và external AI adapter hiện là
blocking/synchronous. Vì vậy các path operation sau được khai báo bằng `def`
để FastAPI/Starlette chạy toàn bộ operation trong worker thread:

- create single/combined analysis;
- list/get/delete analysis;
- generate/persist AI report.

Upload đọc từ `UploadFile.file` trong cùng sync worker. Health và auth response
không làm blocking orchestration nên vẫn có thể là lightweight async route.

Test kiến trúc xác nhận các protected analysis path operation không phải
coroutine để tránh vô tình đưa blocking work trở lại event loop.

## 3. Auth và responsive hardening

- `PublicOnlyRoute` tôn trọng protected internal return path đã sanitize. Điều
  này loại race giữa Supabase auth-state event và `LoginPage.navigate`.
- External URL, protocol-relative URL, backslash path và `/login` loop vẫn bị
  từ chối bởi `getSafeReturnPath`.
- Recharts animation bị tắt cho dashboard/analytics/forecast charts. Kết quả
  render deterministic, không chụp chart giữa animation và không tạo motion
  ngoài cơ chế reduced-motion của app.
- Browser journey kiểm tra document không phát sinh horizontal overflow ở
  390 px và 1.440 px; horizontal mobile navigation vẫn scroll trong container
  riêng.

## 4. Protected browser journey

Chạy:

```bash
.venv/bin/python scripts/run_browser_journey_e2e.py
```

Runner tạo Supabase user tạm, chạy Playwright và luôn cleanup user/analysis.
Credential, token và key không được log.

Journey thật bao phủ:

1. Mở protected History khi chưa login và quay lại đúng route sau login.
2. Mobile empty state và mobile navigation.
3. Upload CSV đơn qua UI tới protected API và persist analysis.
4. Upload gộp hai file, xác nhận 21 source rows thành 20 effective rows và
   loại đúng một repeated order.
5. Đổi active analysis ngay trên Dashboard rồi kiểm tra KPI oracle cũ trở lại.
6. Dashboard mobile/desktop cùng KPI oracle.
7. Sales, Customer và Forecast page dùng analysis đang chọn.
8. Generate AI Report khi provider bị tắt và hiển thị fallback/source đúng.
9. Profile cập nhật display name và đổi mật khẩu bằng current password.
10. History có cả hai analysis, responsive, confirm xóa lần lượt và empty.
11. Logout; login lại bằng mật khẩu mới và xác nhận history vẫn rỗng.

Ba screenshot artifacts dùng cho visual audit:

- mobile upload success;
- desktop dashboard;
- desktop history empty.

Artifacts nằm trong `frontend/test-results/playwright/` và không commit.

## 5. Academic delivery

- `docs/DATA_DICTIONARY.md`: input/output fields, status semantics, privacy và
  lý do database chỉ có một bảng nghiệp vụ.
- `docs/ACADEMIC_METHODOLOGY.md`: research questions, formulas, assumptions,
  forecast experiment, uncertainty và limitations.
- `docs/EXPERIMENT_RESULTS.md`: bảng kết quả forecast/association/cohort có
  thể tái lập.
- `docs/DEMO_DEFENSE_SCRIPT.md`: kịch bản demo 10–12 phút và câu hỏi phản biện.
- `sample_data/ACADEMIC_EVIDENCE.json` được sinh lại bằng production pipeline
  và khóa bởi `scripts/verify_academic_evidence.py --check` cùng automated
  test.

## 6. Performance và security gate

- Benchmark core pipeline ở đúng giới hạn 50.000 dòng bằng
  `scripts/benchmark_analysis.py`; gate local mặc định là 30 giây. Lần khóa
  gần nhất đạt `3,844579` giây, peak RSS `161,83 MB`, input CSV khoảng
  `5,52 MB`.
- React Router được clean-cut từ `react-router-dom 7.18.1` sang
  `react-router 8.3.0`, bản vá advisory RSC. Unit/build/browser gates đều pass
  sau major upgrade; `npm audit --omit=dev` trả `0 vulnerabilities`.
- Gate gần nhất: backend `154 passed`; frontend `59 passed / 13 files`;
  Python dependency/compile, dataset/evidence check, secret scan, frontend
  lint/build và diff check đều pass.
- Protected browser journey và report PDF E2E đều pass sau dependency upgrade;
  user/analysis tạm được cleanup.

## 7. External gate sau predeploy

Code và local/real-Supabase predeploy gate đã khóa. Các việc sau cố ý chưa thực
hiện vì thuộc bước deploy:

- tạo production deployment và domain;
- cấu hình production Redirect URL/CORS/SMTP;
- chạy `scripts/smoke_production.py` trên URL thật;
- kiểm tra email confirmation/recovery trong inbox production.
