import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

const ClusterMap = ({ data, onSelect, selectedId, colorMetric = 'total_score', visibleColors, toggleColor, colors }) => {
    const svgRef = useRef(null);
    const [tooltipContent, setTooltipContent] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [tooltipVisible, setTooltipVisible] = useState(false);

    useEffect(() => {
        if (!svgRef.current || !data || data.length === 0) return;
        const margin = { top: 30, right: 30, bottom: 40, left: 100 };
        const width = 850 - margin.left - margin.right;
        const height = 530 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        svg.attr("width", 850)
            .attr("height", 530);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);


        const xMin = 4;
        const xMax = d3.max(data, d => d.x);

        const x = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([0, width]);


        const yMin = d3.min(data, d => d.y);
        const yMax = d3.max(data, d => d.y);
        const yPadding = (yMax - yMin) * 0.05;

        const y = d3.scaleLinear()
            .domain([yMin - yPadding, yMax + yPadding])
            .range([height, 0]);


        const featureScores = new Map();
        const groups = d3.group(data, d => d.feature_id);
        const aggregatedScores = [];

        for (const [id, items] of groups) {
            const score = d3.mean(items, d => d[colorMetric]);
            featureScores.set(id, score);
            aggregatedScores.push(score);
        }

        const colorScale = d3.scaleQuantile()
            .domain(aggregatedScores)
            .range(colors);

        const filteredData = data.filter(d => {
            const score = featureScores.get(d.feature_id);
            const color = colorScale(score);
            return visibleColors.has(color);
        });


        g.selectAll("circle")
            .data(filteredData)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.x))
            .attr("cy", d => y(d.y))
            .attr("r", d => d.feature_id === selectedId ? 5 : 2)
            .style("fill", d => colorScale(featureScores.get(d.feature_id)))
            .style("opacity", d => d.feature_id === selectedId ? 1 : 0.9)
            .style("stroke", d => d.feature_id === selectedId ? "black" : "none")
            .style("stroke-width", d => d.feature_id === selectedId ? 2.0 : 0)
            .on("mouseover", (event, d) => {
                setTooltipContent({
                    id: d.feature_id,
                    explainer: d.llm_explainer,
                    cluster: d.cluster_id,
                    x: d.x,
                    y: d.y
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

    }, [data, selectedId, colorMetric, visibleColors, colors]);

    return (
        <div className="w-full h-full relative p-2 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            <h3 className="text-sm font-bold text-slate-500 mb-2 text-center">Semantic Clusters (UMAP)</h3>

            <div className="flex justify-center gap-2 mb-2">
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

            <div className="flex-1 relative">
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
                    <div>Cluster ID: {tooltipContent.cluster}</div>
                    <div>X: {tooltipContent.x?.toFixed(2)}</div>
                    <div>Y: {tooltipContent.y?.toFixed(2)}</div>
                </div>
            )}
        </div>
    );
};

export default ClusterMap;
