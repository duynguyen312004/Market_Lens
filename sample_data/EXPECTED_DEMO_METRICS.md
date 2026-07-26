# Expected metrics — `sample_sales_demo_60_days.csv`

Đây là regression oracle của analysis contract V4. File được sinh bởi
`scripts/generate_ds_demo_data.py`, chỉ chứa dữ liệu synthetic và dùng namespace
`R60*` để không xung đột ngoài ý muốn với các gói dữ liệu khác.

## Input

- Tổng dòng: `611`.
- Khoảng ngày: `2026-05-01` đến `2026-06-29`.
- Completed rows: `546`.
- Cancelled rows: `38`.
- Returned rows: `27`.
- Không có dòng trùng hoàn toàn.
- Không có xung đột order/product/customer ID trong file.
- 30 khách hàng, 8 sản phẩm và 60 ngày lịch sử.

## Summary

- Total revenue: `185263000`.
- Total completed orders: `362`.
- Total customers: `30`.
- Total quantity sold: `719`.
- Latest 7-day revenue: `23171000`.
- Previous 7-day revenue: `19750000`.
- Growth rate: `17.321519%`.
- Average order value: `511776.24`.
- Average revenue per customer: `6175433.33`.

## Order health

- Total distinct orders, all statuses: `404`.
- Completed: `362` — `89.60396%`.
- Cancelled: `25` — `6.188119%`.
- Returned: `17` — `4.207921%`.
- Average items per completed order: `1.986188`.

## Commerce

- Gross revenue before discount: `190921000`.
- Total discount: `5658000`.
- Discount rate: `2.963529%`.
- Peak revenue day: `2026-06-14` — `5819000`.
- Lowest non-zero revenue day: `2026-06-03` — `1140000`.
- Friday revenue: `30983000`, 66 completed orders, `16.723793%` revenue.
- Top product revenue share: `26.500165%`.
- Top category revenue share: `38.14847%`.
- Top 20% products: 2 products, `48.937996%` revenue.

## Customer analytics

- Segment counts: new `0`, returning `27`, VIP `3`.
- Repeat customers: `30`; repeat rate: `100%`.
- Returning revenue: `139511000` — `75.304297%`.
- VIP revenue: `45752000` — `24.695703%`.
- Potential customer IDs:
  `R60C003`, `R60C004`, `R60C015`, `R60C005`, `R60C007`, `R60C008`.

RFM snapshot date là `2026-06-30`:

- new: `0`;
- champion: `6`;
- loyal: `6`;
- at risk: `5`;
- regular: `13`.

At-risk priority:
`R60C005`, `R60C009`, `R60C013`, `R60C011`, `R60C022`.

Cohort chưa available vì file chỉ phủ hai calendar months; reason là
`INSUFFICIENT_COHORT_HISTORY`.

## Product analytics

Top revenue product:

- `R60P002` — `Quan jean`;
- revenue `49095000`;
- quantity `130`;
- 100 distinct completed orders.

ABC:

- Class A: 5 sản phẩm, `156674000`, `84.568424%`.
- Class B: 2 sản phẩm, `23004000`, `12.416942%`.
- Class C: 1 sản phẩm, `5585000`, `3.014633%`.

Association rule đầu:

- `R60P002 → R60P001`;
- pair orders `38`;
- support `10.497238%`;
- confidence `38%`;
- lift `1.335534`.

Discount:

- 138 completed orders có discount, tương ứng `38.121547%`.
- `R60P002` có tổng discount cao nhất: `1475000`.

Hủy/trả:

- 42 distinct orders bị hủy hoặc trả.
- Giá trị sản phẩm ghi nhận trong các đơn đó: `22870000`.
- `R60P008` đứng đầu adjusted ranking:
  - 54 đơn chứa sản phẩm;
  - 6 đơn hủy và 5 đơn trả;
  - issue rate `20.37037%`;
  - adjusted ranking score `11.773934%`;
  - affected product value `1817000`.

## Growth drivers

Kỳ 7 ngày:

- current: `2026-06-23` đến `2026-06-29`, revenue `23171000`;
- previous: `2026-06-16` đến `2026-06-22`, revenue `19750000`;
- net change `+3421000`, tương ứng `+17.321519%`;
- top increase: `R60P004`, `+3707000`;
- top decrease: `R60P002`, `-2142000`.

Kỳ 30 ngày:

- current: `2026-05-31` đến `2026-06-29`, revenue `97917000`;
- previous: `2026-05-01` đến `2026-05-30`, revenue `87346000`;
- net change `+10571000`, tương ứng `+12.102443%`;
- top increase: `R60P006`, `+7059000`;
- top decrease: `R60P004`, `-5383000`.

## Forecast 7 ngày

Selected method: `weekday_average_4_weeks`.

```text
3175250
2247750
3014750
3679000
4411000
3670250
2508500
```

- Forecast total: `22706500`.
- Previous 7-day total: `23171000`.
- Change: `-2.004661%`.
- Total empirical range: `16913000` đến `28500000`.
- 4 fold, 28 validation points.
- Model MAE: `1083410.71`.
- Model RMSE: `1254129.63`.
- Model sMAPE: `35.526306%`.
- Baseline MAE: `1417214.29`.
- Improvement vs baseline: `23.553501%`.
- Reliability: `medium`.
- Daily absolute-error q80: `1786500`.
- Observed daily coverage: `82.142857%`.
- Total-error q80: `5793500`.
- Observed total coverage: `100%`.

## Forecast 30 ngày

- Method fallback: `moving_average_7_days`.
- Forecast total: `99304290`.
- Previous 30-day total: `97917000`.
- Change: `+1.416802%`.
- File đủ 60 ngày để công bố forecast cơ bản.
- Chưa đủ 74 ngày cho hai fold 30 ngày nên selection, reliability và empirical
  range đều `unavailable`.

Mọi giá trị trong file này phải được cập nhật có chủ đích khi generator hoặc
production analytics contract thay đổi. `ACADEMIC_EVIDENCE.json` là oracle
machine-readable tương ứng.
