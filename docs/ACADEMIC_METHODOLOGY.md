# MarketLens — Academic Data Science Methodology

## 1. Bài toán

MarketLens biến dữ liệu giao dịch theo fixed template thành một data product
cho shop nhỏ: mô tả tình hình bán hàng, chẩn đoán cơ cấu sản phẩm/khách hàng,
ước lượng doanh thu ngắn hạn và tạo khuyến nghị có dẫn chứng.

Các câu hỏi phân tích chính:

1. Doanh thu, đơn hàng và mức tăng trưởng hiện tại là gì?
2. Sản phẩm/danh mục nào đóng góp nhiều, tập trung doanh thu ra sao?
3. Khách hàng nào mới, quay lại, giá trị cao hoặc có nguy cơ rời bỏ?
4. Sản phẩm nào thường được mua cùng nhau mạnh hơn mức ngẫu nhiên?
5. Khách hàng của từng tháng acquisition quay lại như thế nào?
6. Phương pháp forecast nào có bằng chứng tốt nhất trên history hiện có và
   mức bất định quan sát được là bao nhiêu?

## 2. Thiết kế nghiên cứu và pipeline

```text
CSV/XLSX
→ schema/type/consistency validation
→ chỉ giữ completed cho business metrics
→ deterministic feature engineering
→ descriptive + diagnostic analytics
→ rolling-origin forecast experiment
→ aggregate contract 3.0
→ Supabase analysis snapshot
→ dashboard/report/PDF
```

Đơn vị quan sát đầu vào là product line; `order_id`, `customer_id` và
`product_id` là các khóa phân tích. Toàn bộ công thức chạy server-side bằng
pandas/numpy. Cùng input và cùng phiên bản code phải cho cùng số liệu.

## 3. Chiến lược dữ liệu

MarketLens không train/fine-tune một model chung. Synthetic data được dùng làm
test fixture có ground truth, không phải training set:

- 60 ngày: regression oracle end-to-end.
- 365 ngày: demo tích hợp có seasonality, campaign, zero-sales days, discount,
  status, multi-product basket và cohort.
- 84 ngày: weekly-pattern oracle.
- 100 order: association oracle có support/confidence/lift biết trước.
- Cohort scenario: retention counts biết trước.

Generator dùng seed `20260725`; committed files phải khớp byte-for-byte. Cách
tiếp cận này kiểm tra được thuật toán mà không giả vờ rằng dữ liệu synthetic
đại diện cho mọi shop.

## 4. Descriptive và diagnostic analytics

Chỉ đơn `completed` tạo business value:

```text
net line revenue = quantity × unit_price - discount
total revenue = Σ completed net line revenue
AOV = total revenue / distinct completed orders
ARPC = total revenue / distinct completed customers
growth = (recent 7 days - previous 7 days) / previous 7 days
```

Order health dùng distinct order của cả completed/cancelled/returned. Daily
series điền 0 cho ngày không bán, vì bỏ ngày 0 sẽ làm sai forecast và weekday
pattern.

Product analytics gồm revenue/quantity/order count, revenue concentration,
weekday/category breakdown và discount rate. Customer analytics gồm VIP top
10% theo revenue, returning từ hai completed orders và potential là top 20%
non-VIP repeat customers theo rule deterministic.

## 5. Customer và product intelligence

### RFM

- `recency`: số ngày từ lần mua cuối đến `max(order_date) + 1`.
- `frequency`: distinct completed orders.
- `monetary`: completed revenue.
- Score 1–5 theo empirical percentile average rank; ties cùng điểm.
- Recency đảo chiều, frequency/monetary thuận chiều.

RFM cần ít nhất năm khách hàng. Segment rule chạy theo thứ tự new → champion →
at-risk → loyal → regular, loại trừ nhau và bao phủ toàn bộ khách hàng.

### ABC/Pareto

Sản phẩm được sort revenue giảm dần và ID tăng dần. Class dùng cumulative
revenue trước khi thêm sản phẩm: A dưới 80%, B dưới 95%, C là phần còn lại.
Rule “cumulative before” giữ sản phẩm đầu tiên ở A ngay cả khi nó một mình vượt
ngưỡng.

### Product association

Trên distinct completed baskets đủ điều kiện:

```text
support(A,B) = orders(A∩B) / eligible completed orders
confidence(A→B) = orders(A∩B) / orders(A)
lift(A→B) = confidence(A→B) / support(B)
```

Rule cần ít nhất 3 order và 1% support. Lift lớn hơn 1 là đồng xuất hiện cao hơn
kỳ vọng theo independence baseline; không chứng minh quan hệ nhân quả. Basket
trên 50 unique products bị loại và mẫu số sau loại luôn được công khai.

### Acquisition cohort

Acquisition month là tháng completed order đầu tiên. Mỗi cell đếm distinct
active customer, revenue và distinct order. Retention:

```text
retention(cohort, m) = active customers at month m / cohort size
```

Month 0 bằng 100%. Chỉ tạo các cell nằm trong observation window; future cell
không bị biến thành 0. Capability cần tối thiểu ba tháng lịch.

## 6. Forecast như một thí nghiệm trên từng analysis

Đây là model selection tại request time, không phải training một model dùng
chung. Bốn candidate:

| Candidate | Minimum training history |
|---|---:|
| Seasonal naive 7 ngày | 14 |
| Moving average 7 ngày | 14 |
| Weekday average 4 tuần | 28 |
| Linear trend 30 ngày | 30 |

Mỗi candidate đủ điều kiện chạy trên cùng tối đa tám rolling-origin folds.
Mỗi fold chỉ nhìn dữ liệu trước origin và dự báo bảy ngày kế tiếp; validation
windows không chồng nhau. Thiết kế này bảo toàn thứ tự thời gian và ngăn data
leakage.

Primary metric:

```text
MAE = mean(|actual - prediction|)
```

RMSE nhấn mạnh lỗi lớn; sMAPE hỗ trợ so sánh tỷ lệ. Seasonal naive là baseline.
Candidate được rank theo MAE, rồi sMAPE, complexity và method ID. Nếu method
đơn giản hơn nằm trong 5% MAE tốt nhất, hệ thống chọn method đơn giản để tránh
phức tạp không mang lại cải thiện đáng kể.

Reliability là nhãn chất lượng bằng chứng backtest:

- high: ≥6 folds, sMAPE ≤20%, MAE không kém baseline;
- medium: ≥2 folds, sMAPE ≤40%, MAE không quá 110% baseline;
- low: đủ folds nhưng không đạt hai rule trên;
- unavailable: chưa đủ selection history.

Nhãn này không phải xác suất forecast đúng.

## 7. Định lượng độ bất định

Nếu selected method có ít nhất 28 out-of-sample residual:

```text
q = higher-quantile 80% của |residual|
lower = max(0, prediction - q)
upper = prediction + q
```

API công khai residual count, quantile và observed backtest coverage. Đây là
empirical error band dựa trên lỗi đã quan sát, không phải confidence interval
có bảo đảm phân phối.

## 8. AI Report như lớp diễn giải

KPI, segment, association, cohort và forecast đều do deterministic code tạo.
Backend xây evidence catalog gồm key/value/unit/context. External AI chỉ viết
narrative và tham chiếu evidence keys. Unknown key, sai section, schema lỗi,
timeout/quota hoặc feature bị tắt đều làm fallback toàn bộ sang rule-based
Report 2.0.

Do đó AI không được phép “tính lại” số liệu, nhận raw rows/PII hoặc quyết định
forecast. PDF hiển thị nguồn report, data quality, evidence, risk,
recommendation/action/success metric và disclaimer.

## 9. Validity, assumptions và limitations

- Fixed template giảm ambiguity nhưng chưa ingest trực tiếp Shopee/TikTok.
- Revenue không phải profit; không có cost, inventory, ads hoặc competitor
  data nên hệ thống không kết luận về các biến đó.
- Association đo co-occurrence, không đo causality.
- Cohort phụ thuộc ID khách hàng ổn định và observation window đủ dài.
- RFM/ABC dùng threshold rule; hữu ích để phân tầng, không phải ground-truth
  label về hành vi tương lai.
- Backtest gần nhất phản ánh history của file, không bảo đảm regime tương lai
  giống quá khứ.
- Interval thực nghiệm không có distributional guarantee.
- Synthetic ground truth chứng minh implementation đúng; đánh giá external
  validity cần dữ liệu thật đã ẩn danh từ nhiều shop.

## 10. Reproducibility

Từ repository root:

```bash
.venv/bin/python scripts/generate_ds_demo_data.py --check
.venv/bin/python scripts/verify_academic_evidence.py --check
.venv/bin/pytest -q backend/tests/test_ds_demo_generator.py
.venv/bin/pytest -q backend/tests/test_ds_core_analytics.py
.venv/bin/pytest -q backend/tests/test_forecast_selection.py
```

Kết quả khóa nằm tại `sample_data/ACADEMIC_EVIDENCE.json` và được test trực
tiếp qua production validation/analytics/forecast code. Bảng kết quả và cách
diễn giải nằm tại `docs/EXPERIMENT_RESULTS.md`.
