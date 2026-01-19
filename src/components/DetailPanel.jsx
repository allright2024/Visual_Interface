import React, { useMemo, useEffect } from 'react';

const DetailPanel = ({ data, selectedFeatureId, selectedExplainer, explainerColorScale, onSelect, visibleExplainers }) => {
    const siblings = useMemo(() => {
        if (selectedFeatureId === null || !data) return [];
        let filtered = data.filter(d => d.feature_id === selectedFeatureId);

        if (visibleExplainers) {
            filtered = filtered.filter(d => {
                const explainer = d.llm_explainer.toLowerCase();
                for (const group of visibleExplainers) {
                    if (explainer.includes(group.toLowerCase())) return true;
                }
                return false;
            });
        }

        const getPriority = (d) => {
            const lower = d.llm_explainer.toLowerCase();
            if (lower.includes('llama')) return 0;
            if (lower.includes('gemini')) return 1;
            if (lower.includes('gpt')) return 2;
            return 3;
        };

        return filtered.sort((a, b) => getPriority(a) - getPriority(b));
    }, [data, selectedFeatureId, visibleExplainers]);



    useEffect(() => {
        console.log(siblings);
    }, [siblings]);

    return (
        <div className="flex-1 flex flex-col p-0 min-h-0 border-slate-500 bg-white">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                <h2 className="text-md text-slate-700 font-bold">Detailed Feature Information{selectedFeatureId !== null ? `(Feature ID : ${selectedFeatureId})` : ''}</h2>
                <span className="text-xs font-bold text-slate-500">Detection / Embedding / Fuzz</span>
            </div>

            {siblings.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-black text-base font-medium">
                    Select a feature to view details
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                    {siblings.map((expl, idx) => (
                        <div
                            key={idx}
                            onClick={() => onSelect && onSelect(selectedFeatureId, expl.llm_explainer)}
                            className={`p-2 rounded border transition-all duration-200 cursor-pointer ${expl.llm_explainer === selectedExplainer
                                ? 'shadow-md transform'
                                : 'opacity-60 hover:opacity-100 hover:shadow-sm'
                                }`}
                            style={{
                                borderColor: explainerColorScale ? explainerColorScale(expl.llm_explainer) : '#e2e8f0',
                                backgroundColor: expl.llm_explainer === selectedExplainer ? '#f8fafc' : '#ffffff',
                                borderLeftWidth: '4px',
                                borderLeftColor: explainerColorScale ? explainerColorScale(expl.llm_explainer) : '#e2e8f0'
                            }}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-500 truncate max-w-[60%]">
                                    {(() => {
                                        const lower = expl.llm_explainer.toLowerCase();
                                        if (lower.includes('llama')) return <span className="text-orange-600 font-bold">Llama</span>;
                                        if (lower.includes('gemini')) return <span className="text-blue-600 font-bold">Gemini-flash</span>;
                                        if (lower.includes('gpt')) return <span className="text-green-600 font-bold">GPT-4o-mini</span>;
                                        return expl.llm_explainer;
                                    })()}
                                </span>
                                <span className="text-xs font-bold text-slate-500 truncate max-w-[40%]">
                                    {expl.score_detection.toFixed(2)} / {expl.score_embedding.toFixed(2)} / {expl.score_fuzz.toFixed(2)}
                                </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                                {expl.text}
                            </p>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DetailPanel;

