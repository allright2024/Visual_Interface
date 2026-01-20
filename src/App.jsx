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
  const [scoreRanges, setScoreRanges] = useState({
    'Llama': [0, 1],
    'Gemini-flash': [0, 1],
    'GPT-4o-mini': [0, 1]
  });
  const [filters, setFilters] = useState({
    minSimilarity: 0,
    maxVariance: 0.1,
    excludedIds: new Set(),
  });

  const explainerGroups = ['Llama', 'Gemini-flash', 'GPT-4o-mini'];
  const [visibleExplainers, setVisibleExplainers] = useState(new Set(explainerGroups));

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}processed_data_v2.json`)
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
      let matchedGroup = null;

      for (const group of visibleExplainers) {
        if (explainer.includes(group.toLowerCase())) {
          matched = true;
          matchedGroup = group;
          break;
        }
      }
      if (!matched) return false;

      // Apply Score Range Filter
      if (colorMetric) {
        const range = scoreRanges[matchedGroup];
        if (range) {
          const score = d[colorMetric];
          if (score < range[0] || score > range[1]) return false;
        }
      }

      return true;
    });
  }, [data, filters, visibleExplainers, colorMetric, scoreRanges]);

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

  const [globalRange, setGlobalRange] = useState([0, 1]);

  useEffect(() => {
    setScoreRanges({
      'Llama': [0, 1],
      'Gemini-flash': [0, 1],
      'GPT-4o-mini': [0, 1]
    });
    setGlobalRange([0, 1]);
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
        <div className="col-span-7 flex bg-white border-2 border-stone-300 rounded-xl shadow-sm divide-x divide-stone-200">
          <div className="flex flex-col flex-1 min-w-0 divide-y divide-stone-200">
            <div className="flex items-center gap-4 px-4 flex-1 hover:bg-slate-50 transition-colors">
              <span className="text-xs font-extrabold text-slate-700 tracking-tight w-28 shrink-0">Select LLMs</span>
              <div className="flex items-center gap-5">
                {explainerGroups.map(group => {
                  let colorClass = "accent-gray-600";
                  let gradientStyle = {};
                  if (group.includes('Llama')) {
                    colorClass = "accent-orange-600";
                    gradientStyle = { background: 'linear-gradient(to right, #ffe0b2, #f57c00)' };
                  } else if (group.includes('Gemini')) {
                    colorClass = "accent-blue-600";
                    gradientStyle = { background: 'linear-gradient(to right, #bbdefb, #1e88e5)' };
                  } else if (group.includes('GPT')) {
                    colorClass = "accent-green-600";
                    gradientStyle = { background: 'linear-gradient(to right, #c8e6c9, #43a047)' };
                  }

                  return (
                    <div key={group} className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer select-none hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={visibleExplainers.has(group)}
                          onChange={() => handleToggleExplainer(group)}
                          className={`w-3.5 h-3.5 rounded border-slate-300 ${colorClass}`}
                        />
                        {group}
                      </label>
                      <div className="flex flex-col gap-0.5">
                        <div className="w-12 h-2 rounded-sm opacity-90 border border-slate-200" style={gradientStyle} title={`Score Intensity: Low -> High (${group})`}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4 px-4 flex-1 hover:bg-slate-50 transition-colors">
              <span className="text-xs font-extrabold text-slate-700 tracking-tight w-28 shrink-0">Select Score Metric</span>
              <div className="flex items-center gap-4">
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
          </div>

          <div className="flex items-center gap-2 px-4 h-full w-[340px] hover:bg-slate-50 transition-colors">
            <div className="flex flex-col items-start justify-center">
              <span className="text-xs font-extrabold text-slate-700 tracking-tight whitespace-nowrap">Set Score Range</span>
              <span className="text-[10px] font-semibold text-slate-500 w-full text-center">({
                {
                  'score_detection': 'Detection',
                  'score_embedding': 'Embedding',
                  'score_fuzz': 'Fuzz'
                }[colorMetric]
              })</span>
            </div>
            <div className="flex-1 flex flex-col justify-center h-full gap-1 min-w-0 py-1">
              {/* Global Slider */}
              <div className="flex items-center gap-2 h-6 w-full border-b border-slate-100 pb-1 mb-1">
                <span className="text-[10px] font-extrabold w-12 text-right shrink-0 text-slate-800">All</span>
                <span className="text-[8px] text-slate-400 font-mono w-6 text-right">{globalRange[0].toFixed(2)}</span>
                <div className="flex-1 min-w-0 pt-1">
                  <RangeSlider
                    min={0}
                    max={1}
                    value={globalRange}
                    onChange={(newRange) => {
                      setGlobalRange(newRange);
                      setScoreRanges(prev => {
                        const next = { ...prev };
                        for (const key in next) next[key] = newRange;
                        return next;
                      });
                    }}
                    colors={sliderColors}
                    hideLabels={true}
                  />
                </div>
                <span className="text-[8px] text-slate-400 font-mono w-6 text-left">{globalRange[1].toFixed(2)}</span>
              </div>

              {explainerGroups.map(group => {
                let colorClass = "accent-gray-600";
                let groupSliderColors = sliderColors;

                if (group.includes('Llama')) {
                  colorClass = "text-orange-600";
                  groupSliderColors = ['#ffe0b2', '#f57c00'];
                } else if (group.includes('Gemini')) {
                  colorClass = "text-blue-600";
                  groupSliderColors = ['#bbdefb', '#1e88e5'];
                } else if (group.includes('GPT')) {
                  colorClass = "text-green-600";
                  groupSliderColors = ['#c8e6c9', '#43a047'];
                }

                const currentRange = scoreRanges[group] || [0, 1];

                return (
                  <div key={group} className="flex items-center gap-2 h-6 w-full">
                    <span className={`text-[9px] font-bold w-12 text-right shrink-0 ${colorClass}`}>{group.replace('Gemini-flash', 'Gemini').replace('GPT-4o-mini', 'GPT-4o')}</span>
                    <span className="text-[8px] text-slate-400 font-mono w-6 text-right">{currentRange[0].toFixed(2)}</span>
                    <div className="flex-1 min-w-0 pt-1">
                      <RangeSlider
                        min={0}
                        max={1}
                        value={currentRange}
                        onChange={(newRange) => {
                          setScoreRanges(prev => ({
                            ...prev,
                            [group]: newRange
                          }));
                        }}
                        colors={groupSliderColors}
                        hideLabels={true}
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono w-6 text-left">{currentRange[1].toFixed(2)}</span>
                  </div>
                )
              })}
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
        <div className="row-start-8 row-span-4 col-span-4 bg-white border-stone-300 border-2 p-2 rounded-xl flex flex-col min-h-0 overflow-hidden">
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