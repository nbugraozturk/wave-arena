# Wave Arena

Dalga tabanlı 2D arena nişancı. İlk hedef web; simülasyon katmanı Unity’ye taşınacak şekilde motor bağımsız tutuldu.

## Çalıştırma

```bash
npm install
npm run dev
```

WASD hareket, fare nişan, sol tık veya boşluk ateş. Her dalga bitince kalıcı bir boost seçilir.

## Mimari

- `src/core` — kural, durum, içerik. DOM/Canvas/Unity yok.
- `src/web` — giriş, çizim, HUD. Unity’de bunun karşılığı MonoBehaviour + UI Toolkit olur.
- `src/core/content/catalog.ts` — dalga, düşman, boost tanımları (ScriptableObject adayı).

Detay: `docs/UNITY_PORT.md`.
