import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Info
} from 'lucide-react';
import { scorecardService } from '../../services/scorecardService';

const ScorecardImport = ({ orgId, teamId, onImportComplete }) => {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setError(null);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file to import');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await scorecardService.importMonthlyScorecard(orgId, teamId, formData);
      
      setImportResult(result);
      setSelectedFile(null);
      
      // Clear the file input
      const fileInput = document.getElementById('scorecard-file-input');
      if (fileInput) fileInput.value = '';

      // Notify parent component to refresh data
      if (onImportComplete) {
        onImportComplete();
      }

    } catch (error) {
      console.error('Import failed:', error);
      setError(error.response?.data?.details || error.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleCSV = () => {
    // Create sample CSV content based on the expected format
    const sampleData = [
      ['Title', 'Goal', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      ['WM Total AUM', '>= $100,000,000', '$150,358,370.00', '$150,080,183.00', '$150,137,854.00', '$141,951,999.00', '$133,605,168.00', '$128,956,244.00', '$130,129,822.00', '$121,815,773.00', '', '', '', ''],
      ['WM Monthly Revenue', '>= 62,500', '59,194', '74,331', '67,896', '56,626', '67,603', '107,151', '65,411', '', '', '', '', ''],
      ['Firm Pipeline', '>= 350,000', '598,500', '598,500', '598,500', '580,000', '545,000', '645,000', '', '', '', '', '', ''],
      ['New Clients - 12 months', '>= 0', '1,109', '969', '890', '811', '741', '714', '652', '646', '657', '', '', ''],
      ['New Client Revenue', '>= 0', '3,677,287.04', '3,603,629.8', '3,351,046.25', '2,931,527.54', '2,707,020.72', '2,557,079.92', '1,449,292.64', '1,393,476.17', '1,524,717.63', '', '', '']
    ];

    const csvContent = sampleData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monthly-scorecard-sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setShowImportDialog(true)}
        className="flex items-center gap-2"
      >
        <Upload className="h-4 w-4" />
        Import Monthly Scorecard
      </Button>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Monthly Scorecard from Ninety.io</DialogTitle>
            <DialogDescription>
              Upload a CSV file with your monthly scorecard data. The system will automatically import metrics and historical scores.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* File Format Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">Expected CSV Format</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Your CSV should have columns: Title, Goal, and monthly columns (January through December).
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadSampleCSV}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Sample CSV
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <Label htmlFor="scorecard-file-input">Select CSV File</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="scorecard-file-input"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    {selectedFile.name}
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Display */}
            {importResult && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">{importResult.message}</p>
                    {importResult.data && (
                      <div className="text-sm">
                        <p>• Imported {importResult.data.metrics} metrics</p>
                        <p>• Added {importResult.data.scores} monthly scores</p>
                        {importResult.data.details?.scoresByMetric && (
                          <div className="mt-2">
                            <p className="font-medium mb-1">Metrics imported:</p>
                            {importResult.data.details.scoresByMetric.map((item, index) => (
                              <p key={index} className="ml-2">• {item.metric} ({item.scores} scores)</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {!importResult && (
              <Button 
                onClick={handleImport} 
                disabled={!selectedFile || uploading}
                className="flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Importing...' : 'Import Scorecard'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScorecardImport;