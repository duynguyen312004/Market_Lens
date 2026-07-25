# MarketLens — Demo and Defense Script

> Thời lượng mục tiêu: 10–12 phút.
> Dataset chính: `marketlens_ds_demo_365_days.csv`.
> Dataset phụ: hai file combined demo và các ground-truth scenarios.

## 1. Chuẩn bị trước buổi demo

```bash
.venv/bin/python scripts/generate_ds_demo_data.py --check
.venv/bin/python scripts/verify_academic_evidence.py --check
.venv/bin/pytest -q backend/tests
cd frontend && npm test && npm run lint && npm run build
```

Sau đó chạy backend/frontend theo README, xác nhận Supabase có schema mới và
đăng nhập bằng tài khoản demo. Giữ AI provider bật nếu có quota; luôn chuẩn bị
phương án fallback vì rule-based report vẫn là output hợp lệ, không phải mock.

Mở sẵn:

- `/upload`
- `docs/EXPERIMENT_RESULTS.md`
- `sample_data/ACADEMIC_EVIDENCE.json`
- một PDF ba trang đã xuất thử.

## 2. Talk track theo thời gian

### 0:00–1:00 — Bài toán và ranh giới

“MarketLens giúp shop nhỏ phân tích file bán hàng mà không cần viết code. Một
dòng là một sản phẩm trong đơn. Hệ thống tập trung revenue, product, customer,
forecast và evidence-based report. Revenue không phải profit; ứng dụng không
bịa insight về cost, inventory hay ads vì template không có các trường đó.”

### 1:00–2:15 — Data contract và validation

Tại `/upload`, chỉ ra fixed 11-column template, CSV/XLSX, single/combined mode.
Upload hai combined demo files:

- 21 source rows;
- 20 effective rows;
- 1 repeated order bị loại.

Giải thích request là atomic. Cùng ID nhưng customer/product metadata xung đột
sẽ bị chặn, thay vì tự merge sai.

### 2:15–3:30 — Descriptive analytics

Upload `marketlens_ds_demo_365_days.csv`, vào Dashboard/Sales:

- bốn KPI;
- daily/monthly/weekday/category views;
- gross/net/discount;
- top/slow products và revenue concentration;
- order status health.

Nhấn mạnh KPI do backend deterministic tính trên completed orders, ngày không
bán được điền 0 và UI không có mock fallback.

### 3:30–5:15 — Customer/product DS

Tại Customer Analytics:

- RFM feature và empirical quintile scoring;
- champion/loyal/at-risk/new/regular;
- acquisition cohort heatmap và retention.

Tại Sales/Product Intelligence:

- ABC 80/95;
- support/confidence/lift;
- giải thích lift > 1 là co-occurrence cao hơn independence baseline, không
  phải causality.

Nếu hội đồng hỏi cách biết thuật toán đúng, mở ground-truth results:
association lift 1,5 và January retention 100→60→40→20→10→0.

### 5:15–7:30 — Forecast experiment

Tại `/forecast`, trình bày:

1. bốn candidates;
2. cùng rolling-origin folds, train luôn đứng trước validation;
3. MAE là primary metric; RMSE/sMAPE là diagnostics;
4. simplicity tolerance 5%;
5. selected method, baseline comparison và reliability;
6. empirical interval từ q80 absolute residual.

Mở experiment table để chứng minh selection phụ thuộc data:

- 60 ngày → linear trend;
- 365 ngày → MA7;
- weekly oracle → seasonal naive, MAE 0.

Nói rõ đây là fitting/evaluation trên history của analysis tại request time,
không phải train một model global trên synthetic data.

### 7:30–9:15 — Report 2.0 và AI boundary

Tại `/report`:

- executive summary và KPI snapshot;
- data quality;
- revenue/product/customer/forecast sections;
- risks;
- recommendation có evidence, action và success metric.

Nhấn “AI chỉ viết narrative từ evidence keys; KPI và forecast không do AI
tính. Schema/key sai hoặc provider lỗi thì fallback toàn bộ.” Bấm generate AI
nếu provider sẵn sàng; nếu quota lỗi, dùng chính warning/fallback để chứng minh
resilience và source label trung thực.

### 9:15–10:15 — PDF và privacy

Bấm `Print / Save as PDF`. Chỉ ra bản in riêng ba trang A4, không có sidebar
hay nút UI. Nêu privacy:

- raw upload không lưu;
- database chỉ lưu analysis aggregate JSONB;
- ownership từ verified Supabase token;
- AI không nhận raw rows/customer identity.

### 10:15–11:00 — Reproducibility và kết luận

Mở `ACADEMIC_EVIDENCE.json` và command `verify_academic_evidence.py --check`.
Kết luận:

“Đóng góp DS không nằm ở việc dùng model thật phức tạp, mà ở pipeline có data
contract, feature engineering, experimental comparison không leakage,
uncertainty, ground-truth tests, limitations và khả năng tái lập.”

## 3. Câu hỏi phản biện thường gặp

### “Tại sao không train model ML?”

Mỗi shop có ít lịch sử và pattern khác nhau; một model synthetic/global dễ tạo
ảo tưởng accuracy. V1 chọn phương pháp thống kê giải thích được bằng backtest
trên chính history của analysis. ML chỉ hợp lý sau khi có nhiều dữ liệu thật,
split theo shop/time và governance rõ ràng.

### “Thuật toán hiện tại có phải tốt nhất?”

Không có thuật toán tốt nhất cho mọi time series. MarketLens so sánh bốn
candidate đủ điều kiện trên cùng folds và công khai leaderboard. Đây là
empirical selection trong candidate set, không phải tuyên bố global optimum.

### “Lift 3 có nghĩa bán A làm B tăng ba lần?”

Không. Lift chỉ so đồng xuất hiện với independence baseline; có thể bị ảnh
hưởng bởi campaign, popularity hoặc assortment. Nó gợi ý bundle/cross-sell để
thử nghiệm, không chứng minh tác động nhân quả.

### “80% interval có bảo đảm 80% tương lai nằm trong đó?”

Không. Đây là q80 của absolute backtest residual và API gọi đúng là empirical
interval. Observed coverage được công khai; không có distributional guarantee.

### “Tại sao database chỉ có một bảng?”

Supabase Auth đã có các bảng tài khoản riêng. `public.analyses` là snapshot
store cho aggregate contract V3. Không lưu raw orders/customers giúp giảm PII
và đúng MVP scope; đánh đổi là không re-query arbitrary date filters.

### “Synthetic data có làm kết quả thiếu giá trị?”

Synthetic ground truth dùng để kiểm chứng logic và tái lập, không dùng để tuyên
bố market accuracy. Bước nghiên cứu tiếp theo là đánh giá external validity
trên dữ liệu thật đã ẩn danh từ nhiều shop.

## 4. Checklist kết thúc

- Không gọi forecast là AI.
- Không gọi empirical interval là guaranteed confidence interval.
- Không gọi association là causality.
- Không gọi revenue là profit.
- Luôn nêu selected dataset, observation window và reliability.
- Nếu AI fallback, giải thích đúng nguồn thay vì giấu lỗi.
