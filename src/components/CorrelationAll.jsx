import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';


const CorrelationAll = ({ data, onSelect, selectedId, selectedExplainer, colorMetric, setColorMetric, visibleColors, toggleColor, colors, range, setRange, explainerColorScale, getFeatureColor }) => {
    const svgRef = useRef(null);
    const [tooltipContent, setTooltipContent] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [tooltipVisible, setTooltipVisible] = useState(false);

    const metrics = [
        { id: 'score_detection', label: 'Detection' },
        { id: 'score_embedding', label: 'Embedding' },
        { id: 'score_fuzz', label: 'Fuzz' },
    ];

    useEffect(() => {
        if (!svgRef.current || !data) return;

        const containerWidth = 470;
        const containerHeight = 480;

        const margin = { top: 30, right: 30, bottom: 40, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        svg.attr("width", containerWidth)
            .attr("height", containerHeight);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xExtent = d3.extent(data, d => d.similarity_mean);
        const xDomain = [0.1, 0.9];

        const x = d3.scaleLinear()
            .domain(xDomain)
            .range([0, width]);

        g.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .append("text")
            .attr("x", width)
            .attr("y", -10)
            .attr("fill", "currentColor")
            .style("font-size", "10px")
            .text("Similarity Average");

        const yExtent = d3.extent(data, d => d.similarity_var);
        const yMax = 0.11;

        const y = d3.scaleLinear()
            .domain([0, yMax])
            .range([height, 0]);

        g.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("x", 20)
            .attr("y", -10)
            .attr("fill", "currentColor")
            .style("font-size", "10px")
            .text("Similarity Variance");

        const extent = d3.extent(data, d => d[colorMetric]) || [0, 1];
        const minVal = extent[0];
        const maxVal = extent[1];
        const domain = colors.map((_, i) => minVal + (i * (maxVal - minVal) / (colors.length - 1)));

        const colorScale = d3.scaleLinear()
            .domain(domain)
            .range(colors);

        const [minFilter, maxFilter] = range || [minVal, maxVal];
        const filteredData = data.filter(d => d[colorMetric] >= minFilter && d[colorMetric] <= maxFilter);

        g.selectAll("circle")
            .data(filteredData)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.similarity_mean))
            .attr("cy", d => y(d.similarity_var))
            .attr("r", d => d.feature_id === selectedId ? 5 : 2)
            .style("fill", d => getFeatureColor ? getFeatureColor(d) : "#666")
            .style("stroke", d => {
                if (d.feature_id === selectedId) {
                    return explainerColorScale ? explainerColorScale(d.llm_explainer) : "#333";
                }
                return "none";
            })
            .style("stroke-width", d => {
                if (d.feature_id === selectedId) {
                    return 2.5;
                }
                return 0;
            })
            .style("opacity", 0.9)
            .on("mouseover", (event, d) => {
                setTooltipContent({
                    id: d.feature_id,
                    explainer: d.llm_explainer,
                    simMean: d.similarity_mean,
                    simVar: d.similarity_var,
                    score: d[colorMetric],
                    scoreLabel: metrics.find(m => m.id === colorMetric)?.label
                });
                setTooltipVisible(true);
            })
            .on("mouseleave", () => {
                setTooltipVisible(false);
            })
            .on("click", (event, d) => {
                event.stopPropagation();
                onSelect(d.feature_id, d.llm_explainer);
            })
            .on("mousemove", (event) => {
                setTooltipPos({ x: event.clientX, y: event.clientY });
            });

        if (selectedId) {
            const selectedPoints = filteredData.filter(d => d.feature_id === selectedId);
            if (selectedPoints.length > 1) {
                const lineGenerator = d3.line()
                    .x(d => x(d.similarity_mean))
                    .y(d => y(d.similarity_var));

                const pointsToDraw = [...selectedPoints];
                if (pointsToDraw.length > 2) pointsToDraw.push(pointsToDraw[0]);

                g.append("path")
                    .datum(pointsToDraw)
                    .attr("fill", "none")
                    .attr("stroke", "#555")
                    .attr("stroke-width", 1.5)
                    .attr("stroke-dasharray", "4 4")
                    .attr("d", lineGenerator)
                    .attr("pointer-events", "none");
            }
        }
    }, [data, colorMetric, selectedId, selectedExplainer, visibleColors, range, explainerColorScale, getFeatureColor]);

    const extent = useMemo(() => {
        if (!data) return [0, 1];
        return d3.extent(data, d => d[colorMetric]) || [0, 1];
    }, [data, colorMetric]);

    return (
        <div className="w-full h-full relative p-2 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">

            <div className="text-base font-bold text-slate-700 mb-2 px-1 border-b border-slate-200 pb-2">Similarity Score Scatter Graph</div>
            <div className="absolute top-14 right-4 flex flex-col gap-1 z-10 bg-white/80 p-2 rounded-md backdrop-blur-sm border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-16"></div>
                    <div className="w-16 flex justify-between text-[9px] text-slate-500 font-semibold leading-none">
                        <span>Low</span>
                        <span>High</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-600 w-16 text-right">Llama</span>
                    <div className="w-16 h-2 rounded-sm" style={{ background: 'linear-gradient(to right, #ffe0b2, #f57c00)' }}></div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-600 w-16 text-right">Gemini-flash</span>
                    <div className="w-16 h-2 rounded-sm" style={{ background: 'linear-gradient(to right, #bbdefb, #1e88e5)' }}></div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-600 w-16 text-right">GPT-4o-mini</span>
                    <div className="w-16 h-2 rounded-sm" style={{ background: 'linear-gradient(to right, #c8e6c9, #43a047)' }}></div>
                </div>
            </div>
            <div className="flex-1 relative min-h-0">
                <svg ref={svgRef} className="absolute inset-0 w-full h-full"></svg>
            </div>


            {
                tooltipVisible && tooltipContent && (
                    <div
                        className="absolute bg-white border border-slate-200 p-2 rounded shadow-lg pointer-events-none z-50 text-xs text-slate-700"
                        style={{
                            left: 0,
                            top: 0,
                            transform: `translate(${tooltipPos.x + 10}px, ${tooltipPos.y + 10}px)`,
                            position: 'fixed'
                        }}
                    >
                        <div className="font-bold mb-1">Feature {tooltipContent.id}</div>
                        <div className="mb-1 text-slate-500 max-w-[200px] truncate">
                            {(() => {
                                const lower = tooltipContent.explainer.toLowerCase();
                                if (lower.includes('llama')) return <span className="text-orange-600 font-bold">Llama</span>;
                                if (lower.includes('gemini')) return <span className="text-blue-600 font-bold">Gemini-flash</span>;
                                if (lower.includes('gpt')) return <span className="text-green-600 font-bold">GPT-4o-mini</span>;
                                return tooltipContent.explainer;
                            })()}
                        </div>
                        <div>Sim Avg: {tooltipContent.simMean?.toFixed(3)}</div>
                        <div>Sim Var: {tooltipContent.simVar?.toFixed(4)}</div>
                        <div>{tooltipContent.scoreLabel}: {tooltipContent.score?.toFixed(2)}</div>
                    </div>
                )
            }
        </div >
    );
};

export default CorrelationAll;
