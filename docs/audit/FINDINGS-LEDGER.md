# SỔ CÁI FINDING `R-*` — post-MVP

**Cập nhật:** 2026-09-24 · **Trạng thái:** sổ cái **sống**
**Phạm vi:** `R-01` … `R-29` — giai đoạn post-MVP (từ review roadmap 2026-09-24 trở đi)
**Không bao gồm:** `F-*`, `NF-*`…`NL-*` của v1 → xem [DEFERRED-ITEMS.md](./DEFERRED-ITEMS.md) (món còn mở) và [README.md](./README.md) nhóm C (định nghĩa)

> Trước file này, 29 finding nằm rải trong 7 tài liệu. Đây là nơi duy nhất trả lời *"cái nào còn mở"*.

---

## Tóm tắt

| Trạng thái | Số lượng |
|---|---:|
| **ĐÓNG** | 26 |
| **MỞ** | 3 |

**Còn mở:** `R-10` (phần cứng), `R-12` (chờ owner chọn), `R-28` (quy trình).
**Không cái nào chặn chơi hoặc chặn gate tự động.**

---

## Còn mở

### `R-10` — Không có máy iOS mid-tier để đo hàng floor · **Cao**

| | |
|---|---|
| Nêu ở | [IOS-ONLY-DECISION-IMPACT.md](./IOS-ONLY-DECISION-IMPACT.md) §3 |
| Bằng chứng | `docs/measurement-methodology.md:46` — hàng iOS floor `NOT RUN` |
| Vì sao mở | Chỉ có iPhone 16 Pro (A18 Pro, 120 Hz) — phần cứng mạnh nhất dải. Không có máy A13–A15 / 60 Hz |
| Chặn | Mọi tuyên bố hiệu năng trên máy iOS ngoài 16 Pro. `G2.13` cấm nêu FPS trong store copy |
| Đóng bằng | Mượn/mua một iPhone 11 hoặc SE 3, chạy protocol floor |

### `R-12` — Tier resolver chia theo RAM, không theo thế hệ chip · **Cao**

| | |
|---|---|
| Nêu ở | [DECISIONS-2026-09-24.md](./DECISIONS-2026-09-24.md) §3.3 |
| Bằng chứng | `src/runtime/resolveQualityTier.ts:33-39` |
| Vấn đề | iPhone 11 (4 GB, A13) nhận tier `mid` — **đúng ngân sách 128 particle + glow** đã cert trên A18 Pro. RAM không phải proxy cho fill-rate |
| Trạng thái | `N-TIER-01` = *Documented (owner pick pending)* — `docs/ops/QUALITY-TIER.md` |
| Hai lựa chọn | (a) thêm nhánh theo thế hệ chip — chính xác hơn nhưng vẫn cần máy thật để hiệu chỉnh; (b) hạ iPhone 4 GB xuống `low` cho tới khi đo được — bảo thủ, làm được ngay |
| Chặn | Marketing trước `G2` |

### `R-28` — B1/B2/B3 song song trong một working tree · **Trung bình, quy trình**

| | |
|---|---|
| Nêu ở | [BUG-PLAY-BLANK-PLAYFIELD.md](./BUG-PLAY-BLANK-PLAYFIELD.md) §5 |
| Vấn đề | Ba phase gameplay + C1 thay đổi chồng nhau; `ROADMAP-NEXT` ghi B3 *"serialize with physics hot path"* |
| Hệ quả đã thấy | `R-24` (playfield trắng) mất một vòng để định vị vì `git bisect` không dùng được |
| Đóng bằng | Tách commit B1 / B2 / B3. Gate đã xanh và playfield đã sống — đây là thời điểm tốt nhất |

---

## Đã đóng

### Từ review roadmap post-MVP — [POST-MVP-ROADMAP-REVIEW.md](./POST-MVP-ROADMAP-REVIEW.md)

| ID | Nội dung | Đóng bằng |
|---|---|---|
| `R-01` | Luật feature-freeze §6 không thỏa được nếu D2=B/C | `RELEASE-GATES` §6 viết lại theo nền tảng đang ship + iOS pass-lock |
| `R-02` | Không crash reporting / OTA / nhịp nâng SDK | Tách ba mức → `N-OPS-01…03`, phase A4. *(`N-OPS-01` chờ DSN — là việc tồn đọng, không phải finding mở)* |
| `R-03` | F-43 mồ côi, không N-ID nào phủ | `N-QA-03` thêm vào A2; 3 file mount contract |
| `R-04` | Số level mâu thuẫn 4 cách | **D4 = 5**, thống nhất cả 5 vị trí |
| `R-05` | Sticky paddle mâu thuẫn 3 nơi | Thống nhất `Deferred`; `N-META-06` cho đường promote |
| `R-06` | B3 bó fireball + aimed serve | Tách **B0** (aimed, conditional theo D3=C) khỏi **B3** (fireball) |
| `R-07` | A1 acceptance thoát được bằng cách viết tài liệu | A1 → **iOS Ceiling Certification**, bỏ nhánh escape |
| `R-08` | Nhãn verdict ở tài liệu **nguồn** chưa sửa | `phase8-certification.md` sửa D4 / soak + legend 5 trạng thái; `MVP-CLOSE` sửa HEAD |

### Từ quyết định iOS-first — [IOS-ONLY-DECISION-IMPACT.md](./IOS-ONLY-DECISION-IMPACT.md)

| ID | Nội dung | Đóng bằng |
|---|---|---|
| `R-09` | Bỏ Android là mất cổng hiệu năng định lượng duy nhất | Định nghĩa iOS ceiling/floor lock trong `measurement-methodology.md` |
| `R-11` | Va chạm tên ASC leo lên đường găng, mất đường lui | **D1 = B** — đổi tên trước listing; trademark chuyển thành điều kiện `G2.15` |

### Từ verify A2 / A4 / E1a — [PHASE-VERIFY-A2-A4.md](./PHASE-VERIFY-A2-A4.md)

| ID | Nội dung | Đóng bằng |
|---|---|---|
| `R-15` | Sentry vào binary, ba bề mặt store vẫn mô tả binary không có nó | `CONSOLE-ENTRY.md` hai nhánh DSN-off / DSN-on |
| `R-16` | Thuật toán reachability nhân đôi, không parity test | **Gỡ hẳn trùng lặp** — `scripts/lib/levelSolvability.mjs` dùng chung + parity test |
| `R-17` | Hàng memory soak không chứng minh được verdict của nó | Ghi `576 → 514 (−11%)` cùng trạng thái lấy mẫu; peak tách cột |
| `R-18` | Chỉ lưu lần soak xanh, không lưu lần đỏ | Ghi lần đỏ trước fix kèm chuỗi lỗi thật |
| `R-19` | Soak trên Release bất khả thi về cấu trúc | `G2.3` ghi rõ *"dev-client; release RSS must not be claimed"* |

### Từ chuẩn bị A1 — [PHASE-VERIFY-A1-PREP.md](./PHASE-VERIFY-A1-PREP.md)

| ID | Nội dung | Đóng bằng |
|---|---|---|
| `R-20` | Cert metrics `runOnJS` trong frame worklet — vi phạm `LC-07`, và chèn nhiệt kế vào chính phép đo | Mirror `certOut`/`certSeq` + `useAnimatedReaction` (khuôn `chromeOut`) |
| `R-21` | CERT arm mất bảo đảm cấu trúc khi bỏ `__DEV__` | `scripts/assert-eas-profiles.mjs` có self-check hai chiều; đã neuter-test end-to-end |

### Từ phân tích A1 ceiling — [A1-CEILING-ANALYSIS.md](./A1-CEILING-ANALYSIS.md)

| ID | Nội dung | Đóng bằng |
|---|---|---|
| `R-22` | Ngưỡng ceiling khóa **120 FPS** trong khi `PLT-03` chỉ yêu cầu **60** — *lỗi đặc tả của audit* | Owner lock §5: `p50 ≤ 16.7` và (`p95 ≤ 20` hoặc jank ≤ 5%); 120 Hz thành thông tin |
| `R-23` | Ngưỡng không nói nó khóa **tầng** nào (app-loop vs display-swap) | Bảng ngưỡng ghi rõ tầng đo cho từng hàng |

### Từ bug playfield trắng — [BUG-PLAY-BLANK-PLAYFIELD.md](./BUG-PLAY-BLANK-PLAYFIELD.md)

| ID | Nội dung | Đóng bằng |
|---|---|---|
| `R-24` | **Race `pauseTimer` vs gate effect** → loop tắt vĩnh viễn: playfield trắng, bóng đứng, HUD sống | Xóa `pauseTimer`; bake gọi `setActiveRef(false)` đồng bộ. Regression: `tests/ui/PlayingHost.bake-gate.test.ts` |
| `R-25` | Ba lớp bịt lỗi trong đường render làm bug vô hình | Gỡ `try/catch` bọc `recordFrame`; `GLOW_BLIT_ENABLED` có tên; soft-fail chỉ quanh `drawImageRect` |
| `R-26` | `toggleDevLevel` không bật lại loop | Đóng theo `R-24` — đường re-arm `levelId → bake → fxReady → gate` hoạt động lại |
| `R-27` | `tsc` đỏ 4 lỗi | `GLOW_BLIT_ENABLED` khôi phục narrowing; sửa so sánh chết trong `asyncStorageStore` |
| `R-29` | 6 file `services/storage/*` import ngược lên `runtime/` — vi phạm `boundaries/dependencies` | **Chuyển `LevelId` xuống `src/core/levels/levelIds.ts`**, `runtime/loadLevel` re-export. Không thêm policy exception |

---

## Ghi chú về cách đọc

**`R-22` là lỗi của audit, không phải của dev.** Ngưỡng ceiling do tôi viết đã khóa sai bar. Phép thử dùng để phân biệt sửa lỗi đặc tả với dời cột gôn nằm ở [A1-CEILING-ANALYSIS.md](./A1-CEILING-ANALYSIS.md) §2.4.

**Ba finding đóng "hơn mức đề xuất"** — đáng ghi nhận vì chúng chọn cách sửa gốc thay vì cách sửa vừa đủ:

| ID | Đề xuất | Thực làm |
|---|---|---|
| `R-16` | thêm parity test cho hai bản cài đặt | gỡ hẳn trùng lặp còn một nguồn |
| `R-21` | assert đọc `eas.json` | assert **kèm self-check hai chiều** |
| `R-29` | chuyển `LevelId` xuống core | chuyển + comment giải thích ràng buộc tầng ngay tại chỗ |

**Hai công cụ đã được kiểm chứng là có khả năng báo đỏ** (không phải guard rỗng): `assert-level-solvability` (làm mù → exit 1) và `assert-eas-profiles` (bơm `EXPO_PUBLIC_CERT` vào production → exit 1). Cả hai đều khôi phục sạch sau kiểm tra.

---

## Liên quan

- [README.md](./README.md) — chỉ mục `docs/audit/`
- [DEFERRED-ITEMS.md](./DEFERRED-ITEMS.md) — sổ cái `F-*` / `D-*` / `WP-*` của v1
- `.planning/post-mvp/RELEASE-GATES.md` — gate `G0`…`G3`
- `.planning/post-mvp/REQUIREMENTS-NEXT.md` — requirement `N-*`
