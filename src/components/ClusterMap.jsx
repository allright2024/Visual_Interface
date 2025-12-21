import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const ClusterMap = ({ data, onSelect, selectedId }) => {
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


        const xMin = d3.min(data, d => d.x);
        const xMax = d3.max(data, d => d.x);

        const x = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([0, width]);

        g.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x).ticks(10))
            .append("text")
            .attr("x", width)
            .attr("y", -10)
            .attr("fill", "currentColor")
            .style("font-size", "10px")
            .text("UMAP Dimension 1");

        const yMin = d3.min(data, d => d.y);
        const yMax = d3.max(data, d => d.y);
        const yPadding = (yMax - yMin) * 0.05;

        const y = d3.scaleLinear()
            .domain([yMin - yPadding, yMax + yPadding])
            .range([height, 0]);

        g.append("g")
            .call(d3.axisLeft(y).ticks(10))
            .append("text")
            .attr("x", 10)
            .attr("y", -10)
            .attr("fill", "currentColor")
            .style("font-size", "10px")
            .text("UMAP Dimension 2");


        const clusterIds = data.map(d => d.cluster_id).filter(id => id >= 0);
        const maxClusterId = d3.max(clusterIds) || 0;

        const color = d3.scaleSequential()
            .domain([0, maxClusterId])
            .interpolator(d3.interpolateTurbo);

        g.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.x))
            .attr("cy", d => y(d.y))
            .attr("r", d => d.feature_id === selectedId ? 5 : 3)
            .style("fill", d => d.feature_id === selectedId ? "#ef4444" : color(d.cluster_id))
            .style("opacity", d => d.feature_id === selectedId ? 1 : 0.6)
            .style("stroke", d => d.feature_id === selectedId ? "black" : "none")
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

    }, [data, selectedId]);

    return (
        <div className="w-full h-full relative p-2 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            <h3 className="text-sm font-bold text-slate-500 mb-2 text-center">Semantic Clusters (UMAP)</h3>
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
