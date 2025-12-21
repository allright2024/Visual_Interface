import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const CorrelationChartsAvg = ({ data, onSelect, selectedId }) => {
    const svgRef = useRef(null);
    const [tooltipContent, setTooltipContent] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [yMetric, setYMetric] = useState('total_score');

    const metrics = [
        { id: 'total_score', label: 'Total' },
        { id: 'score_detection', label: 'Detection' },
        { id: 'score_embedding', label: 'Embedding' },
        { id: 'score_fuzz', label: 'Fuzz' },
    ];

    useEffect(() => {
        console.log(data.length);
        if (!svgRef.current || !data || data.length === 0) return;

        const containerWidth = 470;
        const containerHeight = 260;

        const margin = { top: 30, right: 30, bottom: 40, left: 50 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        console.log("correlation charts width", width);
        console.log("correlation charts height", height);

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        svg.attr("width", containerWidth)
            .attr("height", containerHeight);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain([0, 0.01])
            .range([0, width]);

        g.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .append("text")
            .attr("x", width)
            .attr("y", -10)
            .attr("fill", "currentColor")
            .style("font-size", "10px")
            .text("Similarity Variance");

        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);

        g.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("x", 60)
            .attr('y', -15)
            .attr("fill", "currentColor")
            .style("font-size", "10px")
            .text(metrics.find(m => m.id === yMetric)?.label + " Score");

        g.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.similarity_var))
            .attr("cy", d => y(d[yMetric]))
            .attr("r", d => d.feature_id === selectedId ? 4 : 2)
            .style("fill", d => d.feature_id === selectedId ? "#ef4444" : "#69b3a2")
            .style("opacity", d => d.feature_id === selectedId ? 1 : 0.8)
            .on("mouseover", (event, d) => {
                setTooltipContent({
                    id: d.feature_id,
                    explainer: d.llm_explainer,
                    similarity: d.similarity_var,
                    yScore: d[yMetric],
                    yLabel: metrics.find(m => m.id === yMetric)?.label
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

    }, [data, yMetric, selectedId]);

    return (
        <div className="w-full h-full relative p-2 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="flex justify-center gap-4 mb-2 z-10">
                {metrics.map(metric => (
                    <label key={metric.id} className="flex items-center gap-1 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input
                            type="radio"
                            name="yMetricVar"
                            value={metric.id}
                            checked={yMetric === metric.id}
                            onChange={(e) => setYMetric(e.target.value)}
                            className="accent-blue-500"
                        />
                        {metric.label}
                    </label>
                ))}
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
                    <div>Sim Var: {tooltipContent.similarity?.toFixed(2)}</div>
                    <div>{tooltipContent.yLabel}: {tooltipContent.yScore?.toFixed(2)}</div>
                </div>
            )}
        </div>
    );
};

export default CorrelationChartsAvg;