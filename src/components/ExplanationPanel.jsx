import React from 'react';

const ExplanationPanel = ({ explanation }) => {
    return (
        <div className="bg-gray-800 border-t border-gray-700 p-4 mt-4 rounded">
            <h3 className="text-xl font-bold text-gray-200 mb-2">Behind the Scenes</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
                {explanation || "Waiting for scan to start..."}
            </p>
        </div>
    );
};

export default ExplanationPanel;
