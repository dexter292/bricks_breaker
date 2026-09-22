# RE-AUDIT #08 — sau đợt remediation thứ bảy

**Ngày:** 2026-09-22
**Chuỗi:** [#01](./CODE-REVIEW.md) (63 F) → [#02](./RE-AUDIT-02.md) (+18 NF) → [#03](./RE-AUDIT-03.md) (+17 NG) → [#04](./RE-AUDIT-04.md) (+7 NH) → [#05](./RE-AUDIT-05.md) (+5 NJ) → [#06](./RE-AUDIT-06.md) (+7 NK) → [#07](./RE-AUDIT-07.md) (+4 NL) → tài liệu này
**Đối tượng:** HEAD **`6958be9`** — "fix: close RE-AUDIT-07 NL findings and component-contract harness", working tree sạch
**Tính chất:** read-only. Không file nào trong repository bị sửa.

---

## 1. Gate — lần đầu tiên sạch hoàn toàn

| | #07 | **#08** |
|---|---|---|
| `tsc --noEmit` | 0 lỗi | **0 lỗi** |
| `eslint .` | 0 error / 5 warn | **0 error / 0 warning** ✅ *(lần đầu)* |
| Test suite (`*.test.ts`) | 259 | **261 pass / 0 fail** (55 file) |
| Component test (`*.test.tsx`) | 1 (render `<div>`) | **4 file — 3 render component thật** ✅ |
| Worklet guard | 89 file, self-check sống | 89 file, self-check sống, **+ `OptionalCallExpression`** ✅ |
| `assert-privacy-manifest` | 0 WARN | 0 WARN |
| CI | 6 step | **9 step** — thêm `--max-warnings 0`, `assert:worklets` riêng, coverage threshold, `expo export` ✅ |

---

## 2. F-43 đã đóng — finding tái diễn suốt bảy vòng

`vitest.config.ts:4` nay có `resolve: { alias: { 'react-native': 'react-native-web' } }` — đúng một dòng như đã đề xuất, **zero dependency mới**. Và ba component test thật đã xuất hiện:

```
tests/ui/HudStrip.test.tsx
tests/ui/CountdownOverlay.test.tsx
tests/ui/LevelErrorOverlay.test.tsx
```

`HudStrip.test.tsx` không phải grep source — nó render `HudStrip` thật từ `src/runtime/HudStrip` rồi assert **output đã render**:
```ts
expect(screen.getByText('Score · 1200')).toBeTruthy();
expect(screen.getByText('Lives · 2')).toBeTruthy();
expect(screen.getByText('×3')).toBeTruthy();
expect(screen.getByText('Stall! · 2')).toBeTruthy();
const pause = screen.getByRole('button', { name: 'Pause game' });
fireEvent.click(pause);
expect(onPause).toHaveBeenCalledTimes(1);
```
Và test thứ hai assert **vắng mặt** khi `showStall`/`showPause` false. Đây chính là loại coverage mà F-43 tồn tại để có: nếu định dạng `Stall! · N` hay wiring nút Pause regress, test đỏ. `CountdownOverlay` assert numeral và rerender; `LevelErrorOverlay` render `ValidationIssue`.

**Giới hạn xác minh phải nói rõ:** tôi **không chạy được** ba test `.tsx` này trong môi trường audit. Tôi đã dựng một harness riêng (jsdom + babel JSX transform + alias) và `jsdom-harness.test.tsx` **pass**, nhưng ba file kia fail vì `react-native-safe-area-context` là CJS và `require('react-native')` không đi qua ESM loader hook của tôi — đó là việc vitest tự xử lý, không phải lỗi repo. Nên: **tôi xác minh được ba test này là test hành vi thật bằng cách đọc, và xác minh toolchain chạy được; tôi chưa chứng kiến chúng pass.** Hãy dán output `npm test` trên macOS để khép lại phần đó.

---

## 3. Verdict 4 finding NL — đóng cả bốn, đúng phương án đã đề xuất

| ID | Verdict | Bằng chứng |
|---|---|---|
| **NL-1** allocation/frame tái lập trong worklet | **FIXED** | `src/runtime/publishChromeMirror.ts:18-22` nay nhận **5 tham số scalar** (`mirror, phase, lives, score, combo, stallTier`); call site `useGameLoop.ts:436-443` truyền scalar. Zero allocation/frame, mà vẫn giữ nguyên tính test-được của NK-3. Comment cập nhật đúng: "scalar args, zero per-frame alloc" |
| **NL-2** dispose glow atlas không có handshake | **FIXED — đúng cách** | `app/_components/PlayingHost.tsx:294-305` nay:<br>`glowAtlasSv.value = next;` → `runOnUI(() => { 'worklet'; void glowAtlasSv.value; runOnJS(disposeGlowAtlas)(prev); })`.<br>Đây là **thứ tự nhân quả** thật: dispose chạy từ một work item của UI runtime được schedule **sau** lần ghi, rồi hop về JS. Không còn timer, không còn tuyên bố bảo đảm mà thư viện không cung cấp |
| **NL-3** thiếu peer `@types/react-dom` | **FIXED** | `devDependencies['@types/react-dom'] = '~19.2'`, đã cài trong `node_modules` |
| **NL-4** doc còn đặc tả hàm đã xóa | **FIXED** | `02-04-PLAN.md:109` và `REMEDIATION-PLAN.md:96` nay ghi `collectBrickCandidatesInto` kèm ghi chú về hàm đã bỏ. (Các `*-SUMMARY.md` giữ nguyên tên cũ — đúng, vì chúng là hồ sơ lịch sử) |

**Kèm theo:** guard nay có `OptionalCallExpression` (4 chỗ) — đóng lỗ `f?.()` mà tôi xếp ưu tiên cao nhất ở §7 vòng #07.

---

## 4. CI: từ "hàng rào regression" thành gần-ship-gate

```
npm ci
npx expo config --type public
npm run typecheck
npm run lint -- --max-warnings 0        ← warning nay chặn build
npm test
npm run assert:worklets                 ← step riêng, không còn ẩn trong chuỗi &&
npm run assert:skia
npm run assert:privacy-manifest
npx vitest run --coverage --coverage.thresholds.lines=40
npx expo export --platform web --output-dir /tmp/expo-export-ci
```

Bốn trong năm khuyến nghị của vòng #07 đã vào. Hai ghi chú, không phải finding:

- **`--platform web`** chạy Metro trên toàn graph app (bắt lỗi resolve, asset thiếu, lỗi worklet plugin) nhưng resolve theo react-native-web, nên **không** bắt được lỗi import chỉ có ở native. `--platform all` phủ rộng hơn. Đây là bước tiến thật; chỉ là chưa phải phủ tối đa.
- **Threshold `lines=40`** là sàn khiêm tốn — đủ để chặn "xóa test vẫn xanh", chưa đủ để đo chất lượng. Đặt sàn thấp rồi nâng dần là cách làm đúng; chỉ nên nhớ nâng.

---

## 5. Còn mở — danh sách nay ngắn và ổn định

Tôi kiểm tra lại từng mục, không suy đoán:

| ID | Trạng thái | Bằng chứng |
|---|---|---|
| **NJ-3** kênh liên hệ policy | **NOT FIXED — chặn submit** | `privacy-policy.md:34-37`: "primary channel — GitHub Discussions; **no store support email yet**". Mọi kênh vẫn cần tài khoản GitHub. App Store Connect đòi một support contact |
| **NK-6** test scratch tautology | **PARTIALLY FIXED** | `tests/physics.world-shape.test.ts:25-37` thêm type check, nhưng `expect(w.scratchSweep).toBe(sweep)` vẫn **không thể fail**: tôi grep lại `scratchVel =\|scratchSweep =` trong `src/` → **zero** (ngoài `allocate.ts`). Test đáng giá vẫn là: đẩy ball vào stall gần-ngang, chạy `stepAntiStall`, assert velocity khớp `enforceMinVerticalRatioInto ∘ enforceMinHorizontalRatioInto` tính tay — nó **sẽ** bắt được bug NK-1 |
| **F-03** gate quy trình | **NOT FIXED** | PLAN-CHECK **2/8**; REVIEW 3 phase; **`01-PATTERNS.md` vẫn thiếu**; `nyquist_compliant: false` ×5; sign-off trống ở `03`/`04-VALIDATION.md` trong khi ROADMAP ghi Complete. Không có waiver quy trình nào được viết ra |
| **F-21** ledger PHYS-05 | **NOT FIXED** | `REQUIREMENTS.md:16` vẫn `[x] … launches with an **aimed release/tap**` trong khi code ship serve thẳng đứng cố định (và code đã trung thực về điều đó) |
| **F-29** `CLIFF_RAMP` | **NOT FIXED** | 0 consumer ngoài chính `devflags.ts` |
| **F-40** provenance SFX | **NOT FIXED** | `assets/sfx/README.md:15` heading vẫn là "## Provenance (**fill before store submit**)"; `:18-19` tool chain "undocumented", license "confirm … before submit" |
| **F-59** status Skia | **NOT FIXED** | `skia-version-decision.md:6` vẫn `Confirmed` trong khi `:20` đòi "both platforms … physical devices" và `:24` ghi "Android physical confirm is still outstanding" — nay đã disclose ngay trong Status, nhưng field vẫn nói Confirmed |
| **NF-15** override eslint | **NOT FIXED** | `eslint.config.js:115` (`eventBridge.ts`) và `:123` (`PlayingHost.tsx`) vẫn miễn rule. Mỗi file thực tế chỉ cần **một** lời gọi được miễn → thay bằng `eslint-disable-next-line` tại đúng dòng là đóng được |
| **NG-20** 360/640 trùng lặp | **PARTIALLY FIXED** | Vẫn ba định nghĩa độc lập của 360 và ~10 site inline chưa được parity test cover |
| **PLT-03 / soak / iOS Instruments** | **UNPROVEN — cần hardware** | Mọi ô `docs/phase8-certification.md` vẫn `PENDING_DEVICE`. Nhưng **mọi điều kiện tiên quyết về code nay đã đóng** |

**Không có finding mới trong vòng này.** Đây là lần đầu trong tám vòng.

---

## 6. Nhận định

Vòng này đóng **cả bốn NL**, và quan trọng hơn, đóng **F-43** — finding tái diễn suốt bảy vòng và là nguyên nhân gốc chung của NG-20, NH-4, NF-11, NG-16, NK-3, NL-1, NL-2. Cách đóng cũng đúng: một dòng alias, không dependency mới, và ba test render component thật thay vì grep source. NL-2 được sửa bằng đúng cơ chế handshake `runOnUI` → `runOnJS` chứ không phải một timer khác. NL-1 về zero-alloc mà vẫn giữ tính test-được. Guard thêm `OptionalCallExpression`. Lint lần đầu **0 error / 0 warning**. CI từ 6 lên 9 step với warning-as-error, coverage floor và một lần export Metro thật.

Đáng ghi nhận nhất về mặt kỷ luật: qua **tám vòng**, không một số liệu nào bị bịa ra. Mọi chỗ thiếu bằng chứng đều được ghi `PENDING_DEVICE` / "not obtained" / "fill before submit" thay vì được tô xanh. Đó là lý do chuỗi audit này hội tụ được.

Ba việc còn lại, và chúng khác bản chất với mọi thứ trước đó:

1. **NJ-3 — một email hỗ trợ.** Đây là mục duy nhất còn lại thực sự **chặn submit**, và nó không phải việc kỹ thuật.
2. **Nhóm giấy tờ/quy trình** (F-03, F-21, F-29, F-40, F-59, NF-15, NG-20, NK-6): tất cả đều nhỏ, độc lập, không chặn nhau. Nên xử một lượt rồi đóng sổ.
3. **PLT-03 + soak + iOS Instruments**: chỉ cần hardware. Và giờ thì đo được cho ra số có nghĩa — sáu vòng trước thì không, vì `injectCertWorstCase` chưa inject được gì (F-01), overlay chưa vẽ được (F-29/NG-13), hot path còn chạy O(brickCount) (NJ-2), và allocation/frame còn cao.

**Khuyến nghị:** làm nhóm 1 + 2 trong một đợt (đều là việc nhỏ), rồi mang máy ra đo. Đến lúc đó, `08-VERIFICATION.md` mới có thể chuyển từ stub `not_verified` sang một verification thật — và đó là điều kiện duy nhất còn lại để đóng Phase 8.
