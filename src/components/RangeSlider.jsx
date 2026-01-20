import React, { useRef, useEffect, useState } from 'react';

const RangeSlider = ({ min, max, value, onChange, colors, hideLabels = false }) => {
    const [isDragging, setIsDragging] = useState(null);
    const containerRef = useRef(null);

    const currentMin = value ? value[0] : min;
    const currentMax = value ? value[1] : max;

    const getPercentage = (val) => {
        if (typeof val !== 'number' || isNaN(val)) return 0;
        if (max === min) return 0;
        return ((val - min) / (max - min)) * 100;
    };

    const handleMouseDown = (type) => (e) => {
        e.preventDefault();
        setIsDragging(type);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.min(Math.max(x / rect.width, 0), 1);
            const newValue = min + percentage * (max - min);

            let newRange;
            if (isDragging === 'min') {
                newRange = [Math.min(newValue, currentMax), currentMax];
            } else {
                newRange = [currentMin, Math.max(newValue, currentMin)];
            }

            onChange(newRange);
        };

        const handleMouseUp = () => {
            setIsDragging(null);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, min, max, currentMin, currentMax, onChange]);

    const minPos = getPercentage(currentMin);
    const maxPos = getPercentage(currentMax);

    return (
        <div className="w-full flex flex-col items-center select-none">
            {!hideLabels && (
                <div className="flex justify-between w-full text-[10px] text-slate-500 font-bold mb-1 px-1 py-0 -mt-2">
                    <span>{typeof currentMin === 'number' ? currentMin.toFixed(2) : min} (Low)</span>
                    <span>{typeof currentMax === 'number' ? currentMax.toFixed(2) : max} (High)</span>
                </div>
            )}

            <div
                ref={containerRef}
                className="relative w-full h-1.5 rounded-md cursor-pointer mb-1"
                style={{
                    background: `linear-gradient(to right, ${colors.join(', ')})`
                }}
            >
                <div
                    className="absolute top-0 bottom-0 left-0 bg-white/70 rounded-l-md pointer-events-none"
                    style={{ width: `${minPos}%` }}
                />
                <div
                    className="absolute top-0 bottom-0 right-0 bg-white/70 rounded-r-md pointer-events-none"
                    style={{ width: `${100 - maxPos}%` }}
                />

                <div
                    className="absolute top-[-5px] w-2.5 h-4 bg-white border border-slate-600 rounded-sm shadow-sm cursor-ew-resize hover:scale-110 transition-transform z-10 flex items-center justify-center"
                    style={{ left: `calc(${minPos}% - 5px)` }}
                    onMouseDown={handleMouseDown('min')}
                >
                    {/* <div className="w-[1px] h-2 bg-slate-300"></div> */}
                </div>

                <div
                    className="absolute top-[-5px] w-2.5 h-4 bg-white border border-slate-600 rounded-sm shadow-sm cursor-ew-resize hover:scale-110 transition-transform z-10 flex items-center justify-center"
                    style={{ left: `calc(${maxPos}% - 5px)` }}
                    onMouseDown={handleMouseDown('max')}
                >
                    {/* <div className="w-[1px] h-2 bg-slate-300"></div> */}
                </div>
            </div>
        </div>
    );
};

export default RangeSlider;
