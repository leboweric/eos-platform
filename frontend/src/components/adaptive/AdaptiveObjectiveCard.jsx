/**
 * Adaptive Objective Card Component
 * Automatically renders the correct framework-specific component
 * Patent Pending Serial No. 63/870,133
 */

import { useEffect, useState } from 'react';
import EOSRockCard from './EOSRockCard';
import OKRKeyResultCard from './OKRKeyResultCard';
import FourDXWigCard from './FourDXWigCard';
import ScalingUpPriorityCard from './ScalingUpPriorityCard';
import GenericObjectiveCard from './GenericObjectiveCard';
import { translationService } from '../../services/adaptiveTranslationService';
import { Loader2 } from 'lucide-react';

export default function AdaptiveObjectiveCard({ 
  universalObjective, 
  framework = 'auto',
  onUpdate,
  onComplete,
  onCheckIn 
}) {
  const [translatedObjective, setTranslatedObjective] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    translateObjective();
  }, [universalObjective, framework]);

  const translateObjective = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine target framework
      const targetFramework = framework === 'auto' 
        ? universalObjective.framework_type 
        : framework;
      
      // Translate the objective to the target framework
      const translated = await translationService.translateObjective(
        universalObjective,
        targetFramework
      );
      
      setTranslatedObjective(translated);
    } catch (err) {
      console.error('Translation error:', err);
      setError(err.message);
      // Fallback to original objective
      setTranslatedObjective(universalObjective);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-gray-600">Translating objective...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">Translation error: {error}</p>
        <p className="text-xs text-gray-600 mt-2">Showing original objective</p>
      </div>
    );
  }

  // Select the appropriate component based on framework
  const getFrameworkComponent = () => {
    const fw = translatedObjective?.framework_type || universalObjective.framework_type;
    
    switch(fw) {
      case 'eos':
        return (
          <EOSRockCard 
            objective={translatedObjective}
            onUpdate={onUpdate}
            onComplete={onComplete}
          />
        );
        
      case 'okr':
        return (
          <OKRKeyResultCard
            objective={translatedObjective}
            onUpdate={onUpdate}
            onCheckIn={onCheckIn}
          />
        );
        
      case '4dx':
        return (
          <FourDXWigCard
            objective={translatedObjective}
            onUpdate={onUpdate}
            onComplete={onComplete}
          />
        );
        
      case 'scaling_up':
        return (
          <ScalingUpPriorityCard
            objective={translatedObjective}
            onUpdate={onUpdate}
            onComplete={onComplete}
          />
        );
        
      default:
        return (
          <GenericObjectiveCard
            objective={translatedObjective}
            onUpdate={onUpdate}
            onComplete={onComplete}
          />
        );
    }
  };

  return (
    <div className="adaptive-objective-container">
      {/* Framework indicator badge */}
      <div className="text-xs text-gray-500 mb-2">
        Framework: {translatedObjective?.framework_type?.toUpperCase() || 'CUSTOM'}
      </div>
      
      {/* Render the framework-specific component */}
      {getFrameworkComponent()}
    </div>
  );
}