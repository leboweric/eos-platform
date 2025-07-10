import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  User,
  Briefcase,
  Star,
  AlertCircle
} from 'lucide-react';

const PositionNode = ({ position, expanded, onToggle, level = 0 }) => {
  const hasChildren = position.children && position.children.length > 0;
  const isVacant = !position.holder_id;

  const getPositionIcon = () => {
    switch (position.position_type) {
      case 'leadership':
        return <Star className="h-4 w-4" />;
      case 'management':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getPositionTypeColor = () => {
    switch (position.position_type) {
      case 'leadership':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'management':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={`
          flex items-start p-4 rounded-lg border transition-all
          ${isVacant ? 'border-dashed border-gray-300 bg-gray-50' : 'border-solid border-gray-200 bg-white'}
          ${level > 0 ? 'ml-8' : ''}
          hover:shadow-md
        `}
      >
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-6 w-6"
                onClick={onToggle}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            
            <div className={`p-2 rounded-full ${getPositionTypeColor()}`}>
              {getPositionIcon()}
            </div>

            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{position.title}</h4>
              {position.holder_user_id ? (
                <p className="text-sm text-gray-600">
                  {position.first_name} {position.last_name}
                </p>
              ) : position.external_name ? (
                <p className="text-sm text-gray-600">{position.external_name}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Vacant</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {isVacant && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Open
                </Badge>
              )}
              
              {position.skills && position.skills.length > 0 && (
                <Badge variant="secondary">
                  {position.skills.length} skills
                </Badge>
              )}

              {position.responsibilities && position.responsibilities.length > 0 && (
                <Badge variant="secondary">
                  {position.responsibilities.length} responsibilities
                </Badge>
              )}
            </div>
          </div>

          {position.description && (
            <p className="mt-2 text-sm text-gray-600 ml-11">
              {position.description}
            </p>
          )}

          {expanded && position.skills && position.skills.length > 0 && (
            <div className="mt-3 ml-11">
              <p className="text-xs font-medium text-gray-500 mb-2">Required Skills:</p>
              <div className="flex flex-wrap gap-1">
                {position.skills.map((skill) => (
                  <Badge
                    key={skill.skill_id}
                    variant="outline"
                    className={`text-xs ${
                      skill.importance_level === 'required'
                        ? 'border-red-300 text-red-700'
                        : skill.importance_level === 'preferred'
                        ? 'border-yellow-300 text-yellow-700'
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    {skill.skill_name}
                    {skill.importance_level === 'required' && ' *'}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {expanded && position.responsibilities && position.responsibilities.length > 0 && (
            <div className="mt-3 ml-11">
              <p className="text-xs font-medium text-gray-500 mb-2">Key Responsibilities:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {position.responsibilities.map((resp, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span className="flex-1">{resp.responsibility}</span>
                    {resp.priority === 'critical' && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Critical
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="space-y-2">
          {position.children.map((child) => (
            <PositionNode
              key={child.id}
              position={child}
              expanded={expanded}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PositionNode;