import React, { useState, useEffect, useMemo } from "react";
import * as d3 from 'd3';
import CorrelationAll from "./components/CorrelationAll";
import ClusterMap from "./components/ClusterMap";
import DetailPanel from "./components/DetailPanel";
import RangeSlider from "./components/RangeSlider";
import RankTable from "./components/RankTable";

function App() {
  const [data, setData] = useState([]);
  const [avgData, setAvgData] = useState([])

  const [colorMetric, setColorMetric] = useState('score_detection');

  const [selectedFeatureId, setSelectedFeatureId] = useState(1);
  const [selectedExplainer, setSelectedExplainer] = useState("openai/gpt-4o-mini");
  const [scoreRange, setScoreRange] = useState(null);
  const [filters, setFilters] = useState({
    minSimilarity: 0,
    maxVariance: 0.1,
    excludedIds: new Set(),
  });

  const explainerGroups = ['Llama', 'Gemini-flash', 'GPT-4o-mini'];
  const [visibleExplainers, setVisibleExplainers] = useState(new Set(explainerGroups));

  useEffect(() => {
    fetch('/processed_data_v2.json')
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

  const dataForTable = useMemo(() => {
    const validMetricsData = data.filter(d => {
      if (d.similarity_mean < filters.minSimilarity) return false;
      if (d.similarity_var > filters.maxVariance) return false;
      return true;
    });

    const sorted = [...validMetricsData].sort((a, b) => (b[colorMetric] || 0) - (a[colorMetric] || 0));
    const ranked = sorted.map((d, i) => ({ ...d, globalRank: i + 1 }));

    return ranked.filter(d => {
      const explainer = d.llm_explainer.toLowerCase();
      for (const group of visibleExplainers) {
        if (explainer.includes(group.toLowerCase())) return true;
      }
      return false;
    });
  }, [data, filters.minSimilarity, filters.maxVariance, colorMetric, visibleExplainers]);

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

  const scoreExtent = useMemo(() => {
    if (!data || data.length === 0) return [0, 1];
    return d3.extent(data, d => d[colorMetric]) || [0, 1];
  }, [data, colorMetric]);

  const getFeatureColor = useMemo(() => {
    if (!data || data.length === 0) return () => "#666";

    const geminiScale = d3.scaleSequential(d3.interpolateBlues);
    const llamaScale = d3.scaleSequential(d3.interpolateOranges);
    const gptScale = d3.scaleSequential(d3.interpolateGreens);
    const defaultScale = d3.scaleSequential(d3.interpolateGreys);

    const normalize = d3.scaleLinear()
      .domain(scoreExtent)
      .range([0.3, 1]);

    return (feature) => {
      const explainer = feature.llm_explainer.toLowerCase();
      const score = feature[colorMetric];
      const intensity = normalize(score);

      if (explainer.includes('gemini')) return geminiScale(intensity);
      if (explainer.includes('llama')) return llamaScale(intensity);
      if (explainer.includes('gpt')) return gptScale(intensity);
      return defaultScale(intensity);
    };
  }, [data, colorMetric, scoreExtent]);

  const getExplainerBaseColor = useMemo(() => {
    return (explainerName) => {
      const name = explainerName.toLowerCase();
      if (name.includes('gemini')) return d3.interpolateBlues(0.8);
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
      <div className="shrink-0 grid grid-cols-10 gap-2 mb-2">
        <div className="col-span-7 h-10 flex items-center bg-white border-2 border-stone-300 rounded-xl shadow-sm divide-x divide-stone-200">
          <div className="flex items-center gap-4 px-4 h-full hover:bg-slate-50 transition-colors">
            <span className="text-xs font-extrabold text-slate-700 tracking-tight">Select LLMs</span>
            <div className="flex items-center gap-3">
              {explainerGroups.map(group => {
                let colorClass = "accent-gray-600";
                if (group.includes('Llama')) colorClass = "accent-orange-600";
                else if (group.includes('Gemini')) colorClass = "accent-blue-600";
                else if (group.includes('GPT')) colorClass = "accent-green-600";

                return (
                  <label key={group} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer select-none hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={visibleExplainers.has(group)}
                      onChange={() => handleToggleExplainer(group)}
                      className={`w-3.5 h-3.5 rounded border-slate-300 ${colorClass}`}
                    />
                    {group}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 px-4 h-full flex-1 justify-center hover:bg-slate-50 transition-colors">
            <span className="text-xs font-extrabold text-slate-700 tracking-tight">Select Score</span>
            <div className="flex items-center gap-3">
              {[
                { id: 'score_detection', label: 'Detection' },
                { id: 'score_embedding', label: 'Embedding' },
                { id: 'score_fuzz', label: 'Fuzz' },
              ].map(metric => (
                <label key={metric.id} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer select-none hover:text-slate-900">
                  <input
                    type="radio"
                    name="colorMetricApp"
                    value={metric.id}
                    checked={colorMetric === metric.id}
                    onChange={(e) => setColorMetric(e.target.value)}
                    className="w-3.5 h-3.5 accent-blue-500"
                  />
                  {metric.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 px-4 h-full w-[340px] hover:bg-slate-50 transition-colors">
            <span className="text-xs font-extrabold text-slate-700 tracking-tight whitespace-nowrap">Score Range</span>
            <div className="flex-1 min-w-0">
              <RangeSlider
                min={0}
                max={1}
                value={scoreRange}
                onChange={setScoreRange}
                colors={sliderColors}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-rows-12 grid-cols-10 gap-2 min-h-0">
        <div className="row-span-7 col-span-3 flex flex-col gap-2 min-h-0 rounded-xl border border-2 border-stone-300">
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
        <div className="row-span-7 col-span-4 p-0 rounded-xl border border-2 border-stone-300 min-h-0">
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

        <div className="row-start-8 row-span-4 col-span-3 p-0 border-stone-300 border-2 rounded-xl flex flex-col min-h-0 overflow-hidden">
          <RankTable
            data={dataForTable}
            onSelect={handleSelectFeature}
            selectedId={selectedFeatureId}
            onToggle={handleToggleExclusion}
            excludedIds={filters.excludedIds}
            visibleFeatureIds={new Set(filteredData.map(d => d.feature_id))}
            sortKey={colorMetric}
            onSortChange={setColorMetric}
            selectedExplainer={selectedExplainer}
          />
        </div>
        <div className="row-start-8 row-span-4 col-span-4 border-stone-300 border-2 p-2 rounded-xl flex flex-col min-h-0 overflow-hidden">
          <DetailPanel
            data={data}
            selectedFeatureId={selectedFeatureId}
            selectedExplainer={selectedExplainer}
            explainerColorScale={getExplainerBaseColor}
            onSelect={handleSelectFeature}
            visibleExplainers={visibleExplainers}
          />
        </div>
      </div>

    </div>
  )


}

export default App;