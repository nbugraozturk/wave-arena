# Wave Arena — Tamamlanan İşler: Görsel İnceleme

`todo.txt` içinden tamamlanan 12 iş çıkarıldı. Bu sayfa her işin ne sağladığını ve kodu, testi veya komut çıktısını nereden gözle kontrol edebileceğini gösterir.

## Tamamlanan işler

| İş | Ne işe yarıyor? | Gözle doğrulama |
| --- | --- | --- |
| **WA-001 · Agent Context & Repo Contract** | Projeye katılan geliştiricilere mimari sınırları, deterministiklik kurallarını ve kullanılan komutları açıkça verir. | [AGENTS.md](../AGENTS.md) — mimari, çekirdek değişmezleri, komutlar ve değişiklik kuralları. |
| **WA-003 · Content Integrity Validator** | İçerik kataloglarındaki yinelenen ID'leri, bozuk referansları ve imkânsız tarifleri çalıştırmadan önce yakalar. | [Validator kodu](../src/core/content/content-validator.ts), [testler](../src/core/content/content-validator.test.ts); `npm run validate:content` çıktısı `Content integrity: OK` olmalı. |
| **WA-004 · Deterministic Replay Fixture Harness** | Bir seed ve input dizisini tekrar oynatıp özet durum üretir; aynı run'ın aynı sonucu verdiğini sabit fixture ile karşılaştırır. | [Replay kodu](../src/core/replay.ts), [test](../src/core/replay.test.ts), [örnek fixture](../src/core/fixtures/replay-smoke.json); `npm run replay:fixture` JSON özeti yazdırır. |
| **WA-005 · Save/Load Regression Suite** | Profil v1 ve run v2 kayıtlarının geri yüklemede ilerleme, oyun durumu ve RNG devamını koruduğunu doğrular; bozuk/eski kayıtları güvenle ele alır. | [Serialization testleri](../src/core/serialization.test.ts) — round-trip, eski sürüm, eksik ve hatalı payload senaryoları. |
| **WA-006 · Fix Free Reroll** | Ücretsiz yeniden-çekim hakkını kullanılabilir yapar; önce ücretsiz hak düşer, ücretli haklar korunur ve HUD kalan ücretsiz/ücretli sayıyı gösterir. | [Simulation](../src/core/Simulation.ts), [HUD](../src/web/main.ts), [reroll testleri](../src/core/reroll-v1.test.ts); oyun içinde seviye atlayıp reroll sayacını ve bir reroll sonrası ücretsiz sayının azalışını kontrol et. |
| **WA-008 · Seeded Event Selection** | Event rotasını sabit Shrine yerine seed'e bağlı event havuzundan seçer; böylece aynı seed tekrarlanabilir ve Stranger'a erişilebilir. | [Stratejik sistem testleri](../src/core/content/strategic.test.ts) içindeki “event routes choose from the seeded event pool and can reach Stranger” testi; [event kataloğu](../src/core/content/strategic.ts). |
| **WA-010 · Treasure Reward Fallback** | Treasure ödülünü seed'e göre çeşitlendirir; oyuncu aynı artefakta sahipse veya slotlar doluysa deterministik alternatif ödül verir. | [Stratejik sistem testleri](../src/core/content/strategic.test.ts) içindeki “treasure reward varies by seed and grants currency when artifacts are unavailable” testi; aynı seed'i ve dolu slot senaryosunu karşılaştır. |
| **WA-012 · Fixed-Step Simulation Runner** | Simülasyon adımını render FPS'inden ayırır; tarayıcı 30, 60 veya 120 FPS çalışsa da oyun aynı sabit tick'lerle ilerler. | [Runner](../src/core/FixedStepRunner.ts), [FPS karşılaştırma testi](../src/core/FixedStepRunner.test.ts); test üç FPS senaryosunun aynı özet duruma ulaştığını karşılaştırır. |
| **WA-015 · Extract Save/Profile Serialization** | Profil/run parse, normalize ve serialize işlerini saf core modülüne alır; Simulation yalnızca bu fonksiyonları çağırır. | [Saf serialization modülü](../src/core/serialization.ts), [bağlantı noktaları](../src/core/Simulation.ts), [regresyon testleri](../src/core/serialization.test.ts). |
| **WA-017 · Combat Mechanic Regression Matrix** | Sınıf pasiflerine bağlı kalmadan kritik vuruş, pierce, multishot, ricochet, patlama, slow ve lifesteal davranışlarının bozulmasını yakalar. | [Combat test matrisi](../src/core/combat-regression-matrix.test.ts) — her mekanik için ayrı senaryo var. |
| **WA-019 · Balance Report CLI** | Dalga başına düşman sayısı ve HP'si, boss/elite durumu, boost rarity havuzu ve temel zorluk ölçeklemesini tek raporda gösterir. | [Rapor üreticisi](../src/core/content/balance-report.ts), [testler](../src/core/content/balance-report.test.ts); `npm run balance:report` ile dalga tablosunu terminalde incele. |
| **WA-020 · Unity Port Contract Pack** | Unity portunun TypeScript çekirdeğiyle aynı DTO'ları, input snapshot'ını, RNG'yi, tick sırasını, WORLD/VIEW ölçülerini ve replay fixture biçimini kullanmasını tarif eder. | [Unity port kontratı](./UNITY_PORT.md) — DTO eşlemesi, InputSnapshot, sabit adım ve tick sırası, RNG, save ve replay bölümleri. |

## Toplu doğrulama

Bu değişiklikler için doğrulama komutları:

```text
npm test
npm run build
npm run validate:content
npm run balance:report
npm run replay:fixture
```

`todo.txt` tamamlanan maddeleri içermez. Sonraki planlama turunda mevcut 7 açık madde korundu ve öncelik sırasıyla 10 yeni üretim görevi eklendi: **WA-021–WA-030**. Toplam 17 açık iş vardır.

Son doğrulama sonucu: `npm test` **222 passed / 0 failed**; `npm run build` başarılı; `npm run validate:content` **Content integrity: OK**; `npm run replay:fixture` fixture ile aynı JSON özetini üretti; `npm run balance:report` 12 dalganın tamamını ve scaling özetini yazdırdı.
