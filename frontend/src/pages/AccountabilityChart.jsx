import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users,
  Plus,
  Edit,
  Trash2,
  User,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const AccountabilityChart = () => {
  const [seats, setSeats] = useState([]);
  const [expandedSeats, setExpandedSeats] = useState(new Set());
  const [seatDialog, setSeatDialog] = useState({ open: false, seat: null });
  const [responsibilityDialog, setResponsibilityDialog] = useState({ open: false, seatId: null });
  const [assignmentDialog, setAssignmentDialog] = useState({ open: false, seatId: null });
  
  const [seatForm, setSeatForm] = useState({
    seatName: '',
    seatDescription: '',
    parentSeatId: null,
    isLeadershipTeam: false
  });

  const [responsibilities, setResponsibilities] = useState([]);
  const [newResponsibility, setNewResponsibility] = useState('');

  // Mock data - in production, fetch from API
  useEffect(() => {
    const mockSeats = [
      {
        id: '1',
        seatName: 'Visionary',
        seatDescription: 'Creates the vision and drives the company forward',
        isLeadershipTeam: true,
        parentSeatId: null,
        assignedUser: { id: 'u1', name: 'John Smith', avatar: null },
        responsibilities: [
          'Create and communicate the vision',
          'Build key relationships',
          'Champion company culture',
          'Inspire and motivate the team'
        ],
        subSeats: [
          {
            id: '2',
            seatName: 'Integrator',
            seatDescription: 'Integrates the major functions of the business',
            isLeadershipTeam: true,
            parentSeatId: '1',
            assignedUser: { id: 'u2', name: 'Jane Doe', avatar: null },
            responsibilities: [
              'Lead, manage, and hold people accountable',
              'Execute the business plan',
              'Remove obstacles and barriers',
              'Resolve issues'
            ],
            subSeats: [
              {
                id: '3',
                seatName: 'Sales/Marketing',
                seatDescription: 'Drives revenue and market presence',
                isLeadershipTeam: true,
                parentSeatId: '2',
                assignedUser: { id: 'u3', name: 'Mike Johnson', avatar: null },
                responsibilities: [
                  'Generate revenue',
                  'Create and execute marketing strategy',
                  'Manage sales team',
                  'Track and report on KPIs'
                ],
                subSeats: []
              },
              {
                id: '4',
                seatName: 'Operations',
                seatDescription: 'Manages day-to-day operations',
                isLeadershipTeam: true,
                parentSeatId: '2',
                assignedUser: null,
                responsibilities: [
                  'Manage operations processes',
                  'Ensure quality standards',
                  'Optimize efficiency',
                  'Manage vendor relationships'
                ],
                subSeats: []
              }
            ]
          }
        ]
      }
    ];
    setSeats(mockSeats);
    setExpandedSeats(new Set(['1', '2'])); // Expand top levels by default
  }, []);

  const toggleExpand = (seatId) => {
    const newExpanded = new Set(expandedSeats);
    if (newExpanded.has(seatId)) {
      newExpanded.delete(seatId);
    } else {
      newExpanded.add(seatId);
    }
    setExpandedSeats(newExpanded);
  };

  const handleOpenSeatDialog = (seat = null) => {
    if (seat) {
      setSeatForm({
        seatName: seat.seatName,
        seatDescription: seat.seatDescription || '',
        parentSeatId: seat.parentSeatId,
        isLeadershipTeam: seat.isLeadershipTeam
      });
    } else {
      setSeatForm({
        seatName: '',
        seatDescription: '',
        parentSeatId: null,
        isLeadershipTeam: false
      });
    }
    setSeatDialog({ open: true, seat });
  };

  const handleSaveSeat = () => {
    // In production, make API call
    console.log('Save seat:', seatForm);
    setSeatDialog({ open: false, seat: null });
  };

  const handleOpenResponsibilityDialog = (seatId) => {
    const seat = findSeatById(seatId);
    setResponsibilities(seat?.responsibilities || []);
    setResponsibilityDialog({ open: true, seatId });
  };

  const handleAddResponsibility = () => {
    if (newResponsibility.trim() && responsibilities.length < 7) {
      setResponsibilities([...responsibilities, newResponsibility.trim()]);
      setNewResponsibility('');
    }
  };

  const handleRemoveResponsibility = (index) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index));
  };

  const handleSaveResponsibilities = () => {
    // In production, make API call
    console.log('Save responsibilities for seat:', responsibilityDialog.seatId, responsibilities);
    setResponsibilityDialog({ open: false, seatId: null });
  };

  const findSeatById = (seatId, seatList = seats) => {
    for (const seat of seatList) {
      if (seat.id === seatId) return seat;
      const found = findSeatById(seatId, seat.subSeats || []);
      if (found) return found;
    }
    return null;
  };

  const SeatNode = ({ seat, level = 0 }) => {
    const isExpanded = expandedSeats.has(seat.id);
    const hasSubSeats = seat.subSeats && seat.subSeats.length > 0;

    return (
      <div className={`${level > 0 ? 'ml-8' : ''}`}>
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {hasSubSeats && (
                  <button
                    onClick={() => toggleExpand(seat.id)}
                    className="p-1 hover:bg-white/80 backdrop-blur-sm rounded-lg transition-all duration-200"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                )}
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {seat.seatName}
                    {seat.isLeadershipTeam && (
                      <Badge variant="secondary" className="text-xs">Leadership Team</Badge>
                    )}
                  </CardTitle>
                  {seat.seatDescription && (
                    <CardDescription className="mt-1">{seat.seatDescription}</CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => handleOpenSeatDialog(seat)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Assigned User */}
              <div>
                <p className="text-sm font-medium mb-2">Assigned To:</p>
                {seat.assignedUser ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center shadow-sm">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <span className="font-medium">{seat.assignedUser.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setAssignmentDialog({ open: true, seatId: seat.id })}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setAssignmentDialog({ open: true, seatId: seat.id })}>
                    <Plus className="h-3 w-3 mr-1" />
                    Assign Person
                  </Button>
                )}
              </div>

              {/* Responsibilities */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Key Responsibilities:</p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleOpenResponsibilityDialog(seat.id)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
                {seat.responsibilities && seat.responsibilities.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {seat.responsibilities.map((resp, index) => (
                      <li key={index} className="text-sm text-gray-600">{resp}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No responsibilities defined</p>
                )}
              </div>

              {/* Add Sub-Seat Button */}
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setSeatForm({ ...seatForm, parentSeatId: seat.id });
                  setSeatDialog({ open: true, seat: null });
                }}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Sub-Seat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Render Sub-Seats */}
        {hasSubSeats && isExpanded && (
          <div className="relative">
            {level > 0 && (
              <div className="absolute left-4 top-0 bottom-0 w-px bg-white/30" />
            )}
            {seat.subSeats.map(subSeat => (
              <SeatNode key={subSeat.id} seat={subSeat} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 bg-blue-50/80 backdrop-blur-sm text-blue-700">
              <Users className="h-4 w-4" />
              ORGANIZATION STRUCTURE
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">Accountability Chart</h1>
            <p className="text-lg text-slate-600">
              Define seats, responsibilities, and who's accountable
            </p>
          </div>
          <Button 
            onClick={() => handleOpenSeatDialog()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Seat
          </Button>
        </div>

        {/* Chart */}
        <div className="space-y-6">
          {seats.map(seat => (
            <SeatNode key={seat.id} seat={seat} />
          ))}
        </div>
      </div>

      {/* Seat Dialog */}
      <Dialog open={seatDialog.open} onOpenChange={(open) => setSeatDialog({ open, seat: null })}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle>
              {seatDialog.seat ? 'Edit Seat' : 'Create Seat'}
            </DialogTitle>
            <DialogDescription>
              Define the seat name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="seatName">Seat Name</Label>
              <Input
                id="seatName"
                value={seatForm.seatName}
                onChange={(e) => setSeatForm({ ...seatForm, seatName: e.target.value })}
                placeholder="e.g., Visionary, Integrator, Sales Leader"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seatDescription">Description</Label>
              <Textarea
                id="seatDescription"
                value={seatForm.seatDescription}
                onChange={(e) => setSeatForm({ ...seatForm, seatDescription: e.target.value })}
                placeholder="What is this seat accountable for?"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isLeadershipTeam"
                checked={seatForm.isLeadershipTeam}
                onChange={(e) => setSeatForm({ ...seatForm, isLeadershipTeam: e.target.checked })}
              />
              <Label htmlFor="isLeadershipTeam">Leadership Team Member</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeatDialog({ open: false, seat: null })}>
              Cancel
            </Button>
            <Button onClick={handleSaveSeat}>
              {seatDialog.seat ? 'Update' : 'Create'} Seat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Responsibilities Dialog */}
      <Dialog open={responsibilityDialog.open} onOpenChange={(open) => setResponsibilityDialog({ open, seatId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Responsibilities</DialogTitle>
            <DialogDescription>
              Define 3-7 key responsibilities for this seat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {responsibilities.map((resp, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={resp}
                    onChange={(e) => {
                      const updated = [...responsibilities];
                      updated[index] = e.target.value;
                      setResponsibilities(updated);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveResponsibility(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {responsibilities.length < 8 && (
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Add a responsibility..."
                  value={newResponsibility}
                  onChange={(e) => setNewResponsibility(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddResponsibility()}
                />
                <Button onClick={handleAddResponsibility}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponsibilityDialog({ open: false, seatId: null })}>
              Cancel
            </Button>
            <Button onClick={handleSaveResponsibilities}>
              Save Responsibilities
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountabilityChart;