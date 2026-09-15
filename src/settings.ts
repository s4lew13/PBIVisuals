"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/**
 * Karta: kolory danych — bazowy kolor oraz skala gradientu użyta do "gaśnięcia"
 * pierścieni kohort w kierunku obwodu.
 */
class DataColorsCardSettings extends FormattingSettingsCard {
    baseColor = new formattingSettings.ColorPicker({
        name: "baseColor",
        displayName: "Kolor bazowy",
        displayNameKey: "DataColors_BaseColor",
        value: { value: "#5B4FE9" }
    });

    colorScale = new formattingSettings.ItemDropdown({
        name: "colorScale",
        displayName: "Skala gradientu",
        displayNameKey: "DataColors_ColorScale",
        items: [
            { value: "sequential", displayName: "Sekwencyjna (jasny → ciemny)" },
            { value: "diverging", displayName: "Rozbieżna (czerwień → zieleń)" },
            { value: "mono", displayName: "Monochromatyczna (jeden odcień)" }
        ],
        value: { value: "sequential", displayName: "Sekwencyjna (jasny → ciemny)" }
    });

    name: string = "dataColors";
    displayName: string = "Kolory danych";
    displayNameKey: string = "Card_DataColors";
    slices: Array<FormattingSettingsSlice> = [this.baseColor, this.colorScale];
}

/**
 * Karta: układ pierścieni — promień wewnętrzny, odstępy, kąt startowy i zasięg (sweep).
 * Pozwala przejść z pełnego kręgu (360°) na "pulsujący wachlarz" (np. 270°).
 */
class RingLayoutCardSettings extends FormattingSettingsCard {
    innerRadiusRatio = new formattingSettings.NumUpDown({
        name: "innerRadiusRatio",
        displayName: "Promień wewnętrzny (%)",
        displayNameKey: "RingLayout_InnerRadius",
        value: 15,
        options: {
            minValue: { type: 0, value: 0 },
            maxValue: { type: 1, value: 60 }
        }
    });

    ringGap = new formattingSettings.NumUpDown({
        name: "ringGap",
        displayName: "Odstęp między pierścieniami (px)",
        displayNameKey: "RingLayout_RingGap",
        value: 2,
        options: {
            minValue: { type: 0, value: 0 },
            maxValue: { type: 1, value: 20 }
        }
    });

    startAngle = new formattingSettings.NumUpDown({
        name: "startAngle",
        displayName: "Kąt startowy (°)",
        displayNameKey: "RingLayout_StartAngle",
        value: 0,
        options: {
            minValue: { type: 0, value: -180 },
            maxValue: { type: 1, value: 180 }
        }
    });

    sweepAngle = new formattingSettings.NumUpDown({
        name: "sweepAngle",
        displayName: "Zasięg wykresu (°)",
        displayNameKey: "RingLayout_SweepAngle",
        value: 360,
        options: {
            minValue: { type: 0, value: 90 },
            maxValue: { type: 1, value: 360 }
        }
    });

    name: string = "ringLayout";
    displayName: string = "Układ pierścieni";
    displayNameKey: string = "Card_RingLayout";
    slices: Array<FormattingSettingsSlice> = [
        this.innerRadiusRatio,
        this.ringGap,
        this.startAngle,
        this.sweepAngle
    ];
}

/**
 * Karta: metryka centralna — np. średni LTV lub retencja "day 0" wyświetlana
 * w środku pulsu, tam gdzie klasyczna tabela kohort nie ma miejsca na taki podsumowujący KPI.
 */
class CenterMetricCardSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Pokaż metrykę centralną",
        displayNameKey: "CenterMetric_Show",
        value: true
    });

    label = new formattingSettings.TextInput({
        name: "label",
        displayName: "Etykieta",
        displayNameKey: "CenterMetric_Label",
        value: "Śr. retencja",
        placeholder: "Śr. retencja"
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Rozmiar czcionki",
        displayNameKey: "CenterMetric_FontSize",
        value: 20,
        options: {
            minValue: { type: 0, value: 8 },
            maxValue: { type: 1, value: 60 }
        }
    });

    fontColor = new formattingSettings.ColorPicker({
        name: "fontColor",
        displayName: "Kolor czcionki",
        displayNameKey: "CenterMetric_FontColor",
        value: { value: "#201F1E" }
    });

    name: string = "centerMetric";
    displayName: string = "Metryka centralna";
    displayNameKey: string = "Card_CenterMetric";
    slices: Array<FormattingSettingsSlice> = [
        this.show,
        this.label,
        this.fontSize,
        this.fontColor
    ];
}

/**
 * Karta: etykiety danych na segmentach pierścieni.
 */
class DataLabelsCardSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Pokaż etykiety",
        displayNameKey: "DataLabels_Show",
        value: false
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Rozmiar czcionki",
        displayNameKey: "DataLabels_FontSize",
        value: 9,
        options: {
            minValue: { type: 0, value: 6 },
            maxValue: { type: 1, value: 24 }
        }
    });

    color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Kolor",
        displayNameKey: "DataLabels_Color",
        value: { value: "#FFFFFF" }
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Miejsca dziesiętne",
        displayNameKey: "DataLabels_DecimalPlaces",
        value: 0,
        options: {
            minValue: { type: 0, value: 0 },
            maxValue: { type: 1, value: 4 }
        }
    });

    name: string = "dataLabels";
    displayName: string = "Etykiety danych";
    displayNameKey: string = "Card_DataLabels";
    slices: Array<FormattingSettingsSlice> = [
        this.show,
        this.fontSize,
        this.color,
        this.decimalPlaces
    ];
}

/**
 * Karta: legenda kohort (mapowanie kolor → nazwa kohorty).
 */
class LegendCardSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Pokaż legendę",
        displayNameKey: "Legend_Show",
        value: true
    });

    position = new formattingSettings.ItemDropdown({
        name: "position",
        displayName: "Pozycja",
        displayNameKey: "Legend_Position",
        items: [
            { value: "right", displayName: "Prawo" },
            { value: "bottom", displayName: "Dół" }
        ],
        value: { value: "right", displayName: "Prawo" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Rozmiar czcionki",
        displayNameKey: "Legend_FontSize",
        value: 10,
        options: {
            minValue: { type: 0, value: 6 },
            maxValue: { type: 1, value: 20 }
        }
    });

    name: string = "legend";
    displayName: string = "Legenda";
    displayNameKey: string = "Card_Legend";
    slices: Array<FormattingSettingsSlice> = [this.show, this.position, this.fontSize];
}

/**
 * Główny model ustawień formatowania wizualizacji — agreguje wszystkie karty
 * i jest zwracany przez FormattingSettingsService w metodzie getFormattingModel().
 */
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    dataColorsCard = new DataColorsCardSettings();
    ringLayoutCard = new RingLayoutCardSettings();
    centerMetricCard = new CenterMetricCardSettings();
    dataLabelsCard = new DataLabelsCardSettings();
    legendCard = new LegendCardSettings();

    cards: Array<FormattingSettingsCard> = [
        this.dataColorsCard,
        this.ringLayoutCard,
        this.centerMetricCard,
        this.dataLabelsCard,
        this.legendCard
    ];
}
