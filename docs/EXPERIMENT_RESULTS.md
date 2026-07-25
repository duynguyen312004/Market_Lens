# MarketLens — Reproducible DS Experiment Results

> Ngày khóa evidence: 2026-07-25
> Contract: analysis `3.0`
> Runtime: Python 3.14, pandas 3.0.5, numpy 2.5.1.

## 1. Cách tái lập

```bash
.venv/bin/python scripts/generate_ds_demo_data.py --check
.venv/bin/python scripts/verify_academic_evidence.py --check
.venv/bin/pytest -q \
  backend/tests/test_academic_evidence.py \
  backend/tests/test_ds_demo_generator.py \
  backend/tests/test_ds_core_analytics.py \
  backend/tests/test_forecast_selection.py
```

`verify_academic_evidence.py` không dùng một implementation riêng để “chấm”
production. Nó gọi chính file reader, validator, analytics engine và forecast
engine của API, sau đó so sánh với
`sample_data/ACADEMIC_EVIDENCE.json`.

## 2. Forecast candidate comparison

MAE có cùng đơn vị với revenue trong dataset.

| Dataset | Days | Folds | Seasonal naive MAE | MA7 MAE | Weekday avg MAE | Linear MAE | Selected | Reliability |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Regression 60 ngày | 60 | 4 | 1.223.928,57 | 913.316,32 | 993.125,00 | **856.855,50** | Linear trend 30 ngày | Low |
| Integrated 365 ngày | 365 | 8 | 5.981.357,14 | **5.659.224,61** | 6.016.406,25 | 7.085.566,71 | Moving average 7 ngày | Medium |
| Weekly ground truth | 84 | 7 | **0,00** | 46.938,71 | **0,00** | 46.442,57 | Seasonal naive 7 ngày | High |

Hai candidate đạt MAE 0 trên weekly ground truth. Seasonal naive được chọn vì
đơn giản hơn theo deterministic complexity tie-break. Điều này chứng minh
selection không mặc định một thuật toán cho mọi file: linear thắng trên dữ
liệu 60 ngày, MA7 thắng trên demo 365 ngày, seasonal naive thắng trên pattern
tuần lặp chính xác.

60-day result có MAE tốt hơn baseline khoảng 29,99%, nhưng sMAPE là
42,263957%, nên reliability vẫn là `low`. Hệ thống cố ý không nâng nhãn chỉ vì
MAE cải thiện.

## 3. Empirical uncertainty

| Dataset | Residuals | Absolute-error q80 | Observed coverage |
|---|---:|---:|---:|
| Regression 60 ngày | 28 | 1.439.007 | 82,142857% |
| Integrated 365 ngày | 56 | 11.533.286 | 80,357143% |
| Weekly ground truth | 49 | 0 | 100% |

Coverage có thể cao hơn đúng 80% do quantile dùng `higher` và residual có ties.
Con số này chỉ mô tả backtest residual đã quan sát.

## 4. Association ground truth

Scenario có 100 eligible completed orders:

- P001 xuất hiện trong 50 order.
- P002 xuất hiện trong 40 order.
- Hai sản phẩm cùng xuất hiện trong 30 order.
- Support = `30 / 100 = 30%`.
- Confidence P001→P002 = `30 / 50 = 60%`.
- Confidence P002→P001 = `30 / 40 = 75%`.
- Lift P001→P002 = `0,60 / 0,40 = 1,5`.

Production engine trả đúng toàn bộ oracle. Demo tích hợp 365 ngày có top rule
lift `3,176403`, đủ để trình bày một association khác independence baseline,
nhưng vẫn không được diễn giải như causality.

## 5. Cohort ground truth

January cohort có 10 khách hàng. Distinct active customers và retention theo
month index 0–5:

| Month index | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---:|---:|---:|---:|---:|---:|
| Active customers | 10 | 6 | 4 | 2 | 1 | 0 |
| Retention | 100% | 60% | 40% | 20% | 10% | 0% |

Production engine trả đúng sequence trên, xử lý được year boundary, chỉ đếm
mỗi customer một lần/tháng và không tạo future cells ngoài observation
window. Demo 365 ngày tạo 10 acquisition cohorts.

## 6. Kết luận thực nghiệm

Evidence chứng minh:

- data generator deterministic và fixtures đi qua validator production;
- forecast comparison dùng cùng time-aware folds, không leakage;
- selection thay đổi theo pattern dữ liệu;
- uncertainty có điều kiện tối thiểu và observed coverage công khai;
- association/cohort khớp exact ground truth.

Evidence chưa chứng minh:

- accuracy trên mọi shop hoặc một forecast method luôn tốt nhất;
- quan hệ mua kèm là quan hệ nhân quả;
- synthetic customer behavior đại diện cho thị trường thật.

Đó là ranh giới quan trọng khi bảo vệ môn DS: dự án có quy trình đo lường và
reproducibility, đồng thời không phóng đại external validity.
