# `docs/` — bản đồ thư mục

**Cập nhật:** 2026-09-24

> **Trạng thái dự án KHÔNG ở đây — nó ở [`/README.md`](../README.md).**
> Trang này chỉ là bản đồ: file nào nằm đâu, file nào còn đúng.
>
> Hợp đồng kỹ thuật và bằng chứng thiết bị ở đây. **Kế hoạch** ở [`.planning/`](../.planning/README.md). **Kiểm định** ở [`audit/`](./audit/README.md).

---

## Hợp đồng — đọc trước khi sửa code

| Tài liệu | Ràng buộc gì |
|---|---|
| [layer-contract.md](./layer-contract.md) | `LC-01`…`LC-09` — ma trận tầng `core` / `runtime` / `render` / `services` / `app`. Cưỡng chế bằng `eslint-plugin-boundaries` |
| [measurement-methodology.md](./measurement-methodology.md) | **Nguồn duy nhất** cho mọi ngưỡng hiệu năng: iOS ceiling / iOS floor / Android (hoãn). Luật ≥2 run, lấy run tệ hơn, simulator không tính (D-05) |
| [skia-version-decision.md](./skia-version-decision.md) | Vì sao khóa `@shopify/react-native-skia@2.12.0`. Cưỡng chế bằng `scripts/assert-skia-version.mjs` |

## Bằng chứng thiết bị

| Tài liệu | Vai trò |
|---|---|
| [phase8-certification.md](./phase8-certification.md) | **Nguồn hiện tại.** Bảng Cert WC, D2/D4, Soak Results. Legend 5 trạng thái: `WAIVED ≠ PASS ≠ OUT OF SCOPE ≠ NOT RUN ≠ HARNESS-ONLY` |
| [device-gate-results.md](./device-gate-results.md) | ⚠️ Phase 1 (`SC-1`/`SC-2`/`SC-3`) — **lịch sử**, xem banner trong file |
| [phase7-vfx-measurement.md](./phase7-vfx-measurement.md) | ⚠️ Kịch bản đo VFX Phase 7 — **một phần đã lỗi thời**, xem banner |

## [`ops/`](./ops/README.md) — runbook thao tác

Quy trình chạy tay: cert, soak, playtest, crash reporting, cập nhật SDK, và ghi chú thiết kế cho các phase gameplay đang làm. Có chỉ mục riêng.

## `store/` — hồ sơ phát hành

| Tài liệu | Nội dung |
|---|---|
| [store/CONSOLE-ENTRY.md](./store/CONSOLE-ENTRY.md) | Đáp án paste-ready cho ASC + Play. **Hai nhánh** DSN-off / DSN-on (`R-15`) |
| [store/name-clearance.md](./store/name-clearance.md) | Va chạm tên với Gosiha; **D1=B** bắt buộc đổi tên trước listing. Tên cụ thể **chưa chốt** |
| [store/privacy-policy.md](./store/privacy-policy.md) · `.html` | Bản đang publish. Có mục crash reporting tùy chọn |
| [store/play-data-safety.md](./store/play-data-safety.md) | Chuẩn bị sẵn — **không dùng cho bản phát hành iOS-first** (D2=B) |
| [store/age-rating.md](./store/age-rating.md) · [originality-attestation.md](./store/originality-attestation.md) · [HOSTING.md](./store/HOSTING.md) | Khai báo tuổi, cam kết nguyên bản, hạ tầng hosting policy |

`index.html` chỉ là trang redirect sang privacy policy cho GitHub Pages — không phải tài liệu.

## [`audit/`](./audit/README.md) — kiểm định

28 tài liệu qua 9 vòng audit + chuỗi verify post-MVP. **Có chỉ mục riêng, đọc nó trước.** Hai sổ cái sống: `DEFERRED-ITEMS.md` (`F-*`) và `FINDINGS-LEDGER.md` (`R-*`).

---

## Ở đâu tra cái gì

| Cần biết | Đọc |
|---|---|
| Ngưỡng hiệu năng nào đang áp dụng | `measurement-methodology.md` |
| Số đo thiết bị mới nhất | `phase8-certification.md` |
| Món nợ nào còn mở | `audit/DEFERRED-ITEMS.md` + `audit/FINDINGS-LEDGER.md` |
| Cổng nào chặn phát hành | `.planning/post-mvp/RELEASE-GATES.md` |
| Được ship tới đâu lúc này | `audit/MVP-CLOSE-REPORT.md` |
| Quyết định owner D1…D7 | `audit/DECISIONS-*.md` |
| Cách chạy một phép đo | `ops/` |

**Khi thêm tài liệu:** ghi vào bảng tương ứng ở trên và nêu nó thay thế cái nào (nếu có).
