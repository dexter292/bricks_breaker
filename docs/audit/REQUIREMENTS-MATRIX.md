# REQUIREMENTS MATRIX — 27 requirements v1

**Nguồn requirement:** `.planning/REQUIREMENTS.md:12-58`
**Ngày audit:** 2026-09-21

## Quy ước trạng thái

| Trạng thái | Định nghĩa áp dụng trong audit này |
|---|---|
| **VERIFIED** | Có implementation **và** bằng chứng kiểm chứng phù hợp với loại tiêu chí (test tự động cho logic; đo thiết bị cho hiệu năng) |
| **PARTIAL** | Đã triển khai nhưng còn thiếu hành vi, hoặc lệch khỏi yêu cầu, hoặc bị một defent chặn |
| **UNVERIFIED** | Có implementation nhưng bằng chứng không đủ loại (ví dụ: tiêu chí đòi playtest nhưng chỉ có code reading / assertion) |
| **MISSING** | Chưa triển khai |
| **BLOCKED** | Không thể kiểm chứng trong môi trường audit vì thiếu điều kiện bắt buộc (thiết bị thật) |

**Nguyên tắc:** không đánh VERIFIED chỉ vì code tồn tại hoặc vì tài liệu ghi Completed. Cột "Bằng chứng" nêu rõ *loại* bằng chứng.

## Tổng hợp

| Trạng thái | Số lượng |
|---|---|
| VERIFIED | **10** |
| PARTIAL | **14** |
| UNVERIFIED | **2** |
| MISSING | **0** |
| BLOCKED | **1** |
| **Tổng** | **27** |

---

## Controls & Physics

### PHYS-01 — Paddle relative-drag, tuned gain, light smoothing on device
- **Kỳ vọng:** điều khiển bằng relative-drag (không finger-follow tuyệt đối), gain đã tune và smoothing nhẹ, **kiểm chứng trên thiết bị**
- **Implementation:** `src/input/usePaddleGesture.ts:15` (relative drag, `e.translationX`), `:91-100` (áp `camScale`); `src/input/paddleIntent.ts:56`; hằng số `src/input/constants.ts` (`PADDLE_GAIN`, `SMOOTH_ALPHA`)
- **Test:** `tests/input.paddle-intent.test.ts` (5 pass), `tests/input.gesture-gates.test.ts` (9 pass)
- **Bằng chứng:** unit test cho hàm thuần + UAT assertion (`03-VERIFICATION.md:26-30`). Không có log thiết bị, không có artifact tuning
- **Trạng thái:** **UNVERIFIED**
- **Vấn đề:** ledger vẫn ghi `Pending` (`REQUIREMENTS.md:12,102`) trong khi Phase 3 ghi `6/6 Complete`. Phần "tuned on device" chỉ có lời khẳng định
- **Khắc phục:** WP-6 — chạy UAT có ghi nhận (video/log gain-sweep) trên iOS + Android thật; đồng bộ ledger

### PHYS-02 — Swept deterministic collision, no tunneling at designed max speed
- **Implementation:** `src/core/physics/sweep.ts` (Minkowski slab sweep), `src/core/step.ts:85-400` (vòng CCD 5 lượt/ball), `src/core/physics/resolve.ts`
- **Test:** `tests/physics.sweep.test.ts` (8 pass), `tests/physics.tunneling.prop.test.ts` PROP-TUNNEL 100 case ở **2× MAX_BALL_SPEED** với dual oracle (3 pass), `tests/physics.bricks.test.ts` (3 pass)
- **Bằng chứng:** property test tự động — chất lượng cao
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** ba đường tunneling vẫn tồn tại ngoài phạm vi test: **F-11** (miss-path advance hai lần khi lượt CCD thứ 5 trượt, `step.ts:279-282` + `:378-385`), **F-12** (ball chồng collider không được depenetrate, `SEPARATION_EPS=1e-4` tại `:314-315`, rồi advance xuyên collider tại `:383-385`), **F-38** (`applyCompiledLevel` truncate im lặng + spatial grid stale → fail-open, không candidate nào). Mọi test đều phóng ball từ không gian trống
- **Khắc phục:** WP-2

### PHYS-03 — Collision & simulation unit-tested incl. property tests
- **Implementation / Test:** 37 file test, 179 assert pass; `tests/physics.golden-replay.test.ts` (4 pass, gồm PROP-DETERM identical-hash across chunkings), `tests/core.purity.test.ts` (4 pass — grep source cấm `Math.random`/`Date.now`/import RN)
- **Bằng chứng:** tự động
- **Trạng thái:** **VERIFIED**
- **Vấn đề:** vẫn có khoảng trống edge-case (xem bảng cuối tài liệu này); `tests/runtime.freeze.test.ts` + `runtime.accumulator-reset.test.ts` test `src/runtime/freeze.ts` — module **không được production import** (F-36)
- **Khắc phục:** WP-2, WP-7

### PHYS-04 — Paddle-relative bounce with clamps avoiding degenerate trajectories
- **Implementation:** `src/core/physics/resolve.ts:88-107` (`resolvePaddleEnglish`: clamp ±62°, re-derive khi `|vy|/speed < MIN_VERTICAL_RATIO`)
- **Test:** `tests/physics.paddle.test.ts` (6 pass), PROP-CLAMP + PROP-SPEED trong `physics.tunneling.prop.test.ts`
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** **F-22** — `MIN_VERTICAL_RATIO` **chỉ** được enforce trong `resolvePaddleEnglish` và `applyTier3AngleNudge`. `reflectVelocity` (`resolve.ts:11-56`) bảo toàn hướng tuyệt đối, không có sàn góc. Ball bật tường thành near-horizontal sẽ giữ trạng thái đó; tier-2 anti-stall là **no-op** khi ball đã ở `MAX_BALL_SPEED` (`stall.ts:67-70` clamp về 720) nên phải chờ tới tier 3 = **1440 tick = 12 giây**
- **Khắc phục:** WP-3

### PHYS-05 — Ball docked to paddle on life start; player launches with aimed release/tap
- **Implementation:** `src/core/rules/serve.ts:9-23` (`dockBall`), `:53-61` (`processDocked`), `src/input/usePaddleGesture.ts:107-122` (tap → `launchFlag = 1`)
- **Test:** `tests/rules.serve.test.ts` (3 pass)
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** **F-21 — phần "aimed" không tồn tại.** `dockBall` force `world.ballX[bi] = world.paddleX` (`serve.ts:17-18`) nên tham số english `t = (ballX - paddleCx)/half` (`resolve.ts:91`) **luôn = 0**; `applyServe` luôn cho ra chính xác `(0, -360)`. Input launch là boolean, `Intent` không có trường góc (`types.ts:47-48`). Nghiêm trọng hơn: `tests/rules.serve.test.ts:36-45` có comment *"Offset ball from paddle center so english produces non-zero vx"* rồi chỉ assert `|vy| > |vx|` — test **tin rằng** nó đang kiểm chứng serve lệch góc mà code không thể tạo ra
- **Khắc phục:** WP-3 — thêm `aimAngle` vào `Intent` + drag-to-aim khi docked, hoặc chính thức hạ scope và sửa test cho đúng hợp đồng thật

### PHYS-06 — Fixed-timestep loop; React state not updated every physics frame
- **Implementation:** `src/runtime/useGameLoop.ts:286-413` (`useFrameCallback`, `autostart=false`), `:344-361` (accumulator, `FIXED_DT=1/120`, `MAX_SUBSTEPS=5`); mirror SharedValue `:392-396`; không có `setState` nào trong loop
- **Test:** `tests/runtime.accumulator-reset.test.ts`, `tests/runtime.freeze.test.ts` (7 pass) — nhưng test module không dùng trong production (F-36)
- **Bằng chứng:** code reading + đọc source Reanimated (`valueSetter` short-circuit ghi trùng giá trị nên 5 mirror/frame không đánh thức reaction nếu không đổi)
- **Trạng thái:** **VERIFIED** (văn bản requirement được thỏa mãn)
- **Vấn đề kèm theo (không vi phạm requirement nhưng quan trọng):** **F-10** frame callback re-register mỗi render; **F-25** bốn `useAnimatedReaction` riêng biệt → tối đa 3-4 React render/frame khi score+combo+lives đổi cùng frame
- **Khắc phục:** WP-1, WP-4

### PHYS-07 — Anti-stall uses visible, deterministic escalation (no random jitter)
- **Implementation:** `src/core/rules/stall.ts:180-215` (ngưỡng 960/1200/1440 tick), `:50,67-71` (clamp `MAX_BALL_SPEED`), `:108-113` (tier-3 rotate ±8°); HUD `src/runtime/HudStrip.tsx:49-51` (`Stall! · N`) qua mirror `useGameLoop.ts:396`
- **Test:** `tests/rules.stall.test.ts` (8 pass, gồm grep source chứng minh không có `Math.random`)
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** deterministic ✓, no-jitter ✓, clamp ✓, reset-by-any-ball ✓ (`stall.ts:19-46` scan toàn ring), timer chỉ đếm active sim time ✓. Nhưng: **F-22** tier-2 là no-op ở max speed; **F-23** dấu rotation của tier-3 lấy theo **parity của ball index** (`stall.ts:108`: `sign = i % 2 === 0 ? 1 : -1`) chứ không theo heading, nên ~50% trường hợp xoay **về phía nằm ngang hơn** — trái với `05-05-PLAN.md:81` ("toward steeper") và D-16; **F-27** không có escalation sau tier 3 dù SC-5 hứa "until it breaks out"
- **Khắc phục:** WP-3

---

## Level & Bricks

### LVL-01 — Versioned data-driven level format suitable for a future editor
- **Implementation:** `src/core/levels/schema.ts`, `validate.ts` (reject schemaVersion không hỗ trợ tại `:49-58`; validate **trước** compile tại `load.ts:14-19`; không trim row-strings `:167-179`; reject space `:180-187`, unknown char `:191-199`, `__proto__`/`constructor`/`prototype` `:18,127-133`; `brickTypes` trên `Object.create(null)` `:118`), `compile.ts`, `migrations/index.ts:15-19`
- **Test:** `tests/levels.validate.test.ts` (6 pass) + 6 JSON fixture invalid, `tests/levels.compile.test.ts` (7 pass, fingerprint cả 3 level), `tests/levels.apply.test.ts` (3 pass)
- **Trạng thái:** **VERIFIED**
- **Vấn đề nhỏ:** chỉ tồn tại identity migrator (đã tự thừa nhận tại `04-VERIFICATION.md:111-113`); **F-38** truncate im lặng khi `brickCount > world.brickX.length` (chỉ tới được với `maxBricks` không mặc định)

### LVL-02 — Multiple brick types with different HP and readable damage states (color + non-color cue)
- **Implementation:** `src/core/levels/damageCues.ts`; render `src/render/recordSprites.ts:226-236` (0-3 `drawLine`), palette `src/render/colors.ts`
- **Test:** `tests/levels.damage-cues.test.ts` (1 pass)
- **Trạng thái:** **VERIFIED**
- **Vấn đề nhỏ:** `recordSprites.ts:72-115` **nhân bản** logic của `damageCues.ts` (có chủ đích, để worklet không gọi JS remote) nhưng **không có test nào đảm bảo hai bản đồng bộ**; stroke rộng 1.25px không có AA (F-15) nên có thể mất nét

### LVL-03 — Unbreakable/structural bricks that channel the ball
- **Implementation:** `BrickFlags.UNBREAKABLE`; `src/core/step.ts:349-354` (reflect-only, không bao giờ `BRICK_BREAK`); `src/core/rules/win.ts:6-16` (`countBreakableAlive` mask UNBREAKABLE)
- **Test:** `tests/physics.bricks.test.ts:87-145`, `tests/rules.win.test.ts` (4 pass)
- **Trạng thái:** **VERIFIED**
- **Vấn đề nhỏ:** **F-48** brick không phá hủy emit trùng `BRICK_HIT` mỗi ball mỗi lượt CCD (guard `brickDamagedThisStep` chỉ nằm ở nhánh breakable) → particle chip + audio `brick_chip` trùng

### LVL-04 — One hand-crafted ~2–3 minute arcade challenge level with progressive difficulty
- **Implementation:** `assets/levels/level-03.json` (10×16, 103 brick: 93 breakable / 10 steel; HP1×37, HP2×33, HP3×23; tổng 172 hit để clear breakable). Cấu trúc ba act xác nhận bằng số: Act 1 rows 0-4 = 33 brick HP1 / 33 hit → plateau row 5 → Act 2 rows 6-12 = 52 brick / 115 hit → Act 3 rows 13-15 = 8 breakable + 10 steel / 24 hit. Mọi brick nằm trong `[0,360]×[0,640]`
- **Test:** `tests/levels.compile.test.ts` fingerprint
- **Bằng chứng:** cấu trúc ba act **VERIFIED bằng dữ liệu**. Tiêu chí "~2–3 phút" và "người chơi lần đầu muốn chơi lại" **không có bằng chứng nào** — được giao cho `08-06-PLAN.md:111`, plan chưa bao giờ chạy
- **Trạng thái:** **UNVERIFIED**
- **Vấn đề:** audit đã chạy bot headless (paddle bám ball tuyệt đối, không mất mạng) trên `stepRun` không sửa đổi: level-03 clear trong **156s (offset ±18u) đến 317s (offset 0)**. Nghĩa là một người chơi *siêu phàm* mất 2.6–5.3 phút. Kết hợp với **F-45** (không có ball speed ramp: `SERVE_SPEED=360` cố định suốt ván, `MAX_BALL_SPEED=720` không bao giờ đạt được trong lối chơi bình thường) và F-21 (serve luôn thẳng đứng), thời lượng thực của người chơi thật rất có thể **vượt 3 phút**
- **Khắc phục:** WP-6 (playtest có ghi số) + WP-3 (cân nhắc speed ramp)

---

## Run Loop

### RUN-01 — Score with combo rewards for consecutive brick hits without paddle contact
- **Implementation:** `src/core/rules/scoring.ts:36-54` (award-then-increment; `combo = 1` on `PADDLE_HIT` tại `:36-39`; skip UNBREAKABLE tại `:43-45` cả điểm cả combo)
- **Test:** `tests/rules.scoring.test.ts` (7 pass)
- **Trạng thái:** **VERIFIED**
- **Vấn đề nhỏ:** combo reset chỉ được test ở mức unit (push `PADDLE_HIT` thủ công), không có test end-to-end qua `stepRun` với một cú bật paddle thật; **F-37** `SCORE_HIT`/`SCORE_BREAK_BONUS` trong `constants.ts:73,76` **không được import** ở đâu — `scoring.ts:28-29` inline literal `10`/`50`, và không test nào so sánh literal với constant → sửa `constants.ts` không thay đổi gì và không test nào fail (D-04 "configurable core constants" **chưa đạt**)

### RUN-02 — Limited lives (default 3) with clear win and lose presentations
- **Implementation:** `src/core/rules/lives.ts:18-54` (không trừ mạng khi còn ball khác; `lives`→`DOCKED`/`LOST`), `allocate.ts:119` (3 mạng); UI `src/runtime/overlays/ResultOverlay.tsx`, `app/_components/PlayingHost.tsx:301-319`
- **Test:** `tests/rules.lives.test.ts` (6 pass), `tests/rules.win.test.ts` (4 pass)
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** logic lives/win/lose VERIFIED. Phần **"clear presentations"** bị **F-09** phá: `ResultOverlay.tsx:75` dùng `StyleSheet.absoluteFillObject` không tồn tại trong RN 0.86 → scrim mất absolute positioning, panel kết quả render thành dải trên đỉnh màn hình, không dim, không chặn touch. Thêm **F-08**: SFX `win`/`lose` có thể retrigger 1-2 lần do ring không clear ở nhánh terminal. Ledger vẫn ghi `Pending` (`REQUIREMENTS.md:30,114`)
- **Khắc phục:** WP-1

### RUN-03 — Instantly retry from lose or pause without a confirmation dialog
- **Implementation:** `app/_components/PlayingHost.tsx:391-410` (`onRetry`: clear state → `retry()` → `setActive(true)`, không dialog), `src/runtime/useGameLoop.ts:429-441`
- **Test:** không có test nào cho đường này (không có component/integration test trong repo — F-43)
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** **F-01 (Critical).** `retry()` đọc `world.value` từ RN runtime. Đã xác minh trong source: `mutables.js:146-161` → `shareableGuestUnpacker.native.js:80-82` `getSync` → `runtimes.native.js:260-265` bọc kết quả bằng `makeShareableCloneOnUIRecursive` → `Serializable.h:261-276` `SerializableArrayBuffer` **copy byte vào `std::vector<uint8_t>`**. Vậy `resetWorld`/`applyCompiledLevel`/`dockBall` trong `retry()` tác động lên bản clone, World thật trên UI runtime giữ nguyên `simPhase = LOST/WON` → frame kế tiếp `simFrozen` (`useGameLoop.ts:337-338`) không step, mirror `simPhaseOut` bắn lại reaction → result overlay hiện lại ngay. `06-VALIDATION.md:81` ghi "Instant Retry ✅ checked" từ UAT người thật, **mâu thuẫn** với phân tích code — có thể UAT chỉ thử Retry từ Pause overlay (khi `simPhase` còn `DOCKED`/`PLAYING`, triệu chứng nhẹ hơn nhiều: brick/score không reset nhưng vẫn chơi được). **Cần xác nhận 30 giây trên thiết bị:** log `world.value.tick` trước/sau hai lần retry liên tiếp
- **Khắc phục:** WP-1 (ưu tiên cao nhất)

### RUN-04 — Local high score persists across app kills (offline, no account)
- **Implementation:** `src/services/storage/asyncStorageStore.ts:74-85`, `parseBlob.ts`, `compareBest.ts`; ghi tại `PlayingHost.tsx:289-292`
- **Test:** `tests/storage.personal-best.test.ts` (7 pass) — nhưng chạy trên **memory store**, không phải AsyncStorage thật
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** **F-26** ba lỗi liên quan: (a) ghi fire-and-forget `void store.setBest(best).catch(() => {})`, không await, không flush khi background (`appStatePause.ts:17-22` chỉ pause), không xử lý Android Back (F-30) → force-quit ngay sau khi lập kỷ lục có thể mất; (b) `parseBlob.ts:4-15` trả `0` cho **mọi** blob lỗi → `previousBestRef = 0` → ván tiếp theo với điểm bất kỳ được coi là kỷ lục mới và **ghi đè** best thật: một byte lỗi là mất vĩnh viễn, không phải chỉ không đọc được; (c) hai instance store độc lập (`GameHost.tsx:30` và `PlayingHost.tsx:87`) — khi native module thiếu, fallback `createMemoryPersonalBestStore()` tạo closure mới `bestScore = 0` mỗi lần nên best không lan từ Playing sang Title. `06-VERIFICATION.md:100` đã tự thừa nhận đường soft-fail; durability chỉ có UAT assertion
- **Khắc phục:** WP-5

---

## Power-ups

### PWR-01 — Multi-ball drop; a life is lost only when the last ball leaves play
- **Implementation:** `src/core/rules/multiball.ts:24-28` (`Math.min(2, freeSlots)`, cap `MAX_BALLS=8`), `:41,68-74` (chỉ ghi vào slot `activeBallCount`); `src/core/rules/lives.ts:18-24` (early-return khi `activeBallCount > 0`); `src/core/step.ts:18-38` (`compactBallPool` giữ dense prefix)
- **Test:** `tests/rules.multiball.test.ts` (4 pass), `tests/rules.lives.test.ts` (6 pass)
- **Trạng thái:** **VERIFIED**
- **Vấn đề kèm theo:** core push `LIFE_LOST` đúng một lần; nhưng **F-08** khiến runtime *tiêu thụ lại* entry đó mỗi substep trong pha DOCKED (cosmetic, không sai state); **F-16** trail ring không migrate khi slot compaction → ball sống thừa hưởng vệt của ball chết

### PWR-02 — Paddle expand; bounce-angle mapping normalizes to current paddle width
- **Implementation:** `src/core/rules/effects.ts:16-18,30` (72 × 1.5 = 108), `:45-46` (`tick + 1200` = 10s @ 1/120), `:49-56` (re-collect refresh timer, width là **derived** nên không stack), `:32-36` (clamp `paddleX` vào `[half, 360-half]` mỗi lần derive); `src/core/step.ts:77` truyền `paddleHalfW = world.paddleW * 0.5` vào `resolvePaddleEnglish`
- **Test:** `tests/rules.effects.test.ts` (4 pass)
- **Trạng thái:** **VERIFIED**
- **Vấn đề nhỏ:** **F-49** nhánh `LOST` (`lives.ts:51-54`) không clear pickup/effect nên frame cuối của màn thua có thể hiện pickup lơ lửng + paddle rộng 108 (đã ghi nhận là IN-03, cố ý bỏ); `pickups.ts:93-97` chụp AABB paddle một lần đầu step nên pickup sau trong cùng step vẫn test với paddle hẹp cũ

### PWR-03 — Power-up drops must be caught on the paddle (no auto-collect)
- **Implementation:** `src/core/rules/pickups.ts:115-126` (AABB overlap thật, không có magnet/proximity ở bất kỳ đâu trong module), `:51-53` (chỉ drop trên `BRICK_BREAK`), `:55,60` (`nextFloat(world.rngGameplay, 0)` — deterministic), `:109-113` (deactivate khi rơi khỏi màn, slot reuse qua `findFreePickupSlot` `:22-30` — không rò rỉ)
- **Test:** `tests/rules.pickups.test.ts` (5 pass)
- **Trạng thái:** **VERIFIED**

---

## Feedback (VFX / Audio)

### FX-01 — Ball trail readable at max speed; degrades to high-contrast minimum under reduced motion, never vanishes
- **Implementation:** `src/vfx/trails.ts:8-26` (ring `TRAIL_MAX=5`), render `src/render/recordSprites.ts:305-358` (ghost alpha 0.15→0.55, ball sống vẽ **cuối** với alpha 1.0); reduced motion từ **OS** `src/runtime/useVfxIntensity.ts:20-34` (`AccessibilityInfo.isReduceMotionEnabled` + listener), sàn `src/vfx/intensity.ts:13-15` (≥2) và `resolveQualityTier.ts:18` (`low.trailMax = 2`)
- **Test:** `tests/vfx.trails.test.ts` (4 pass), `tests/vfx.intensity.test.ts` (6 pass), `tests/runtime.quality-tiers.test.ts` (7 pass)
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** sàn reduced-motion và bound history VERIFIED. Nhưng **F-16**: `trailX`/`trailY`/`trailHead` **không bao giờ được reset** — grep toàn `src/` chỉ có một chỗ ghi (`trails.ts:23-25`). Kết hợp với `compactBallPool` (slot dồn) và `useGameLoop.ts:450` (`retry` cố ý "keep Vfx pools"), trail vẽ ra một vệt circle bán kính đầy từ vị trí ball cũ tới ball sống trong ~5 frame — chính artifact mà FX-01 tồn tại để ngăn. **F-15**: ghost/ball không có anti-alias. Không có test nào cho `recordFrame`
- **Khắc phục:** WP-4

### FX-02 — Neon destruction effects use a global intensity scalar and a hard particle budget; spectacle never hides paddle/ball or breaks frame budget
- **Implementation:** glow **baked** thật (`src/render/textures/bakeGlowSprites.ts:35-63`; grep toàn `src/`: **zero** `BlurMask`/`ImageFilter`/`MaskFilter`/`setImageFilter` — hợp đồng "never live blur" thành lập); pool cố định `src/vfx/types.ts:78-101` clamp `PARTICLE_POOL_HARD_MAX=192`; intensity scalar áp cho particle (`particles.ts:51`), trail (`intensity.ts:15`), glow (`recordSprites.ts:213`), flash (`:262`), shake (`shake.ts:15`); shake chỉ trigger `BRICK_BREAK` + `LIFE_LOST` (`consumeEvents.ts:85,89-91`), cap 2.5 (`shake.ts:14`), decay ×0.85; shake **không** ảnh hưởng sim/input — offset là một `canvas.translate` duy nhất trong cặp `save()`/`restore()` (`recordSprites.ts:168,176,360`)
- **Test:** `tests/vfx.particles.test.ts` (9 pass), `tests/vfx.shake.test.ts` (5 pass), `tests/runtime.quality-tiers.test.ts` (7 pass), `tests/runtime.event-drain.test.ts` (4 pass)
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** bốn defect thị giác + một khoảng trống đo lường. **F-13** particle nổ không thừa hưởng màu brick (HP bị zero *trước* khi push event). **F-14** glow atlas bake 44×18 nhưng level mặc định dùng 32×14 → halo trùm lệch. **F-15** không anti-alias. **F-31** shake là một cú trượt một hướng cố định (`amp*0.85, amp*0.53` hardcode, không đổi dấu, không jitter) chứ không phải rung; **F-28** `punchShake` nhân `intensity` hai lần nên một cú nổ mới có thể **giảm** shake đang chạy khi reduced-motion. Phần **"never breaks frame budget" là UNPROVEN**: `phase7-vfx-measurement.md:72` = `OPEN — PENDING_DEVICE`, và **F-29** overlay đo trong app không thể bật (`PERF_OVERLAY` ở `devflags.ts:10` không có consumer nào; `drawOverlayFlag` luôn `false`)
- **Khắc phục:** WP-4, WP-6

### FX-03 — Modular audio plays frame-accurate SFX for paddle hit, brick hit/break, power-up catch, life lost, win, lose
- **Implementation:** 7/7 SFX tồn tại, có phân biệt chip vs break: `assets/sfx/{paddle_hit,brick_chip,brick_break,powerup_catch,life_lost,win,lose}.wav`; mapping `src/services/audio/mapping.ts:9-29`; decoupling đúng — sim push event ring → `appendEventsForAudio` mỗi substep (`useGameLoop.ts:352`) → **đúng 1** `scheduleOnRN`/frame (`eventBridge.ts:25`, LC-07 exception duy nhất) → `playBatch` trên JS thread. `src/core` không import audio; `useGameLoop` không import `src/services`. Preload có gate: `PlayingHost.tsx:168-197` await `audio.preload()` rồi mới `fxReady`, và `setActive(true)` phụ thuộc `fxReady` (`:254-262`). Không có call blocking nào từ audio vào physics loop
- **Test:** `tests/audio.mapping.test.ts` (6 pass), `tests/audio.release.test.ts` (4 pass), `tests/events.fx.test.ts` (4 pass)
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** **đường expo-audio thật chưa bao giờ được test** — `isExpoAudioNativeAvailable` trả `false` dưới Vitest (`expoAudioService.ts:212-214`), nên toàn bộ test chạy trên memory service. **F-33** `ensurePools()` nằm *trong* cùng khối `try` sau các `await` của `preload` (`:100-108`) → nếu `setAudioModeAsync` hoặc một `preloadSource` reject, pool không được dựng và **13 player sẽ được tạo đồng bộ ngay trong gameplay** ở lần `playBatch` đầu tiên; thêm nữa loop preload await tuần tự (`:104-106`) nên reject đầu tiên bỏ luôn các source còn lại. **F-34** không dedupe `sfxId` trùng trong một batch: 8 ball phá brick cùng step → 8 code `BRICK_BREAK` map lên 3 voice, voice 0 nhận `seekTo(0)+play()` **ba lần trong cùng một JS tick** → flam/stutter và nguy cơ clipping (3 bản sao cùng waveform ở volume 0.85). **F-35** `release()` là latch một chiều trên service `useMemo(…, [])` → nếu effect chạy lại (Fast Refresh, StrictMode, đổi dep) thì game **im lặng vĩnh viễn** mà không có lỗi. **F-08** `life_lost` (1 voice) retrigger ~120 lần/giây trong pha DOCKED sau khi mất mạng. **F-60** mọi asset là 22.05 kHz mono (Nyquist 11 kHz — mất dải cao tạo "sparkle" mà `07-UI-SPEC.md:201` yêu cầu)
- **Khắc phục:** WP-4

---

## Platform & Performance

### PLT-01 — Pause/resume; auto-pause on OS background/interruption; resume with countdown (no physics catch-up spiral)
- **Implementation:** auto-pause `src/runtime/appStatePause.ts:17-20` wired tại `useGameLoop.ts:499-511`; **không auto-resume** (`appStatePause.ts:21` cố ý rỗng); resume phải bấm control (`PauseOverlay.tsx:32-39`; gate `gestureGates.ts:13-18`, `shouldAcceptResumeTap:21-27` đòi `fromResumeControl`); countdown 3-2-1 `PlayingHost.tsx:374-389` (`setActive(true)` chỉ trong `t3` ở 3000ms); **không catch-up**: đã xác minh cơ chế thật ở `FrameCallbackRegistryUI.js:26-33,79,47` (re-activate → `timeSincePreviousFrame: null` → `useGameLoop.ts:326-329` thay bằng 16.67ms), thêm trần `MAX_FRAME_TIME=0.25` × `MAX_SUBSTEPS=5` ≈ 42ms
- **Test:** `tests/runtime.freeze.test.ts` (7 pass) — nhưng test module `freeze.ts` không dùng trong production (F-36)
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** **F-30 Android hardware Back không được xử lý ở đâu cả** — grep `BackHandler|hardwareBackPress|beforeRemove` toàn `src/` + `app/`: **zero match**. Với một route duy nhất, Back trên Android **thoát app giữa ván**, không pause, không `setActive(false)`, không flush personal best. Thêm nữa: lưới an toàn "accumulator reset" mà `useGameLoop.ts:210-220,420-423` ghi trong tài liệu **là no-op** do F-01 (không catch-up vẫn đúng, nhưng nhờ `setActive(false)` chứ không nhờ reset). Lock/unlock và cuộc gọi đến đi cùng đường AppState nhưng **chưa được kiểm chứng trên thiết bị**; không có xử lý audio interruption/session. Ledger vẫn ghi `Pending` (`REQUIREMENTS.md:48,123`)
- **Khắc phục:** WP-5, WP-6

### PLT-02 — Responsive playfield layout with safe-area handling on iOS and Android
- **Implementation:** letterbox `src/render/recordSprites.ts:165-170` (`scale = min(w/360, h/640)` + centering, bar đen `:160-162`); phía gesture khớp cùng công thức (`PlayingHost.tsx:264-277` → `paddleIntent.ts:56`); safe area `src/runtime/GameScreen.tsx:96-111` (inset cả 4 phía dưới HUD 48px), mọi overlay pad theo inset; portrait-locked (`app.json:6`, `app/_layout.tsx:13-15`)
- **Test:** không có test layout; không có screenshot đa kích thước
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** toán letterbox và safe-area đúng theo code reading, nhưng **không có bằng chứng thiết bị/simulator nào cho nhiều kích thước**. Trên tablet (iPad portrait ≈ 834×1146 → scale 1.79) playfield chỉ chiếm một phần nhỏ màn hình với bar hai bên ~94pt — đúng về mặt kỹ thuật, cần quyết định thiết kế. **F-61** `Dimensions.get('window')` ở module scope (`useGameLoop.ts:130`) seed `surfaceSize` — chụp một lần mỗi JS bundle, stale khi split-screen/fold, gây một frame scale-pop trước khi Skia `onSize` về. **F-09** phá presentation của overlay trên mọi kích thước
- **Khắc phục:** WP-1, WP-6

### PLT-03 — Stable 60 FPS measured on a named mid-range real device (incl. worst-case multi-ball + particle burst); RN perf monitor alone is not acceptance
- **Implementation:** protocol đầy đủ và đúng chuẩn (`docs/measurement-methodology.md`, `docs/phase8-certification.md:12-82`); harness `injectCertWorstCase` (`useGameLoop.ts:517-618`); metrics `src/runtime/metrics.ts:70-121` (rolling FPS = `1000/mean(interval)` — đúng phương pháp, p95/p99 alloc-free)
- **Test / đo:** **KHÔNG CÓ.** `docs/phase8-certification.md:103-108` và `:151-152`: mọi ô = `PENDING_DEVICE`. Con số duy nhất trong repo là simulator (`device-gate-results.md:52`), đã tự đánh dấu `WAIVED (interim)` và "**not** gfxinfo/Instruments — sim smoke"
- **Trạng thái:** **BLOCKED** (không có thiết bị trong môi trường audit; và ngay cả khi có, xem bên dưới)
- **Vấn đề:** ledger tick `[x]` Complete (`REQUIREMENTS.md:50,125`) — **F-04, Critical**. Bốn `08-*-SUMMARY.md` khai `requirements-completed: [PLT-03]` cho harness/protocol — **F-06**. Và nghịch lý chặn đường: **harness worst-case không thể dựng được cảnh worst-case** vì `injectCertWorstCase` mutate bản clone của World (F-01) → phải sửa F-01 trước khi đo, nếu không số liệu vô nghĩa. Ngoài ra F-10/F-17/F-29 sẽ làm sai lệch số đo (worklet re-serialize mỗi render; 452 SkColor/frame; percentile tính mỗi frame cho overlay không thể vẽ)
- **Khắc phục:** WP-1 → WP-4 → WP-6 (theo đúng thứ tự này)

### PLT-04 — Store compliance baseline prepared: public HTTPS privacy policy URL, Play Data Safety form, honest age rating, iOS privacy manifest
- **Implementation / bằng chứng:**
  - Privacy policy URL: **audit này đã fetch trực tiếp** `https://dexter292.github.io/bricks_breaker/store/privacy-policy.html` → **HTTP 200, nội dung khớp hành vi thật của app**. Đã đối chiếu `package.json:6-32`: không có dependency analytics/ads/IAP nào. **Hạng mục này THỰC SỰ ĐẠT**
  - iOS privacy manifest: `app.json:16-38` khai `NSPrivacyTracking: false`, `NSPrivacyTrackingDomains` rỗng, `NSPrivacyCollectedDataTypes` rỗng, 4 required-reason API (UserDefaults CA92.1; FileTimestamp C617.1/0A2A.1/3B52.1; DiskSpace E174.1/85F4.1; SystemBootTime 35F9.1); `scripts/assert-privacy-manifest.mjs` PASS
  - Play Data Safety: `docs/store/play-data-safety.md:9-42` đầy đủ 13 category + lập luận "local score is not collected" hợp lý
  - Age rating: `docs/store/age-rating.md:5-20` (Play Everyone / Apple 4+ / PEGI 3)
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** **F-39** file đã prebuild `ios/NeonBrickBreaker/PrivacyInfo.xcprivacy` **lệch khỏi** `app.json`: thiếu hẳn `NSPrivacyTrackingDomains`, thiếu block DiskSpace, chỉ liệt kê `C617.1` cho FileTimestamp. `ios/` bị gitignore (`.gitignore:42`) nên `app.json` là nguồn chân lý qua CNG, nhưng script assert **chỉ kiểm tra key tồn tại** (`:26-37`), không kiểm tra nội dung và không kiểm tra artifact sinh ra → không gate nào bắt được divergence trong binary thật sự ship. **F-54** app name clearance **không có bằng chứng nào** (`name-clearance.md:13-18` chỉ liệt kê các tìm kiếm *sẽ* thực hiện; `:24-26` trademark opinion "Not obtained"). **F-40** originality attestation bị chính cây file phản bác (`assets/images/` chứa `expo-logo.png` + `tabIcons/*` template Expo, không referenced ở đâu; 7 file `.wav` khai "project-authored / licensed" không nêu nguồn). **F-42** `app.json:56` vẫn load plugin `expo-dev-client` không điều kiện. **F-55** policy không có kênh liên hệ hoạt động (`:36` "repository issues **when published**"). **F-57** `HOSTING.md` tự mâu thuẫn (`:5` "no git remote" vs `:58-60` "Pages enabled"; `:62` điều kiện vs `:64-66` waiver) — chỉ là rác tài liệu vì URL đã live thật
- **Khắc phục:** WP-8

---

## Architecture (cross-cutting)

### ARCH-01 — Game logic, physics, rendering, input, UI separated; simulation suitable for UI-thread worklet path
- **Implementation:** `src/core` thuần TypeScript; enforce **hai lớp**: (a) `tests/core.purity.test.ts:22-51` grep source cấm import RN/Skia/Reanimated/Expo và cấm `Math.random`/`Date.now`; (b) ESLint `no-restricted-imports` + `eslint-plugin-boundaries` matrix (`eslint.config.js:6-20,39-50,106-143`) + `no-restricted-syntax` cho `runOnJS`/`scheduleOnRN` (`:81-90`) và `Date.now` (`:66-70`). Audit đã **probe từng rule bằng file tổng hợp qua `eslint --stdin`**: tất cả các trường hợp core→RN, core→runtime, core→services, render→runtime, app→core, runtime→services, `Date.now` trong core, `runOnJS` trong `src/runtime` đều **bắn lỗi thật**. Sim chạy hoàn toàn trên UI runtime (`useGameLoop.ts:286-413`). Không có gameplay logic trong `render/` — `recordSprites.ts` chỉ **đọc** World SoA (đã đọc hết 370 dòng, không có write nào)
- **Test:** `tests/core.purity.test.ts` (4 pass); ESLint `boundaries/*` 0 vi phạm
- **Trạng thái:** **PARTIAL**
- **Vấn đề:** chất lượng enforcement cao hơn mức trung bình rất nhiều, nhưng có **4 lỗ và 1 debt chưa trả**. **F-24**: rule LC-07 giới hạn `files: ['src/runtime/**','src/render/**']` (`eslint.config.js:81`) nên **không phủ `app/`** — và `PlayingHost.tsx:335,344,353,362` có đúng **4 `runOnJS`** từ tầng app, vô hình với rule tồn tại để kiểm soát chính việc đó (`docs/layer-contract.md:25` ghi exception duy nhất được phép là `eventBridge.ts`); selector chỉ khớp `CallExpression[callee.name=...]` nên `runOnRuntime`/`runOnUI`/dạng member-call lọt hết; LC-08 ("render không mutate world") và LC-11 ("không setState mỗi frame") **không có cơ chế enforce nào**, chỉ doc + review; `boundaries.configs.recommended` set `no-unknown-files: 0` nên `src/devflags.ts` không khớp element pattern nào và hoàn toàn không bị quản lý. **Debt:** chính `REQUIREMENTS.md:56` ghi *"Hardware 60 FPS / Android install waived for Phase 1 close (simulator interim); re-cert before MVP (D-04/D-05)"* — **waiver này chưa bao giờ được discharge** (F-20), và hai mục con (SC-2 release-build worklet mutation, iOS profiling chưa re-run sau fix HUD font) không thuộc plan nào
- **Khắc phục:** WP-6, WP-7

### ARCH-02 — Seams for future ads/IAP/accounts without implementing them; MVP fully playable offline
- **Implementation:** `src/services/platform/{noopAds,noopPurchases,noopAccounts}.ts` + `types.ts`; call site `handleRunEnded` (`06-VERIFICATION.md:30`); offline xác nhận bằng `package.json` (không có SDK network/analytics/ads/IAP nào)
- **Test:** `tests/platform.seams.test.ts` (4 pass)
- **Trạng thái:** **VERIFIED**
- **Vấn đề nhỏ:** `src/services/platform/index.ts:11-14` có 4 warning `import/first`

---

## Bảng khoảng trống test theo edge case bắt buộc

| Edge case (theo yêu cầu audit) | Coverage | Chi tiết |
|---|---|---|
| Ball va góc viên gạch | 🟡 partial | `physics.sweep.test.ts:153-176` chỉ assert **hình dạng normal** từ `sweepCircleAabb`; không có test cấp `stepWorld` (velocity sau reflect, bảo toàn tốc độ, event) |
| Ball chạm đồng thời hai viên gạch | ❌ **không có** | `step.ts:261` dùng so sánh strict `h.t < bestT` nên tie → candidate đầu tiên trong broadphase thắng, viên thứ hai không mất HP. Deterministic nhưng không được pin bởi test nào (F-41) |
| Nhiều vật thể trong cùng một step | 🟡 partial | PROP-TUNNEL có, nhưng **không có test nào assert hành vi khi `ccd >= MAX_CCD_ITERATIONS`** (F-11, F-12) |
| Ball ở 2× max designed speed | ✅ có | `physics.tunneling.prop.test.ts:171-299`, 100 case, dual oracle, lưới steel dày |
| Ball kẹt giữa unbreakable bricks | ❌ **không có** | Không test; không level nào hiện tại tạo được pocket kín (phá brick chỉ mở thêm không gian), nhưng nếu tạo được thì anti-stall **không giải thoát được** |
| Ball spawn chồng collider | ❌ **không có** | Mọi test đều phóng từ không gian trống. F-12 sống trong đúng khoảng trống này |
| Ball ra khỏi playfield cùng lúc có collision | ❌ **không có** | Hành vi thực tế đúng (`[BRICK_BREAK, BALL_OUT]`, `activeBallCount = 0`) nhưng không có test nào pin lại |
| Pause/resume giữa lúc va chạm | 🟡 partial | `runtime.accumulator-reset.test.ts` + `runtime.freeze.test.ts` chỉ test policy accumulator/freeze — **và trên module không dùng trong production** (F-36); không có test freeze giữa CCD rồi so hash |
| Broadphase brick chiếm nhiều cell | ❌ **không có** | F-47: vòng dedup `broadphase.ts:99-116` scan cả **về sau**, nên brick nằm ở ≥2 cell trong cùng window bị **bỏ hẳn** (hai occurrence triệt tiêu nhau). Hiện chưa reachable vì mọi level map 1 brick/cell |
| Event ring không clear ở nhánh DOCKED/terminal | ❌ **không có** | F-08. `runtime.event-drain.test.ts` luôn gọi `clearEvents` thủ công, che đúng bug này |
| Multiball catch cùng step ball cuối rơi | ❌ **không có** | Hành vi emergent từ thứ tự `stepRun.ts:50,55`, được mô tả là "intentional" ở `05-REVIEW.md:119` nhưng không test |
| Pickup pool cạn (16 active + drop thứ 17) | ❌ **không có** | `pickups.ts:60-64` consume roll `which` **trước** khi check slot — cần pin lại là cố ý |
| Render path (`recordFrame`, atlas key, `defaultResolveBrickRgb`) | ❌ **không có** | Grep 37 file test: **zero** match. Đây là lý do F-13/F-14/F-15/F-16 ship được |
| Đường `expo-audio` thật | ❌ **không có** | `isExpoAudioNativeAvailable` trả `false` dưới test (`expoAudioService.ts:212-214`) |
| Component / integration / thread-boundary | ❌ **không có** | `package.json:33-44` không có `@testing-library/*`, `react-test-renderer`, hay `jest-expo`. F-01/F-10/F-25 sống trong đúng khoảng trống này (F-43) |
| Parity giữa literal inline và constant | ❌ **không có** | F-37, F-63: ~16 constant được export nhưng không import; test hardcode chính literal đó |
| Solvability / thời lượng của level | ❌ **không có** | F-02, LVL-04. Audit đã tự chạy bot headless để bù (xem PHASE-REVIEW) |

Đề xuất bổ sung test cụ thể: [REMEDIATION-PLAN.md](./REMEDIATION-PLAN.md) mục "Regression tests cần bổ sung" của từng work package.
