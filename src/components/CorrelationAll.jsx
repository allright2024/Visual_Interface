import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

const CorrelationAll = ({ data, onSelect, selectedId, colorMetric, setColorMetric, visibleColors, toggleColor, colors }) => {
    const svgRef = useRef(null);
    const [tooltipContent, setTooltipContent] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const metrics = [
        { id: 'total_score', label: 'Total' },
        { id: 'score_detection', label: 'Detection' },
        { id: 'score_embedding', label: 'Embedding' },
        { id: 'score_fuzz', label: 'Fuzz' },
    ];

    useEffect(() => {
        if (!svgRef.current || !data) return;

        const containerWidth = 470;
        const containerHeight = 540;

        const margin = { top: 30, right: 30, bottom: 40, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        svg.attr("width", containerWidth)
            .attr("height", containerHeight);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain([0.76, 0.96])
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

        const y = d3.scaleLinear()
            .domain([0, 0.007])
            .range([height, 0]);

        g.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("x", 20)
            .attr("y", -10)
            .attr("fill", "currentColor")
            .style("font-size", "10px")
            .text("Similarity Variance");

        const colorScale = d3.scaleQuantile()
            .domain(data.map(d => d[colorMetric]))
            .range(colors);

        const filteredData = data.filter(d => visibleColors.has(colorScale(d[colorMetric])));

        g.selectAll("circle")
            .data(filteredData)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.similarity_mean))
            .attr("cy", d => y(d.similarity_var))
            .attr("r", d => d.feature_id === selectedId ? 5 : 2)
            .style("fill", d => colorScale(d[colorMetric]))
            .style("stroke", d => d.feature_id === selectedId ? "#333" : "none")
            .style("stroke-width", d => d.feature_id === selectedId ? 2 : 0)
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
            .on("click", (event, d) => {
                event.stopPropagation();
                onSelect(d.feature_id);
            })
            .on("mousemove", (event) => {
                setTooltipPos({ x: event.clientX, y: event.clientY });
            })
            .on("mouseleave", () => {
                setTooltipVisible(false);
            });

    }, [data, colorMetric, selectedId, visibleColors]);

    return (
        <div className="w-full h-full relative p-2 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="flex flex-col gap-2 mb-2 z-10 shrink-0">
                <div className="flex justify-center gap-4">
                    {metrics.map(metric => (
                        <label key={metric.id} className="flex items-center gap-1 text-xs font-semibold text-slate-600 cursor-pointer">
                            <input
                                type="radio"
                                name="colorMetricAll"
                                value={metric.id}
                                checked={colorMetric === metric.id}
                                onChange={(e) => setColorMetric(e.target.value)}
                                className="accent-blue-500"
                            />
                            {metric.label}
                        </label>
                    ))}
                </div>
                <div className="flex justify-center gap-2">
                    <span>Low Score</span>
                    {colors.map((color, idx) => (
                        <label key={color} className="flex items-center cursor-pointer" title={`Toggle range ${idx + 1}`}>
                            <input
                                type="checkbox"
                                checked={visibleColors.has(color)}
                                onChange={() => toggleColor(color)}
                                className="hidden"
                            />
                            <div
                                style={{
                                    backgroundColor: color,
                                    opacity: visibleColors.has(color) ? 1 : 0.3,
                                    border: visibleColors.has(color) ? '2px solid #333' : '1px solid #ddd'
                                }}
                                className="w-5 h-5 rounded-full transition-all duration-200"
                            ></div>
                        </label>
                    ))}
                    <span>High Score</span>
                </div>
            </div>
            <div className="flex-1 relative min-h-0">
                <svg ref={svgRef} className="absolute inset-0 w-full h-full"></svg>
            </div>

            {tooltipVisible && tooltipContent && (
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
                    <div className="mb-1 text-slate-500 max-w-[200px] truncate">{tooltipContent.explainer}</div>
                    <div>Sim Avg: {tooltipContent.simMean?.toFixed(3)}</div>
                    <div>Sim Var: {tooltipContent.simVar?.toFixed(4)}</div>
                    <div>{tooltipContent.scoreLabel}: {tooltipContent.score?.toFixed(2)}</div>
                </div>
            )}
        </div>
    );
};

export default CorrelationAll;
