# Unity port haritası

Web sürümü kasıtlı olarak **simülasyon / görünüm** diye ayrıldı. Unity tarafında `src/core` C#’a çevrilir; `src/web` atılır.

## Sınıf eşlemesi

| TypeScript | Unity |
|---|---|
| `Simulation` | `Simulation` (plain C# class, MonoBehaviour değil) |
| `GameState` | serializable struct/class |
| `BOOSTS` / `ENEMIES` / `buildWaves` | ScriptableObject katalogları |
| `InputAdapter` | `New Input System` → `InputSnapshot` |
| `CanvasView` | sprite / URP 2D |
| boost overlay | UI Toolkit veya uGUI, `state.boostOffers` üzerinden |

## Taşınacak API (değiştirmeyin)

Unity döngüsü web ile aynı kalmalı:

```csharp
void Update() {
  var input = ReadInput(); // world-space aim
  sim.Tick(Time.deltaTime, input);
  view.Render(sim.State);
}

// boost kartına tıklanınca
sim.SelectBoost(boostId);
```

Dünya birimleri: `WORLD` 2880×1620. Kamera `VIEW` 960×540 penceresiyle oyuncuyu takip eder; minimap tüm haritayı gösterir.

## Adım adım

1. `types.ts` → C# DTO’lar
2. `catalog.ts` → ScriptableObject
3. `Simulation.ts` neredeyse satır satır (aynı `tick` sırası)
4. `Rng` aynı seed ile (mulberry32) — replay/test için
5. Görsel ve input en son

`Simulation` Unity API (`GameObject`, `Transform`) kullanmamalı. Sınıf seçimi `selectClass`, ulti `InputSnapshot.ult`.
