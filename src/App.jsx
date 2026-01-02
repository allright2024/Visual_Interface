import React, { useState, useEffect, useMemo } from "react";
import CorrelationAll from "./components/CorrelationAll";
import ClusterMap from "./components/ClusterMap";
import DetailPanel from "./components/DetailPanel";
import RankTable from "./components/RankTable";

function App() {
  const [data, setData] = useState([]);
  const [avgData, setAvgData] = useState([])

  const [colorMetric, setColorMetric] = useState('total_score');

  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [filters, setFilters] = useState({
    minSimilarity: 0,
    maxVariance: 0.222,
    excludedIds: new Set(),
  });

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
      return true;
    });
  }, [data, filters]);

  const dataForTable = useMemo(() => {
    return data.filter(d => {
      if (d.similarity_mean < filters.minSimilarity) return false;
      if (d.similarity_var > filters.maxVariance) return false;
      return true;
    });
  }, [data, filters.minSimilarity, filters.maxVariance])

  const handleSelectFeature = (id) => setSelectedFeatureId(id);

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

  return (
    <div className="h-screen bg-slate-50 p-2 font-sans text-slate-800 overflow-hidden flex flex-col">
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
              colors={colors}
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
              colors={colors}
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
            />
          </div>
          <div className="flex-[7.05] border-stone-300 border-2 p-2 rounded-xl">
            <DetailPanel data={data} selectedFeatureId={selectedFeatureId} />
          </div>
          {/* <div className="flex-[2] rounded-xl border border-2 p-2 border-stone-300">

          </div> */}
        </div>

      </div>

    </div>
  )


}

export default App;