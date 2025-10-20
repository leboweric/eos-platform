import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, User, Building, Target, Clock, Flag } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    'not_started': { color: 'bg-gray-100 text-gray-800', label: 'Not Started' },
    'in_progress': { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
    'on_track': { color: 'bg-green-100 text-green-800', label: 'On Track' },
    'at_risk': { color: 'bg-yellow-100 text-yellow-800', label: 'At Risk' },
    'off_track': { color: 'bg-red-100 text-red-800', label: 'Off Track' },
    'completed': { color: 'bg-green-100 text-green-800', label: 'Complete' }
  };

  const config = statusConfig[status] || statusConfig['not_started'];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const priorityConfig = {
    'low': { color: 'bg-gray-100 text-gray-800', label: 'Low' },
    'medium': { color: 'bg-blue-100 text-blue-800', label: 'Medium' },
    'high': { color: 'bg-orange-100 text-orange-800', label: 'High' },
    'critical': { color: 'bg-red-100 text-red-800', label: 'Critical' }
  };

  const config = priorityConfig[priority] || priorityConfig['medium'];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const MilestonesList = ({ milestones }) => {
  if (!milestones || milestones.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">No milestones</div>
    );
  }

  return (
    <div className="space-y-2">
      {milestones.map((milestone, index) => (
        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{milestone.title}</span>
          </div>
          {milestone.due_date && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              {new Date(milestone.due_date).toLocaleDateString()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const RocksPreviewTable = ({ priorities }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());

  if (!priorities || priorities.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Priorities Found</h3>
        <p className="text-gray-500">
          No priorities were found in the uploaded CSV file. Please check the file format and try again.
        </p>
      </div>
    );
  }

  const toggleRow = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900">Priority Preview</h3>
        <p className="text-sm text-gray-600 mt-1">
          First {Math.min(priorities.length, 10)} priorities from your CSV file
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-6 py-3"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assignee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {priorities.map((priority, index) => (
              <React.Fragment key={index}>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleRow(index)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedRows.has(index) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 line-clamp-2">
                          {priority.title}
                        </div>
                        {priority.description && (
                          <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {priority.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={priority.status} />
                  </td>
                  <td className="px-6 py-4">
                    {priority.assignee_name ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{priority.assignee_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {priority.due_date ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {new Date(priority.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">No due date</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <PriorityBadge priority={priority.priority_level} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {priority.is_company ? (
                        <>
                          <Building className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-blue-700 font-medium">Company</span>
                        </>
                      ) : (
                        <>
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Individual</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Row */}
                {expandedRows.has(index) && (
                  <tr>
                    <td></td>
                    <td colSpan="6" className="px-6 py-4 bg-slate-50">
                      <div className="space-y-4">
                        {/* Full Description */}
                        {priority.description && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                            <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border">
                              {priority.description}
                            </p>
                          </div>
                        )}

                        {/* Milestones */}
                        {priority.milestones && priority.milestones.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Milestones ({priority.milestones.length})
                            </h4>
                            <div className="bg-white p-3 rounded-lg border">
                              <MilestonesList milestones={priority.milestones} />
                            </div>
                          </div>
                        )}

                        {/* Additional Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                              Import Source
                            </div>
                            <div className="text-sm text-gray-900">{priority.import_source || 'ninety.io'}</div>
                          </div>
                          
                          {priority.external_id && (
                            <div className="bg-white p-3 rounded-lg border">
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                External ID
                              </div>
                              <div className="text-sm text-gray-900 font-mono">{priority.external_id}</div>
                            </div>
                          )}
                          
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                              Milestone Count
                            </div>
                            <div className="text-sm text-gray-900">
                              {priority.milestones ? priority.milestones.length : 0} milestones
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                              Priority Type
                            </div>
                            <div className="text-sm text-gray-900">
                              {priority.is_company ? 'Company Rock' : 'Individual Rock'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {priorities.length >= 10 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            Showing first 10 priorities. Full import will process all {priorities.length} priorities from your CSV file.
          </p>
        </div>
      )}
    </div>
  );
};

export default RocksPreviewTable;