import React, { useEffect, useRef } from 'react';

const RealOutput = ({ output }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [output]);

    return (
        <div className="bg-black border border-gray-700 rounded p-4 font-mono text-xs text-gray-300 h-full overflow-hidden flex flex-col shadow-inner">
            <div className="flex-1 overflow-y-auto" ref={scrollRef}>
                {output.length === 0 && (
                    <div className="text-gray-600 italic">Ready to scan...</div>
                )}
                <pre className="whitespace-pre-wrap leading-tight">
                    {output.join('\n')}
                </pre>
                <div className="animate-pulse inline-block w-2 h-4 bg-gray-500 ml-1 align-middle"></div>
            </div>
        </div>
    );
};

export default RealOutput;
