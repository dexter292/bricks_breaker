# RE-AUDIT #05 — sau đợt remediation thứ tư

**Ngày:** 2026-09-22
**Chuỗi:** [#01](./CODE-REVIEW.md) (63 F) → [#02](./RE-AUDIT-02.md) (+18 NF) → [#03](./RE-AUDIT-03.md) (+17 NG) → [#04](./RE-AUDIT-04.md) (+7 NH) → tài liệu này (+5 NJ)
**Đối tượng:** HEAD **`06864eb`** — 3 commit mới, **working tree sạch**
**Tính chất:** read-only, **với một ngoại lệ được công bố** ở §2.1 (một thử nghiệm có kiểm soát, đã hoàn nguyên; `git status` xác nhận repo sạch sau đó).

---

## 0. Hai đính chính cho chính báo cáo này

Trong lần chạy gate đầu phiên, tôi đã báo hai điều **sai**:

1. **"Guard worklet-closure tồn tại và PASS"** — guard tồn tại nhưng **không thể fail**. Tôi đã nhận `exit 0` và báo là đạt, thay vì kiểm tra xem nó có phát hiện được gì không. Xem **NJ-1**.
2. **"assert-privacy-manifest còn 1 WARN"** — thực tế vẫn là **2 WARN** (`NSPrivacyTrackingDomains` *và* `NSPrivacyAccessedAPICategoryDiskSpace`). Tôi dùng `tail -2` nên cắt mất một dòng.

Bài học lặp lại lần thứ hai trong chuỗi audit này: **exit code 0 không phải bằng chứng; phải kiểm tra rằng công cụ có khả năng báo đỏ.**

---

## 1. Gate tự động

| | #04 | **#05** |
|---|---|---|
| `git` | HEAD `215873e`, **79 uncommitted** | **`06864eb`, 0 uncommitted** ✅ |
| `tsc --noEmit` | 0 lỗi | **0 lỗi** ✅ |
| Test suite | 250 / 0 | **255 pass / 0 fail** (54 file) ✅ |
| `eslint .` | 0 error / 6 warn | **0 error / 6 warn** ✅ |
| `assert-skia` | PASS | PASS |
| `assert-privacy-manifest` | PASS + 2 WARN | PASS + **2 WARN** (không đổi) |
| `assert-worklet-closures` | *chưa tồn tại* | tồn tại, exit 0 — **nhưng vacuous (NJ-1)** |
| CI | *không có* | **vẫn không có** (`.github/` không tồn tại) |

---

## 2. Đợt này đóng được nhiều nhất trong năm vòng

**NF-3 — đã commit.** Đây là mục bị nêu năm vòng liền và nay đã xong: 3 commit (`76387e0`, `053dc20`, `06864eb`), working tree sạch, `app.config.js` **đã vào git**, `app.json` đã xóa khỏi git. Một checkout sạch nay build được. `origin/main == HEAD` nên các commit đã được push — và bản privacy policy live đã cập nhật (xác minh ở §4).

### Verdict 7 finding NH của vòng #04

| ID | Verdict | Bằng chứng |
|---|---|---|
| **NH-1** một cú chạm góc = 2 HP | **FIXED** | Tôi tự đo lại bằng đúng repro của vòng #04: `hp2 → 1 HIT (còn 1)`, `hp3 → 1 HIT (còn 2)`, `hp9 → 1 HIT (còn 8)`. **Đúng 1 damage mỗi cú chạm.** |
| **NH-2** level-02 không thể thắng mà vẫn bundle | **FIXED** | `src/runtime/loadLevel.ts:18` `LevelId = 'level-01' \| 'level-03'`; level-02 bị bỏ khỏi `LEVEL_MODULES` và được ghi rõ ở `:5-6` là compile fixture. Đúng một trong hai phương án đã đề xuất. |
| **NH-3** scan O(brickCount) bị di chuyển chứ không xóa | **FIXED** | `src/core/step.ts:877-879` — escape hatch nay gate theo `brickTouchedThisStep`. Đo trên level-03 4000 frame: **18 lời gọi** (trước: 287.033), 0 hit. |
| **NH-4** cleanup **hủy** lệnh dispose đang chờ → rò rỉ atlas | **PARTIALLY FIXED** | `PlayingHost.tsx:306`, `:335`, `:338-340` — cleanup nay gọi `flushPendingDispose()` (clear timer **và** dispose). Rò rỉ đã đóng. Nhưng thứ tự vẫn **dựa trên thời gian**: `setTimeout` 32ms ở `:310-316` vẫn là rào duy nhất giữa `glowAtlasSv.value = null` (`:308`) và `dispose()`. |
| **NH-5** `setFxReady(false)` hoãn vào macrotask | **FIXED** | `PlayingHost.tsx:159-162`, `:356-358` — `fxReady` nay **dẫn xuất** (`bakedKey === loadKey`), đúng tại thời điểm render; đổi level flip `loadKey` trong cùng render và gate effect gọi `setActive(false)` đồng bộ. |
| **NH-6** docstring lệch + PROP-CLAMP thiếu biên dưới | **FIXED** | `resolve.ts:159` nay ghi `sign(t)*(8° + \|t\|*54°)` khớp thân hàm `:208`; `tests/physics.tunneling.prop.test.ts:389-391` assert biên dưới `MIN_HORIZONTAL_RATIO`; `tests/physics.paddle.test.ts:11,69-70` dùng hằng đã import. |
| **NH-7** hợp đồng F-23 bị xóa không ghi nhận | **PARTIALLY FIXED** | Tính chất vẫn đúng về cấu trúc (horizontal-sau-vertical chỉ có thể nâng `\|vy\|/speed` lên cos8°=0,990 ≥ cos62°=0,469) và test thay thế assert cả hai sàn. Nhưng F-23 vẫn **chưa được ghi nhận là đã bị thay thế** ở bất cứ đâu. |

### Các mục còn mở từ vòng #02/#03 — nay đóng

| ID | Bằng chứng |
|---|---|
| **NG-4** cluster-eject bỏ qua hai sàn | `step.ts:360-365` — nay áp cả `enforceMinVerticalRatioInto` rồi `enforceMinHorizontalRatioInto` |
| **NG-15 / NF-8** chrome pack cấp object mỗi frame | `useGameLoop.ts:443-472`, `PlayingHost.tsx:430-444` — mutate in-place + cờ `dirty`; `chromeOut.value=` / `chromeSeq++` **chỉ khi có thay đổi**; reaction prepare trả về scalar nên nó **ngủ** khi không đổi. Đúng pattern đã đề xuất |
| **NG-17** nhân bản DTO ChromeMirror | `src/input/usePaddleGesture.ts:28` — `import type { ChromeMirror }` |
| **NG-19** spec trái code về audio dedupe | `07-UI-SPEC.md:205`, `07-VERIFICATION.md:29` — spec đã được hòa giải theo hành vi dedupe-with-gain, và truth 4 được viết lại trung thực |
| **NG-21** seed trail không ràng buộc cơ học | `trails.ts:32-37,51-57`, `worldRequests.ts:45` — tham số seed nay **bắt buộc**, TypeScript enforce |
| **F-26** hai instance store | `asyncStorageStore.ts:43-59` — singleton theo process; cả hai host lấy cùng instance |
| **F-27** escalation sau tier 3 | `stall.ts:196-203`, `:96-101` — re-fire mỗi 240 tick idle, nudge tăng 8°/16°/24° cap 30°, đổi dấu; có test hành vi |
| **F-49** `LOST` để pickup/expand sống | `lives.ts:51-68` — nay clear pickup, expire effect, re-derive paddle width; test thật ở `rules.lives.test.ts:125-146` |
| **F-52** pickups thiếu guard PLAYING | `pickups.ts:38-40`, `:84-86` — cả hai entry point đã guard; test thật ở `rules.pickups.test.ts:123-140` |
| **F-55** policy thiếu kênh liên hệ | **Tôi tự fetch bản live với cache-buster**: `## Contact` nay ghi "open an issue at `https://github.com/dexter292/bricks_breaker/issues`". Đã deploy — nhưng xem **NJ-3** |
| **NF-12** parity test sai tập hằng | `constants.parity.test.ts:58-66` — `MIN_HORIZONTAL_RATIO` và `STALL_TIER3_REPEAT_TICKS` nay được cover và **ghép với literal trong worklet** qua grep `stall.ts`/`resolve.ts`. Còn 2 tautology ở `:55`, `:65` |

**Tổng: 19 finding đóng hẳn trong đợt này** (NF-3, NH-1, NH-2, NH-3, NH-5, NH-6, NG-4, NG-15, NG-17, NG-19, NG-21, F-26, F-27, F-49, F-52, F-55, NF-12 + 2 phần) — nhiều nhất trong năm vòng, và phần lớn có test hành vi thật đứng sau.

---

## 3. Finding mới — 5 mục (NJ-1 … NJ-5)

### NJ-1 — **CRITICAL** — `assert-worklet-closures.mjs` **không thể fail**; kiểm soát cơ học cho NF-1 thực chất không tồn tại

**File:** `scripts/assert-worklet-closures.mjs:84-91`, wired vào `package.json:51` (`"test": "vitest run && node scripts/assert-worklet-closures.mjs"`)

```js
function fnIsWorklet(node) {
  const first = node.body?.body?.[0];          // ← Babel KHÔNG đặt directive ở đây
  return (first?.type === 'ExpressionStatement' && … === 'worklet');
}
```
`@babel/parser` đặt directive mở đầu thân hàm vào **`body.directives`**, không phải `body.body[0]`. Tôi đo trực tiếp trên `src/core/step.ts`:
```
tổng hàm = 5
có 'worklet' trong body.directives  = 5   ← nơi Babel thực sự đặt
có 'worklet' trong body.body[0]     = 0   ← nơi guard đang tìm
```
Vì `fnIsWorklet` **không bao giờ** true, `path.traverse({CallExpression})` ở `:115-129` không bao giờ chạy, và kết cục duy nhất script có thể đạt là `console.log('Worklet closure guard OK')`.

**Kiểm chứng end-to-end (đây là ngoại lệ read-only đã công bố ở §2.1):** tôi xóa directive `'worklet'` khỏi `src/runtime/substepCap.ts` — **tái lập chính xác lỗi NF-1 Critical** — rồi chạy guard:
```
-> đã BỎ 'worklet' khỏi substepCap.ts
Worklet closure guard OK (88 files)
GUARD EXIT=0
```
Sau đó tôi phục hồi file ngay; `git status src/runtime/substepCap.ts` trả về rỗng.

Ngay cả khi sửa lỗi directive, còn một tầng bất định thứ hai: `exportIsWorklet:37-40` tìm `exports.<name>=` rồi tìm `_init_data` trong 600 ký tự — marker đó khớp với **preamble hoisting `exports.a=exports.b=…=void 0;` ở đầu file**, không phải export thật. Kết quả phụ thuộc vào *module export bao nhiêu symbol*, và sai theo **cả hai hướng** (false positive trên `src/vfx/types.ts:66` `allocateVfx` — vốn *là* worklet; false negative trên module trộn worklet/non-worklet). Cộng thêm các lỗ: bỏ qua `ImportDefaultSpecifier`/`ImportNamespaceSpecifier` (`:105`), bỏ qua **member-call** (`:118`), `resolveExport` chỉ tìm `export function` nên `export const f = () => …` và `export default` trả `null` → `:122` **im lặng cho qua**, và **helper cùng file không bao giờ được kiểm tra**.

**Impact:** đây là một đèn xanh được nối vào `npm test` và không thể chuyển đỏ. Lớp lỗi ball-freeze (hàm non-worklet bị gọi từ worklet) có thể tái xuất mà không có tín hiệu nào — và cả tôi lẫn developer đều đã trích "Worklet closure guard OK (88 files)" như bằng chứng đạt. **Tệ hơn là không có guard**, vì nó tạo ra niềm tin sai.

**Fix:** (a) đọc `node.body.directives`; (b) thay `exportIsWorklet` bằng kiểm tra thật — parse **source** của module đích và test directive trên chính hàm đó, truy hồi qua re-export; (c) xử lý default/namespace import, member-call, `export const f = () => …`, `export default`, và **helper cùng file**; (d) **fail closed** — callee không resolve được bên trong worklet phải là lỗi, không phải im lặng cho qua; (e) thêm **cặp fixture tự kiểm** (một known-good, một known-bad) để chính guard được assert là còn sống.

### NJ-2 — **HIGH** — Broadphase đã được nối vào nhưng bị bỏ qua ở 98,7% lượt CCD
**File:** `src/core/step.ts:655` (`if (useLattice && candCount > 0)`) vs `:688` (`else { for (brickIndex = 0; … < nBricks) }`)

NF-10 ("broadphase là dead code") đã đóng: `collectBrickCandidatesInto` được gọi thật ở `:645`. Nhưng điều kiện `candCount > 0` khiến **mọi lượt mà lattice trả lời đúng "không có brick nào gần"** — trường hợp phổ biến nhất và chính là nơi tiết kiệm nằm ở đó — rơi vào nhánh `else` quét **toàn bộ** brick.

Đo trên level-03 thật, 4000 frame: `ccd = 4027`, `latticeBranch = 50`, **`flatDespiteLattice = 3977`**, `flatTests = 409.631` so với `latticeTests = 53`. Level-01: `flatDespiteLattice = 3983`, `flatTests = 139.405`.

Lattice thì **đúng**: 300.000 truy vấn swept-circle ngẫu nhiên trên level-03 với 237.807 hit ground-truth → **0 miss**, 0 candidate trùng, trung bình 1,34 candidate (max 14) so với 103 brick. Nên nhánh fallback **không bảo vệ gì** mà tốn ~99,99% lợi ích.

Và `tests/physics.broadphase.test.ts:99-106` chỉ assert rằng `step.ts` **chứa chuỗi** `collectBrickCandidatesInto` — nên nó xanh trong khi defect đang sống. Đây là minh hoạ rõ nhất cho tác hại của test grep-source: nó biến một defect hiệu năng đang hoạt động thành một dấu tích xanh.
**Fix:** gate theo `useLattice` một mình, bỏ `candCount > 0`. Để giữ phần an toàn mà fallback định mang lại, chuyển nó về **load time**: cho `assignSpatialBrickCells` trả `false` khi *bất kỳ* brick sống không map được (`spatial.ts:45-47` hiện `continue` im lặng) hoặc khi hai brick trùng một cell (`:48` ghi đè im lặng), để một level xấu fallback toàn cục thay vì âm thầm mất collider. Cả ba level hiện map đủ (35/35, 31/31, 103/103) nên đây là latent, không phải live.

### NJ-3 — **MEDIUM (chặn submit)** — Kênh liên hệ duy nhất của privacy policy có thể đang bị đóng
**File:** `docs/store/privacy-policy.html:78-84` và bản live

Policy nay trỏ tới `https://github.com/dexter292/bricks_breaker/issues` (F-55 đã đóng — tôi xác minh bản live bằng nội dung). Agent báo rằng truy cập ẩn danh vào repo đó trả về *"Issue creation is restricted in this repository"*. **Tôi không xác minh được điều này một cách độc lập** — `GET /issues/new` trả về rỗng từ môi trường audit (GitHub cần JS/auth cho trang đó). Nếu đúng, thì fix F-55 đã thay một kênh mơ hồ bằng một kênh **đã chết**, và đó là điều reviewer App Store / Play sẽ gặp.
**Cần làm:** mở trang `issues` trong một cửa sổ ẩn danh và thử tạo issue. Nếu bị chặn: bật public issue creation, hoặc đặt một địa chỉ email thật vào policy.
**Kèm theo:** `docs/store/HOSTING.md` quy định verify bằng `curl … | grep -F '…/issues'` — công thức này **không đáng tin** vì GitHub Pages edge có thể trả bản cũ (lần fetch đầu của tôi trong phiên trước nhận đúng bản cũ). Cần thêm cache-buster hoặc `Cache-Control: no-cache`.

### NJ-4 — **MEDIUM** — `npm test` phụ thuộc 4 package không được khai báo
**File:** `scripts/assert-worklet-closures.mjs:9-12` (import `glob`, `@babel/core`, `@babel/parser`, `@babel/traverse`) vs `package.json:6-44`

Không package nào trong bốn cái đó có trong `dependencies`/`devDependencies`. Chúng resolve được hôm nay **chỉ nhờ npm hoist** chúng như transitive dep của `@expo/cli`/`@expo/config`/`@react-native/babel-preset` (đã kiểm tra: `glob@13.0.6`, `@babel/core@7.29.7`, `@babel/traverse@7.29.8` nằm ở top level `node_modules/` không có parent khai báo).
**Impact:** `npm test` và `npm run assert:worklets` sẽ vỡ khi hoisting đổi, khi bump Expo, hoặc với bất kỳ installer không phải npm (pnpm / yarn-berry) — và failure mode là một exception, không phải một kết quả gate nhìn thấy được.
**Fix:** thêm cả bốn vào `devDependencies` với range pin.

### NJ-5 — **MEDIUM** — Hợp đồng "allocation-free resolve" (F-56) bị đánh đổi trong im lặng, và đường được test không còn là đường hot
**File:** `src/core/step.ts:410-413` vs `src/core/physics/resolve.ts:9-10`, `:216-257`

`step.ts:410-413` cấp `sweepOut` và `velOut` **mỗi lời gọi `stepWorld`**, kèm comment biện minh ("Reanimated worklets can clone/share module objects incorrectly across UI frames") nhưng **không dẫn một repro nào**. Trong khi đó `resolve.ts:9-10` vẫn khai `_velScratch` là "Module-level scratch for **allocation-free** collision resolve (F-56)", và `:216-257` vẫn giữ các wrapper trả-scratch (`reflectVelocity`, `enforceMinVerticalRatio`, `enforceMinHorizontalRatio`, `resolvePaddleEnglish`) — nay **chỉ còn test dùng**.

**Impact:** (a) ~4 allocation UI-runtime/frame ở 60fps (2 substep × 2 object), tới 10 khi drop frame, ngược với một hợp đồng F-56 vẫn đang được ghi là còn hiệu lực; (b) **property test và unit test chạy trên wrapper dùng scratch chia sẻ, còn CCD trên thiết bị dùng stack local** — hai đường có thể phân kỳ mà suite không thấy; (c) `escapeOverlappingBricks` thêm 5 allocation mỗi cú chạm brick (`:258-271`, `:361`).
**Fix:** hoặc đưa scratch về field preallocate trên `World` (cấp một lần trong `allocate.ts` — vừa tránh lo ngại module-sharing vừa hết allocation), hoặc cập nhật văn bản hợp đồng F-56 và **xóa** các wrapper chỉ-test để test gọi đúng code thiết bị chạy.

---

## 4. Còn mở

| ID | Verdict | Ghi chú |
|---|---|---|
| **NG-16** test ghim defect | **NOT FIXED** | `tests/runtime.chrome-reaction.test.ts:16-33` được **viết lại để khớp source text mới**, không thay bằng test hành vi. Vẫn 100% `readFileSync` + `toContain`. **Nó vẫn sẽ pass nếu `chromeOut.value = {…}` mỗi frame được đưa trở lại** — tức không guard được chính invariant nó tồn tại để guard |
| **NF-11** test grep source | **NOT FIXED** | `tests/render.path-contracts.test.ts:27` vẫn `expect(src).toMatch(/F-14/)` — assert một comment. Được viết **mới trong đợt này**, sau ba vòng bị nêu |
| **NF-15** override eslint diện rộng | **NOT FIXED** | `eslint.config.js:119-125` vẫn tắt cả rule cho `PlayingHost.tsx` |
| **NF-16** element `devflags` inert | **NOT FIXED** | `eslint.config.js:138`; plugin vẫn in cảnh báo mỗi lần chạy |
| **NF-17** D2/D4 trỏ vào Results row không tồn tại | **NOT FIXED** | `DEFERRED-ITEMS.md:9-10` vs `phase8-certification.md:101-106`. File được sửa (+27 dòng) mà không thêm row |
| **NF-18** 6 mục tài liệu | **NOT FIXED — 0/6** | `07-VERIFICATION.md:127` vẫn "FX-01…**FX-04**" *và dòng đó vừa được viết lại trong đợt này*; `08-VALIDATION.md:72` vẫn "null→**Low**" (code là `?? 'mid'`); `07-VERIFICATION.md:27,75` vẫn "soft/**strong** pads"; `PROJECT.md:30-34` vẫn `[ ]`; `applyFreeze` (`useGameLoop.ts:218`) vẫn 0 caller; `useFonts` vẫn trùng ở hai host |
| **NG-18** | **PARTIAL** | Comment nay chính xác, nhưng `hits` thành binding không dùng → warning lint thường trực (`expoAudioService.ts:205`) |
| **NG-20** | **PARTIAL** | Tầng app đã single-source và được pin. Nhưng 360/640 vẫn inline tay ở `stepRun.ts:20`, `step.ts:402-403`, `reset.ts:17-18`, `allocate.ts:18-19`, `pickups.ts:95`, `effects.ts:18`, `broadphase.ts:53-54`, `input/constants.ts:8` — chỉ `step.ts` được parity test cover |
| **F-39** xcprivacy drift | **NOT FIXED (nặng hơn báo cáo trước)** | **2** key thiếu + reason `FileTimestamp` khác nhau (`['C617.1']` vs `['C617.1','0A2A.1','3B52.1']`). Gate exit **0** nên không bao giờ chặn được release |
| **F-43** component/integration test | **NOT FIXED** | `package.json:33-44` vẫn không có `@testing-library/*`, `react-test-renderer`, `jest-expo`. **Không file nào trong `tests/` gọi `render(`/`renderHook`** |
| **F-03** gate quy trình | **PARTIAL** | VERIFICATION nay 8/8 (`08-VERIFICATION.md` là stub `not_verified` trung thực). Còn: PLAN-CHECK 2/8, REVIEW 3/8, thiếu `01-PATTERNS.md`, `nyquist_compliant: false` ở 03/04/05/06/08, sign-off trống ở `03`/`04-VALIDATION.md`. **Và không có `.github/` nào** nên `test`/`lint`/`typecheck`/`assert:*` không được enforce cơ học |
| F-21, F-29, F-45, F-59 | **NOT FIXED** | serve thẳng đứng (đã ghi nhận là hoãn có chủ ý), `CLIFF_RAMP` 0 consumer, không speed ramp, `skia-version-decision.md:6` vẫn "Confirmed" trái tiêu chí `:20`/`:24` |
| F-40, F-54 | **PARTIAL (trung thực)** | Attestation và name-clearance nay trung thực về những gì còn thiếu; nội dung thực chất (provenance SFX, trademark, store-console check) vẫn chưa làm |

---

## 5. Chất lượng test

**Tiến bộ thật.** Đợt này thêm 8 file test và sửa 9. Các file hành vi đều tốt và tôi đã chạy lại: `physics.level03-serve.test.ts` (level thật qua toàn bộ pipeline `stepRun`), `physics.ball-freeze.test.ts` (321 dòng), `physics.near-vertical.test.ts`, `physics.tiebreak.test.ts`, `events.overflow.test.ts`, `audio.batch-dedupe.test.ts`, và các case mới ở `rules.lives.test.ts:125-146` / `rules.pickups.test.ts:123-140`. `rules.stall.test.ts` thay một assertion gần-tautology bằng hai test escalation thật.

**Vấn đề, và nó là cùng một vấn đề với NJ-1/NJ-2.** Ba artefact được dựng để **chứng minh** tính đúng đắn lại chính là ba cái hỏng:

| Artefact | Mục đích | Thực tế |
|---|---|---|
| `scripts/assert-worklet-closures.mjs` | chặn lớp lỗi NF-1 | **không thể fail** (NJ-1) |
| `tests/physics.broadphase.test.ts:99-106` | chứng minh broadphase được dùng | assert `step.ts` **chứa chuỗi** tên hàm — xanh trong khi broadphase bị bỏ qua 98,7% (NJ-2) |
| `tests/runtime.chrome-reaction.test.ts` | chặn tái phát NG-15 | 100% grep source; **sẽ pass nếu defect quay lại** (NG-16) |

Thêm nữa: nhánh lattice **không có coverage phân biệt** — `loadTestGrid` đặt `latticePitchX = 0` (`reset.ts:54,123`) và `loadDenseUnbreakableGrid` (`physics.tunneling.prop.test.ts:53-79`) đặt `gridCols/gridRows` nhưng **không** đặt `latticePitch*`, nên gần như toàn bộ physics suite chạy nhánh flat-scan. Vì fallback làm hai nhánh cho kết quả **giống hệt**, **không test nào phân biệt được "có dùng broadphase" với "bỏ qua broadphase"**.

Và một khuôn mẫu cần để ý: `runtime.quality-tiers.test.ts` đổi `null → 'low'` thành `null → 'mid'`, `mid.trailMax 5 → 4` — **test đi theo code**, trong khi `08-VALIDATION.md:72` vẫn ghi hợp đồng cũ. Không ai hỏi "unknown device nhận Mid glow" có phải default bảo toàn đúng hay không.

**F-43 vẫn là kiểm soát cơ học cuối cùng chưa tồn tại.** Toàn bộ `app/_components/` — pause FSM, countdown timer, dẫn xuất `fxReady`, thứ tự cleanup glow atlas, chrome bridge — chỉ được kiểm chứng bằng đọc source. Hai fix rủi ro nhất của đợt này (**NH-4** dispose flush và **NH-5** `fxReady` dẫn xuất) đều nằm trong `PlayingHost.tsx` và đều **không được kiểm chứng cơ học**. Cộng với NJ-1 và việc không có CI, dự án hiện có **zero** bảo vệ tự động trên biên UI-runtime.

---

## 6. Hiệu năng

`src/render/recordSprites.ts` chỉ đổi một dòng comment trong đợt này nên đường vẽ không thay đổi về bản chất. Ghi chú phương pháp: con số 611/539/340 của vòng #04 đếm theo một mô hình khác với lần đếm này (vòng #05 đếm ở trạng thái idle: high **353**, mid **352**, low **247**; worst-case cert: high **559**, mid **492**, low **303**). Vì code không đổi, chênh lệch là **phương pháp, không phải regression** — nhưng nó nhắc rằng số draw-call trong chuỗi báo cáo này nên được coi là chỉ dấu tương đối, không phải phép đo.

Một điểm đáng chú ý: **`high` và `mid` nay chỉ khác nhau đúng 1 draw call** ở idle (`trailMax` 5 vs 4), làm tier "high" gần như vô nghĩa.

Allocation UI-runtime: NG-15 đã loại chrome object (thắng thật so với 5 SV write + 4 reaction của baseline). Nhưng **NJ-5 thêm ~4/frame** từ `sweepOut`/`velOut`. Ròng lại vẫn tốt hơn baseline nhưng **không phải 0** như hợp đồng F-56 đang ghi.

**Certification vẫn UNPROVEN** — mọi ô `phase8-certification.md:101-106` là `PENDING_DEVICE`. Hai điều nên sửa trước khi đo: **NJ-2** (hot path đang chạy O(brickCount) khi không cần) và **NJ-5** (allocation/frame).

---

## 7. Sáu việc ưu tiên

1. **NJ-1 — sửa hoặc xóa `assert-worklet-closures.mjs`.** Hiện nó là đèn xanh không thể đỏ, đã được trích làm bằng chứng bởi cả developer và audit. Nếu không sửa được ngay thì **xóa khỏi `npm test`** — không có guard tốt hơn là có guard giả.
2. **NJ-2 — bỏ `candCount > 0`** khỏi điều kiện ở `step.ts:655`; chuyển phần an toàn về load time trong `spatial.ts`.
3. **NG-16 + NF-11 — xóa hai file test grep-source** và thay bằng test hành vi. Chúng đang biến defect thành dấu tích xanh.
4. **NJ-3 — kiểm tra kênh liên hệ trong cửa sổ ẩn danh.** Nếu issue bị chặn, policy đang không có cách liên hệ nào.
5. **NJ-4 + NJ-5 — khai báo 4 package thiếu; đưa scratch về `World` hoặc cập nhật hợp đồng F-56.**
6. **F-43 + CI.** Thêm `react-test-renderer`/`@testing-library/react-native` và một workflow `.github/` chạy `test`+`lint`+`typecheck`+`assert:*`. Không có CI thì mọi gate ở trên chỉ chạy khi có người nhớ chạy.

---

## 8. Nhận định

Về **sửa lỗi gameplay**, đây là đợt tốt nhất trong năm vòng: 19 finding đóng hẳn, nhiều mục có test hành vi thật mà tôi chạy lại được, và **NF-3 — mục bị nêu năm vòng liền — đã xong**, nên mọi thứ cuối cùng cũng nằm trong git và bản live đã cập nhật. NH-1 (một cú chạm = 1 damage), NH-2 (level không thể thắng bị loại khỏi build), NG-15 (`chromeSeq` đúng pattern), F-49/F-52 (guard + clear ở nhánh terminal) đều là fix đúng chỗ, đúng cách.

Nhưng khuôn mẫu của cả chuỗi lại hiện ra ở dạng gắt hơn: **ba artefact được dựng để chứng minh tính đúng đắn thì cả ba đều hỏng** — guard không thể fail, broadphase được nối vào nhưng bị bỏ qua trong khi một test grep chứng nhận nó, và test chống tái phát NG-15 vẫn sẽ pass nếu defect quay lại. Và tôi cũng rơi vào đúng cái bẫy đó ở đầu phiên: nhận `exit 0` rồi báo là đạt.

Điều cần đổi không phải kỹ năng sửa lỗi — điều đó đã tốt. Điều cần đổi là **mỗi công cụ kiểm chứng phải tự được kiểm chứng**: một cặp fixture known-good / known-bad cho guard, một test phân biệt được "broadphase được dùng" với "bị bỏ qua", và một CI để các gate đó thực sự chạy. Ba thứ đó nhỏ hơn nhiều so với công việc đã làm trong năm vòng vừa rồi.
