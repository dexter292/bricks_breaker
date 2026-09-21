# PERFORMANCE REVIEW

**Ngày audit:** 2026-09-21
**Nguyên tắc tuyệt đối:** báo cáo này **không chứa một con số benchmark nào do audit bịa ra**. Mọi số đo được trích nguyên văn kèm file:line. Mọi con số do audit tự tính đều là **phép tính tĩnh từ code** (có trình bày số học) hoặc **kết quả chạy headless** (có nêu rõ phương pháp), và được gắn nhãn tương ứng. Không có số nào ở đây là số đo trên thiết bị — vì trong repository không tồn tại số đo nào trên thiết bị.

---

## 1. Methodology đã được tài liệu hóa — chất lượng tốt

`docs/measurement-methodology.md` là một hợp đồng đo lường nghiêm túc và trung thực:

| Dòng | Nội dung |
|---|---|
| `:22` | Công cụ verdict Android: `adb shell dumpsys gfxinfo <package> reset` → ~30 s → `framestats` |
| `:25` | "Never declare the 60 FPS gate from the React Native performance monitor alone" |
| `:32` | `profiling` là build profile dùng cho gate |
| `:34` | `production` "Not for FPS claims" |
| `:46` | "Simulators / emulators never count toward the gate (D-05)" |
| `:49-54` | Hygiene: giữ màn hình sáng, bỏ ~2 s đầu, **cửa sổ ≥30 s, ≥2 run, lấy run tệ hơn** |
| `:58` | "~200–300 sprites at 60 FPS on Pixel 6a" — nêu rõ là **target**, không phải kết quả |

`docs/phase8-certification.md` bổ sung protocol worst-case đúng chuẩn:

| Dòng | Nội dung |
|---|---|
| `:12-23` | Scenario: level-03 + Mid tier + ≥3 ball + particle gần cap 128 + shake + glow |
| `:53-61` | Pixel 6a **vật lý**, Mid, **≥2 run × ≥30 s, lấy run tệ hơn** |
| `:73-79` | Pass lock: `p50 ≤ 16.7 ms` **và** `p95 ≤ 20 ms`, **hoặc** jank ≤ 5% |
| `:81` | "RN Perf Monitor alone is invalid" |
| `:82` | Không được silently remap về Low |
| `:99` | "**do not invent gfxinfo numbers**" |

Code metrics cũng đúng phương pháp: `src/runtime/metrics.ts:70-76` tính rolling FPS bằng `1000 / mean(interval)` — **không** phải mean của per-frame FPS (một sai lầm phổ biến); `:78-98` p95/p99 bằng insertion sort alloc-free; `:116` `if (intervalMs > 16.7) m.overBudget += 1`.

**Kết luận về methodology: protocol yêu cầu đúng những gì cần yêu cầu. Nó chưa bao giờ được thực thi.**

---

## 2. Các phép đo thực tế tồn tại trong repository

Toàn bộ repository chứa **đúng một** con số hiệu năng, và đó là số từ simulator:

> `docs/device-gate-results.md:52`
> `| 1 | iPhone 17 Simulator | development | overlay only | ~256 | ~16.67 ms / ~60 FPS | **not** gfxinfo/Instruments — sim smoke | cool | **WAIVED (interim)** |`

Phân tích: Thiết bị = **Simulator** · Build = **development** · Công cụ = in-app overlay · Scenario = ~256 sprite giả của harness Phase 1, **không phải gameplay** · Duration = không nêu · Runs = 1 · Metric = rolling FPS + ms/frame, **không có percentile, không có jank count**. Lặp lại ở `:63`: `| 256 | ~16.67 ms / ~60 FPS (iOS development overlay) | baseline smoke | no |`.

**Điểm cần ghi công cho repository:** con số này được gắn nhãn là **không phải một claim** ở **năm** chỗ khác nhau (`:3`, `:7`, `:15`, `:52`, `:55`). Đây là sự trung thực, không phải gian dối. Rủi ro nằm ở việc **tái sử dụng downstream**, không ở chính tài liệu.

Mọi thứ còn lại là placeholder:

> `phase8-certification.md:103` — `| Pixel 6a | Mid | profiling | run1 | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | … |`
> `:104` run2 — y hệt `PENDING_DEVICE`
> `:105` — `| iPhone (physical) | … | Instruments | PENDING_DEVICE | … |`
> `:108` — `**Worse-run summary (Pixel Mid):** \`PENDING_DEVICE\``
> `phase7-vfx-measurement.md:72` — hàng Phase 7: `**OPEN** — \`PENDING_DEVICE\``
> `device-gate-results.md:53` — hàng Pixel 6a: `TBD` … `**OPEN (D-04)**`
> `phase8-certification.md:151-152` — hàng Soak: `| Pixel 6a | … | 100 | 15 min | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE |`

**Test liên quan hiệu năng: không tồn tại.** 37 file test không có frame-time test, không soak test, không cert test. `tests/audio.release.test.ts` có thật nhưng chỉ cover việc release audio pool — và `phase8-certification.md:146` đã trung thực ghi "unit green alone does **not** claim soak pass".

---

## 3. Verdict

| Claim | Verdict | Cơ sở |
|---|---|---|
| **Pixel 6a mid-tier Android certification** (profiling/release build, thiết bị thật, ≥2 run, ≥30 s/run, worst-case max ball + peak particle + shake, lấy run tệ hơn, methodology frame-time/jank) | **UNPROVEN** | Protocol đầy đủ (`phase8-certification.md:12-82`); **0 run đã chạy**; mọi ô `PENDING_DEVICE`; không có output gfxinfo nào ở bất kỳ đâu trong repo |
| **iOS real-device evidence** (install, render, touch, lifecycle, stability, Instruments) | **PARTIAL — chỉ install/render, không Instruments** | Install + render + `worklet tick PASS` trên iPhone 16 Pro **vật lý** có bằng chứng đáng tin: `device-gate-results.md:14`, `:28`, `:34` (UDID, `devicectl` launch, Metro IP). Nhưng chỉ **development build**; profiling SC-2 **không được re-run** (`:24`); `:46` iOS profiling/release = `WAIVED`. **Instruments: chưa bao giờ chạy** (`phase8-certification.md:105` `PENDING_DEVICE`). Không có bằng chứng lifecycle/stability theo thời lượng. Chính `:94` ghi "Install alone **≠** performance evidence" |
| **Soak test** (100 chu kỳ Title↔Playing, 15 phút liên tục, memory growth, frame-time degradation) | **UNPROVEN** | Harness có thật (`app/_components/GameHost.tsx:38-88`: `__DEV__ && SOAK_HARNESS`, 100 cycle, `SOAK_CONTINUOUS_MS`, log `[soak] complete`) nhưng **chưa chạy** (`phase8-certification.md:151-152`). **Và harness không tự ghi số liệu** — memory/frame-time phải thu tay bằng `adb dumpsys meminfo`/`gfxinfo` (`:137-138`), nên kể cả khi chạy cũng **không sinh artifact nào** |
| **Frame budget của VFX (FX-02)** | **UNPROVEN** | `phase7-vfx-measurement.md:72` = `OPEN — PENDING_DEVICE`. Nặng hơn: cross-check bằng in-app overlay mà `:11` mô tả là **bất khả thi** — `PERF_OVERLAY` (`devflags.ts:10`) không có consumer nào, `drawOverlayFlag` luôn `false` (F-29) |

---

## 4. Các con số trong tài liệu cần gắn cờ

| Cờ | Vị trí | Đánh giá |
|---|---|---|
| `~16.67 ms / ~60 FPS` | `device-gate-results.md:52`, `:63` | **Simulator, development build, overlay-only, sprite giả.** Đã disclaim đúng và lặp lại. Rủi ro là tái sử dụng downstream |
| `BUDGETS low 48/2/0, mid 128/5/1, high 192/5/1` | `resolveQualityTier.ts:18-20`; `STATE.md:131` "(RESEARCH table)" | **Hằng số thiết kế chưa được validate**, lấy từ một bảng research, chưa bao giờ được xác nhận bằng đo đạc. Mid = 128 particle chính là thứ mà certification tồn tại để kiểm tra |
| `p50 ≤ 16.7 ms`, `p95 ≤ 20 ms`, jank ≤ 5% | `phase8-certification.md:75-78` | Được trình bày đúng là **threshold**, không phải kết quả. Sạch |
| `~200–300 sprites at 60 FPS on Pixel 6a` | `measurement-methodology.md:58` | Nêu rõ là **target**. Sạch |
| `npm test` 179/179 | `08-VALIDATION.md:63` | **Audit đã cross-check độc lập: 179 pass** (xem §6). Nhưng đây là đếm unit test Node, và `08-VALIDATION.md:65` trung thực từ chối cho nó thay thế các hàng device |
| `110 green as of Phase 5` | `PROJECT.md:20` | Hơi cũ (`05-REVIEW-FIX.md:41` báo 112). Không đáng kể |

**Không tìm thấy phép đo thiết bị nào bị bịa ra.** Failure mode của repository này không phải fabrication mà là **reclassification**: protocol chưa thực thi được đối xử như requirement đã thỏa (F-04, F-06, F-19).

---

## 5. Ước tính worst-case rendering per frame (phép tính tĩnh từ code)

**Nhãn: phép tính tĩnh, không phải số đo.** Mục đích là định vị nơi chi phí nằm, để đợt đo thật biết tìm gì.

### Kiểm kê brick của level-03 (đếm trực tiếp từ `assets/levels/level-03.json`, đã verify)

| Loại | Số lượng |
|---|---|
| `1` (hp 1) | 37 |
| `2` (hp 2) | 33 |
| `3` (hp 3) | 23 |
| `X` (unbreakable, hp 99) | 10 |
| `.` (rỗng) | 57 |
| **Tổng brick** | **103** (93 breakable) |
| **Tổng HP breakable = số hit để clear** | **37×1 + 33×2 + 23×3 = 172** |
| Grid | `cols:10, rows:16, originX:2, originY:48, brickW:32, brickH:14, gapX:4, gapY:2` |
| Extent | x ≤ 358, y ≤ 302 — nằm trong 360×640 ✓ |

Cấu trúc ba act (y từ `originY=48`, `pitchY=16`):

| Segment | Rows (y) | hp1 | hp2 | hp3 | steel | breakable | hits |
|---|---|---|---|---|---|---|---|
| Act 1 (mở màn dễ) | 0-4 (48-126) | 33 | 0 | 0 | 0 | 33 | 33 |
| Plateau | 5 (128-142) | — | — | — | — | 0 | 0 |
| Act 2 (dày hơn, multi-HP) | 6-12 (144-254) | 4 | 33 | 15 | 0 | 52 | 115 |
| Act 3 (pocket steel) | 13-15 (256-302) | 0 | 0 | 8 | 10 | 8 | 24 |

→ Cấu trúc ba act **được xác nhận bằng dữ liệu**. Cột steel của Act 3 sát tường (col0 x 2-34, col9 x 326-358, để lại khe 2 đơn vị) nên **không** có kênh mảnh như level-02 (F-02), và không tồn tại vùng rỗng bị bao kín ở trạng thái đầu. Vì phá brick chỉ mở thêm không gian chứ không bao giờ bịt kín, failure mode "ball kẹt trong hộp steel kín" **không reachable từ level nào đang ship** (dù harness xác nhận nó không thể thoát nếu được dựng nhân tạo — 200 step, anti-stall không giúp được).

### Số lệnh vẽ mỗi frame

Scenario: level-03, tier `high` (`particleCap 192`, `trailMax 5`, `glowScale 1`), `vfxIntensity = 1.0`, pool saturated, destroy flash đang sống, 8 ball, 16 pickup.

Quy tắc damage cue (`recordSprites.ts:72-115`): unbreakable → 3 line, hp2 → 1, hp1 → 2, hp3 → 0.

| Op | Số lượng | Dòng |
|---|---|---|
| `drawRect` letterbox | 1 | `:162` |
| `drawRect` navy field | 1 | `:183` |
| `drawImage` glow blit | 103 | `:214` |
| `drawRect` brick fill | 103 | `:223` |
| `drawLine` damage cue | 137 → **216** | `:234` |
| `drawCircle` particle | 192 | `:254` |
| `drawCircle` destroy flash | 1 | `:267` |
| `drawRect` pickup (`maxPickups=16`, `allocate.ts:27`) | 16 | `:290` |
| `drawRect` paddle | 1 | `:302` |
| `drawCircle` trail ghost (`maxBalls=8` × `ringLen=5`) | 40 | `:327` |
| `drawCircle` viền cyan | 8 | `:335` |
| `drawCircle` ball sống | 8 | `:352` |
| `drawText` overlay | 0 (không thể vẽ — F-29) | `recordOverlay.ts:33-61` |

```
Damage cue, trạng thái đầu level : 37×2 + 33×1 + 23×0 + 10×3 = 74 + 33 + 0 + 30 = 137 line
Damage cue, xấu nhất (93 breakable đều còn hp1, chưa phá) : 93×2 + 10×3 = 186 + 30 = 216 line

Trạng thái đầu : 1+1+103+103+137+192+1+16+1+40+8+8 = 611 draw op / frame
Xấu nhất       : 1+1+103+103+216+192+1+16+1+40+8+8 = 690 draw op / frame
@60 fps        : 690 × 60 = 41.400 draw op / giây
```

### Số lần gọi `Skia.Color()` mỗi frame (F-17)

`SkColor` là `Float32Array`; `Skia.Color(string)` là JSI host function: chuyển JS string → `std::string`, chạy CSS color parser, rồi **dựng `Float32Array(4)` mới bằng cách gọi constructor JS từ C++** (`node_modules/@shopify/react-native-skia/cpp/api/JsiSkColor.h:31-45,89-96`); `paint.setColor` đọc ngược qua JSI bằng `getProperty("buffer")` + `getArrayBuffer` (cùng file `:66-70`).

```
   2  letterbox + field                  (recordSprites.ts:160, :181)
 103  brick fill                         (:221)
 103  màu cue, một lần / brick có cue    (:231)   ← 80 ở trạng thái đầu
 192  particle                           (:252)   + 192 template string
   1  flash                              (:265)
   1  pickup                             (:278)
   1  paddle                             (:294)
  40  ghost trắng                        (:325)
   8  ghost cyan                         (:333)
   1  ball sống                          (:345)
─────
 452  Skia.Color / frame
      → 452 Float32Array(4) + 452 lần parse CSS + ~904 lần crossing JSI
      @60 fps: 27.120 color object / giây ≈ 1,7 MB/giây rác thuần màu
```

### Tổng allocation JS heap mỗi frame

```
 452  SkColor Float32Array(4)
 192  template string `rgb(r, g, b)`
 103  array cue (planBrickDamageCuesLocal gọi cho mọi brick)
 216  object cue {x0,y0,x1,y1}
   1  SkPicture (không tránh được)
   1  Int16Array copy audio batch      (eventBridge.ts:21)
  ≤5  object intent                    (useGameLoop.ts:345)
─────
~970 allocation / frame  ≈  58.000 allocation / giây @60 fps
```

### Hot spot ngoài draw call trên UI runtime

```
spawn particle : 5 substep × 8 ball × 1 break × 12 spark × 192-slot scan
                 = 480 spawn × 192 ≈ 92.160 lần đọc typed-array / frame   (particles.ts:33 — F-60)
step particle  : 192 vòng lặp                                            (particles.ts:111)
metrics        : 2 × (copy 60 float + insertion sort ~900 so sánh) ≈ 1.800 op / frame
                 — cho một overlay không bao giờ vẽ                       (F-29)
```

### Những gì **đã** được reuse đúng (đừng phá khi tối ưu)

`PictureRecorder`, **một** `SkPaint`, và ba `SkRect` được cache trên global UI-runtime và mutate bằng `setXYWH` (`recordSprites.ts:31-49, 154, 161, 182, 222, 284, 296`); paint của overlay cũng được cache (`recordOverlay.ts:8-17`); **không có `SkPath` nào được tạo** — trail là circle rời rạc theo thiết kế (D-10). Anti-pattern "Paint/Path/Picture mỗi frame" **không tồn tại**. Vấn đề là ~452 SkColor object — tương đương về mặt hiệu ứng, và là điểm tối ưu đòn bẩy cao nhất của render path.

Tương tự, `src/vfx/particles.ts` và `trails.ts` là SoA đúng chuẩn, **zero allocation per-particle**. Kỷ luật allocation của dự án nói chung là tốt; nó chỉ rò rỉ ở đúng một chỗ.

---

## 6. Bằng chứng tự động do audit chạy

**Nhãn: thực thi thật, nhưng bằng runner thay thế.**

`npx vitest run` **không chạy được** trong môi trường audit: `node_modules` được cài trên macOS/arm64 nên `rolldown` báo `Cannot find module '@rolldown/binding-wasm32-wasi'`, và registry npm bị chặn (403) nên không thể cài bù binding Linux. Để vẫn có bằng chứng thực thi thay vì chỉ đọc code, audit đã:

1. Copy `src/`, `tests/`, `assets/` ra một thư mục scratch **ngoài repository** (không file nào trong repo bị sửa).
2. Dựng shim `vitest` + `@fast-check/vitest` tương thích (describe/it/expect/prop, dùng `fast-check` thật của dự án).
3. Chạy 37 file test bằng Node 22 `--experimental-strip-types` với resolver hook cho import không có extension.

**Kết quả: 179 pass / 0 fail / 0 skip** — trùng khớp con số 179 mà `08-VALIDATION.md:63` ghi nhận.

**Giới hạn phải nêu rõ:** đây **không** phải output của vitest thật. Cần chạy lại `npm test` trên macOS để có bằng chứng chính thức. Shim có thể có khác biệt hành vi ở các matcher phức tạp (`expect.objectContaining`, `.resolves`, property-test shrinking).

Các lệnh khác:

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit` | **FAIL — 6 lỗi** (F-44) |
| `npx eslint .` | **CRASH** — `Cannot find native binding` (`unrs-resolver`, build macOS) trong rule `import/namespace`. Chạy lại với nhóm `import/*` tắt: **6 error + 7 warning** (F-46) |
| ESLint `boundaries/*` | **PASS — 0 vi phạm** |
| `node scripts/assert-skia-version.mjs` | **PASS** — `@shopify/react-native-skia@2.12.0 OK` |
| `node scripts/assert-privacy-manifest.mjs` | **PASS** — `privacyManifests OK` (chỉ kiểm tra 4 key tồn tại, không kiểm tra nội dung — F-39) |
| `GET .../store/privacy-policy.html` | **200**, nội dung khớp hành vi app |

### Đo thời lượng gameplay bằng bot headless

**Nhãn: chạy headless trên `stepRun` không sửa đổi, không phải playtest người thật.** Bot paddle bám ball tuyệt đối, không bao giờ mất mạng.

| Level | Bot offset 0 | Bot offset ±18u luân phiên |
|---|---|---|
| level-01 | WON 11.573 tick = **96 s** (score 4.080) | WON 13.962 tick = **116 s** |
| level-02 | **TIMEOUT 600 s**, còn 12/16 breakable | **TIMEOUT 600 s**, còn 8/16 |
| level-03 | WON 37.976 tick = **317 s** (score 12.880) | WON 18.658 tick = **156 s** (score 21.980) |

Cùng harness xác nhận: bảo toàn tốc độ `maxDev = 3.7e-5` trên 719.6 sau 20.000 step reflection xếp lớp; 0 vi phạm tunneling trên geometry level-03 ở 2× max speed qua 33.933 step; và tái hiện được F-08, F-12, F-22, F-47, F-21.

**Ý nghĩa cho LVL-04:** một paddle *siêu phàm* cần **2,6-5,3 phút** cho level-03. Người chơi thật (3 mạng, mất nhịp mỗi lần miss, serve luôn thẳng đứng theo F-21, tốc độ ball cố định 360 u/s cả ván theo F-45) rất có thể **vượt 3 phút**. Mục tiêu "~2-3 phút" nên được coi là **chưa kiểm chứng và lạc quan**.

---

## 7. Điều kiện tiên quyết bắt buộc trước khi đo — phần quan trọng nhất của báo cáo này

**Nếu mang Pixel 6a ra đo ngay bây giờ, số liệu thu được sẽ vô nghĩa.** Bốn lý do độc lập:

1. **F-01 (Critical) — harness worst-case không dựng được cảnh worst-case.** `injectCertWorstCase` (`useGameLoop.ts:517-618`) mutate `world.value` đọc từ RN runtime, tức là một bản clone. Cảnh "≥3 ball + particle gần cap + shake" mà `phase8-certification.md:12-23` yêu cầu **chưa bao giờ được inject**. Số đo sẽ là của cảnh gameplay thường.
2. **F-29 — không có cách nào cross-check trong app.** `PERF_OVERLAY` không có consumer; `drawOverlayFlag` luôn `false`. Đồng thời `pushSample` + hai `percentileMs` vẫn chạy mỗi frame (~1.800 op) làm nhiễu chính phép đo.
3. **F-10 — frame callback re-register mỗi React render**, mỗi lần serialize lại toàn bộ worklet graph trên JS thread, và bỏ một lần `timeSincePreviousFrame` (thay bằng hardcode 16.67ms). Số đo sẽ phản ánh bug này chứ không phản ánh chi phí render thật.
4. **F-17 — ~452 SkColor + ~970 allocation/frame.** Đây là một khoản chi phí **đã biết và sửa được**; đo trước khi sửa nghĩa là certify một sản phẩm không tồn tại nữa sau khi sửa.

Thêm vào đó, nếu chạy soak trước khi sửa **F-18** (glow atlas rò rỉ 4 surface + 4 image mỗi mount), soak sẽ fail vì một lý do đã biết thay vì phát hiện điều gì mới.

**Thứ tự đúng: WP-1 → WP-2/WP-4 → WP-6 (đo).** Chi tiết: [REMEDIATION-PLAN.md](./REMEDIATION-PLAN.md).

---

## 8. Các bước cần thực hiện để hoàn tất performance certification

Đây là nội dung của `08-06-PLAN.md` Task 2, viết lại dưới dạng checklist thực thi được sau khi các điều kiện tiên quyết ở §7 đã xong:

### Android (Pixel 6a, Mid tier)
1. Build `profiling` (`eas.json` profile `profiling`), cài trên **Pixel 6a vật lý**.
2. Bật Cert WC harness; xác nhận bằng mắt đang ở level-03, Mid tier, **≥3 ball đang bay**, particle gần cap 128, shake xảy ra.
3. `adb shell dumpsys gfxinfo <package> reset` → chơi ≥30 s → `adb shell dumpsys gfxinfo <package> framestats`.
4. Lặp lại **≥2 lần**. Bỏ ~2 s đầu mỗi run. Giữ màn hình sáng, máy nguội.
5. Ghi **p50 / p95 / jank% cho cả hai run**, rồi lấy **run tệ hơn**. Paste nguyên văn dòng one-liner của gfxinfo vào `docs/phase8-certification.md:103-108`.
6. Đối chiếu pass lock `:73-79`. Nếu fail, **không** được silently remap về Low (`:82`).

### iOS (iPhone vật lý)
7. Build `profiling`, cài trên iPhone vật lý (không simulator — `measurement-methodology.md:46`).
8. Xcode Instruments → template **Core Animation** (và Allocations cho memory), cùng scenario worst-case, ≥30 s × ≥2 run.
9. Ghi kết quả vào `:105`. **Đồng thời discharge D2** (SC-2 worklet mutation trên profiling/release) và **D4** (iOS profiling re-run sau fix HUD font) — hai mục này cần **ô Results riêng**, vì schema p50/p95/jank không biểu diễn được chúng (F-20).

### Soak / memory
10. Instrument harness (`GameHost.tsx:38-88`) để **tự ghi** `adb dumpsys meminfo` + `gfxinfo` ở đầu và cuối vào log — hiện nó chỉ log cycle (F-07).
11. Chạy 100 chu kỳ Title↔Playing. Ghi PSS đầu/cuối, số duplicate game loop (kiểm tra qua `nextCallId`), orphaned worklet.
12. Chạy 15 phút gameplay liên tục. Ghi memory growth và frame-time drift (so p95 của 30 s đầu vs 30 s cuối).
13. Xác nhận: không crash, không mất khả năng điều khiển, không leak timer/listener.

### Đóng phase
14. Tạo `08-06-SUMMARY.md` và `08-VERIFICATION.md`.
15. Chỉ khi đó mới tick PLT-03 trong `.planning/REQUIREMENTS.md` (F-04), và discharge waiver Phase 1 (F-20).
16. Visual QA trên build **production** để đóng mitigation T-08-30 (`08-06-PLAN.md:160`) — xác nhận không có UI Cert/Soak, và xử lý F-42 (`expo-dev-client` trong app.json).
