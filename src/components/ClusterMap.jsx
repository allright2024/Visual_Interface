import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';


const ClusterMap = ({ data, onSelect, selectedId, selectedExplainer, colorMetric = 'total_score', visibleColors, toggleColor, colors, range, setRange, explainerColorScale, getFeatureColor, propsXDomain, propsYDomain }) => {
    const svgRef = useRef(null);
    const [tooltipContent, setTooltipContent] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [showDensity, setShowDensity] = useState(true);

    useEffect(() => {
        if (!svgRef.current || !data) return;

        const element = svgRef.current;
        const rect = element.getBoundingClientRect();
        const margin = { top: 10, right: 10, bottom: 10, left: 10 };

        const width = rect.width - margin.left - margin.right;
        const height = rect.height - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);


        const xMin = 4;

        const xDomain = propsXDomain || [xMin, d3.max(data, d => d.x)];

        const x = d3.scaleLinear()
            .domain(xDomain)
            .range([0, width]);


        const yMin = d3.min(data, d => d.y);
        const yMax = d3.max(data, d => d.y);

        const yDomain = propsYDomain || [yMin, yMax];
        const yPadding = (yDomain[1] - yDomain[0]) * 0.05;

        const y = d3.scaleLinear()
            .domain([yDomain[0] - yPadding, yDomain[1] + yPadding])
            .range([height, 0]);

        const extent = d3.extent(data, d => d[colorMetric]) || [0, 1];
        const minVal = extent[0];
        const maxVal = extent[1];
        const domain = colors.map((_, i) => minVal + (i * (maxVal - minVal) / (colors.length - 1)));

        const colorScale = d3.scaleLinear()
            .domain(domain)
            .range(colors);

        const [minFilter, maxFilter] = range || [minVal, maxVal];
        const filteredData = data.filter(d => d[colorMetric] >= minFilter && d[colorMetric] <= maxFilter);

        if (showDensity) {
            const densityData = d3.contourDensity()
                .x(d => x(d.x))
                .y(d => y(d.y))
                .size([width, height])
                .bandwidth(25)
                .thresholds(15)
                (filteredData);

            const densityColor = d3.scaleLinear()
                .domain(d3.extent(densityData, d => d.value))
                .range(["transparent", "#94a3b8"]);

            g.append("g")
                .attr("class", "densities")
                .selectAll("path")
                .data(densityData)
                .enter().append("path")
                .attr("d", d3.geoPath())
                .attr("fill", d => densityColor(d.value))
                .attr("opacity", 0.5);
        }


        g.selectAll("circle")
            .data(filteredData)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.x))
            .attr("cy", d => y(d.y))
            .attr("r", d => d.feature_id === selectedId ? 5 : 2)
            .style("fill", d => getFeatureColor ? getFeatureColor(d) : "#666")
            .style("opacity", d => d.feature_id === selectedId ? 1 : 0.9)
            .style("stroke", d => {
                if (d.feature_id === selectedId) {
                    return explainerColorScale ? explainerColorScale(d.llm_explainer) : "black";
                }
                return "none";
            })
            .style("stroke-width", d => {
                if (d.feature_id === selectedId) {
                    return 2.5;
                }
                return 0;
            })
            .on("mouseover", (event, d) => {
                setTooltipContent({
                    id: d.feature_id,
                    explainer: d.llm_explainer,
                    cluster: d.cluster_id,
                    score: d[colorMetric],
                    x: d.x,
                    y: d.y
                });
                setTooltipVisible(true);
            })
            .on("click", (event, d) => {
                event.stopPropagation();
                onSelect(d.feature_id, d.llm_explainer);
            })
            .on("mousemove", (event) => {
                setTooltipPos({ x: event.clientX, y: event.clientY });
            })
            .on("mouseleave", () => {
                setTooltipVisible(false);
            });

        if (selectedId) {
            const selectedPoints = filteredData.filter(d => d.feature_id === selectedId);
            if (selectedPoints.length > 1) {
                const lineGenerator = d3.line()
                    .x(d => x(d.x))
                    .y(d => y(d.y));

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
    }, [data, selectedId, selectedExplainer, colorMetric, visibleColors, colors, showDensity, range, explainerColorScale, getFeatureColor]);

    const extent = useMemo(() => {
        if (!data || data.length === 0) return [0, 1];
        return d3.extent(data, d => d[colorMetric]) || [0, 1];
    }, [data, colorMetric]);

    return (
        <div className="w-full h-full relative p-2 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            <h3 className="text-base font-bold text-slate-700 mb-2 px-1 border-b border-slate-200 pb-2">Semantic Clusters (UMAP)</h3>
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
                    <div className="mb-1 text-slate-500 max-w-[200px] truncate">
                        {(() => {
                            const lower = tooltipContent.explainer.toLowerCase();
                            if (lower.includes('llama')) return <span className="text-orange-600 font-bold">Llama</span>;
                            if (lower.includes('gemini')) return <span className="text-blue-600 font-bold">Gemini-flash</span>;
                            if (lower.includes('gpt')) return <span className="text-green-600 font-bold">GPT-4o-mini</span>;
                            return tooltipContent.explainer;
                        })()}
                    </div>
                    <div>
                        {{
                            'score_detection': 'Detection',
                            'score_embedding': 'Embedding',
                            'score_fuzz': 'Fuzz',
                            'total_score': 'Total Score'
                        }[colorMetric] || 'Score'}: {tooltipContent.score?.toFixed(2)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClusterMap;
