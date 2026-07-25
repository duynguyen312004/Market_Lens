# Expected metrics — `sample_sales_demo_60_days.csv`

Các giá trị này là test oracle cho analysis contract V3. File được đọc bằng
UTF-8-SIG. KPI doanh thu/khách hàng/sản phẩm chỉ dùng `completed`; order
health dùng distinct order của mọi status.

## Input

- Tổng dòng: 393.
- Khoảng ngày toàn file: 2026-05-01 đến 2026-06-29.
- Completed rows: 344.
- Cancelled rows: 34.
- Returned rows: 15.
- Không có dòng trùng hoàn toàn.
- Không có xung đột order/product/customer ID.

## Summary

- Total revenue: `113010000`.
- Total orders: `273`.
- Total customers: `30`.
- Total quantity sold: `503`.
- Recent 7 days revenue: `16670000`.
- Previous 7 days revenue: `12150000`.
- Growth rate: khoảng `37.201646%`.
- Average order value: khoảng `413956.04`.
- Average revenue per customer: `3767000`.

## Order health

- Total distinct orders, all statuses: `313`.
- Completed: `273` — khoảng `87.220447%`.
- Cancelled: `27` — khoảng `8.626198%`.
- Returned: `13` — khoảng `4.153355%`.
- Average items per completed order: khoảng `1.842491`.

## Commerce và revenue pattern

- Gross revenue trước discount: `115180000`.
- Total discount: `2170000`.
- Discount rate: khoảng `1.884008%`.
- Peak revenue day: `2026-05-21` — `4430000`.
- Lowest non-zero revenue day: `2026-05-27` — `90000`.
- Thứ Sáu: `22580000`, 50 distinct completed orders, khoảng `19.980533%`
  tổng doanh thu.
- Top product revenue share: khoảng `27.926732%`.
- Top category revenue share: khoảng `36.563136%`.
- Top 20% sản phẩm: 2 sản phẩm, khoảng `53.853641%` doanh thu.

## Customer segments

Theo rule `ceil(30 × 10%)`, có 3 VIP:

- `vip`: 3 (`C003`, `C020`, `C009` theo revenue rank).
- `returning`: 27.
- `new`: 0.

Customer health:

- Repeat customers: `30`.
- Repeat customer rate: `100%`.
- Revenue by segment: new `0`; returning `92290000` (khoảng `81.665339%`);
  VIP `20720000` (khoảng `18.334661%`).

Potential customers là nhãn phụ, không cộng vào ba segment:

- Count: 6.
- IDs: `C017`, `C025`, `C015`, `C018`, `C012`, `C011`.

## E2 — RFM customer intelligence

- Snapshot date: `2026-06-30`.
- RFM segments:
  - `new`: 0.
  - `champion`: 5.
  - `loyal`: 10.
  - `at_risk`: 3.
  - `regular`: 12.
- At-risk customer IDs theo priority: `C015`, `C018`, `C022`.

Scoring dùng empirical quintile 1-5 với average rank; giá trị bằng nhau nhận
cùng điểm.

## Top product by revenue

- Product: `P004` — `Tai nghe Bluetooth`.
- Revenue: `31560000`.
- Quantity: `65`.
- Distinct orders: `45`.

## E2 — Product intelligence

ABC:

- Class A: 4 sản phẩm, `97460000`, khoảng `86.240156%` doanh thu.
- Class B: 2 sản phẩm, `15550000`, khoảng `13.759844%` doanh thu.
- Class C: 0 sản phẩm.

Association rules:

- 71 completed orders có ít nhất hai sản phẩm distinct.
- 0 order bị bỏ qua do basket quá lớn.
- Rule đầu: `P003 → P001`, xuất hiện cùng nhau trong 7 order.
- Support `2.564103%`, confidence `14.583333%`, lift `0.686422`.
- Lift dưới 1 chỉ thể hiện đồng xuất hiện thấp hơn mức kỳ vọng độc lập, không
  phải quan hệ nhân quả.

Cohort:

- Dataset chỉ phủ hai calendar months nên `available = false`.
- Reason: `INSUFFICIENT_COHORT_HISTORY`.

Discount:

- 131 completed orders có discount.
- Discounted-order rate: khoảng `47.985348%`.
- Sản phẩm có tổng discount cao nhất: `P006`, `500000`.

## Revenue by category

- `Thoi trang`: `41320000`.
- `Gia dung`: `32420000`.
- `Dien tu`: `31560000`.
- `Phu kien`: `7710000`.

## Forecast

Với linear trend trên 30 ngày cuối và làm tròn mỗi điểm đến integer:

```text
2193862
2198305
2202747
2207190
2211633
2216076
2220518
```

- Forecast total: `15450331`.
- Change vs last 7 days: khoảng `-7.316551%`.

Nếu implementation chọn làm tròn total sau khi cộng float thay vì cộng từng
điểm đã làm tròn, kết quả vẫn là `15450331` với dataset này.

## Forecast selection và evaluation V3

- Selection strategy: `rolling_origin_candidate_comparison`.
- Candidates theo rank: linear trend, moving average, weekday average,
  seasonal naive.
- Selected method: `linear_trend_30_days` vì có MAE thấp nhất.
- Evaluation strategy: `rolling_origin_selected_method`.
- Evaluated method: `linear_trend_30_days`.
- Baseline: `seasonal_naive_7_days`.
- 4 fold, 28 validation points.
- Model MAE: `856855.5`; RMSE: `1034308.06`; sMAPE: `42.263957%`.
- Baseline MAE: `1223928.57`; RMSE: `1432915.36`; sMAPE: `67.306507%`.
- MAE improvement vs baseline: `29.99138%`.
- Reliability: `low` vì sMAPE cao hơn ngưỡng medium 40%, dù MAE tốt hơn
  baseline. Đây là nhãn bằng chứng backtest, không phải cam kết tương lai.
- Empirical interval: available với 28 residual.
- Absolute-error quantile 80%: `1439007`.
- Observed backtest coverage: `82.142857%`.
