        <div className="space-y-10">
          {/* Employee-Centric Rock View */}
          {(() => {
            // Combine all priorities (company and individual)
            const allPriorities = [
              ...companyPriorities,
              ...Object.values(teamMemberPriorities).flatMap(member => member?.priorities || [])
            ];
            
            // Toggle expansion for a priority
            const togglePriorityExpansion = (priorityId, e) => {
              e.stopPropagation();
              setExpandedPriorities(prev => ({
                ...prev,
                [priorityId]: !prev[priorityId]
              }));
            };
            
            // Group all priorities by owner
            const prioritiesByOwner = allPriorities.reduce((acc, priority) => {
              const ownerId = priority.owner?.id || 'unassigned';
              const ownerName = priority.owner?.name || 'Unassigned';
              if (!acc[ownerId]) {
                acc[ownerId] = {
                  id: ownerId,
                  name: ownerName,
                  priorities: []
                };
              }
              acc[ownerId].priorities.push(priority);
              return acc;
            }, {});
            
            // Convert to array and sort by name
            const owners = Object.values(prioritiesByOwner).sort((a, b) => {
              if (a.id === 'unassigned') return 1;
              if (b.id === 'unassigned') return -1;
              return a.name.localeCompare(b.name);
            });
            
            if (allPriorities.length === 0) {
              return (
                <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
                  <CardContent className="text-center py-8">
                    <p className="text-slate-500 font-medium">No {labels.priorities_label?.toLowerCase() || 'priorities'} found for this quarter.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowAddPriority(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add {labels.priority || 'Priority'}
                    </Button>
                  </CardContent>
                </Card>
              );
            }
            
            return (
              <div className="space-y-6">
                {owners.map(owner => (
                  <Card key={owner.id} className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-slate-100">
                            <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-semibold">
                              {owner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">{owner.name}</h3>
                            <p className="text-sm text-slate-500">{owner.priorities.length} {labels?.priority_singular || 'Rock'}{owner.priorities.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        {/* Header Row */}
                        <div className="flex items-center px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                          <div className="w-8"></div>
                          <div className="w-10 ml-2">Status</div>
                          <div className="flex-1 ml-3">Title</div>
                          <div className="w-40 text-center">Milestone Progress</div>
                          <div className="w-20 text-right">Due By</div>
                          <div className="w-8"></div>
                        </div>
                        
                        {/* Rock Rows */}
                        {owner.priorities.map(priority => {
                          const isComplete = priority.status === 'complete' || priority.status === 'completed';
                          const isOnTrack = priority.status === 'on-track';
                          const completedMilestones = (priority.milestones || []).filter(m => m.completed).length;
                          const totalMilestones = (priority.milestones || []).length;
                          const isExpanded = expandedPriorities[priority.id];
                          
                          return (
                            <div key={priority.id} className="border-b border-slate-100 last:border-0">
                              {/* Main Rock Row */}
                              <div className="flex items-center px-3 py-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                {/* Expand Arrow */}
                                <div 
                                  className="w-8 flex items-center justify-center cursor-pointer"
                                  onClick={(e) => togglePriorityExpansion(priority.id, e)}
                                >
                                  <ChevronRight 
                                    className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                                      isExpanded ? 'rotate-90' : ''
                                    }`} 
                                  />
                                </div>
                                
                                {/* Status Indicator with Dropdown */}
                                <div className="w-10 ml-2 flex items-center relative status-dropdown">
                                  <div 
                                    className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                    style={{
                                      backgroundColor: 
                                        priority.status === 'cancelled' ? '#6B728020' :
                                        isComplete ? themeColors.primary + '20' : 
                                        (isOnTrack ? '#10B98120' : '#EF444420'),
                                      border: `2px solid ${
                                        priority.status === 'cancelled' ? '#6B7280' :
                                        isComplete ? themeColors.primary : 
                                        (isOnTrack ? '#10B981' : '#EF4444')
                                      }`
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenStatusDropdown(openStatusDropdown === priority.id ? null : priority.id);
                                    }}
                                  >
                                    {priority.status === 'cancelled' ? (
                                      <X className="h-4 w-4 text-gray-500" />
                                    ) : isComplete ? (
                                      <CheckCircle className="h-4 w-4" style={{ color: themeColors.primary }} />
                                    ) : isOnTrack ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <X className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                  
                                  {/* Status Dropdown */}
                                  {openStatusDropdown === priority.id && (
                                    <div className="absolute top-8 left-0 z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]">
                                      <button
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleUpdatePriority(priority.id, { status: 'on-track' });
                                          setOpenStatusDropdown(null);
                                        }}
                                      >
                                        <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                                          {priority.status === 'on-track' && <Check className="h-3 w-3 text-green-600" />}
                                        </div>
                                        <span className={priority.status === 'on-track' ? 'font-medium' : ''}>On Track</span>
                                      </button>
                                      
                                      <button
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleUpdatePriority(priority.id, { status: 'off-track' });
                                          setOpenStatusDropdown(null);
                                        }}
                                      >
                                        <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                                          {priority.status === 'off-track' && <X className="h-3 w-3 text-red-600" />}
                                        </div>
                                        <span className={priority.status === 'off-track' ? 'font-medium' : ''}>Off Track</span>
                                      </button>
                                      
                                      <button
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleUpdatePriority(priority.id, { status: 'complete' });
                                          setOpenStatusDropdown(null);
                                        }}
                                      >
                                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                                             style={{ 
                                               backgroundColor: themeColors.primary + '20',
                                               borderColor: themeColors.primary 
                                             }}>
                                          {priority.status === 'complete' && <CheckCircle className="h-3 w-3" style={{ color: themeColors.primary }} />}
                                        </div>
                                        <span className={priority.status === 'complete' ? 'font-medium' : ''}>Complete</span>
                                      </button>
                                      
                                      <div className="border-t border-slate-100 my-1"></div>
                                      
                                      <button
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleUpdatePriority(priority.id, { status: 'cancelled' });
                                          setOpenStatusDropdown(null);
                                        }}
                                      >
                                        <div className="w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-500 flex items-center justify-center">
                                          {priority.status === 'cancelled' && <X className="h-3 w-3 text-gray-500" />}
                                        </div>
                                        <span className={priority.status === 'cancelled' ? 'font-medium' : ''}>Cancelled</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Title */}
                                <div 
                                  className="flex-1 ml-3 cursor-pointer"
                                  onClick={() => {
                                    setSelectedPriority(priority);
                                    setShowPriorityDialog(true);
                                  }}
                                >
                                  <span className={`font-medium ${isComplete ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                    {priority.title}
                                  </span>
                                  {priority.isCompanyPriority && (
                                    <Badge variant="outline" className="ml-2 text-xs">Company</Badge>
                                  )}
                                </div>
                                
                                {/* Milestone Progress */}
                                <div className="w-40 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-sm text-slate-600">
                                      {completedMilestones}/{totalMilestones}
                                    </span>
                                    <Progress value={totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0} className="w-16 h-2" />
                                  </div>
                                </div>
                                
                                {/* Due Date */}
                                <div className="w-20 text-right">
                                  <span className="text-sm text-slate-600">
                                    {priority.dueDate ? format(new Date(priority.dueDate), 'MMM d') : '-'}
                                  </span>
                                </div>
                                
                                {/* Actions */}
                                <div className="w-8 flex items-center justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                      setSelectedPriority(priority);
                                      setShowPriorityDialog(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 text-slate-400" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Expanded Milestones Section */}
                              {isExpanded && (
                                <div className="ml-12 mr-4 mb-3 p-3 bg-slate-50 rounded-lg">
                                  <div className="space-y-2">
                                    {(priority.milestones || []).map(milestone => (
                                      <div key={milestone.id} className="flex items-center gap-3">
                                        <Checkbox
                                          checked={milestone.completed}
                                          onCheckedChange={async (checked) => {
                                            await handleToggleMilestone(priority.id, milestone.id, checked);
                                          }}
                                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                        />
                                        <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                          {milestone.title}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          {milestone.dueDate ? format(new Date(milestone.dueDate), 'MMM d') : ''}
                                        </span>
                                      </div>
                                    ))}
                                    
                                    {/* Add Milestone Inline */}
                                    {addingMilestoneFor === priority.id ? (
                                      <div className="flex items-center gap-2 mt-2">
                                        <Input
                                          value={newMilestone.title}
                                          onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                                          placeholder="Milestone description..."
                                          className="flex-1 h-8 text-sm"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newMilestone.title.trim()) {
                                              handleAddMilestone(priority.id);
                                            }
                                            if (e.key === 'Escape') {
                                              setAddingMilestoneFor(null);
                                              setNewMilestone({ title: '', dueDate: '' });
                                            }
                                          }}
                                        />
                                        <Input
                                          type="date"
                                          value={newMilestone.dueDate}
                                          onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                                          className="w-32 h-8 text-sm"
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0 hover:bg-green-100"
                                          onClick={() => handleAddMilestone(priority.id)}
                                        >
                                          <Check className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0 hover:bg-red-100"
                                          onClick={() => {
                                            setAddingMilestoneFor(null);
                                            setNewMilestone({ title: '', dueDate: '' });
                                          }}
                                        >
                                          <X className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <button
                                        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mt-2"
                                        onClick={() => {
                                          setAddingMilestoneFor(priority.id);
                                          setNewMilestone({ 
                                            title: '', 
                                            dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
                                          });
                                        }}
                                      >
                                        <Plus className="h-3 w-3" />
                                        Add Milestone
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </div>