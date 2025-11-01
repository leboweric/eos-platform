import React from 'react';
import { TrendingUp, AlertTriangle, Target, Zap } from 'lucide-react';
import SwotQuadrant from './SwotQuadrant';

const SwotAnalysis = ({ 
  swotData, 
  onAddItem, 
  onUpdateItem, 
  onDeleteItem,
  isPresenting 
}) => {
  const quadrants = [
    {
      title: 'Strengths',
      subtitle: 'Internal • Positive',
      icon: <TrendingUp size={24} />,
      category: 'strength',
      accentColor: '#10b981', // green-500
      items: swotData.strength || []
    },
    {
      title: 'Opportunities',
      subtitle: 'External • Positive',
      icon: <Target size={24} />,
      category: 'opportunity',
      accentColor: '#3b82f6', // blue-500
      items: swotData.opportunity || []
    },
    {
      title: 'Weaknesses',
      subtitle: 'Internal • Negative',
      icon: <AlertTriangle size={24} />,
      category: 'weakness',
      accentColor: '#f59e0b', // amber-500
      items: swotData.weakness || []
    },
    {
      title: 'Threats',
      subtitle: 'External • Negative',
      icon: <Zap size={24} />,
      category: 'threat',
      accentColor: '#ef4444', // red-500
      items: swotData.threat || []
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          SWOT Analysis
        </h3>
        <p className="text-sm text-gray-700">
          Identify internal strengths and weaknesses, along with external opportunities and threats
        </p>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quadrants.map((quadrant) => (
          <SwotQuadrant
            key={quadrant.category}
            title={quadrant.title}
            subtitle={quadrant.subtitle}
            icon={quadrant.icon}
            category={quadrant.category}
            accentColor={quadrant.accentColor}
            items={quadrant.items}
            onAddItem={onAddItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            isPresenting={isPresenting}
          />
        ))}
      </div>
    </div>
  );
};

export default SwotAnalysis;