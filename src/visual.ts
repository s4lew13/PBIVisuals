"use strict";

import "core-js/stable";
import "./../style/visual.less";

import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DataView = powerbi.DataView;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;

import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { createTooltipServiceWrapper, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";

import { VisualFormattingSettingsModel } from "./settings";

type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

/**
 * Jeden segment: przecięcie kohorty (pierścień) x okresu (kąt na pierścieniu).
 */
interface CohortSegment {
    cohortName: string;
    cohortIndex: number;
    periodIndex: number;
    periodLabel: string;
    value: number;
    maxValueInCohort: number;
    tooltipItems: Array<{ displayName: string; value: string }>;
    selectionId: powerbi.visuals.ISelectionId;
}

interface CohortViewModel {
    segments: CohortSegment[];
    cohortNames: string[];
    periodCount: number;
    overallAverage: number;
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;
    private svg: Selection<SVGSVGElement>;
    private mainGroup: Selection<SVGGElement>;
    private centerLabelGroup: Selection<SVGGElement>;
    private legendGroup: Selection<SVGGElement>;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private formattingSettingsService: FormattingSettingsService;
    private formattingSettings: VisualFormattingSettingsModel;
    private selectionManager: powerbi.extensibility.ISelectionManager;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;
        this.formattingSettingsService = new FormattingSettingsService();
        this.selectionManager = this.host.createSelectionManager();

        this.tooltipServiceWrapper = createTooltipServiceWrapper(
            this.host.tooltipService,
            this.target
        );

        this.svg = d3.select(this.target)
            .append("svg")
            .classed("cohortPulseRadial", true);

        this.mainGroup = this.svg.append("g").classed("mainGroup", true);
        this.centerLabelGroup = this.svg.append("g").classed("centerLabelGroup", true);
        this.legendGroup = this.svg.append("g").classed("legendGroup", true);
    }

    public update(options: VisualUpdateOptions): void {
        if (!options.dataViews || !options.dataViews[0]) {
            return;
        }

        const dataView: DataView = options.dataViews[0];

        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews
        );

        const viewModel = this.transformData(dataView);
        const width = options.viewport.width;
        const height = options.viewport.height;

        this.svg.attr("width", width).attr("height", height);

        const legendWidth = this.formattingSettings.legendCard.show.value ? 120 : 0;
        const plotWidth = Math.max(0, width - legendWidth);
        const radius = Math.min(plotWidth, height) / 2 - 10;

        this.mainGroup.attr(
            "transform",
            `translate(${plotWidth / 2}, ${height / 2})`
        );

        this.drawRings(viewModel, radius);
        this.drawCenterMetric(viewModel, radius);

        if (this.formattingSettings.legendCard.show.value) {
            this.drawLegend(viewModel, plotWidth, height);
        } else {
            this.legendGroup.selectAll("*").remove();
        }
    }

    /**
     * Przekształca surowy DataView (kategorie kohort x grupy okresów) w model
     * segmentów gotowych do narysowania jako łuki na pierścieniach.
     */
    private transformData(dataView: DataView): CohortViewModel {
        const categorical = dataView.categorical;
        const segments: CohortSegment[] = [];

        if (!categorical || !categorical.categories || !categorical.values) {
            return { segments: [], cohortNames: [], periodCount: 0, overallAverage: 0 };
        }

        const cohortCategory = categorical.categories[0];
        const cohortNames = cohortCategory.values.map(v => String(v));
        const valueGroups = categorical.values;

        // Grupy w categorical.values są zgrupowane po "period" (grouped by period)
        const periodCount = valueGroups.grouped ? valueGroups.grouped().length : valueGroups.length;

        let sum = 0;
        let count = 0;

        cohortNames.forEach((cohortName, cohortIndex) => {
            let maxValueInCohort = 0;

            for (let periodIndex = 0; periodIndex < valueGroups.length; periodIndex++) {
                const valueColumn = valueGroups[periodIndex];
                const raw = valueColumn.values[cohortIndex];
                const numericValue = typeof raw === "number" ? raw : Number(raw) || 0;
                maxValueInCohort = Math.max(maxValueInCohort, numericValue);
            }

            for (let periodIndex = 0; periodIndex < valueGroups.length; periodIndex++) {
                const valueColumn = valueGroups[periodIndex];
                const raw = valueColumn.values[cohortIndex];
                const numericValue = typeof raw === "number" ? raw : Number(raw) || 0;
                const periodLabel = String(
                    (valueColumn.source.groupName !== undefined)
                        ? valueColumn.source.groupName
                        : periodIndex
                );

                const selectionId = this.host.createSelectionIdBuilder()
                    .withCategory(cohortCategory, cohortIndex)
                    .createSelectionId();

                segments.push({
                    cohortName,
                    cohortIndex,
                    periodIndex,
                    periodLabel,
                    value: numericValue,
                    maxValueInCohort: maxValueInCohort || 1,
                    tooltipItems: [
                        { displayName: "Kohorta", value: cohortName },
                        { displayName: "Okres", value: periodLabel },
                        { displayName: "Wartość", value: numericValue.toFixed(2) }
                    ],
                    selectionId
                });

                sum += numericValue;
                count++;
            }
        });

        return {
            segments,
            cohortNames,
            periodCount: valueGroups.length,
            overallAverage: count > 0 ? sum / count : 0
        };
    }

    /**
     * Rysuje jeden pierścień na kohortę. Każdy pierścień dzieli się na tyle
     * łuków, ile jest okresów; intensywność koloru gaśnie z rosnącym periodIndex,
     * imitując zanikanie retencji w czasie ("pulse" gasnący od centrum na zewnątrz).
     */
    private drawRings(viewModel: CohortViewModel, outerRadius: number): void {
        const settings = this.formattingSettings;
        const innerRatio = settings.ringLayoutCard.innerRadiusRatio.value / 100;
        const ringGap = settings.ringLayoutCard.ringGap.value;
        const startAngleDeg = settings.ringLayoutCard.startAngle.value;
        const sweepAngleDeg = settings.ringLayoutCard.sweepAngle.value;

        const innerRadius = outerRadius * innerRatio;
        const cohortCount = Math.max(1, viewModel.cohortNames.length);
        const bandThickness = (outerRadius - innerRadius) / cohortCount;

        const startAngleRad = (startAngleDeg * Math.PI) / 180;
        const sweepAngleRad = (sweepAngleDeg * Math.PI) / 180;

        const colorScale = this.buildColorScale(settings.dataColorsCard.baseColor.value.value);

        const arcGenerator = d3.arc<CohortSegment>()
            .innerRadius(d => innerRadius + d.cohortIndex * bandThickness + ringGap / 2)
            .outerRadius(d => innerRadius + (d.cohortIndex + 1) * bandThickness - ringGap / 2)
            .startAngle(d => startAngleRad + (d.periodIndex / viewModel.periodCount) * sweepAngleRad)
            .endAngle(d => startAngleRad + ((d.periodIndex + 1) / viewModel.periodCount) * sweepAngleRad)
            .padAngle(0.01)
            .cornerRadius(2);

        const arcs = this.mainGroup
            .selectAll<SVGPathElement, CohortSegment>("path.segmentArc")
            .data(viewModel.segments, (d: CohortSegment) => `${d.cohortIndex}-${d.periodIndex}`);

        arcs.exit().remove();

        const arcsEnter = arcs.enter()
            .append("path")
            .classed("segmentArc", true);

        const merged = arcsEnter.merge(arcs as any);

        merged
            .attr("d", arcGenerator as any)
            .attr("fill", d => {
                const intensity = d.maxValueInCohort > 0 ? d.value / d.maxValueInCohort : 0;
                return colorScale(intensity);
            })
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            .on("click", (event, d: CohortSegment) => {
                this.selectionManager.select(d.selectionId);
                event.stopPropagation();
            });

        this.tooltipServiceWrapper.addTooltip(
            merged,
            (d: CohortSegment) => d.tooltipItems,
            (d: CohortSegment) => d.selectionId
        );

        if (settings.dataLabelsCard.show.value) {
            this.drawSegmentLabels(viewModel, arcGenerator, settings.dataLabelsCard);
        } else {
            this.mainGroup.selectAll("text.segmentLabel").remove();
        }
    }

    private drawSegmentLabels(
        viewModel: CohortViewModel,
        arcGenerator: d3.Arc<any, CohortSegment>,
        labelSettings: VisualFormattingSettingsModel["dataLabelsCard"]
    ): void {
        const labels = this.mainGroup
            .selectAll<SVGTextElement, CohortSegment>("text.segmentLabel")
            .data(viewModel.segments, (d: CohortSegment) => `${d.cohortIndex}-${d.periodIndex}`);

        labels.exit().remove();

        const labelsEnter = labels.enter()
            .append("text")
            .classed("segmentLabel", true);

        labelsEnter.merge(labels as any)
            .attr("transform", d => `translate(${arcGenerator.centroid(d as any)})`)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", `${labelSettings.fontSize.value}px`)
            .style("fill", labelSettings.color.value.value)
            .style("pointer-events", "none")
            .text(d => d.value.toFixed(labelSettings.decimalPlaces.value));
    }

    private drawCenterMetric(viewModel: CohortViewModel, radius: number): void {
        this.centerLabelGroup.selectAll("*").remove();
        const settings = this.formattingSettings.centerMetricCard;

        if (!settings.show.value) {
            return;
        }

        const innerRatio = this.formattingSettings.ringLayoutCard.innerRadiusRatio.value / 100;
        const innerRadius = radius * innerRatio;

        this.centerLabelGroup
            .attr("transform", this.mainGroup.attr("transform"));

        this.centerLabelGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "-0.2em")
            .style("font-size", `${settings.fontSize.value}px`)
            .style("font-weight", "600")
            .style("fill", settings.fontColor.value.value)
            .text(`${viewModel.overallAverage.toFixed(1)}${innerRadius > 24 ? "" : ""}`);

        this.centerLabelGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1.3em")
            .style("font-size", `${Math.max(8, settings.fontSize.value * 0.45)}px`)
            .style("fill", settings.fontColor.value.value)
            .style("opacity", 0.7)
            .text(settings.label.value);
    }

    private drawLegend(viewModel: CohortViewModel, plotWidth: number, height: number): void {
        this.legendGroup.selectAll("*").remove();
        const legendSettings = this.formattingSettings.legendCard;
        const colorScale = this.buildColorScale(this.formattingSettings.dataColorsCard.baseColor.value.value);

        this.legendGroup.attr("transform", `translate(${plotWidth + 10}, 10)`);

        const itemHeight = legendSettings.fontSize.value + 8;

        viewModel.cohortNames.forEach((name, i) => {
            const g = this.legendGroup.append("g")
                .attr("transform", `translate(0, ${i * itemHeight})`);

            g.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("rx", 2)
                .attr("fill", colorScale(1 - i / Math.max(1, viewModel.cohortNames.length)));

            g.append("text")
                .attr("x", 16)
                .attr("y", 9)
                .style("font-size", `${legendSettings.fontSize.value}px`)
                .text(name.length > 14 ? name.slice(0, 13) + "…" : name);
        });
    }

    private buildColorScale(baseColor: string): (t: number) => string {
        const scaleType = this.formattingSettings.dataColorsCard.colorScale.value.value;

        if (scaleType === "diverging") {
            return d3.scaleLinear<string>()
                .domain([0, 0.5, 1])
                .range(["#D13438", "#F7DC6F", "#107C10"]) as any;
        }

        if (scaleType === "mono") {
            return d3.scaleLinear<string>()
                .domain([0, 1])
                .range(["#F3F2F1", baseColor]) as any;
        }

        // sequential (default)
        return d3.scaleLinear<string>()
            .domain([0, 1])
            .range([d3.color(baseColor)!.copy({ opacity: 0.15 }).formatRgb(), baseColor]) as any;
    }

    /**
     * Wymagane przez starsze API panelu formatowania jako fallback;
     * primarną ścieżką jest getFormattingModel poniżej.
     */
    public enumerateObjectInstances(
        options: EnumerateVisualObjectInstancesOptions
    ): VisualObjectInstanceEnumeration {
        return [] as VisualObjectInstance[];
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
