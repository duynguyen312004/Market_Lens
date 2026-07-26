# MarketLens deterministic dataset suite

Toàn bộ file trong suite là dữ liệu synthetic, không chứa dữ liệu khách hàng
thật và không dùng để train một model chung.

## Nguồn sự thật

- Suite version: `2.0`.
- Seed: `20260725`.
- Ngày dữ liệu muộn nhất: `2026-06-30`.
- Manifest machine-readable:
  `sample_data/DATASET_MANIFEST.json`.
- Generator: `scripts/generate_ds_demo_data.py`.

Regenerate và kiểm tra:

```bash
.venv/bin/python scripts/generate_ds_demo_data.py
.venv/bin/python scripts/generate_ds_demo_data.py --check
```

Mỗi gói dùng namespace ID riêng. Vì vậy người dùng không gặp xung đột giả khi
vô tình chọn template cùng một demo khác; các file conflict chỉ xung đột ở
những identifier được cài có chủ đích.

## Integrated demo

`marketlens_ds_demo_365_days.csv`:

- khoảng ngày `2025-07-01` đến `2026-06-30`;
- 21.313 line rows;
- 12.041 distinct orders;
- 10.920 completed, 684 cancelled, 437 returned;
- 800 synthetic customers;
- 24 products;
- completed net revenue `5.223.934.000 VND`;
- SHA-256
  `c876ed97c0a80f5106392867dd8b6d7b5db499b861d1379be7a33577951dc142`.

File có weekly seasonality, ba campaign windows, ba zero-sales days, activity
tiers, multi-product baskets và association patterns. Bản sao tại
`frontend/public/` giống byte-for-byte để tải trực tiếp từ ứng dụng.

Forecast 7 ngày trên 8 fold:

- seasonal naive MAE `6.222.839,29`, rank 1;
- moving average MAE `6.301.885,21`, rank 2;
- weekday average MAE `6.658.513,39`, rank 3;
- linear trend MAE `8.188.594,32`, rank 4;
- selected method `seasonal_naive_7_days`;
- forecast total `104.109.000 VND`;
- reliability `medium`;
- daily q80 `12.625.000`;
- total q80 `74.374.000`.

Forecast 30 ngày:

- selected method `seasonal_naive_7_days` theo simplicity rule;
- forecast total `440.206.000 VND`;
- reliability `high`;
- total q80 `115.271.000 VND`.

## Regression oracle

`sample_sales_demo_60_days.csv` là fixture gọn dùng cho backend, API, AI report,
browser journey và production smoke:

- khoảng ngày `2026-05-01` đến `2026-06-29`;
- 611 rows, 404 distinct orders, 30 customers, 8 products;
- namespace `R60*`;
- đủ mọi order status, discount, multi-product basket, RFM và product issue;
- đủ model comparison 7 ngày;
- chỉ đủ forecast cơ bản 30 ngày, chưa đủ 30-day backtest.

Oracle chi tiết nằm tại `sample_data/EXPECTED_DEMO_METRICS.md`.

## Focused ground-truth scenarios

### `forecast_weekly_84_days.csv`

- 84 ngày;
- weekly pattern lặp lại chính xác;
- seasonal naive và weekday average đạt daily MAE 0;
- dùng để kiểm tra time-aware folds và leakage.

### `association_known_lift.csv`

- 100 distinct completed orders;
- `AS-P001` xuất hiện trong 50 order;
- `AS-P002` xuất hiện trong 40 order;
- hai sản phẩm cùng xuất hiện trong 30 order;
- support 30%;
- confidence `AS-P001 → AS-P002` là 60%;
- confidence chiều ngược lại là 75%;
- lift hai chiều là 1,5.

### `cohort_known_retention.csv`

January cohort có 10 khách hàng:

- month 0: 10/10 = 100%;
- month 1: 6/10 = 60%;
- month 2: 4/10 = 40%;
- month 3: 2/10 = 20%;
- month 4: 1/10 = 10%;
- month 5: 0/10 = 0%.

## Upload và combined fixtures

- `sample_sales_template.csv`: template hợp lệ tối thiểu, namespace `TPL*`.
- `marketlens_combined_demo_part_1.csv` và
  `marketlens_combined_demo_part_2.csv`: 21 source rows, 20 effective rows và
  một exact duplicate order.

Các file public dùng namespace riêng nên không xung đột với regression hoặc
integrated demo khi được chọn nhầm cùng nhau.

## Boundary và error fixtures

Thư mục `sample_data/test_cases/` gồm:

- `insufficient_history_13_days.csv`: forecast 7 ngày unavailable;
- `forecast_7_only_30_days.csv`: forecast 7 ngày available, 30 ngày
  unavailable;
- `no_cancelled_or_returned.csv`: empty state cho phân tích hủy/trả;
- `single_product_orders.csv`: không có multi-product basket;
- `invalid_missing_discount_column.csv`: `INVALID_FILE_COLUMNS`;
- `invalid_row_values.csv`: `INVALID_ROW_DATA`;
- ba cặp file conflict cho customer, product và order.

Các file conflict đều hợp lệ khi đọc riêng; lỗi chỉ xuất hiện khi kết hợp đúng
cặp, phản ánh chính xác contract multi-file.
