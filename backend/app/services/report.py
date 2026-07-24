from typing import Any


REPORT_DISCLAIMER = (
    "Báo cáo dựa trên dữ liệu được tải lên và không thay thế tư vấn "
    "tài chính hoặc kinh doanh chuyên môn."
)


def build_rule_based_report(analytics: dict[str, Any]) -> dict[str, Any]:
    summary = analytics["summary"]
    sales = analytics["sales"]
    customers = analytics["customers"]
    top_product = sales["top_products_by_revenue"][0]
    lowest_product = sales["lowest_quantity_products"][0]
    growth = summary["growth_rate_percent"]

    highlights = [
        (
            f"{top_product['product_name']} dẫn đầu doanh thu với "
            f"{top_product['revenue']:,} VND."
        )
    ]
    if growth is not None and growth > 5:
        highlights.insert(
            0,
            f"Doanh thu 7 ngày gần nhất tăng {growth:.1f}% so với kỳ trước.",
        )
    elif growth is not None and growth < -5:
        highlights.insert(
            0,
            f"Doanh thu 7 ngày gần nhất giảm {abs(growth):.1f}% so với kỳ trước.",
        )

    returning_and_vip = (
        customers["segments"]["returning"] + customers["segments"]["vip"]
    )
    retention_rate = returning_and_vip / summary["total_customers"] * 100
    if retention_rate >= 50:
        highlights.append(
            f"{retention_rate:.1f}% khách hàng trong kỳ thuộc nhóm quay lại "
            "hoặc VIP."
        )

    recommendations = [
        {
            "title": "Ưu tiên sản phẩm dẫn đầu",
            "description": (
                f"Theo dõi nguồn bán và hoạt động quảng bá của "
                f"{top_product['product_name']} để duy trì đóng góp doanh thu."
            ),
        },
        {
            "title": "Chăm sóc khách hàng giá trị",
            "description": (
                "Xây chương trình chăm sóc phù hợp cho nhóm VIP và khách "
                "quay lại trong kỳ."
            ),
        },
        {
            "title": "Kiểm tra sản phẩm bán ít",
            "description": (
                f"Đánh giá lại cách trưng bày và nhu cầu của "
                f"{lowest_product['product_name']}, sản phẩm có lượng bán thấp "
                "trong dữ liệu."
            ),
        },
    ]

    if growth is None:
        trend_analysis = (
            "Chưa đủ dữ liệu so sánh hai giai đoạn 7 ngày liên tiếp."
        )
    elif growth > 0:
        trend_analysis = (
            f"Doanh thu gần đây đang tăng {growth:.1f}% so với 7 ngày trước."
        )
    elif growth < 0:
        trend_analysis = (
            f"Doanh thu gần đây đang giảm {abs(growth):.1f}% so với 7 ngày trước."
        )
    else:
        trend_analysis = "Doanh thu hai giai đoạn 7 ngày gần nhất không đổi."

    return {
        "source": "rule_based",
        "title": "Báo cáo tổng quan kinh doanh",
        "summary": (
            f"Trong kỳ, shop ghi nhận {summary['total_orders']:,} đơn completed "
            f"với tổng doanh thu {summary['total_revenue']:,} VND."
        ),
        "highlights": highlights[:3],
        "trend_analysis": trend_analysis,
        "recommendations": recommendations[:3],
        "disclaimer": REPORT_DISCLAIMER,
    }
