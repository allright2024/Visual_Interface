import React, { useMemo, useState } from "react";

const RankTable = ({ data, onSelect, selectedId, onToggle, excludedIds, visibleFeatureIds }) => {
    const [sortKey, setSortKey] = useState('total_score');

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
    }, [data, sortKey]);

    return (
        <div className="flex-1 overflow-auto rounded-xl border border-stone-300">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                        <th className="p-2 border-b w-12">Rank</th>
                        <th className="p-2 border-b">Explainer (Feature)</th>
                        <th className="p-2 border-b">
                            <select
                                value={sortKey}
                                onChange={(e) => setSortKey(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 cursor-pointer font-semibold uppercase text-xs p-0 outline-none"
                            >
                                <option value="total_score">Total</option>
                                <option value="score_detection">Detect</option>
                                <option value="score_embedding">Embed</option>
                                <option value="score_fuzz">Fuzz</option>
                            </select>
                        </th>
                        <th className="p-2 border-b text-center w-10">Vis</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((item, index) => {
                        const isVisible = visibleFeatureIds?.has(item.feature_id) ?? true;
                        const isSelected = selectedId === item.feature_id;
                        return (
                            <tr
                                key={`${item.feature_id}-${item.explanation_index}`}
                                className={`border-b last:border-0 hover:bg-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-100' : 'bg-white'}`}
                                onClick={() => onSelect(item.feature_id)}
                            >
                                <td className="p-2 text-slate-400 font-mono text-xs">{index + 1}</td>
                                <td className="p-2">
                                    <div className="font-medium text-xs truncate max-w-[120px]" title={item.llm_explainer}>
                                        Feature {item.feature_id}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        {item.llm_explainer}
                                    </div>
                                </td>
                                <td className="p-2 font-mono text-xs">{item[sortKey]?.toFixed(3)}</td>
                                <td className="p-2 text-center">
                                    <input
                                        type="checkbox"
                                        checked={isVisible}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            onToggle(item.feature_id);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default RankTable;