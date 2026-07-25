# MarketLens DS datasets

Các file trong nhóm này là dữ liệu synthetic deterministic, không phải dữ
liệu khách hàng thật và không dùng để train một model chung.

## Regenerate

Từ repository root:

```bash
.venv/bin/python scripts/generate_ds_demo_data.py
```

Generator dùng seed `20260725`. Test suite kiểm tra file committed khớp chính
xác với generator, nên mọi thay đổi có chủ đích phải cập nhật cả methodology
và oracle.

## Integrated demo

`marketlens_ds_demo_365_days.csv`:

- khoảng ngày: `2025-08-01` đến `2026-07-31`;
- 21.277 line rows;
- 12.069 distinct orders;
- 10.905 completed, 667 cancelled, 497 returned;
- 800 synthetic customers;
- 24 products;
- 5.724 completed multi-product orders;
- 4.544 discounted line rows;
- completed net revenue: `5.177.265.000 VND`;
- SHA-256:
  `4630e15eae19a3863127cbe10864b2e49dd94a8368b4740cd5735a996f620590`.

File có weekly seasonality, ba campaign window, ba zero-sales day, activity
tiers, multi-product baskets và các association đã cài ground truth. Bản sao
trong `frontend/public/` phải giống byte-for-byte để người dùng tải từ app.

Forecast V3 oracle trên 8 common folds:

- moving average MAE: `5659224.61`, rank 1;
- seasonal naive MAE: `5981357.14`, rank 2;
- weekday average MAE: `6016406.25`, rank 3;
- linear trend MAE: `7085566.71`, rank 4;
- selected method: `moving_average_7_days` vì có MAE thấp nhất;
- empirical absolute-error quantile 80%: `11533286`;
- observed backtest coverage: `80.357143%`.

## Focused scenarios

### `forecast_weekly_84_days.csv`

- 84 ngày;
- một weekly pattern lặp lại chính xác;
- dùng để kiểm tra weekday-seasonal candidate và leakage.

### `association_known_lift.csv`

- 100 distinct completed orders;
- P001 xuất hiện trong 50 order;
- P002 xuất hiện trong 40 order;
- P001 và P002 cùng xuất hiện trong 30 order;
- support: 30%;
- confidence P001 → P002: 60%;
- confidence P002 → P001: 75%;
- lift hai chiều: 1,5.

### `cohort_known_retention.csv`

January cohort có 10 customers:

- month 0: 10/10 = 100%;
- month 1: 6/10 = 60%;
- month 2: 4/10 = 40%;
- month 3: 2/10 = 20%;
- month 4: 1/10 = 10%.

Các cohort tháng 2–4 tạo thêm oracle cho incomplete observation windows.
