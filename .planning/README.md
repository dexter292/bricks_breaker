# `.planning/` — bản đồ thư mục

**Cập nhật:** 2026-09-24

> **Trạng thái dự án KHÔNG ở đây — nó ở [`/README.md`](../README.md).**
> Trang này chỉ là bản đồ kế hoạch. Hợp đồng kỹ thuật ở [`../docs/`](../docs/README.md), kiểm định ở [`../docs/audit/`](../docs/audit/README.md).

---

## Sống — đọc nhóm này

| Tài liệu | Nội dung |
|---|---|
| [STATE.md](./STATE.md) | **Trạng thái GSD hiện tại** — milestone, phase đang dừng ở đâu, deferred items |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | 27 requirement **v1** (`PHYS-*`, `LVL-*`, `RUN-*`, `PWR-*`, `FX-*`, `PLT-*`, `ARCH-*`) + backlog v2 |
| [PROJECT.md](./PROJECT.md) | Tầm nhìn, feel mix 40/30/30, ràng buộc gốc. Ít khi đổi |
| **[post-mvp/](./post-mvp/)** | **Kế hoạch phía trước.** Milestone A…G, gate `G0`…`G3`, requirement `N-*`. Đã `FULL LOCK` D1…D7 |

**Thứ tự đọc cho người mới / agent mới:** `post-mvp/CURRENT-STATE.md` §9 có danh sách 6 bước, đọc theo đó.

---

## Lịch sử — không đọc để lấy trạng thái

| Tài liệu | Vì sao giữ |
|---|---|
| [ROADMAP.md](./ROADMAP.md) | Roadmap **v1**, 8 phase đã xong. Có banner trỏ sang `post-mvp/ROADMAP-NEXT.md` |
| [phases/](./phases/) | Sổ ghi GSD của 8 phase v1 — `CONTEXT` / `RESEARCH` / `PLAN` / `SUMMARY` / `VERIFICATION` / `VALIDATION`. Là **bằng chứng thực thi**, không phải tài liệu tra cứu. Vài file `RESEARCH` dài 40–77 KB |
| [debug/](./debug/) | Phiên debug đã đóng (`status: resolved` ngay trong frontmatter) |

---

## `post-mvp/` — sáu tài liệu

| Tài liệu | Trả lời |
|---|---|
| `CURRENT-STATE.md` | Baseline kỹ thuật: cái gì đã ship, giới hạn nào cản mở rộng |
| `PRODUCT-DIRECTION.md` | Quyết định **D1…D7**, tất cả đã `LOCKED` |
| `ROADMAP-NEXT.md` | Milestone A…G, từng phase có Deps / Acceptance / Parallel |
| `REQUIREMENTS-NEXT.md` | Requirement `N-*` — `N-PLT`, `N-QA`, `N-OPS`, `N-LVL`, `N-PWR`, `N-BRK`, `N-PROG`, `N-TIER`, `N-STORE`, `N-META` |
| `RELEASE-GATES.md` | Thang **G0** internal → **G1** external → **G2** public → **G3** paid UA |
| `FEATURE-CANDIDATES.md` | Ứng viên tính năng `FC-*` — **chưa** cam kết cho tới khi promote thành `N-*` |

---

## Bảng quy ước ID

| Tiền tố | Nghĩa | Định nghĩa ở |
|---|---|---|
| `PHYS-` `LVL-` `RUN-` `PWR-` `FX-` `PLT-` `ARCH-` | Requirement v1 | `REQUIREMENTS.md` |
| `N-*` | Requirement post-MVP | `post-mvp/REQUIREMENTS-NEXT.md` |
| `FC-*` | Ứng viên tính năng (chưa cam kết) | `post-mvp/FEATURE-CANDIDATES.md` |
| `D1`…`D7` | Quyết định owner post-MVP | `post-mvp/PRODUCT-DIRECTION.md` §6 |
| `G0`…`G3`, `G1.x`, `G2.x` | Cổng phát hành | `post-mvp/RELEASE-GATES.md` |
| `D-01`…`D-26` | Decision record v1 (khác `D1…D7`) | `phases/*/`-CONTEXT / `PROJECT.md` |
| `LC-01`…`LC-09` | Ràng buộc tầng | `../docs/layer-contract.md` |
| `F-*`, `NF-*`…`NL-*` | Finding audit v1 | `../docs/audit/README.md` nhóm C |
| `R-*` | Finding audit post-MVP | `../docs/audit/FINDINGS-LEDGER.md` |
| `WP-1`…`WP-8` | Work package khắc phục | `../docs/audit/REMEDIATION-PLAN.md` |

> ⚠️ **`D-01`…`D-26` và `D1`…`D7` là hai hệ khác nhau.** Hệ thứ nhất là decision record kỹ thuật thời v1 (ví dụ `D-05` simulator không tính). Hệ thứ hai là bảy quyết định sản phẩm của owner ngày 2026-09-24. Dễ nhầm khi đọc nhanh.
