import React, { useMemo, useEffect } from 'react';

const DetailPanel = ({ data, selectedFeatureId }) => {
    const siblings = useMemo(() => {
        if (selectedFeatureId === null || !data) return [];
        return data.filter(d => d.feature_id === selectedFeatureId);
    }, [data, selectedFeatureId]);



    useEffect(() => {
        console.log(siblings);
    }, [siblings]);

    if (siblings.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-300 text-sm italic">
                Select a feature to view details
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col p-0 min-h-0 border-slate-500">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl uppercase text-slate-400 font-bold">Detailed Feature Information({selectedFeatureId})</h2>
                <span className="text-xs font-bold text-slate-500">detection / embedding / fuzz</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {siblings.map((expl, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-500 truncate max-w-[60%]">
                                {expl.llm_explainer}
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
        </div>
    );
};

export default DetailPanel;

