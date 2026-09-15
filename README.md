# Data Flow Heatmap

Custom visual do Power BI do monitoringu przepływu danych i wejść/logowań — matrix (np. dzień tygodnia x godzina) z intensywnością koloru reprezentującą wolumen (rekordy, zdarzenia, sesje logowania) oraz automatycznym wykrywaniem anomalii statystycznych.

![koncepcja](preview/preview_render.png)

## Zastosowanie

Zaprojektowany pod monitoring operacyjny — typowe scenariusze:

- **Monitoring pipeline'ów ETL/ELT** — kiedy w tygodniu/dobie przepływa najwięcej/najmniej danych, gdzie są nietypowe skoki wolumenu (potencjalny błąd źródła lub duplikacja)
- **Monitoring wejść/logowań** — wzorce aktywności użytkowników w czasie, wykrywanie nietypowych szczytów (np. atak, kampania, błąd w systemie logowania)
- **Kapacity planning** — identyfikacja okien niskiego obciążenia pod maintenance/refresh

## Kluczowa funkcja: wykrywanie anomalii

Wizual liczy średnią i odchylenie standardowe wszystkich wartości w danym widoku i automatycznie obramowuje komórki odchylone o więcej niż X odchyleń standardowych (konfigurowalny próg w panelu formatowania) — czyli sam sygnalizuje "to wymaga uwagi", bez potrzeby dodatkowej logiki DAX w raporcie.

## Model danych (role)

| Rola | Typ | Opis |
|---|---|---|
| `dayAxis` | Grouping | Kategoria wiersza — dzień tygodnia, data, źródło systemu |
| `hourAxis` | Grouping | Kategoria kolumny — godzina, numer tygodnia, kanał |
| `intensity` | Measure | Wartość intensywności komórki (wolumen, liczba zdarzeń, błędy) |
| `tooltipData` | Measure | Opcjonalne dodatkowe metryki w tooltipie |

Przykładowe dane: `testData/sample-flow-data.csv` (7 dni x 7 godzin, syntetyczny ruch z jedną wstrzykniętą anomalią w środę o 12:00).

## Panel formatowania

- **Kolory danych** — skala sekwencyjna lub rozbieżna, konfigurowalne kolory min/max
- **Układ komórek** — odstępy, zaokrąglenie rogów, widoczność etykiet osi
- **Wykrywanie anomalii** — włącz/wyłącz, próg w odchyleniach standardowych, kolor obramowania
- **Etykiety danych** — wartości liczbowe na komórkach
- **Legenda** — gradient skali kolorów

## Budowanie

```bash
npm install -g powerbi-visuals-tools
cd data-flow-heatmap
npm install
pbiviz start
pbiviz package
```

## Zgodność z SDK

Struktura projektu i formatting model zgodne z [oficjalnym SDK Microsoftu](https://learn.microsoft.com/en-us/power-bi/developer/visuals/develop-power-bi-visuals) oraz [`microsoft/PowerBI-visuals-tools`](https://github.com/microsoft/powerbi-visuals-tools). Formatting model przez `powerbi-visuals-utils-formattingmodel`.
