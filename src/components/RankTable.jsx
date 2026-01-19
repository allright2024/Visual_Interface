import React, { useMemo, useState, useEffect, useRef } from "react";

const RankTable = ({ data, onSelect, selectedId, selectedExplainer, onToggle, sortKey, onSortChange, visibleFeatureIds }) => {
    const tableContainerRef = useRef(null);

    useEffect(() => {
        if (selectedId && tableContainerRef.current) {
            let selector = `tr[data-feature-id="${selectedId}"]`;
            if (selectedExplainer) {
                const safeExplainer = selectedExplainer.replace(/"/g, '\\"');
                selector += `[data-explainer="${safeExplainer}"]`;
            }

            let row = tableContainerRef.current.querySelector(selector);

            if (!row && selectedExplainer) {
                row = tableContainerRef.current.querySelector(`tr[data-feature-id="${selectedId}"]`);
            }

            if (row) {
                const container = tableContainerRef.current;
                const rowRect = row.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                const currentScrollTop = container.scrollTop;
                const rowRelativeTop = rowRect.top - containerRect.top;
                const targetScrollTop = currentScrollTop + rowRelativeTop - (containerRect.height / 2) + (rowRect.height / 2);

                const duration = 250;
                const startTime = performance.now();

                const animateScroll = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const ease = t => 1 - Math.pow(1 - t, 3);

                    container.scrollTop = currentScrollTop + (targetScrollTop - currentScrollTop) * ease(progress);

                    if (progress < 1) {
                        requestAnimationFrame(animateScroll);
                    }
                };

                requestAnimationFrame(animateScroll);
            }
        }
    }, [selectedId, selectedExplainer, data]);

    return (
        <div className="flex flex-col h-full bg-white p-2">
            <div className="text-base font-bold text-slate-700 mb-0 px-1 border-b border-slate-200 pb-2">Score Rank Table</div>
            <div className="flex-1 overflow-auto" ref={tableContainerRef}>
                <table className="w-full text-left text-sm border-collapse table-fixed">
                    <thead className="bg-white sticky top-0 z-10 text-xs font-semibold border-b border-transparent">
                        <tr>
                            <th className="py-3 px-2 border-b border-slate-100 w-[15%] text-slate-500 text-sm text-right">Rank</th>
                            <th className="py-3 px-2 border-b border-slate-100 w-[40%] text-slate-500 text-sm text-right">Feature ID / LLM</th>
                            <th className="py-3 px-2 border-b border-slate-100 w-[30%] text-slate-500 text-sm text-right pr-8">
                                {{
                                    'score_detection': 'Detection',
                                    'score_embedding': 'Embedding',
                                    'score_fuzz': 'Fuzz'
                                }[sortKey] || sortKey}
                            </th>
                            <th className="py-3 px-2 border-b border-slate-100 w-[15%] text-center text-slate-500 text-sm">Vis</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => {
                            const isVisible = visibleFeatureIds?.has(item.feature_id) ?? true;
                            const isSelected = selectedId === item.feature_id;
                            return (
                                <tr
                                    key={`${item.feature_id}-${item.explanation_index}`}
                                    data-feature-id={item.feature_id}
                                    data-explainer={item.llm_explainer}
                                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                                    onClick={() => onSelect(item.feature_id, item.llm_explainer)}
                                >
                                    <td className="py-3 px-2 text-slate-400 font-mono text-xs text-right">{item.globalRank}</td>
                                    <td className="py-3 px-2 text-right">
                                        <div className="font-medium text-xs truncate max-w-[120px] ml-auto" title={item.llm_explainer}>
                                            Feature {item.feature_id}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {(() => {
                                                const lower = item.llm_explainer.toLowerCase();
                                                if (lower.includes('llama')) return <span className="text-orange-600 font-bold">Llama</span>;
                                                if (lower.includes('gemini')) return <span className="text-blue-600 font-bold">Gemini-flash</span>;
                                                if (lower.includes('gpt')) return <span className="text-green-600 font-bold">GPT-4o-mini</span>;
                                                return item.llm_explainer;
                                            })()}
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 font-mono text-xs text-right pr-8">{item[sortKey]?.toFixed(3)}</td>
                                    <td className="py-3 px-2 text-center">
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
        </div>
    )
}

export default RankTable;