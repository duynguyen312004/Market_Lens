# Expected metrics — `sample_sales_demo_60_days.csv`

Các giá trị này là test oracle cho master plan v1.2. File được đọc bằng
UTF-8-SIG; chỉ `completed` được tính.

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

## Customer segments

Theo rule `ceil(30 × 10%)`, có 3 VIP:

- `vip`: 3 (`C003`, `C020`, `C009` theo revenue rank).
- `returning`: 27.
- `new`: 0.

Potential customers là nhãn phụ, không cộng vào ba segment:

- Count: 6.
- IDs: `C017`, `C025`, `C015`, `C018`, `C012`, `C011`.

## Top product by revenue

- Product: `P004` — `Tai nghe Bluetooth`.
- Revenue: `31560000`.
- Quantity: `65`.
- Distinct orders: `45`.

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
- Change vs last 7 days: khoảng `-7.316548%`.

Nếu implementation chọn làm tròn total sau khi cộng float thay vì cộng từng
điểm đã làm tròn, kết quả vẫn là `15450331` với dataset này.
