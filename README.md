# Neon Brick Breaker

Game phá gạch arcade offline cho iOS. Expo 57 · React Native 0.86 · Skia 2.12 · Reanimated 4.5 · sim tất định 120 Hz chạy trên UI runtime.

> **Đây là trang trạng thái duy nhất.** Mọi tài liệu khác là chi tiết. Nếu chỉ đọc một file, đọc file này.

---

## Trạng thái — 2026-09-24

| | |
|---|---|
| **Ship được tới đâu** | iOS internal / sideload / soft playtest |
| **Chưa được phép** | Submit công khai App Store · paid UA dưới tên hiện tại |
| **Nền tảng** | **iOS-first** (quyết định `D2=B`). Android **OUT OF SCOPE**, không phải "waived" |
| **Milestone v1** | 8/8 phase — đóng tạm thời 2026-09-24 |
| **Milestone post-MVP** | A…G đã `FULL LOCK` (`D1`…`D7`). A1/A2/A4 xong, A3 xem mục ⚠️ bên dưới |
| **Nội dung** | 5 level playable (`01`, `03`, `04`, `05`, `06`) |

### Gate tự động — chạy `npm test && npm run typecheck && npm run lint`

| Gate | Hiện tại |
|---|---|
| `tsc --noEmit` | 0 lỗi |
| `eslint . --max-warnings 0` | sạch |
| vitest | **304 pass / 62 file** |
| worklet closure guard | OK, 97 file |
| solvability · skia · privacy · eas-profiles | OK |

### Bằng chứng thiết bị

| Hạng mục | Trạng thái |
|---|---|
| iOS ceiling (iPhone 16 Pro) | **PASS** theo bar 60 FPS — `G2.16` đóng |
| Soak vật lý 100 chu kỳ + 15 phút | **PASS** (dev-client; không dùng để claim release RSS) |
| iOS floor máy tầm trung | **NOT RUN** — không có phần cứng |
| Android | **OUT OF SCOPE** |

---

## Còn mở — danh sách duy nhất

Gộp từ `docs/audit/DEFERRED-ITEMS.md` (`F-*`/`D-*`/`WP-*`) và `docs/audit/FINDINGS-LEDGER.md` (`R-*`).

| # | Món | Chặn | Chi tiết |
|---|---|---|---|
| 1 | **Tên hiển thị chưa chốt** — trùng chính xác tiêu đề với Gosiha trên App Store | `G2.15`, listing | `docs/store/name-clearance.md` |
| 2 | **`N-OPS-01`** Sentry DSN — code đã wire, chưa có crash thật nào nhận được | `G1` | `docs/ops/CRASH-REPORTING.md` |
| 3 | **`R-12`** tier chia theo RAM — iPhone 4 GB nhận ngân sách Mid chỉ cert trên A18 Pro | Marketing trước `G2` | `docs/ops/QUALITY-TIER.md` |
| 4 | **`R-10`** không có máy iOS tầm trung để đo hàng floor | Mọi claim FPS ngoài 16 Pro (`G2.13`) | `docs/measurement-methodology.md` |
| 5 | **Console entry** ASC — đáp án sẵn, chưa bấm submit | `G2.4` | `docs/store/CONSOLE-ENTRY.md` |
| 6 | **`WP-6`** một phần — floor + soak release còn thiếu | `G2.3` một phần | `docs/audit/DEFERRED-ITEMS.md` |
| 7 | **`R-28`** B1/B2/B3 chưa tách commit | Quy trình — `git bisect` không dùng được | `docs/audit/FINDINGS-LEDGER.md` |
| 8 | **`F-45`** ball speed ramp | Backlog | — |

**Không món nào chặn chơi hay chặn gate tự động.**

### ⚠️ Một mâu thuẫn cần chốt

`.planning/STATE.md` ghi `post_mvp_a3: skipped_owner` và `post_mvp_b0: wont_do_tap_only`.

Nhưng `.planning/post-mvp/PRODUCT-DIRECTION.md` — D3 vẫn `LOCKED = C`:

> *"Do **not** mark PHYS-05 Complete or Won't-Do until cohort runs."*

Và `N-PHYS-01` vẫn ghi *"Deferred — pending A3 cohort"*.

Tức A3 bị bỏ qua, nhưng `D3=C` chọn hoãn **chính vì** để lấy dữ liệu cohort. Nếu owner đã quyết tap-only vĩnh viễn thì **D3 phải đổi thành B** và ghi lý do; nếu chưa thì `STATE.md` đang ghi sớm. Hai chỗ phải khớp trước khi tính A3 là xong.

---

## Chạy

```bash
npm install
npx expo start              # dev
npm test                    # vitest + worklet/solvability/eas asserts
npm run typecheck           # tsc --noEmit
npm run lint                # eslint
```

Build thiết bị: `eas.json` có ba profile — `development` (dev-client), `profiling` (đo Instruments, arm CERT), `production`.
**Không bao giờ** đặt `EXPO_PUBLIC_CERT` / `EXPO_PUBLIC_SOAK` lên profile `production` — `scripts/assert-eas-profiles.mjs` canh việc này.

---

## Đi đâu tìm gì

| Cần | Đọc |
|---|---|
| Ràng buộc tầng trước khi sửa code | `docs/layer-contract.md` |
| Ngưỡng hiệu năng đang áp dụng | `docs/measurement-methodology.md` |
| Số đo thiết bị | `docs/phase8-certification.md` |
| Cách chạy một phép đo | [`docs/ops/`](./docs/ops/README.md) |
| Kế hoạch phía trước | [`.planning/post-mvp/`](./.planning/README.md) |
| Cổng phát hành `G0`…`G3` | `.planning/post-mvp/RELEASE-GATES.md` |
| Kiểm định, finding, quyết định | [`docs/audit/`](./docs/audit/README.md) |
| Hồ sơ store | `docs/store/` |

Ba thư mục trên có chỉ mục riêng. **Trạng thái thì chỉ ở đây** — nếu một tài liệu khác mâu thuẫn với trang này, trang này là nơi phải sửa trước.

---

## Quy ước ID

`PHYS-*` `LVL-*` `PLT-*`… = requirement v1 · `N-*` = requirement post-MVP · `D1`…`D7` = quyết định owner · `D-01`…`D-26` = decision record kỹ thuật v1 (**hệ khác**) · `G0`…`G3` = cổng phát hành · `LC-*` = ràng buộc tầng · `F-*` `NF-*`…`NL-*` = finding audit v1 · `R-*` = finding audit post-MVP.

Bảng đầy đủ: [`.planning/README.md`](./.planning/README.md).
