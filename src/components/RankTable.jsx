import React, { useMemo, useState } from "react";

const RankTable = ({ data, onSelect, selectedId, onToggle, excludedIds, visibleFeatureIds }) => {
    const [sortKey, setSortKey] = useState('total_score');

    const uniqueFeatures = useMemo(() => {
        const map = new Map();
        data.forEach(d => {
            if (!map.has(d.feature_id)) {
                map.set(d.feature_id, {
                    feature_id: d.feature_id,
                    scores_total: [],
                    scores_detection: [],
                    scores_embedding: [],
                    scores_fuzz: [],
                })
            }
            const entry = map.get(d.feature_id);
            entry.scores_total.push(d.total_score || 0);
            entry.scores_detection.push(d.score_detection || 0);
            entry.scores_embedding.push(d.score_embedding || 0);
            entry.scores_fuzz.push(d.score_fuzz || 0);
        });

        const mean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

        return Array.from(map.values()).map(f => ({
            feature_id: f.feature_id,
            total_score: mean(f.scores_total),
            score_detection: mean(f.scores_detection),
            score_embedding: mean(f.scores_embedding),
            score_fuzz: mean(f.scores_fuzz),
        })).sort((a, b) => b[sortKey] - a[sortKey]);
    }, [data, sortKey]);

    return (
        <div className="flex-1 overflow-auto rounded-xl border border-stone-300">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                        <th className="p-2 border-b">Rank</th>
                        <th className="p-2 border-b">ID</th>
                        <th className="p-2 border-b">
                            <select
                                value={sortKey}
                                onChange={(e) => setSortKey(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 cursor-pointer font-semibold uppercase text-xs p-0 outline-none"
                            >
                                <option value="total_score">Total Score</option>
                                <option value="score_detection">Detection</option>
                                <option value="score_embedding">Embedding</option>
                                <option value="score_fuzz">Fuzz</option>
                            </select>
                        </th>
                        <th className="p-2 border-b text-center">Vis</th>
                    </tr>
                </thead>
                <tbody>
                    {uniqueFeatures.map((feature, index) => {
                        const isVisible = visibleFeatureIds?.has(feature.feature_id) ?? true;
                        const isSelected = selectedId === feature.feature_id;
                        return (
                            <tr
                                key={feature.feature_id}
                                className={`border-b last:border-0 hover:bg-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-100' : 'bg-white'}`}
                                onClick={() => onSelect(feature.feature_id)}
                            >
                                <td className="p-2 text-slate-400 font-mono text-xs">{index + 1}</td>
                                <td className="p-2 font-medium">Feature {feature.feature_id}</td>
                                <td className="p-2 font-mono">{feature[sortKey].toFixed(2)}</td>
                                <td className="p-2 text-center">
                                    <input
                                        type="checkbox"
                                        checked={isVisible}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            onToggle(feature.feature_id);
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