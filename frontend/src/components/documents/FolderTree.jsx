import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Edit2, Trash2, Building2, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const FolderTree = ({ 
  folders, 
  selectedFolder, 
  onSelectFolder, 
  onCreateFolder, 
  onRenameFolder, 
  onDeleteFolder,
  isAdmin,
  userId 
}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  // Build tree structure from flat list
  const buildTree = (folders) => {
    const folderMap = {};
    const rootFolders = [];

    // Create map of all folders
    folders.forEach(folder => {
      folderMap[folder.id] = { ...folder, children: [] };
    });

    // Build parent-child relationships
    folders.forEach(folder => {
      if (folder.parent_folder_id) {
        const parent = folderMap[folder.parent_folder_id];
        if (parent) {
          parent.children.push(folderMap[folder.id]);
        }
      } else {
        rootFolders.push(folderMap[folder.id]);
      }
    });

    // Sort folders by visibility (company first, then department, then personal)
    const sortFolders = (folders) => {
      return folders.sort((a, b) => {
        const visibilityOrder = { company: 0, department: 1, personal: 2 };
        if (visibilityOrder[a.visibility] !== visibilityOrder[b.visibility]) {
          return visibilityOrder[a.visibility] - visibilityOrder[b.visibility];
        }
        return a.name.localeCompare(b.name);
      });
    };

    // Sort at each level
    const sortTree = (folders) => {
      sortFolders(folders);
      folders.forEach(folder => {
        if (folder.children.length > 0) {
          sortTree(folder.children);
        }
      });
    };

    sortTree(rootFolders);
    return rootFolders;
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'company':
        return <Building2 className="h-4 w-4 text-blue-600" />;
      case 'department':
        return <Users className="h-4 w-4 text-green-600" />;
      case 'personal':
        return <Lock className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const canManageFolder = (folder) => {
    if (isAdmin) return true;
    if (folder.visibility === 'personal' && folder.owner_id === userId) return true;
    return false;
  };

  const renderFolder = (folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;
    const canManage = canManageFolder(folder);

    return (
      <div key={folder.id}>
        <div 
          className={cn(
            "flex items-center py-1.5 px-2 hover:bg-gray-100 rounded-md cursor-pointer group",
            isSelected && "bg-blue-50 hover:bg-blue-100"
          )}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <button
            onClick={() => hasChildren && toggleFolder(folder.id)}
            className="p-0.5 hover:bg-gray-200 rounded mr-1"
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            {isExpanded ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
            }
          </button>
          
          <div
            onClick={() => onSelectFolder(folder.id)}
            className="flex items-center flex-1 min-w-0"
          >
            {isExpanded ? 
              <FolderOpen className="h-4 w-4 mr-2 text-gray-600 flex-shrink-0" /> : 
              <Folder className="h-4 w-4 mr-2 text-gray-600 flex-shrink-0" />
            }
            <span className="truncate flex-1">{folder.name}</span>
            <div className="ml-2 flex items-center space-x-1">
              {getVisibilityIcon(folder.visibility)}
              {folder.document_count > 0 && (
                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {folder.document_count}
                </span>
              )}
            </div>
          </div>

          {canManage && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <span className="sr-only">Folder options</span>
                    <Plus className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onCreateFolder(folder.id)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Subfolder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRenameFolder(folder)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDeleteFolder(folder)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {folder.children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree(folders);

  return (
    <div className="space-y-1">
      {/* Root folder */}
      <div 
        className={cn(
          "flex items-center py-1.5 px-2 hover:bg-gray-100 rounded-md cursor-pointer",
          !selectedFolder && "bg-blue-50 hover:bg-blue-100"
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="h-4 w-4 mr-2 text-gray-600" />
        <span className="font-medium">All Documents</span>
      </div>

      {/* Folder tree */}
      {tree.map(folder => renderFolder(folder))}
    </div>
  );
};

export default FolderTree;