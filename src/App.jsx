import React, { useState, useEffect, useMemo } from "react";
import * as d3 from 'd3';
import CorrelationAll from "./components/CorrelationAll";
import ClusterMap from "./components/ClusterMap";
import DetailPanel from "./components/DetailPanel";
import RankTable from "./components/RankTable";

function App() {
  const [data, setData] = useState([]);
  const [avgData, setAvgData] = useState([])

  const [colorMetric, setColorMetric] = useState('total_score');

  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [selectedExplainer, setSelectedExplainer] = useState(null);
  const [scoreRange, setScoreRange] = useState(null);
  const [filters, setFilters] = useState({
    minSimilarity: 0,
    maxVariance: 0.222,
    excludedIds: new Set(),
  });

  const explainerGroups = ['Qwen', 'Llama', 'GPT'];
  const [visibleExplainers, setVisibleExplainers] = useState(new Set(explainerGroups));

  useEffect(() => {
    fetch('/processed_data.json')
      .then(res => {
        if (!res.ok) throw new Error("Data not found");
        return res.json();
      })
      .then(jsonData => {
        setData(jsonData);
      })
      .catch(err => {
        console.error("Failed to load data: ", err);
      });
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      if (filters.excludedIds.has(d.feature_id)) return false;

      const explainer = d.llm_explainer.toLowerCase();
      let matched = false;
      for (const group of visibleExplainers) {
        if (explainer.includes(group.toLowerCase())) {
          matched = true;
          break;
        }
      }
      if (!matched) return false;

      return true;
    });
  }, [data, filters, visibleExplainers]);

  /* Table Sorting State */
  const [tableSortKey, setTableSortKey] = useState('total_score');

  const dataForTable = useMemo(() => {
    // 1. Filter by metrics (Similarity/Variance)
    const validMetricsData = data.filter(d => {
      if (d.similarity_mean < filters.minSimilarity) return false;
      if (d.similarity_var > filters.maxVariance) return false;
      return true;
    });

    // 2. Sort and assign Rank (Global Rank among valid metrics)
    const sorted = [...validMetricsData].sort((a, b) => (b[tableSortKey] || 0) - (a[tableSortKey] || 0));
    const ranked = sorted.map((d, i) => ({ ...d, globalRank: i + 1 }));

    // 3. Filter by Visible Explainers
    return ranked.filter(d => {
      const explainer = d.llm_explainer.toLowerCase();
      for (const group of visibleExplainers) {
        if (explainer.includes(group.toLowerCase())) return true;
      }
      return false;
    });
  }, [data, filters.minSimilarity, filters.maxVariance, tableSortKey, visibleExplainers]);

  const handleSelectFeature = (id, explainer = null) => {
    setSelectedFeatureId(id);
    setSelectedExplainer(explainer);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  const handleToggleExclusion = (id) => {
    setFilters(prev => {
      const newSet = new Set(prev.excludedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return { ...prev, excludedIds: newSet };
    })
  }

  useEffect(() => {
    setScoreRange(null);
  }, [colorMetric]);

  const colors = [
    "#8F00FF",
    "#808080",
    "#0000FF",
    "#008000",
    "#FFB6C1",
    "#FFA500",
    "#FF0000"
  ];

  const [visibleColors, setVisibleColors] = useState(new Set(colors));

  const toggleColor = (color) => {
    const newSet = new Set(visibleColors);
    if (newSet.has(color)) newSet.delete(color);
    else newSet.add(color);
    setVisibleColors(newSet);
  };

  const handleToggleExplainer = (group) => {
    setVisibleExplainers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(group)) newSet.delete(group);
      else newSet.add(group);
      return newSet;
    });
  };

  const getFeatureColor = useMemo(() => {
    if (!data || data.length === 0) return () => "#666";

    const qwenScale = d3.scaleSequential(d3.interpolateBlues);
    const llamaScale = d3.scaleSequential(d3.interpolateOranges);
    const gptScale = d3.scaleSequential(d3.interpolateGreens);
    const defaultScale = d3.scaleSequential(d3.interpolateGreys);

    const extent = d3.extent(data, d => d[colorMetric]) || [0, 1];

    const normalize = d3.scaleLinear()
      .domain(extent)
      .range([0.3, 1]);

    return (feature) => {
      const explainer = feature.llm_explainer.toLowerCase();
      const score = feature[colorMetric];
      const intensity = normalize(score);

      if (explainer.includes('qwen')) return qwenScale(intensity);
      if (explainer.includes('llama')) return llamaScale(intensity);
      if (explainer.includes('gpt')) return gptScale(intensity);
      return defaultScale(intensity);
    };
  }, [data, colorMetric]);

  const getExplainerBaseColor = useMemo(() => {
    return (explainerName) => {
      const name = explainerName.toLowerCase();
      if (name.includes('qwen')) return d3.interpolateBlues(0.8);
      if (name.includes('llama')) return d3.interpolateOranges(0.8);
      if (name.includes('gpt')) return d3.interpolateGreens(0.8);
      return "#666";
    }
  }, []);

  const globalXDomain = useMemo(() => {
    if (!data || data.length === 0) return [0, 10];
    return d3.extent(data, d => d.x);
  }, [data]);

  const globalYDomain = useMemo(() => {
    if (!data || data.length === 0) return [0, 10];
    return d3.extent(data, d => d.y);
  }, [data]);

  const sliderColors = ['#e5e7eb', '#1f2937'];

  return (
    <div className="h-screen bg-slate-50 p-2 font-sans text-slate-800 overflow-hidden flex flex-col">
      <div className="h-10 shrink-0 flex items-center justify-between px-4 mb-2 bg-white border border-slate-300 rounded-lg shadow-sm">
        <div className="font-bold text-slate-600">Explore Features</div>
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold text-slate-500 mr-2">Visible LLMs:</span>
          {explainerGroups.map(group => (
            <label key={group} className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visibleExplainers.has(group)}
                onChange={() => handleToggleExplainer(group)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              {group}
            </label>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-rows-12 gap-2 min-h-0">
        <div className="row-span-8 flex flex-row gap-2 min-h-0">
          <div className="flex-[3] flex flex-col gap-2 min-h-0 rounded-xl border border-2 border-stone-300">
            <CorrelationAll
              data={filteredData}
              onSelect={handleSelectFeature}
              selectedId={selectedFeatureId}
              colorMetric={colorMetric}
              setColorMetric={setColorMetric}
              visibleColors={visibleColors}
              toggleColor={toggleColor}
              colors={sliderColors}
              range={scoreRange}
              setRange={setScoreRange}
              getFeatureColor={getFeatureColor}
              getExplainerBaseColor={getExplainerBaseColor}
              explainerColorScale={getExplainerBaseColor}
              selectedExplainer={selectedExplainer}
            />
          </div>
          <div className="flex-[7] p-0 rounded-xl border border-2 border-stone-300 min-h-0">
            <ClusterMap
              data={filteredData}
              onSelect={handleSelectFeature}
              selectedId={selectedFeatureId}
              colorMetric={colorMetric}
              visibleColors={visibleColors}
              toggleColor={toggleColor}
              colors={sliderColors}
              range={scoreRange}
              setRange={setScoreRange}
              getFeatureColor={getFeatureColor}
              explainerColorScale={getExplainerBaseColor}
              propsXDomain={globalXDomain}
              propsYDomain={globalYDomain}
            />
          </div>
        </div>
        <div className="row-span-4 flex flex-row gap-2 min-h-0">
          <div className="flex-[2.95] p-0 border-stone-300 border-2 rounded-xl flex flex-col min-h-0">
            <RankTable
              data={dataForTable}
              onSelect={handleSelectFeature}
              selectedId={selectedFeatureId}
              onToggle={handleToggleExclusion}
              excludedIds={filters.excludedIds}
              visibleFeatureIds={new Set(filteredData.map(d => d.feature_id))}
              sortKey={tableSortKey}
              onSortChange={setTableSortKey}
            />
          </div>
          <div className="flex-[7.05] border-stone-300 border-2 p-2 rounded-xl">
            <DetailPanel
              data={data}
              selectedFeatureId={selectedFeatureId}
              selectedExplainer={selectedExplainer}
              explainerColorScale={getExplainerBaseColor}
            />
          </div>
          {/* <div className="flex-[2] rounded-xl border border-2 p-2 border-stone-300">

          </div> */}
        </div>

      </div>

    </div>
  )


}

export default App;