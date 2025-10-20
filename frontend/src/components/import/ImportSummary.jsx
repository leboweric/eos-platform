import React from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Target, 
  Plus, 
  Edit, 
  SkipForward, 
  MapPin,
  Calendar,
  TrendingUp
} from 'lucide-react';

const ImportSummary = ({ results }) => {
  if (!results) return null;

  const {
    prioritiesCreated = 0,
    prioritiesUpdated = 0,
    prioritiesSkipped = 0,
    milestonesCreated = 0,
    totalProcessed = 0,
    errors = [],
    quarter,
    year
  } = results;

  const hasErrors = errors.length > 0;
  const hasWarnings = prioritiesSkipped > 0;
  const isSuccess = !hasErrors;
  const successCount = prioritiesCreated + prioritiesUpdated;

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <div className={`rounded-xl p-6 ${
        hasErrors 
          ? 'bg-red-50 border-2 border-red-200' 
          : isSuccess 
          ? 'bg-green-50 border-2 border-green-200'
          : 'bg-yellow-50 border-2 border-yellow-200'
      }`}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {hasErrors ? (
              <AlertCircle className="h-8 w-8 text-red-500" />
            ) : isSuccess ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            )}
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-semibold ${
              hasErrors ? 'text-red-800' : isSuccess ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {hasErrors 
                ? 'Import Completed with Errors' 
                : isSuccess 
                ? 'Import Completed Successfully!' 
                : 'Import Completed with Warnings'
              }
            </h2>
            <p className={`mt-1 ${
              hasErrors ? 'text-red-700' : isSuccess ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {hasErrors 
                ? `${successCount} of ${totalProcessed} priorities imported successfully. ${errors.length} errors occurred.`
                : isSuccess 
                ? `All ${totalProcessed} priorities have been successfully imported to ${quarter} ${year}.`
                : `${successCount} of ${totalProcessed} priorities imported. ${prioritiesSkipped} were skipped due to conflicts.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalProcessed}</div>
              <div className="text-sm text-gray-600">Total Processed</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Plus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">{prioritiesCreated}</div>
              <div className="text-sm text-gray-600">Created</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Edit className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-700">{prioritiesUpdated}</div>
              <div className="text-sm text-gray-600">Updated</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-700">{milestonesCreated}</div>
              <div className="text-sm text-gray-600">Milestones</div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Details */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Import Details</h3>
        </div>
        <div className="p-6 space-y-4">
          {/* Quarter and Year */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-500" />
            <div>
              <div className="font-medium text-blue-900">Imported to {quarter} {year}</div>
              <div className="text-sm text-blue-700">All priorities have been assigned to this quarter</div>
            </div>
          </div>

          {/* Success Summary */}
          {successCount > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Successfully Imported
              </h4>
              <div className="grid md:grid-cols-2 gap-3">
                {prioritiesCreated > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Plus className="h-4 w-4 text-green-500" />
                    <span className="text-green-700 font-medium">{prioritiesCreated} new priorities</span>
                    <span className="text-gray-600">added to your team</span>
                  </div>
                )}
                {prioritiesUpdated > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Edit className="h-4 w-4 text-orange-500" />
                    <span className="text-orange-700 font-medium">{prioritiesUpdated} existing priorities</span>
                    <span className="text-gray-600">updated with new data</span>
                  </div>
                )}
                {milestonesCreated > 0 && (
                  <div className="flex items-center gap-2 text-sm md:col-span-2">
                    <MapPin className="h-4 w-4 text-purple-500" />
                    <span className="text-purple-700 font-medium">{milestonesCreated} milestones</span>
                    <span className="text-gray-600">created across all priorities</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skipped Items */}
          {prioritiesSkipped > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <SkipForward className="h-4 w-4" />
                Skipped Items
              </h4>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <SkipForward className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-700 font-medium">{prioritiesSkipped} priorities</span>
                  <span className="text-yellow-600">were skipped due to name conflicts with existing priorities</span>
                </div>
                <div className="text-xs text-yellow-600 mt-1">
                  These items already exist in your team and were left unchanged as per your conflict resolution strategy.
                </div>
              </div>
            </div>
          )}

          {/* Error Details */}
          {hasErrors && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Import Errors
              </h4>
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium text-red-800">{error.priority}</div>
                    <div className="text-sm text-red-700 mt-1">{error.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Next Steps</h3>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>• Review your imported priorities in the Quarterly Priorities page</li>
          <li>• Assign priorities to team members if not already mapped</li>
          <li>• Set up milestone due dates and track progress</li>
          <li>• Update priority status as work progresses</li>
          {hasErrors && <li>• Review and manually add any priorities that failed to import</li>}
        </ul>
      </div>

      {/* Performance Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Import Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{totalProcessed}</div>
            <div className="text-gray-600">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{successCount}</div>
            <div className="text-gray-600">Successful</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-600">{prioritiesSkipped}</div>
            <div className="text-gray-600">Skipped</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{errors.length}</div>
            <div className="text-gray-600">Errors</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportSummary;