# PHASE REVIEW — 8 phase GSD

**Ngày audit:** 2026-09-21
**Nguyên tắc:** SUMMARY.md và VERIFICATION.md **không** được dùng làm bằng chứng duy nhất. Với mỗi phase, audit phân loại *loại* bằng chứng được đưa ra: test tự động (có output thật) / manual device test (có log, UDID, artifact) / code reading / assertion không bằng chứng.

---

## 1. Bảng review từng phase

| Phase | Mục tiêu & SC | Plan cam kết | SUMMARY/VERIFICATION tuyên bố | Loại bằng chứng | Verdict audit |
|---|---|---|---|---|---|
| **1. Foundation & Thread-Boundary Spike** | `ROADMAP.md:27-34` — dev-client trên iOS thật **và** Android mid-range có tên; worklet mutation trong **dev và release**; 200–300 SkPicture sprite @60 FPS trên máy Android tham chiếu; purity của `core/` | 4 plan (`:37-40`): scaffold, core/+ESLint boundaries, worklet loop+overlay, device builds & gates | `01-VERIFICATION.md:5` `score: 5/8 must-haves verified (3 waived by owner)`; truth 1/2/3 đều `⚠ WAIVED` (`:43-45`) | Truth 4-8: **code reading + output lint/vitest thật**. Truth 1-3: **assertion của owner + smoke trên iOS Simulator** (`device-gate-results.md:52` run 1 = `iPhone 17 Simulator … overlay only … WAIVED (interim)`) | **PASS phần repo / FAIL phần hardware, có waiver chưa trả** |
| **2. Headless Core Simulation** | `:44-51` — fixed timestep + golden-replay identity; property test tunneling ở 2× max speed; paddle-relative clamps; không RNG/clock trong sim | 6 plan (`:54-59`) | `02-VERIFICATION.md:30` `4/4 truths verified` | **Mạnh nhất trong repo.** Tự động, có quote output: `:90` "8 files, 31 tests passed (~492ms)", `:91` "PROP-TUNNEL ~327ms", `:92` `eslint … exit 0` | **PASS** |
| **3. First Playable** | `:66-71` — relative drag; docked/aimed serve; ngắm được một viên gạch trong phút đầu; win/lose rõ ràng; auto-pause sau 60s background + countdown | 6 plan (`:74-79`) | `03-VERIFICATION.md:5` `5/5 must-haves verified` | Hỗn hợp: tự động (`:85` "16 files, 65/65 passed") + **assertion UAT người thật** cho cả 5 truth (`:26-30`, mỗi dòng kết thúc "UAT approved"). Không log thiết bị, không screenshot, không artifact timing cho bài test background 60s | **PASS (UAT-backed, chưa instrumented)** — và phần "aimed serve" của SC **không tồn tại trong code** (F-21) |
| **4. Level Format & Brick Types** | `:86-91` — level thứ hai khác cấu trúc; validation fail-closed; damage cue không dùng màu; unbreakable; migration có version | 5 plan (`:94-98`) | `04-VERIFICATION.md:30` `5/5` | Tự động (`:80` "79/79 pass (20 files)") + code reading + UAT (`:103`). **Tự giới hạn trung thực** tại `:111-113` (chỉ tồn tại identity migrator) | **PASS** |
| **5. Run Rules** | `:105-110` — combo; pickup phải bắt; mất mạng theo ball cuối; bounce normalize theo width; anti-stall deterministic | 7 plan (`:113-119`) | `05-VERIFICATION.md:31` `5/5` | Tự động (`:84` "6 files, 34/34 passed") + code review `05-REVIEW.md` (2 warning) → `05-REVIEW-FIX.md:41` "25 files, 112 tests passed" | **PASS** — nhưng verification chạy **trước** fix (F-57) |
| **6. UI Shell, HUD & Persistence** | `:126-131` — retry một tap; HUD qua event mirror; best sống qua force-quit; safe-area; seam monetization no-op | 6 plan (`:134-139`) | `06-VERIFICATION.md:32` `5/5` | Tự động (`:80` "2 files, 11 passed") + checkbox UAT `06-VALIDATION.md:78-81`. **Caveat trung thực** tại `06-VERIFICATION.md:100`: soft-fail sang in-memory khi thiếu native AsyncStorage → durability chỉ có UAT assertion, và unit test chạy trên memory path (`:101`) | **PASS nhưng bằng chứng durability yếu** — và `06-VALIDATION.md:81` "Instant Retry ✅" **mâu thuẫn với phân tích code** (F-01) |
| **7. Feedback — Neon VFX & Audio** | `:146-151` — SC-5: "**Every effect added is measured on the named Android reference device** and stays inside the Phase 1 frame budget" | 7 plan (`:154-160`); `07-06-PLAN` = "tài liệu đo Pixel 6a + human UAT" | `07-VERIFICATION.md:30` SC-5 = **`✓ VERIFIED (procedure + debt)`** — "Results row still OPEN — physical numbers deferred to Phase 8" | **Assertion + tài liệu procedure.** Một tiêu chí *đo lường* được đánh VERIFIED dựa trên một tài liệu *hướng dẫn cách đo*. Truth 1-4 = code reading + UAT | **SC-5 KHÔNG ĐẠT nhưng được đánh verified (F-19)** |
| **8. Showpiece + Certification + Launch Baseline** | `:167-172` — SC2 60 FPS worst-case trên hardware; SC4 soak, không leak/drift; SC5 policy HTTPS live + Data Safety + age + privacy manifest + name + originality | 7 plan; `08-06-PLAN.md` là plan **duy nhất** ghi nhận bằng chứng thiết bị | `ROADMAP.md:200` "3/7 In Progress"; `08-VALIDATION.md:2-7` `status: draft`, `nyquist_compliant: false`; `:102` "Approval: pending" | Plan 00-05: code thật + suite tự động (179/179, `08-VALIDATION.md:63` — audit này xác nhận lại bằng runner độc lập). **Plan 06 chưa bao giờ chạy.** Không `08-06-SUMMARY.md`, không `08-VERIFICATION.md` | **INCOMPLETE — SC2 & SC4 không có bằng chứng (F-05)** |

### Phase 8 — xác nhận trực tiếp danh mục file

```
08-00-PLAN.md  08-00-SUMMARY.md   08-CONTEXT.md        08-PATTERNS.md
08-01-PLAN.md  08-01-SUMMARY.md   08-DISCUSSION-LOG.md 08-PLAN-CHECK.md
08-02-PLAN.md  08-02-SUMMARY.md   08-RESEARCH.md       08-VALIDATION.md
08-03-PLAN.md  08-03-SUMMARY.md
08-04-PLAN.md  08-04-SUMMARY.md
08-05-PLAN.md  08-05-SUMMARY.md
08-06-PLAN.md  ← KHÔNG có 08-06-SUMMARY.md
               ← KHÔNG có 08-VERIFICATION.md (phase duy nhất thiếu)
```

Git log HEAD (`682056a` … `5ac45d3`) khớp: commit cuối liên quan Plan 06 là `5ac45d3 docs(08-06): scaffold PENDING_DEVICE Results + Phase 7 debt links` — chỉ dựng khung placeholder, chưa có run nào.

---

## 2. Bảng truy vết deferred items — **phần quan trọng nhất**

| # | Hạng mục deferred | Nơi deferred | Phase/plan đích | Thực tế đi đâu | Đóng? |
|---|---|---|---|---|---|
| **D1** | Android SC-1 install (Pixel 6a hoặc thay thế D-04) | `01-VERIFICATION.md:64`; `device-gate-results.md:36` `WAIVED (temporary)` | trước MVP (D-04) | `STATE.md:152`; `device-gate-results.md:87` → trỏ Phase 8 | **OPEN** |
| **D2** | SC-2 worklet mutation trên profiling/release (iOS + Android) | `01-VERIFICATION.md:65`; `device-gate-results.md:44-46` đều `WAIVED` | trước MVP (D-05) | `device-gate-results.md:46` "re-run before MVP" — **không nằm trong bảng Results của bất kỳ plan Phase 8 nào** | **OPEN và mồ côi.** Schema Results của Phase 8 (p50/p95/jank) **không có ô nào biểu diễn được** "release-build worklet mutation" |
| **D3** | SC-3 gfxinfo ~256 sprite @60 FPS trên Pixel 6a | `01-VERIFICATION.md:66`; `device-gate-results.md:53` run 2 = `TBD … OPEN (D-04)` | trước MVP | `device-gate-results.md:87` → `phase8-certification.md` | **OPEN** (`phase8-certification.md:103-108` toàn `PENDING_DEVICE`) |
| **D4** | iOS profiling SC-2 chưa re-run sau fix HUD font | `01-04-SUMMARY.md:75`; `device-gate-results.md:24` | "open follow-up" — **không owner, không phase** | **Không đi đâu cả.** Không xuất hiện trong 08-CONTEXT, plan, hay Results | **OPEN — untracked, bị bỏ rơi im lặng** |
| **D5** | Xác nhận Skia 2.12.0 trên Android vật lý | `skia-version-decision.md:23` "Android physical confirm is still outstanding for absolute completeness" | gắn với D-04 | Status vẫn được set **`Confirmed`** (`:6`), dù `:20` định nghĩa tiêu chí là "**both** platforms install and run the FPS harness on **physical devices**" và Android chỉ được xác nhận bằng **EAS build success** (`:13`) | **OPEN nhưng tài liệu ghi "Confirmed" (F-59)** |
| **D6** | Cliff-ramp sprite curve (D-07) | `device-gate-results.md:64` "not ramped; `EXPO_PUBLIC_CLIFF_RAMP` not enabled" | "research only — không block phase" | Không đi đâu; và `CLIFF_RAMP` trong `devflags.ts:11` **không có consumer nào** | **OPEN (non-blocking theo thiết kế)** |
| **D7** | Quality tiers | `08-CONTEXT.md:91` | Phase 8 | `08-02-PLAN`, `src/runtime/resolveQualityTier.ts`, `tests/runtime.quality-tiers.test.ts` (7 pass) | **✅ CLOSED** — code thật + unit test thật |
| **D8** | Pixel 6a gfxinfo VFX worst-case Results row | `07-VERIFICATION.md:8-10`; `phase7-vfx-measurement.md:72` `**OPEN** — PENDING_DEVICE` | Phase 8 (chỉ định rõ) | `phase8-certification.md:103-108` | **OPEN** |
| **D9** | Soak/leak device evidence | `08-CONTEXT.md:47-51` (D-19…D-22) | Phase 8 Plan 06 | `phase8-certification.md:151-152` | **OPEN** — mọi ô `PENDING_DEVICE`; và harness **không tự ghi số liệu** |
| **D10** | iOS Instruments performance | `08-CONTEXT.md:42` (D-16) | Phase 8 Plan 06 | `phase8-certification.md:105` | **OPEN** |
| **D11** | Live HTTPS privacy URL | `08-05-SUMMARY.md:34` "Owner waived live HTTPS publish … D-27 live-URL gate remains OPEN debt" | Plan 05/06 | `HOSTING.md:56-62` + `08-05-SUMMARY.md:40,48,59` claim `curl` → 200 | **✅ CLOSED THẬT.** Audit này đã fetch trực tiếp URL → **200, nội dung đúng**. Nhưng tài liệu vẫn chứa **hai câu loại trừ nhau** trong cùng file (F-57) |
| **D12** | Store-listing uniqueness / trademark opinion | `name-clearance.md:25-26` | pre-submit, không phase | Không đi đâu | **OPEN theo thiết kế** (nhưng F-54: **zero** bằng chứng cho cả 4 search "sẽ làm") |
| **D13** | Lỗi `tsc --noEmit` (`app/index.tsx` `styles.fill`; overlay `absoluteFillObject`) | `06-.../deferred-items.md:7`; lặp lại ở `06-01-SUMMARY.md:105`, `06-02-SUMMARY.md:102`, `06-03-SUMMARY.md:113`, `06-04-SUMMARY.md:91` | **không bao giờ được giao** | Không đi đâu. Không plan Phase 7/8 nào nhận; gate của Phase 8 (`08-06-PLAN.md:94`: `npm test` + `assert-privacy-manifest.mjs`) **không chạy `tsc`** — dù Phase 1 **đã từng** gate tsc (`01-VALIDATION.md:48`) | **OPEN — deferred 5 lần, gate bị thoái hóa.** Audit này xác nhận vẫn còn đúng 6 lỗi, **và một trong số đó là bug runtime thật** (F-09) |
| D14 | Barrel/`stepRun` wiring trong Phase 5 | `05-02-SUMMARY.md:33`, `05-03-SUMMARY.md:38` | Plan 05-04 | `05-04-SUMMARY.md:66` | **✅ CLOSED** |
| D15 | Stall wiring | `05-04-SUMMARY.md:22,66` | Plan 05-05 | `05-VERIFICATION.md:47` | **✅ CLOSED** |
| D16 | Platform-seam call sites | `06-02-SUMMARY.md:39` | Plan 06-05 | `06-VERIFICATION.md:30` (`handleRunEnded` gọi cả ba) | **✅ CLOSED** |
| D17 | Phase 5 review info items IN-01 (`hashWorld` thiếu `lives`/`simPhase`), IN-02 (thiếu PLAYING guard trong pickups), IN-03 (`LOST` không clear pickup/effect) | `05-REVIEW.md:82-109`; cố ý ngoài scope fix (`05-REVIEW-FIX.md:17`) | không | Không đi đâu | **OPEN (accepted info)** — audit xác nhận cả ba vẫn đúng: F-50, F-52, F-49 |

**Tổng kết truy vết: 7 đóng, 10 mở — và 3 trong số mở (D2, D4, D13) không có phase, plan, hay ô Results nào sở hữu.**

---

## 3. Tài liệu thiếu / tham chiếu hỏng

| # | Tham chiếu | Trạng thái |
|---|---|---|
| 1 | `08-06-PLAN.md:172` yêu cầu tạo `08-06-SUMMARY.md` | **THIẾU** — plan duy nhất trong repo không có SUMMARY |
| 2 | `08-VERIFICATION.md` | **THIẾU** — phase duy nhất không có VERIFICATION (01-07 đều có) |
| 3 | `08-REVIEW.md` / `08-REVIEW-FIX.md` | **VẮNG** dù `.planning/config.json:31` set `"code_review": true`. Chỉ phase 05 và 07 từng có review |
| 4 | `*-PLAN-CHECK.md` | Chỉ có ở phase **02 và 08**; **vắng ở 01, 03, 04, 05, 06, 07** dù `config.json:17` set `"plan_check": true` |
| 5 | `01-PATTERNS.md` | **VẮNG** dù `config.json:34` set `"pattern_mapper": true` (02-08 đều có) |
| 6 | `app/GameHost.tsx` (path trong frontmatter plan Phase 3) | Không tồn tại; ship thực tế là `app/_components/GameHost.tsx`. **Đã được disclose đúng** tại `03-VERIFICATION.md:50,107` — không phải defect |
| 7 | `src/core/levels/phase3Grid.ts` | Bị xóa có chủ đích ở Phase 4 (`04-VERIFICATION.md:50`) — tham chiếu còn lại là lịch sử |
| 8 | `docs/legacy-gestures/gesture-composition.md` (`03-RESEARCH.md:618`) | URL GitHub upstream, không phải file local — **không phải defect** |
| 9 | `phase8-certification.md:144` trích `tests/audio.release.test.ts` | **Tồn tại thật**, 4 test pass |
| 10 | `docs/index.html:5` redirect sang `store/privacy-policy.html` | Target tồn tại, **và đã live trên HTTPS** (audit đã fetch) |

Không tìm thấy tham chiếu in-repo hỏng nào khác (đã scan toàn bộ đường dẫn dạng `docs/…`, `.planning/…`, `tests|scripts|src|app|assets/…`).

---

## 4. Công việc chuyển phase nhưng vẫn chưa hoàn thành

Đây là câu trả lời trực tiếp cho yêu cầu "phát hiện những công việc được chuyển từ phase trước sang phase sau nhưng cuối cùng vẫn chưa hoàn thành":

1. **Phase 1 → MVP: cả ba waiver hardware (D1, D2, D3).** Không một cái nào được discharge. D2 thậm chí không thể biểu diễn trong schema Results của Phase 8.
2. **Phase 1 → nowhere: D4** (iOS profiling chưa re-run sau fix HUD font). Bị bỏ rơi hoàn toàn.
3. **Phase 6 → nowhere: D13** (6 lỗi `tsc`). Deferred 5 lần qua 5 SUMMARY khác nhau rồi biến mất; đồng thời `tsc` bị loại khỏi phase gate. **Một trong 6 lỗi này là bug runtime thật** (`absoluteFillObject` không tồn tại trong RN 0.86 → 4 overlay mất scrim toàn màn hình).
4. **Phase 7 → Phase 8: D8** (Pixel 6a gfxinfo cho VFX worst-case). Chuyển đúng địa chỉ, nhưng địa chỉ đó chưa bao giờ được thực thi. Đồng thời SC-5 của Phase 7 đã được đánh VERIFIED trước khi debt được trả.
5. **Phase 8 nội bộ: Plan 06 chưa chạy** → SC2 (60 FPS hardware), SC4 (soak), phần playtest của SC1 (LVL-04 ~2-3 phút + replay intent), và mitigation T-08-30 ("Confirm production build lacks Cert/Soak UI during visual QA", `08-06-PLAN.md:160`) đều chưa được thực hiện.
6. **Phase 5 → nowhere: IN-01/IN-02/IN-03.** Được ghi nhận là "accepted info", nhưng IN-01 (`hashWorld` thiếu `lives`/`simPhase`) làm giảm giá trị của chính golden-replay primitive mà Phase 2 xây.

---

## 5. Vấn đề tích hợp liên phase (không thể thấy khi review từng phase độc lập)

Đây là những defect **chỉ xuất hiện ở đường nối** giữa các phase — lý do audit không đánh giá phase một cách cô lập:

| # | Nối giữa | Vấn đề |
|---|---|---|
| I-1 | Phase 2 (core) ↔ Phase 6 (UI shell) | **F-01.** Core cung cấp `resetWorld`/`dockBall` như worklet thuần; Phase 6 gọi chúng từ RN runtime qua `world.value`. Cả hai phase đều "đúng" theo hợp đồng của mình; chỗ nối thì sai. Phase 2 verification không thể bắt (không có UI), Phase 6 verification không bắt (không có thread-boundary test) |
| I-2 | Phase 2 (event ring) ↔ Phase 7 (VFX/audio drain) | **F-08.** Phase 2 đặt chính sách "stepRun owns clear policy"; Phase 7 thêm hai consumer cố ý **không** clear ring; nhưng nhánh `DOCKED`/terminal của `stepRun` không clear. Ba quyết định đúng cục bộ tạo một bug |
| I-3 | Phase 2 (`compactBallPool`) ↔ Phase 7 (trail ring theo slot) | **F-16.** Phase 2 dồn ball về dense prefix; Phase 7 index trail theo slot. Không ai migrate trail |
| I-4 | Phase 2 (`step.ts` zero HP trước khi push event) ↔ Phase 7 (resolve màu từ HP) | **F-13.** Thứ tự trong `step.ts:357-361` khiến `consumeEvents.ts:82-84` luôn đọc HP = 0 |
| I-5 | Phase 4 (level-03 brick 32×14) ↔ Phase 7 (glow bake 44×18 của level-01) | **F-14.** Phase 7 bake theo "reference brick cell from level-01"; Phase 8 đổi level mặc định sang level-03 |
| I-6 | Phase 1 (layer contract LC-07) ↔ Phase 6 (chrome bridge đặt trong `app/`) | **F-24.** Rule LC-07 scope `src/runtime` + `src/render`; Phase 6 xây cầu UI→JS trong `app/` — đúng nơi rule không phủ |
| I-7 | Phase 7 (`rngCosmetic` được advance bởi VFX) ↔ Phase 2 (`hashWorld` mix `rngCosmetic`) | **F-32.** Replay hash phụ thuộc vào setting reduce-motion của người chơi. Golden-replay suite không gọi `consumeEventsForVfx` nên CI không thấy |
| I-8 | Phase 8 (cert harness) ↔ Phase 6 (retry/world wiring) | **F-01 lần hai.** `injectCertWorstCase` chưa bao giờ inject được gì → cảnh "worst case" của certification chưa từng tồn tại. Nếu đo ngay bây giờ, số liệu sẽ là của cảnh thường |

---

## 6. Bằng chứng bổ sung do audit tự tạo (headless, không sửa repo)

Vì `08-06-PLAN.md` chưa chạy và không có dữ liệu playtest nào, audit đã chạy `stepRun` **không sửa đổi** trong một harness headless (copy `src/core` ra thư mục scratch ngoài repo) với bot paddle bám ball tuyệt đối, không bao giờ mất mạng:

| Level | Bot offset 0 | Bot offset ±18u luân phiên |
|---|---|---|
| level-01 | WON 11.573 tick = **96 s** (score 4.080) | WON 13.962 tick = **116 s** |
| level-02 | **TIMEOUT 600 s**, còn 12/16 breakable | **TIMEOUT 600 s**, còn 8/16 |
| level-03 | WON 37.976 tick = **317 s** (score 12.880) | WON 18.658 tick = **156 s** (score 21.980) |

**Ý nghĩa:**
- **LVL-04:** một paddle *siêu phàm* cần **2,6–5,3 phút** cho level-03. Người chơi thật (3 mạng, mất nhịp mỗi lần miss, serve luôn thẳng đứng theo F-21, không có speed ramp theo F-45) rất có thể **vượt 3 phút**. Mục tiêu "~2-3 phút" nên được coi là **chưa kiểm chứng và lạc quan** cho tới khi có UAT thật.
- **level-02 (F-02):** 10/12 seed dừng đúng ở 8 brick bị chặn sau hàng steel full-width trong suốt 5 phút. Hàng `"XXXXXXX"` (`assets/levels/level-02.json`, row 2, y 100-118) chỉ để lại kênh sát tường `x ∈ [0,14]`; với `BALL_RADIUS = 6` tâm ball phải đi trong `x ∈ [6,8]` — **2 đơn vị dung sai**. Khe giữa các brick là 4 đơn vị, không thể lọt ball đường kính 12. Level vẫn thắng được nhưng 50% nội dung bị gate sau một cú bắn gần như không thể, và F-21 khiến không có cách ngắm vào kênh đó. Production chỉ boot level-03 (`src/runtime/loadLevel.ts:30`) và switch là `__DEV__`-gated nên player exposure hiện tại = 0. Nếu level-02 chỉ là fixture compile/regression thì nên ghi rõ trong `name`; nếu là level chơi được thì phải mở hàng steel.

Đồng thời audit xác nhận bằng harness (unmodified core):
- **Bảo toàn tốc độ:** `speed0=719.6034 min=719.6033 max=719.6034 maxDev=3.7e-5` sau 20.000 step với reflection xếp lớp → chỉ là lượng tử hóa Float32. Tốt.
- **Tunneling trên geometry level-03 ở 2× max speed:** 33.933 step, **0** vi phạm "tâm ball nằm trong brick solid".
- **F-12 tái hiện được:** đặt tâm ball ở `y=629` (dưới paddle `y=616..628`) với `vy=+360` → 5 `PADDLE_HIT` mỗi step và ball bị kéo **xuyên lên qua thân paddle** tới `y=616.99` sau 4 step.
- **F-08 tái hiện được:** sau khi mất mạng, `evCount` giữ `[BALL_OUT, LIFE_LOST]` ở mọi step DOCKED tiếp theo, và cả step launch, chỉ clear ở step PLAYING đầu tiên.
- **F-22 tái hiện được:** `v=(720, 0.5)` → tick 960 tier 1 không làm gì, tick 1200 tier 2 không đổi gì (đã ở max speed), chỉ tick **1440 (12 giây)** tier 3 mới phục hồi chuyển động dọc.
- **F-47 tái hiện được:** `gridCols=4, gridRows=4`, một brick map vào `(r0,c1)` và `(r1,c1)` → `forEachBrickCandidate` trả về `[]` thay vì `[0]`.
- **F-21 tái hiện được:** mọi pre-offset của `ballX` đều cho `vx=0, vy=-360` sau launch.

---

## 7. Chất lượng quy trình GSD

| Gate cấu hình | Bật trong `config.json`? | Thực tế |
|---|---|---|
| `plan_check` (`:17`) | true | **2/8 phase** có PLAN-CHECK |
| `code_review` (`:31`) | true | **2/8 phase** có REVIEW |
| `pattern_mapper` (`:34`) | true | **7/8** (thiếu `01-PATTERNS.md`) |
| VERIFICATION | — | **7/8** (thiếu Phase 8) |
| `nyquist_compliant` trong VALIDATION | — | **`false`** ở `03`(:5), `04`(:5), `06`(:5), `08`(:6) |
| Sign-off / Approval | — | `03-VALIDATION.md:82-90` và `04-VALIDATION.md:83-90`: **mọi checkbox trống**, "Approval: pending" — nhưng cả hai phase đều `Complete` trong `ROADMAP.md:195-196` |

Các gate quy trình đã được cấu hình bị **bỏ qua mà không có waiver được ghi nhận** (F-03).

## 8. Số học roll-up không khớp (F-57)

| Nguồn | Con số |
|---|---|
| `ROADMAP.md:173` | "3/7 plans executed" |
| `ROADMAP.md:175-180` | hiển thị **sáu** `[x]` cho plan Phase 8 |
| `ROADMAP.md:200` | "3/7 In Progress" |
| `STATE.md:13-14` | `total_plans: 48, completed_plans: 47` |
| `STATE.md:29` | "Plan: 6 of 7" |
| `STATE.md:39` | "Total plans completed: 41" |
| `STATE.md:9-12` | `completed_phases: 7 … percent: 98` |
| `STATE.md:33` | "88% phases" |
| `PROJECT.md:20` | "110 green as of Phase 5" (thực tế `05-REVIEW-FIX.md:41` = 112; hiện tại 179) |

Bốn giá trị khác nhau cho cùng một câu hỏi "bao nhiêu plan đã xong". Không phải defect kỹ thuật, nhưng đủ để không dùng bất kỳ file roll-up nào làm nguồn trạng thái.
