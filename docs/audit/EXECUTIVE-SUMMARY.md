# EXECUTIVE SUMMARY — Kiểm định toàn diện Neon Brick Breaker

**Ngày audit:** 2026-09-21
**Phạm vi:** toàn bộ repository `/Users/admin/SideProject/game/bricks_breaker` (commit HEAD `682056a`)
**Tính chất:** kiểm định độc lập, read-only. Không có file production/test/planning nào bị sửa đổi trong quá trình audit.
**Stack:** Expo ~57.0.24 · React Native 0.86.3 · React 19.2.3 · Reanimated 4.5.1 · react-native-worklets 0.10.1 · @shopify/react-native-skia 2.12.0 · TypeScript ~6.0.3

---

## 1. Kết luận tổng thể

Phần lõi mô phỏng (`src/core`) là **chất lượng cao thực sự**: pure TypeScript, không có `Math.random`/`Date.now`, swept CCD có property test chống tunneling ở 2× tốc độ tối đa, golden-replay hash, level pipeline fail-closed. Layer contract được enforce bằng ESLint (`eslint-plugin-boundaries`) và test purity — các probe thực nghiệm cho thấy rule **có bắn thật**, không phải cấu hình trang trí.

Tuy nhiên, **sản phẩm chưa đạt trạng thái MVP hoàn thành** như các tài liệu roll-up tuyên bố, vì ba lý do độc lập:

1. **Có một lỗi Critical ở biên thread khiến Retry gần như chắc chắn không hoạt động.** `retry()` và `setActive(false)` đọc `world.value` từ RN runtime rồi mutate object đó. Trong Reanimated 4.5.1, đọc SharedValue từ RN runtime trả về **bản clone sâu** (đã xác minh trong source native: `Serializable.h:261-276` copy byte của ArrayBuffer). Mọi thao tác reset trong `retry()` do đó tác động lên một bản copy, không phải World đang chạy trên UI runtime.
2. **Phase 8 chưa hoàn thành.** `08-06-PLAN.md` chưa bao giờ được thực thi: không có `08-06-SUMMARY.md`, không có `08-VERIFICATION.md` (phase duy nhất thiếu), `ROADMAP.md:200` ghi `3/7 In Progress`, `STATE.md:6` ghi `stopped_at: Completed 08-04-PLAN.md`. Trong khi đó `REQUIREMENTS.md` đã tick `[x]` cho PLT-03/PLT-04/LVL-04.
3. **Không tồn tại một phép đo hiệu năng nào trên thiết bị thật.** Toàn bộ ô kết quả trong `docs/phase8-certification.md:103-108` và `:151-152` đều là chuỗi `PENDING_DEVICE`. Con số hiệu năng duy nhất trong repo là `~16.67 ms / ~60 FPS` trên **iPhone 17 Simulator, development build, overlay-only, 256 sprite giả** (`docs/device-gate-results.md:52`) — và chính tài liệu đó đã đánh dấu `WAIVED (interim)`.

**Điểm đáng ghi nhận:** repository **không bịa số liệu**. Mọi chỗ thiếu đo đạc đều ghi `PENDING_DEVICE` / `OPEN` / `WAIVED` một cách trung thực. Vấn đề không phải gian dối số liệu, mà là **reclassification**: protocol chưa chạy được roll-up thành requirement đã đạt.

---

## 2. Bằng chứng tự động đã chạy thực tế trong audit này

| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `npx tsc --noEmit` | **FAIL — 6 lỗi** | `app/index.tsx:8,9` (`styles.fill` vs `fills`); `CountdownOverlay.tsx:35`, `LevelErrorOverlay.tsx:49`, `PauseOverlay.tsx:63`, `ResultOverlay.tsx:75` (`StyleSheet.absoluteFillObject`) |
| `npx eslint .` | **CRASH** trong sandbox Linux (native binding `unrs-resolver` build cho macOS) | Chạy lại với rule `import/*` tắt: **6 error + 7 warning** (xem CODE-REVIEW F-27/F-28) |
| ESLint `boundaries/*` | **PASS — 0 vi phạm** | Không có vi phạm layer matrix trong code hiện tại |
| Unit test suite (37 file) | **179 pass / 0 fail / 0 skip** | Xem cảnh báo về runner ngay bên dưới |
| `node scripts/assert-skia-version.mjs` | **PASS** — `@shopify/react-native-skia@2.12.0 OK` | |
| `node scripts/assert-privacy-manifest.mjs` | **PASS** — `privacyManifests OK` | Chỉ kiểm tra sự *tồn tại* của 4 key, không kiểm tra nội dung |
| `GET https://dexter292.github.io/bricks_breaker/store/privacy-policy.html` | **200 — nội dung khớp hành vi app** | Audit này xác nhận URL privacy policy **thực sự live** |

> **Cảnh báo về runner test — bắt buộc đọc.** `npx vitest run` **không chạy được** trong môi trường audit: `node_modules` được cài trên macOS/arm64 nên `rolldown` thiếu native binding Linux, và registry npm bị chặn nên không thể cài bù. Để vẫn có bằng chứng thực thi thay vì chỉ đọc code, audit đã copy `src/`+`tests/`+`assets/` ra thư mục scratch **ngoài repository** và chạy 37 file test bằng Node 22 `--experimental-strip-types` với một shim `vitest`/`@fast-check/vitest` tương thích (describe/it/expect/prop). Kết quả: **179/179 pass**, trùng khớp con số 179 mà `08-VALIDATION.md:63` ghi nhận. Không một file nào trong repository bị sửa. Dù vậy, **đây không phải output của vitest thật** — cần chạy lại `npm test` trên macOS để có bằng chứng chính thức.

---

## 3. Trạng thái 27 requirements v1

| Trạng thái | Số lượng | Requirement |
|---|---|---|
| **VERIFIED** | **10** | PHYS-03, PHYS-06, LVL-01, LVL-02, LVL-03, RUN-01, PWR-01, PWR-02, PWR-03, ARCH-02 |
| **PARTIAL** | **14** | PHYS-02, PHYS-04, PHYS-05, PHYS-07, RUN-02, RUN-03, RUN-04, FX-01, FX-02, FX-03, PLT-01, PLT-02, PLT-04, ARCH-01 |
| **UNVERIFIED** | **2** | PHYS-01, LVL-04 |
| **MISSING** | **0** | — |
| **BLOCKED** | **1** | PLT-03 (cần thiết bị thật, không thể kiểm chứng trong môi trường audit) |

Chi tiết từng dòng: [REQUIREMENTS-MATRIX.md](./REQUIREMENTS-MATRIX.md).

Lưu ý quan trọng: chính `REQUIREMENTS.md` đang **vừa over-claim vừa under-claim**. Over-claim: PLT-03 `[x]` Complete (`:50`, `:125`) dù không có phép đo nào. Under-claim: PHYS-01 (`:12`, `:102`), PHYS-05 (`:16`, `:106`), RUN-02 (`:30`, `:114`), PLT-01 (`:48`, `:123`) vẫn ở `Pending` dù Phase 3 được ghi `6/6 Complete` (`ROADMAP.md:195`) và `03-VERIFICATION.md:94-97` đánh dấu cả bốn là `✓ SATISFIED`. **Ledger requirements hiện không dùng được làm nguồn trạng thái.**

---

## 4. Lỗi nghiêm trọng

### Critical (5)

| ID | Vấn đề | Vị trí |
|---|---|---|
| **F-01** | `retry()` / `setActive()` mutate **bản clone** của World đọc từ RN runtime → Retry không reset ván chơi; reset accumulator là no-op; `injectCertWorstCase` chưa bao giờ thực sự inject gì (nghĩa là "worst case" của Phase 8 chưa từng được dựng) | `src/runtime/useGameLoop.ts:420-424`, `:429-441`, `:517-618` |
| **F-04** | PLT-03 được tick Complete trong ledger khi mọi ô đo là `PENDING_DEVICE` | `.planning/REQUIREMENTS.md:50,125` vs `docs/phase8-certification.md:103-108` |
| **F-05** | Phase 8 chưa hoàn thành nhưng dự án được trình bày là "8 phase completed"; không có `08-VERIFICATION.md`, không có `08-06-SUMMARY.md` | `.planning/ROADMAP.md:181,200`; `.planning/STATE.md:6` |
| **F-06** | 4 SUMMARY của Phase 8 khai `requirements-completed: [PLT-03]` cho công việc chỉ là harness/protocol; `08-00-SUMMARY.md:53` khai cả `[LVL-04, PLT-03, PLT-04]` cho một plan mà output là `it.todo` stub | `08-00/02/03/04-SUMMARY.md` |
| **F-07** | Soak test (SC4) hoàn toàn chưa chạy, **và harness không tự ghi lại dữ liệu gì** — chỉ log chu kỳ; memory/frame-time phải thu tay bằng `adb` | `app/_components/GameHost.tsx:39-80`; `docs/phase8-certification.md:151-152` |

### High (14)

Rút gọn — chi tiết đầy đủ kèm code evidence trong [CODE-REVIEW.md](./CODE-REVIEW.md):

- **F-08** Event ring không được clear ở nhánh `DOCKED`/`WON`/`LOST` → sau mỗi lần mất mạng, SFX `life_lost` (1 voice) retrigger ~120 lần/giây và camera shake bị ghim ở biên độ tối đa suốt thời gian chờ serve (`src/core/stepRun.ts:24-42` vs `src/runtime/useGameLoop.ts:349-354`).
- **F-09** `StyleSheet.absoluteFillObject` **không còn tồn tại** trong RN 0.86 (đã grep: zero match trong `node_modules/react-native/Libraries/StyleSheet/`) → 4 overlay mất `position:absolute` + `top/left/right/bottom:0`, scrim co thành một dải trên đỉnh màn hình, không dim và không chặn touch playfield.
- **F-10** Frame callback bị unregister/re-register **mỗi lần React render** `PlayingHost` (closure inline tại `useGameLoop.ts:286`; `useFrameCallback` key theo `[callback, autostart]`) → mỗi lần score/combo nhảy là một lần serialize lại toàn bộ worklet graph trên JS thread.
- **F-11** CCD miss-path advance hai lần trong cùng một step khi lần lặp thứ 5 trượt (`step.ts:279-282` không zero `remaining`, `:378-385` advance tiếp).
- **F-12** Ball nằm chồng collider không bao giờ được depenetrate (`SEPARATION_EPS = 1e-4`), CCD cạn lượt rồi advance **xuyên qua** collider → ball đã lọt dưới paddle có thể bị kéo ngược lên xuyên thân paddle.
- **F-13** Particle nổ **không bao giờ** thừa hưởng màu brick: `step.ts:357-361` zero HP *trước* khi push `BRICK_BREAK`, `consumeEvents.ts:82-84` resolve màu từ HP đã = 0 → mọi brick nổ ra cùng một màu amber. Vi phạm trực tiếp D-08 / FX-02.
- **F-14** Glow atlas bake cứng ở `44×18` (`bakeGlowSprites.ts:15-16`) nhưng level mặc định là level-03 với brick `32×14` → halo trùm lệch 16px phải / 8px dưới mỗi viên.
- **F-15** `setAntiAlias` **chỉ** xuất hiện trong hàm bake; paint của record path không bật AA → toàn bộ ball, trail, particle, flash, damage-cue stroke đều bị răng cưa.
- **F-16** Trail ring không bao giờ được clear (retry + slot compaction khi ball chết) → vệt ghost của ball cũ dính sang ball còn sống.
- **F-17** ~452 `Skia.Color()` + 192 template string + ~103 array cue mỗi frame (ước tính có phép tính trong PERFORMANCE-REVIEW) → áp lực GC trên UI runtime.
- **F-18** Skia offscreen surface + SkImage của glow atlas không bao giờ `dispose()`; bake lại mỗi lần mount PlayingHost → rò rỉ theo từng chu kỳ Title↔Playing (soak harness chạy 100 chu kỳ).
- **F-19** Phase 7 SC-5 — một tiêu chí **đo lường** — được đánh `✓ VERIFIED (procedure + debt)` dựa trên một tài liệu *hướng dẫn cách đo* (`07-VERIFICATION.md:30`).
- **F-20** Waiver hardware của Phase 1 chưa bao giờ được discharge; hai hạng mục (SC-2 release-build worklet mutation, iOS profiling chưa re-run sau fix HUD font) **không thuộc plan nào** và schema Results của Phase 8 không có ô nào biểu diễn được chúng.
- **F-21** PHYS-05 "aimed release" **chưa tồn tại**: `processDocked` luôn snap `ballX = paddleX` nên english luôn = 0, serve luôn thẳng đứng chính xác `(0, -360)`. Test `rules.serve.test.ts:36-45` comment là đang test serve lệch góc nhưng chỉ assert `|vy| > |vx|`.

Tổng: **5 Critical · 14 High · 29 Medium · 15 Low** (63 finding). ID là nhãn ổn định, **không** sắp theo mức độ — F-02 và F-03 là Medium.

---

## 5. Trạng thái hiệu năng

| Hạng mục | Verdict | Cơ sở |
|---|---|---|
| Android certification (Pixel 6a, Mid tier) | **UNPROVEN** | Protocol đúng và đầy đủ (`phase8-certification.md:12-82`: profiling build, ≥2 run × ≥30s, lấy run tệ hơn, p50≤16.7ms / p95≤20ms hoặc jank≤5%, cấm dùng RN Perf Monitor). **Đã chạy: 0 run.** Mọi ô: `PENDING_DEVICE` |
| iOS real device | **PARTIAL** | Install + render + `worklet tick PASS` trên iPhone 16 Pro vật lý có bằng chứng thật (`device-gate-results.md:14,28,34` — UDID, `devicectl` launch). Nhưng chỉ **development build**; profiling/release `WAIVED` (`:46`); **Instruments: chưa bao giờ chạy** |
| Soak / memory leak | **UNPROVEN** | Harness thật tồn tại nhưng chưa chạy, và không tự thu số liệu |
| Frame-budget của VFX (FX-02) | **UNPROVEN** | `phase7-vfx-measurement.md:72` = `OPEN — PENDING_DEVICE`. Thêm nữa, in-app perf overlay **không thể bật được**: `PERF_OVERLAY` trong `devflags.ts:10` không có consumer nào, `drawOverlayFlag` luôn `false` |

Nghịch lý cần nhấn mạnh: kể cả khi mang máy Pixel 6a ra đo *ngay bây giờ*, **harness worst-case sẽ không dựng được cảnh worst-case**, vì `injectCertWorstCase` mutate bản clone của World (F-01). Phải sửa F-01 **trước** khi đo, nếu không số liệu thu được sẽ vô nghĩa.

---

## 6. Sẵn sàng phát hành

**Chưa đủ điều kiện để external testing công khai**, nhưng **đủ điều kiện để tiếp tục playtest nội bộ** sau khi sửa F-01 và F-09 (hai fix nhỏ, tác động lớn: một là wiring reset qua SharedValue request counter, một là đổi `absoluteFillObject` → `absoluteFill` ở 4 file).

Store compliance: **chuẩn bị 8/9 hạng mục, thỏa mãn thực tế 4/9.**

- ✅ Privacy policy: text chuẩn, **URL HTTPS live và đã được audit này fetch xác nhận 200**, nội dung khớp hành vi thật của app (offline, AsyncStorage local, không analytics/ads/IAP — đã đối chiếu `package.json`).
- ✅ Apple privacy manifest trong `app.json:16-38` (nguồn chân lý qua CNG) — nhưng file `ios/.../PrivacyInfo.xcprivacy` đã prebuild **lệch** (thiếu `NSPrivacyTrackingDomains`, thiếu category DiskSpace, chỉ có 1/3 reason cho FileTimestamp) và script assert chỉ kiểm tra key tồn tại.
- ✅ Play Data Safety + Age rating: tài liệu đầy đủ, lập luận vững — nhưng **chưa nhập vào console nào**.
- ❌ App name clearance: `name-clearance.md:13-18` chỉ liệt kê các tìm kiếm *sẽ làm*, không có ngày, từ khóa, hay kết quả. **Zero bằng chứng.**
- ❌ Asset originality: attestation nói `assets/images` là "project art" nhưng thư mục chứa asset template Expo (`expo-logo.png`, `tabIcons/*`); 7 file `.wav` khai "project-authored / licensed" không nêu tác giả, công cụ, hay license.
- ⚠️ `app.json:56` vẫn load plugin `expo-dev-client` không điều kiện cho cả production.

Chi tiết: [RELEASE-READINESS.md](./RELEASE-READINESS.md).

---

## 7. Năm việc ưu tiên tiếp theo

1. **Sửa F-01** — chuyển mọi mutation World khỏi RN runtime sang một `resetRequest: SharedValue<number>` được frame callback quan sát. Đây là điều kiện tiên quyết cho cả Retry, cả reset accumulator, và cả toàn bộ đợt đo hiệu năng.
2. **Sửa F-09 + F-15 + F-14 + F-13** (bốn fix nhỏ, tác động thị giác lớn: scrim overlay, anti-alias, glow theo brick size thật, màu particle từ HP trước khi trừ) và **F-08** (clear event ring ở mọi nhánh `stepRun`).
3. **Sửa F-10 + F-17** rồi mới chạy certification: ổn định identity của frame callback, cache SkColor. Không đo trước khi sửa — số liệu sẽ phản ánh bug, không phản ánh sản phẩm.
4. **Thực thi `08-06-PLAN.md` trên hardware thật**: Pixel 6a profiling + Cert WC + 2×≥30s + `gfxinfo framestats` p50/p95/jank cả hai run; iPhone vật lý + Instruments; soak 100 chu kỳ + 15 phút với `adb dumpsys meminfo`/`gfxinfo` đầu-cuối. Sau đó tạo `08-06-SUMMARY.md` và `08-VERIFICATION.md`.
5. **Dọn ledger trạng thái**: revert PLT-03/PLT-04/LVL-04 về Pending cho tới khi có số liệu; xóa `requirements-completed: [PLT-03]` khỏi 4 SUMMARY của Phase 8; đồng bộ PHYS-01/PHYS-05/RUN-02/PLT-01; mở lại D2/D4 với plan chủ sở hữu; đưa `tsc --noEmit` trở lại phase gate.

**Không bắt đầu remediation trước khi kế hoạch được phê duyệt.** Kế hoạch khắc phục đã được chia thành 8 work package sẵn sàng làm input cho GSD: [REMEDIATION-PLAN.md](./REMEDIATION-PLAN.md).

---

## 8. Danh mục báo cáo

| File | Nội dung |
|---|---|
| [EXECUTIVE-SUMMARY.md](./EXECUTIVE-SUMMARY.md) | Tài liệu này |
| [REQUIREMENTS-MATRIX.md](./REQUIREMENTS-MATRIX.md) | Đối chiếu 27 requirements v1 |
| [PHASE-REVIEW.md](./PHASE-REVIEW.md) | Review 8 phase GSD + bảng truy vết deferred items |
| [CODE-REVIEW.md](./CODE-REVIEW.md) | 63 finding kỹ thuật kèm file:line và code evidence |
| [PERFORMANCE-REVIEW.md](./PERFORMANCE-REVIEW.md) | Bằng chứng hiệu năng, memory, soak; phép tính worst-case |
| [RELEASE-READINESS.md](./RELEASE-READINESS.md) | Checklist trước external testing / phát hành |
| [REMEDIATION-PLAN.md](./REMEDIATION-PLAN.md) | 8 work package khắc phục |
