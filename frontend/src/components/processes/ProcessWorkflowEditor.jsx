import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useTerminology } from '../../contexts/TerminologyContext';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme } from '../../utils/themeUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  ChevronUp,
  ChevronDown,
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  BookOpen,
  ListChecks,
  Target,
  X,
  GripVertical,
  Edit,
  Check,
  Upload,
  Image,
  Paperclip,
  Eye,
  Download,
  Loader2,
  ChevronRight as ChevronRightIcon,
  StickyNote,
  FileText as FileTextIcon,
  Info,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Minus
} from 'lucide-react';
import axios from '../../services/axiosConfig';

const ProcessWorkflowEditor = ({ process, onSave, onCancel, templates = [], teamMembers = [] }) => {
  const { user } = useAuthStore();
  const { labels } = useTerminology();
  const [currentStep, setCurrentStep] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, index: null, subIndex: null });
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  // Form data with all process information
  const [formData, setFormData] = useState({
    name: process?.name || '',
    description: process?.description || '',
    category: process?.category || 'Operations',
    owner_user_id: process?.owner_user_id || user?.id || '',
    purpose: process?.purpose || '',
    outcomes: process?.outcomes || '',
    storage_type: process?.storage_type || 'internal',
    methodology_type: process?.methodology_type || 'eos',
    is_core_process: process?.is_core_process || false,
    status: process?.status || 'draft',
    review_frequency_days: process?.review_frequency_days || 90,
    steps: process?.steps || [],
    external_url: process?.external_url || '',
    external_file_id: process?.external_file_id || '',
  });

  // Track which step is being edited
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const [editingSubStepIndex, setEditingSubStepIndex] = useState(null);
  const [expandedSubSteps, setExpandedSubSteps] = useState({}); // Track which substeps have expanded notes
  const [editingNotes, setEditingNotes] = useState({}); // Track which notes are being edited
  const [expandedSteps, setExpandedSteps] = useState({}); // Track which steps are expanded for viewing
  const [savedNotes, setSavedNotes] = useState({}); // Track which notes were just saved for visual feedback

  useEffect(() => {
    fetchOrganizationTheme();
    // If editing an existing process, fetch its full details including steps
    if (process?.id) {
      fetchProcessDetails(process.id);
    }
  }, [process?.id]);

  const fetchProcessDetails = async (processId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/processes/${processId}`);
      const processData = response.data;
      
      // Update formData with the fetched process including steps
      setFormData({
        ...formData,
        name: processData.name || '',
        description: processData.description || '',
        category: processData.category || 'Operations',
        owner_user_id: processData.owner_user_id || user?.id || '',
        purpose: processData.purpose || '',
        outcomes: processData.outcomes || '',
        storage_type: processData.storage_type || 'internal',
        methodology_type: processData.methodology_type || 'eos',
        is_core_process: processData.is_core_process || false,
        status: processData.status || 'draft',
        review_frequency_days: processData.review_frequency_days || 90,
        steps: processData.steps || [],
        external_url: processData.external_url || '',
        external_file_id: processData.external_file_id || '',
      });
    } catch (error) {
      console.error('Failed to fetch process details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationTheme = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
    }
  };

  // Process categories based on methodology
  const getCategories = () => {
    const baseCategories = [
      'Sales & Marketing',
      'Operations',
      'Finance',
      'Human Resources',
      'Customer Success',
      'Technology',
      'Product',
      'Legal & Compliance'
    ];
    
    if (formData.methodology_type === 'scaling_up') {
      return [...baseCategories, 'Strategy', 'Execution'];
    }
    return baseCategories;
  };

  // Workflow steps configuration
  const workflowSteps = [
    { id: 'overview', label: 'Process Overview', icon: FileText },
    { id: 'steps', label: 'Process Steps', icon: ListChecks },
    { id: 'review', label: 'Review & Settings', icon: CheckCircle }
  ];

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 0) {
      const newErrors = {};
      if (!formData.name) newErrors.name = 'Process name is required';
      if (!formData.description) newErrors.description = 'Description is required';
      if (!formData.owner_user_id) newErrors.owner = 'Process owner is required';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    
    setErrors({});
    if (currentStep < workflowSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddStep = () => {
    const newStep = {
      step_number: formData.steps.length + 1,
      title: '',
      description: '',
      bullets: [],
      responsible_role: '',
      estimated_time: '',
      tools_required: [],
      attachments: [], // Array to store attachments/screenshots for this step
      resources: {}
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
    setEditingStepIndex(formData.steps.length);
  };

  const handleUpdateStep = (index, field, value) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setFormData({ ...formData, steps: updatedSteps });
  };

  const handleDeleteStep = (index) => {
    setDeleteConfirm({ show: true, type: 'step', index, subIndex: null });
  };

  const confirmDeleteStep = (index) => {
    const updatedSteps = formData.steps.filter((_, i) => i !== index);
    // Renumber remaining steps
    updatedSteps.forEach((step, i) => {
      step.step_number = i + 1;
    });
    setFormData({ ...formData, steps: updatedSteps });
    setEditingStepIndex(null);
    setDeleteConfirm({ show: false, type: null, index: null, subIndex: null });
  };

  const handleMoveStep = (index, direction) => {
    const updatedSteps = [...formData.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < updatedSteps.length) {
      [updatedSteps[index], updatedSteps[targetIndex]] = [updatedSteps[targetIndex], updatedSteps[index]];
      // Renumber steps
      updatedSteps.forEach((step, i) => {
        step.step_number = i + 1;
      });
      setFormData({ ...formData, steps: updatedSteps });
    }
  };

  const handleAddSubStep = (stepIndex) => {
    const updatedSteps = [...formData.steps];
    if (!updatedSteps[stepIndex].bullets) {
      updatedSteps[stepIndex].bullets = [];
    }
    updatedSteps[stepIndex].bullets.push({ 
      text: '', 
      notes: '', // Added notes field for requirements/details
      completed: false 
    });
    setFormData({ ...formData, steps: updatedSteps });
  };

  const handleUpdateSubStep = (stepIndex, subStepIndex, field, value) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[stepIndex].bullets[subStepIndex] = { 
      ...updatedSteps[stepIndex].bullets[subStepIndex], 
      [field]: value 
    };
    setFormData({ ...formData, steps: updatedSteps });
  };

  const handleDeleteSubStep = (stepIndex, subStepIndex) => {
    setDeleteConfirm({ show: true, type: 'substep', index: stepIndex, subIndex: subStepIndex });
  };

  const confirmDeleteSubStep = (stepIndex, subStepIndex) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[stepIndex].bullets = updatedSteps[stepIndex].bullets.filter((_, i) => i !== subStepIndex);
    setFormData({ ...formData, steps: updatedSteps });
    setDeleteConfirm({ show: false, type: null, index: null, subIndex: null });
  };

  // Handle file upload for step attachments
  const handleFileUpload = async (stepIndex, files) => {
    const updatedSteps = [...formData.steps];
    if (!updatedSteps[stepIndex].attachments) {
      updatedSteps[stepIndex].attachments = [];
    }

    for (const file of files) {
      // Check if it's an image
      const isImage = file.type.startsWith('image/');
      
      // Convert file to base64 for storage
      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment = {
          id: Date.now() + Math.random(), // Temporary ID
          file_name: file.name,  // Use file_name to match backend
          name: file.name,       // Keep for compatibility
          file_type: file.type,  // Use file_type to match backend
          type: file.type,       // Keep for compatibility
          file_size: file.size,  // Use file_size to match backend
          size: file.size,       // Keep for compatibility
          file_data: e.target.result, // Base64 data for storage
          url: e.target.result,  // For preview
          isImage: isImage,
          uploadedAt: new Date().toISOString()
        };
        
        updatedSteps[stepIndex].attachments.push(attachment);
        setFormData({ ...formData, steps: updatedSteps });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAttachment = (stepIndex, attachmentIndex) => {
    setDeleteConfirm({ show: true, type: 'attachment', index: stepIndex, subIndex: attachmentIndex });
  };

  const confirmDeleteAttachment = (stepIndex, attachmentIndex) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[stepIndex].attachments = updatedSteps[stepIndex].attachments.filter((_, i) => i !== attachmentIndex);
    setFormData({ ...formData, steps: updatedSteps });
    setDeleteConfirm({ show: false, type: null, index: null, subIndex: null });
  };

  // Handle attachment download
  const handleDownloadAttachment = (attachment) => {
    // Create a download link
    const link = document.createElement('a');
    link.href = attachment.url || attachment.file_data;
    link.download = attachment.name || attachment.file_name || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle attachment preview
  const handlePreviewAttachment = (attachment) => {
    console.log('Preview attachment clicked:', attachment);
    
    // Check if it's an image - use same logic as edit mode
    const isImage = attachment.isImage || 
                   attachment.fileType?.startsWith('image/') || 
                   attachment.file_type?.startsWith('image/') ||
                   /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name || attachment.fileName || attachment.file_name || '');
    
    console.log('Is image?', isImage);
    console.log('attachment.isImage:', attachment.isImage);
    console.log('attachment.url:', attachment.url);
    console.log('attachment.name:', attachment.name);
    
    if (isImage) {
      // Use attachment.url first (same as edit mode)
      let imageUrl = attachment.url || attachment.file_url || attachment.file_data || attachment.fileData || attachment.data;
      
      // If it's base64 data without the data URL prefix, add it
      if (imageUrl && !imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
        const mimeType = attachment.fileType || attachment.file_type || 'image/jpeg';
        imageUrl = `data:${mimeType};base64,${imageUrl}`;
      }
      
      console.log('Image URL preview:', imageUrl ? imageUrl.substring(0, 100) + '...' : 'No URL');
      
      if (!imageUrl) {
        console.error('No image URL found for preview:', attachment);
        alert('Unable to preview this image. The image data may not be available.');
        return;
      }
      
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>${attachment.fileName || attachment.file_name || attachment.name || 'Image Preview'}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1f2937; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                .error { color: white; font-family: sans-serif; text-align: center; padding: 20px; }
              </style>
            </head>
            <body>
              <img src="${imageUrl}" alt="${attachment.fileName || attachment.file_name || 'Preview'}" 
                   onerror="document.body.innerHTML='<div class=error>Failed to load image. The image data may be corrupted or in an unsupported format.</div>'" />
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        console.error('Failed to open preview window - popup may be blocked');
        alert('Unable to open preview window. Please check if popups are blocked for this site.');
      }
    } else {
      // For documents, try to open in browser or download
      if (attachment.file_type && attachment.file_type.includes('pdf')) {
        const pdfUrl = attachment.url || attachment.file_url || attachment.file_data;
        if (pdfUrl) {
          window.open(pdfUrl, '_blank');
        } else {
          handleDownloadAttachment(attachment);
        }
      } else {
        // For other files, trigger download
        handleDownloadAttachment(attachment);
      }
    }
  };

  // Rich text formatting functions
  const applyFormatting = (stepIndex, subStepIndex, format) => {
    // First ensure we're in edit mode
    const key = `${stepIndex}-${subStepIndex}`;
    if (!editingNotes[key]) {
      toggleEditMode(stepIndex, subStepIndex, true);
      // Wait for textarea to be rendered
      setTimeout(() => {
        applyFormatting(stepIndex, subStepIndex, format);
      }, 100);
      return;
    }
    
    const textarea = document.getElementById(`notes-${stepIndex}-${subStepIndex}`);
    if (!textarea) {
      console.error('Textarea not found for formatting');
      return;
    }
    
    // Focus the textarea to ensure selection is active
    textarea.focus();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let newText = '';
    let newCursorPos = start;

    switch (format) {
      case 'bold':
        // Check if already bold and toggle
        if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
          newText = text.substring(0, start) + selectedText.slice(2, -2) + text.substring(end);
          newCursorPos = end - 4;
        } else {
          newText = text.substring(0, start) + `**${selectedText}**` + text.substring(end);
          newCursorPos = end + 4;
        }
        break;
      
      case 'italic':
        // Check if already italic and toggle
        if (selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**')) {
          newText = text.substring(0, start) + selectedText.slice(1, -1) + text.substring(end);
          newCursorPos = end - 2;
        } else {
          newText = text.substring(0, start) + `*${selectedText}*` + text.substring(end);
          newCursorPos = end + 2;
        }
        break;
      
      case 'bullet':
        // If nothing is selected or just cursor position
        if (selectedText === '' || (start === end)) {
          // Just add a bullet at the current position
          newText = text.substring(0, start) + '• ' + text.substring(end);
          newCursorPos = start + 2;
        } else {
          // Text is selected - add bullet to each line
          const lines = selectedText.split('\n');
          const bulletedLines = lines.map(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return line; // Keep empty lines
            
            // Check if already has a bullet
            if (trimmedLine.startsWith('•')) {
              // Remove the bullet (toggle off)
              return line.replace(/^\s*•\s*/, '');
            } else {
              // Add bullet (remove any numbers first)
              const cleanLine = trimmedLine.replace(/^\d+\.\s*/, '');
              return `• ${cleanLine}`;
            }
          });
          
          newText = text.substring(0, start) + bulletedLines.join('\n') + text.substring(end);
          newCursorPos = end + (bulletedLines.join('\n').length - selectedText.length);
        }
        break;
      
      case 'number':
        // If nothing is selected, select the current line(s) based on cursor position
        if (!selectedText && start === end) {
          // Find the start and end of the current line
          const lineStart = text.lastIndexOf('\n', start - 1) + 1;
          const lineEnd = text.indexOf('\n', start);
          const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
          
          // Select the current line
          textarea.setSelectionRange(lineStart, actualLineEnd);
          selectedText = text.substring(lineStart, actualLineEnd);
          start = lineStart;
          end = actualLineEnd;
        }
        
        // Handle multiple lines or single line with selection
        if (selectedText) {
          const lines = selectedText.split('\n');
          let lineNumber = 1;
          const numberedLines = lines.map(line => {
            if (!line.trim()) return line;  // Keep empty lines as-is
            
            // Remove existing formatting and add number
            const cleanLine = line
              .replace(/^[•\-\*\+]\s*/, '')  // Remove bullets
              .replace(/^\d+\.\s*/, '')  // Remove existing numbers
              .trim();
            return cleanLine ? `${lineNumber++}. ${cleanLine}` : '';
          });
          
          newText = text.substring(0, start) + numberedLines.join('\n') + text.substring(end);
          newCursorPos = start + numberedLines.join('\n').length;
        }
        break;
      
      case 'code':
        newText = text.substring(0, start) + `\`${selectedText}\`` + text.substring(end);
        newCursorPos = end + 2;
        break;
      
      case 'divider':
        newText = text.substring(0, start) + '\n---\n' + text.substring(start);
        newCursorPos = start + 5;
        break;
    }

    handleUpdateSubStep(stepIndex, subStepIndex, 'notes', newText);
    
    // Restore cursor position and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const toggleEditMode = (stepIndex, subStepIndex, editing) => {
    const key = `${stepIndex}-${subStepIndex}`;
    setEditingNotes(prev => ({
      ...prev,
      [key]: editing
    }));
    
    // If we're closing edit mode (saving), show saved feedback
    if (!editing) {
      setSavedNotes(prev => ({ ...prev, [key]: true }));
      // Clear the saved indicator after 2 seconds
      setTimeout(() => {
        setSavedNotes(prev => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      }, 2000);
    }
  };

  // Handle Enter key for auto-continuing lists and Tab for indentation
  const handleKeyDown = (e, stepIndex, subStepIndex) => {
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    if (e.key === 'Tab') {
      e.preventDefault();
      
      // Find the current line
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = text.indexOf('\n', start);
      const currentLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
      
      // Calculate current indentation level
      const currentIndentMatch = currentLine.match(/^(\s*)/);
      const currentIndent = currentIndentMatch ? currentIndentMatch[1] : '';
      const currentIndentLevel = Math.floor(currentIndent.length / 4);
      
      if (e.shiftKey) {
        // Shift+Tab: Decrease indentation (outdent)
        if (currentIndentLevel > 0) {
          const newIndentLevel = currentIndentLevel - 1;
          const newIndent = '    '.repeat(newIndentLevel);
          
          // Replace current line's indentation
          const lineWithoutIndent = currentLine.trimStart();
          const newLine = newIndent + lineWithoutIndent;
          const newText = text.substring(0, lineStart) + newLine + text.substring(lineStart + currentLine.length);
          handleUpdateSubStep(stepIndex, subStepIndex, 'notes', newText);
          
          // Maintain cursor position relative to content
          setTimeout(() => {
            textarea.focus();
            const cursorOffset = start - lineStart - currentIndent.length;
            const newPos = lineStart + newIndent.length + Math.max(0, cursorOffset);
            textarea.setSelectionRange(newPos, newPos);
          }, 10);
        }
      } else {
        // Tab: Increase indentation (indent)
        // Add one more level of indentation (max 3 levels deep, so 4 total including base)
        const newIndentLevel = Math.min(currentIndentLevel + 1, 3);
        const newIndent = '    '.repeat(newIndentLevel);
        
        // Check if we're on an empty bullet line (just spaces and bullet)
        if (currentLine.trim() === '•') {
          // Replace the existing bullet with a more indented one
          const newText = text.substring(0, lineStart) + newIndent + '• ' + text.substring(start);
          handleUpdateSubStep(stepIndex, subStepIndex, 'notes', newText);
          
          // Set cursor position after the indented bullet
          setTimeout(() => {
            textarea.focus();
            const newPos = lineStart + newIndent.length + 2; // indent + "• "
            textarea.setSelectionRange(newPos, newPos);
          }, 10);
        } else {
          // Insert a new line with an indented bullet (one level deeper than current)
          const newText = text.substring(0, start) + '\n' + newIndent + '• ' + text.substring(end);
          handleUpdateSubStep(stepIndex, subStepIndex, 'notes', newText);
          
          // Set cursor position after the new indented bullet
          setTimeout(() => {
            textarea.focus();
            const newPos = start + 1 + newIndent.length + 2; // newline + indent + "• "
            textarea.setSelectionRange(newPos, newPos);
          }, 10);
        }
      }
      return;
    }
    
    if (e.key === 'Enter') {
      // Find the current line
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = text.indexOf('\n', start);
      const currentLine = text.substring(lineStart, lineEnd === -1 ? start : Math.min(start, lineEnd));
      
      // Check if current line starts with a bullet
      const bulletMatch = currentLine.match(/^(\s*)(•\s+)/);
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const bullet = bulletMatch[2];
        
        // Check if the line has content after the bullet
        const lineContent = currentLine.substring(bulletMatch[0].length).trim();
        
        if (lineContent === '') {
          // Empty bullet line - remove the bullet and add plain new line
          const newText = text.substring(0, lineStart) + '\n' + text.substring(start);
          handleUpdateSubStep(stepIndex, subStepIndex, 'notes', newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart + 1;
          }, 0);
        } else {
          // Add new bullet on next line
          const newText = text.substring(0, start) + '\n' + indent + bullet + text.substring(end);
          handleUpdateSubStep(stepIndex, subStepIndex, 'notes', newText);
          setTimeout(() => {
            const newPos = start + 1 + indent.length + bullet.length;
            textarea.selectionStart = textarea.selectionEnd = newPos;
          }, 0);
        }
        return;
      }
      
      // Check if current line starts with a number
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s+/);
      if (numberMatch) {
        e.preventDefault();
        const indent = numberMatch[1];
        const currentNum = parseInt(numberMatch[2]);
        
        // Check if the line has content after the number
        const lineContent = currentLine.substring(numberMatch[0].length).trim();
        
        if (lineContent === '') {
          // Empty numbered line - remove the number and add plain new line
          const newText = text.substring(0, lineStart) + '\n' + text.substring(start);
          handleUpdateSubStep(stepIndex, subStepIndex, 'notes', newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart + 1;
          }, 0);
        } else {
          // Add new numbered item on next line
          const nextNum = currentNum + 1;
          const newText = text.substring(0, start) + '\n' + indent + nextNum + '. ' + text.substring(end);
          handleUpdateSubStep(stepIndex, subStepIndex, 'notes', newText);
          setTimeout(() => {
            const newPos = start + 1 + indent.length + (nextNum + '. ').length;
            textarea.selectionStart = textarea.selectionEnd = newPos;
          }, 0);
        }
        return;
      }
    }
  };

  // Handle paste to preserve formatting
  const handlePaste = (stepIndex, subStepIndex, event) => {
    event.preventDefault();
    
    // Try to get HTML content first for better formatting preservation
    let htmlContent = event.clipboardData.getData('text/html');
    let paste = event.clipboardData.getData('text/plain');
    
    const textarea = event.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    // If we have HTML content, parse it to extract structure
    if (htmlContent && !htmlContent.includes('<!--')) {
      // Create a temporary div to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // Remove all style tags and their content
      const styles = tempDiv.querySelectorAll('style');
      styles.forEach(style => style.remove());
      
      // Remove all script tags
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach(script => script.remove());
      
      // Extract text with formatting preserved
      const processNode = (node, depth = 0) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent;
        }
        
        if (node.nodeName === 'LI') {
          // List item - add bullet with proper indentation
          const content = Array.from(node.childNodes).map(child => processNode(child, depth)).join('');
          const indent = '    '.repeat(depth);
          return indent + '• ' + content.trim();
        }
        
        if (node.nodeName === 'P' || node.nodeName === 'DIV') {
          const content = Array.from(node.childNodes).map(child => processNode(child, depth)).join('');
          return content ? content + '\n' : '';
        }
        
        if (node.nodeName === 'UL' || node.nodeName === 'OL') {
          const items = Array.from(node.children).map((li, index) => {
            const content = Array.from(li.childNodes).map(child => processNode(child, depth + 1)).join('');
            const indent = '    '.repeat(depth);
            if (node.nodeName === 'OL') {
              return indent + `${index + 1}. ${content.trim()}`;
            }
            return indent + '• ' + content.trim();
          });
          return items.join('\n') + '\n';
        }
        
        if (node.nodeName === 'BR') {
          return '\n';
        }
        
        // Process children for other nodes
        return Array.from(node.childNodes).map(child => processNode(child, depth)).join('');
      };
      
      paste = processNode(tempDiv).trim();
    } else if (htmlContent && htmlContent.includes('<!--')) {
      // If HTML contains comments (likely Word CSS), just use plain text
      // Plain text paste is already in the paste variable
    }
    
    // Clean up the pasted text - handle more bullet types
    paste = paste
      .replace(/^[●▪▫◦‣⁃◘○◙§·]/gm, '•')  // Replace various bullet chars with our standard bullet
      .replace(/^[\-\*\+>]/gm, '•')     // Replace dashes, asterisks, plus signs, arrows at line start
      .replace(/^\s*([●▪▫◦‣⁃◘○◙§·•])\s*/gm, '• ')  // Normalize spacing after bullets
      .replace(/^o\s+/gm, '• ')  // Replace 'o' used as bullet
      .replace(/^\s*(\d+)[.)]/gm, '$1.')  // Normalize numbered list formatting
      .replace(/\t/g, '    ')  // Convert tabs to spaces
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')  // Normalize Mac line endings
      .replace(/\n{3,}/g, '\n\n');  // Collapse multiple blank lines
    
    // If paste looks like it has Word CSS garbage, extract just the visible text
    if (paste.includes('@font-face') || paste.includes('mso-') || paste.includes('<!--')) {
      // Find where the actual content starts (after the CSS)
      const contentStart = paste.lastIndexOf('->');
      if (contentStart > -1) {
        paste = paste.substring(contentStart + 2).trim();
      }
      
      // Additional cleanup for Word artifacts
      paste = paste
        .replace(/^\s*[·§]\s*/gm, '• ')  // Replace Word bullet characters
        .replace(/\n\s*\n/g, '\n')  // Remove empty lines with just spaces
        .trim();
    }
    
    // Preserve formatting from paste
    const newText = text.substring(0, start) + paste + text.substring(end);
    handleUpdateSubStep(stepIndex, subStepIndex, 'notes', newText);
    
    // Update cursor position
    setTimeout(() => {
      textarea.focus();
      const newPos = start + paste.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Render formatted text for display
  const renderFormattedText = (text) => {
    if (!text) return '';
    
    // Escape HTML first to prevent XSS
    const escapeHtml = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };
    
    // Split into lines first to handle structure
    const lines = text.split('\n');
    const formattedLines = lines.map(line => {
      let formattedLine = escapeHtml(line);
      
      // Apply inline formatting
      // Bold (must come before italic to handle ** correctly)
      formattedLine = formattedLine.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');
      
      // Italic (single asterisk, not part of bold)
      formattedLine = formattedLine.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em style="font-style: italic;">$1</em>');
      
      // Code/monospace
      formattedLine = formattedLine.replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #0f172a;">$1</code>');
      
      // Handle line types - check for bullets with indentation
      const bulletMatch = line.match(/^(\s*)(•\s+)(.*)$/);
      if (bulletMatch) {
        const indent = bulletMatch[1];
        const indentLevel = Math.floor(indent.length / 4); // Count 4-space indents
        const paddingLeft = 20 + (indentLevel * 20); // Base padding + additional for each indent
        const content = formattedLine.substring(formattedLine.indexOf('•') + 1).trim();
        return `<div style="padding-left: ${paddingLeft}px; position: relative; margin: 2px 0;"><span style="position: absolute; left: ${indentLevel * 20}px;">•</span>${content}</div>`;
      }
      
      // Handle numbered lists with indentation
      const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numberMatch) {
        const indent = numberMatch[1];
        const num = numberMatch[2];
        const indentLevel = Math.floor(indent.length / 4);
        const paddingLeft = 20 + (indentLevel * 20);
        const content = formattedLine.replace(/^\s*\d+\.\s+/, '');
        return `<div style="padding-left: ${paddingLeft}px; position: relative; margin: 2px 0;"><span style="position: absolute; left: ${indentLevel * 20}px;">${num}.</span>${content}</div>`;
      }
      
      if (line.trim() === '---') {
        return '<hr style="margin: 12px 0; border: none; border-top: 1px solid #e2e8f0;" />';
      }
      
      // Regular paragraph (or empty line)
      if (line.trim()) {
        return `<div style="margin: 2px 0;">${formattedLine}</div>`;
      } else {
        return '<div style="margin: 2px 0; height: 1em;"></div>';
      }
    });
    
    return formattedLines.join('');
  };

  const handleSaveProcess = async () => {
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save process:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    onCancel();
  };

  // Calculate progress
  const progressPercentage = ((currentStep + 1) / workflowSteps.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: themeColors.primary }} />
          <p className="text-slate-600">Loading process details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                   style={{
                     background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                     color: themeColors.primary
                   }}>
                <Sparkles className="h-4 w-4" />
                {process ? 'EDIT PROCESS' : 'CREATE NEW PROCESS'}
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                {workflowSteps[currentStep].label}
              </h1>
            </div>
            <Button
              variant="ghost"
              onClick={handleExit}
              className="text-slate-600 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex items-center">
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isActive 
                            ? 'shadow-lg' 
                            : isCompleted 
                            ? '' 
                            : 'bg-gray-100'
                        }`}
                        style={{
                          background: isActive || isCompleted
                            ? `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                            : undefined
                        }}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5 text-white" />
                        ) : (
                          <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        )}
                      </div>
                      <span className={`ml-3 font-medium ${
                        isActive ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <div className="flex-1 mx-4">
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: isCompleted ? '100%' : '0%',
                              background: `linear-gradient(90deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-sm">
          {/* Step 1: Process Overview */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2">
                  Process Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter a clear, descriptive name for this process"
                  className={`${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide a brief overview of what this process accomplishes"
                  rows={3}
                  className={`${errors.description ? 'border-red-500' : ''}`}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2">
                    Process Owner <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.owner_user_id}
                    onValueChange={(value) => setFormData({ ...formData, owner_user_id: value })}
                  >
                    <SelectTrigger className={`${errors.owner ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.owner && (
                    <p className="text-sm text-red-500 mt-1">{errors.owner}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2">
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategories().map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2">
                  Purpose & Why This Process Exists
                </Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Explain why this process is important and what problem it solves"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2">
                  Expected Outcomes
                </Label>
                <Textarea
                  value={formData.outcomes}
                  onChange={(e) => setFormData({ ...formData, outcomes: e.target.value })}
                  placeholder="What results should be achieved when this process is followed?"
                  rows={2}
                />
              </div>

              {formData.methodology_type === 'eos' && (
                <div className="flex items-center space-x-3 p-4 rounded-lg"
                     style={{
                       background: `linear-gradient(135deg, ${themeColors.primary}5 0%, ${themeColors.secondary}5 100%)`
                     }}>
                  <Switch
                    checked={formData.is_core_process}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_core_process: checked })}
                  />
                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      Mark as Core Process
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Is this one of your 6-10 core processes that define how your business operates?
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Process Steps */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {formData.steps.length === 0 ? (
                <div className="text-center py-12 px-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200">
                  <ListChecks className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No steps added yet
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Start building your process by adding the first step
                  </p>
                  <Button
                    onClick={handleAddStep}
                    className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ 
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Step
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {formData.steps.map((step, index) => (
                      <div key={index} 
                           className="p-6 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveStep(index, 'up')}
                                disabled={index === 0}
                                className="h-6 w-6 p-0"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveStep(index, 'down')}
                                disabled={index === formData.steps.length - 1}
                                className="h-6 w-6 p-0"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                 style={{
                                   background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                                 }}>
                              {step.step_number}
                            </div>
                            {editingStepIndex === index ? (
                              <Textarea
                                value={step.title}
                                onChange={(e) => handleUpdateStep(index, 'title', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    // Focus the description field
                                    const descriptionField = document.querySelector(`#step-description-${index}`);
                                    if (descriptionField) {
                                      descriptionField.focus();
                                    }
                                  }
                                }}
                                placeholder="Enter step title"
                                className="flex-1 font-medium resize-none overflow-hidden"
                                rows={1}
                                style={{ 
                                  minHeight: '2.5rem',
                                  height: 'auto'
                                }}
                                onInput={(e) => {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                autoFocus
                              />
                            ) : (
                              <div className="flex-1">
                                <h3 className="font-medium text-lg text-slate-900">
                                  {step.title || 'Untitled Step'}
                                </h3>
                                {!editingStepIndex && (
                                  <div className="flex items-center gap-4 mt-1">
                                    {step.description && (
                                      <p className="text-sm text-slate-600 line-clamp-1">
                                        {step.description}
                                      </p>
                                    )}
                                    {step.attachments?.length > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Paperclip className="h-3 w-3 mr-1" />
                                        {step.attachments.length}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newExpanded = { ...expandedSteps };
                                if (newExpanded[index]) {
                                  delete newExpanded[index];
                                } else {
                                  newExpanded[index] = true;
                                }
                                setExpandedSteps(newExpanded);
                              }}
                              className="text-slate-600 hover:text-slate-900"
                              title={expandedSteps[index] ? "Collapse" : "Expand"}
                            >
                              {expandedSteps[index] ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingStepIndex(editingStepIndex === index ? null : index)}
                              className={editingStepIndex === index ? "text-green-600 hover:text-green-700" : ""}
                              title={editingStepIndex === index ? "Save" : "Edit"}
                            >
                              {editingStepIndex === index ? (
                                <Save className="h-4 w-4" />
                              ) : (
                                <Edit className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStep(index)}
                              className="text-red-500 hover:text-red-700"
                              title="Delete Step"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {editingStepIndex === index && (
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label className="text-sm font-medium text-slate-700 mb-2">
                                Step Notes
                              </Label>
                              <Textarea
                                id={`step-description-${index}`}
                                value={step.description}
                                onChange={(e) => handleUpdateStep(index, 'description', e.target.value)}
                                placeholder="Describe what happens in this step"
                                rows={3}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && e.ctrlKey) {
                                    e.preventDefault();
                                    // Focus the first sub-step or add a new one
                                    const firstSubStep = document.querySelector(`#substep-${index}-0`);
                                    if (firstSubStep) {
                                      firstSubStep.focus();
                                    } else {
                                      handleAddSubStep(index);
                                      setTimeout(() => {
                                        const newSubStep = document.querySelector(`#substep-${index}-0`);
                                        if (newSubStep) newSubStep.focus();
                                      }, 100);
                                    }
                                  }
                                }}
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-slate-700 mb-2">
                                Sub-steps / Checklist
                              </Label>
                              <div className="space-y-3">
                                {step.bullets?.map((bullet, subIndex) => {
                                  const isExpanded = expandedSubSteps[`${index}-${subIndex}`];
                                  const subStepLetter = String.fromCharCode(97 + subIndex); // Convert to letter (a, b, c...)
                                  return (
                                    <div key={subIndex} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 ml-4 relative">
                                      {/* Letter indicator with connecting line */}
                                      <div className="absolute -left-8 top-3 flex items-center">
                                        <div className="w-4 h-px bg-slate-300"></div>
                                        <div 
                                          className={`border rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium transition-all ${
                                            savedNotes[`${index}-${subIndex}`] 
                                              ? 'bg-green-100 border-green-400 text-green-700'
                                              : 'bg-white'
                                          }`}
                                          style={savedNotes[`${index}-${subIndex}`] ? {} : { 
                                            borderColor: `${themeColors.primary}40`,
                                            color: `${themeColors.primary}99`,
                                            backgroundColor: `${themeColors.primary}08`
                                          }}
                                        >
                                          {savedNotes[`${index}-${subIndex}`] ? '✓' : subStepLetter}
                                        </div>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <div className="flex-1 space-y-2">
                                          <Input
                                            id={`substep-${index}-${subIndex}`}
                                            value={bullet.text}
                                            onChange={(e) => handleUpdateSubStep(index, subIndex, 'text', e.target.value)}
                                            placeholder="Enter sub-step description"
                                            className="bg-white"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                
                                                // Check if this is the last sub-step
                                                const isLastSubStep = subIndex === step.bullets.length - 1;
                                                
                                                if (isLastSubStep) {
                                                  // Add a new sub-step
                                                  handleAddSubStep(index);
                                                  // Focus the new sub-step after a short delay
                                                  setTimeout(() => {
                                                    const newSubStep = document.querySelector(`#substep-${index}-${subIndex + 1}`);
                                                    if (newSubStep) {
                                                      newSubStep.focus();
                                                      newSubStep.select();
                                                    }
                                                  }, 100);
                                                } else {
                                                  // Move to next sub-step
                                                  const nextSubStep = document.querySelector(`#substep-${index}-${subIndex + 1}`);
                                                  if (nextSubStep) {
                                                    nextSubStep.focus();
                                                    nextSubStep.select();
                                                  }
                                                }
                                                
                                                // Show saved feedback for current sub-step
                                                const key = `${index}-${subIndex}`;
                                                setSavedNotes(prev => ({ ...prev, [key]: true }));
                                                setTimeout(() => {
                                                  setSavedNotes(prev => {
                                                    const updated = { ...prev };
                                                    delete updated[key];
                                                    return updated;
                                                  });
                                                }, 1500);
                                              }
                                            }}
                                          />
                                          
                                          {/* Expandable Notes Section */}
                                          <div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                const key = `${index}-${subIndex}`;
                                                setExpandedSubSteps(prev => ({
                                                  ...prev,
                                                  [key]: !prev[key]
                                                }));
                                              }}
                                              className={`text-xs -ml-2 ${
                                                savedNotes[`${index}-${subIndex}`] 
                                                  ? 'text-green-600 hover:text-green-700' 
                                                  : 'text-slate-600 hover:text-slate-900'
                                              }`}
                                            >
                                              {savedNotes[`${index}-${subIndex}`] ? (
                                                <>
                                                  <Check className="h-3 w-3 mr-1" />
                                                  Saved!
                                                </>
                                              ) : (
                                                <>
                                                  <ChevronRightIcon 
                                                    className={`h-3 w-3 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                                                  />
                                                  <StickyNote className="h-3 w-3 mr-1" />
                                                  {bullet.notes ? 'Edit Requirements/Notes' : 'Add Requirements/Notes'}
                                                </>
                                              )}
                                            </Button>
                                            
                                            {isExpanded && (
                                              <div className="mt-2 p-3 bg-white rounded-md border border-slate-200">
                                                <div className="flex items-center justify-between mb-2">
                                                  <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                                                    <Info className="h-3 w-3" />
                                                    Required Information / Notes
                                                  </Label>
                                                  
                                                  {/* Formatting Toolbar */}
                                                  <div className="flex items-center gap-1">
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 w-7 p-0"
                                                      onMouseDown={(e) => e.preventDefault()}
                                                      onClick={() => applyFormatting(index, subIndex, 'bold')}
                                                      title="Bold (select text first)"
                                                    >
                                                      <Bold className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 w-7 p-0"
                                                      onMouseDown={(e) => e.preventDefault()}
                                                      onClick={() => applyFormatting(index, subIndex, 'italic')}
                                                      title="Italic (select text first)"
                                                    >
                                                      <Italic className="h-3 w-3" />
                                                    </Button>
                                                    <div className="w-px h-4 bg-slate-200 mx-1" />
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 w-7 p-0"
                                                      onMouseDown={(e) => e.preventDefault()}
                                                      onClick={() => applyFormatting(index, subIndex, 'bullet')}
                                                      title="Bullet point"
                                                    >
                                                      <List className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 w-7 p-0"
                                                      onMouseDown={(e) => e.preventDefault()}
                                                      onClick={() => applyFormatting(index, subIndex, 'number')}
                                                      title="Numbered list"
                                                    >
                                                      <ListOrdered className="h-3 w-3" />
                                                    </Button>
                                                    <div className="w-px h-4 bg-slate-200 mx-1" />
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 w-7 p-0"
                                                      onMouseDown={(e) => e.preventDefault()}
                                                      onClick={() => applyFormatting(index, subIndex, 'code')}
                                                      title="Code/Account number"
                                                    >
                                                      <Code className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 w-7 p-0"
                                                      onMouseDown={(e) => e.preventDefault()}
                                                      onClick={() => applyFormatting(index, subIndex, 'divider')}
                                                      title="Divider line"
                                                    >
                                                      <Minus className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                                
                                                {/* Show formatted preview or edit mode */}
                                                {editingNotes[`${index}-${subIndex}`] ? (
                                                  <>
                                                    <Textarea
                                                      id={`notes-${index}-${subIndex}`}
                                                      value={bullet.notes || ''}
                                                      onChange={(e) => handleUpdateSubStep(index, subIndex, 'notes', e.target.value)}
                                                      onKeyDown={(e) => handleKeyDown(e, index, subIndex)}
                                                      onPaste={(e) => handlePaste(index, subIndex, e)}
                                                      placeholder="Enter required information, notes, or details for this sub-step...&#10;&#10;Example:&#10;• Purchase Date&#10;• Control Numbers&#10;• Serial Numbers&#10;• Dollar Amount for each item&#10;• Account Codes:&#10;  - 131000 New Inventory&#10;  - 183000 Fixed Assets"
                                                      rows={8}
                                                      className="text-sm font-mono whitespace-pre-wrap"
                                                      style={{ lineHeight: '1.6' }}
                                                      autoFocus
                                                    />
                                                    <div className="flex items-start justify-between mt-2">
                                                      <p className="text-xs text-slate-500">
                                                        **bold** *italic* `code` • bullets (Click outside to see formatted)
                                                      </p>
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 text-xs -mt-1"
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          toggleEditMode(index, subIndex, false);
                                                        }}
                                                      >
                                                        Save
                                                      </Button>
                                                    </div>
                                                  </>
                                                ) : (
                                                  <>
                                                    <div 
                                                      className="text-sm bg-white border border-slate-200 rounded-lg p-3 min-h-[120px] cursor-text hover:bg-slate-50 transition-colors"
                                                      onClick={() => toggleEditMode(index, subIndex, true)}
                                                      style={{ lineHeight: '1.6' }}
                                                    >
                                                      {bullet.notes ? (
                                                        <div 
                                                          dangerouslySetInnerHTML={{ __html: renderFormattedText(bullet.notes) }}
                                                          className="formatted-text"
                                                        />
                                                      ) : (
                                                        <p className="text-slate-400">Click to add required information, notes, or details...</p>
                                                      )}
                                                    </div>
                                                    <div className="flex items-start justify-between mt-2">
                                                      <p className="text-xs text-slate-500">
                                                        Click text to edit • Use toolbar for formatting
                                                      </p>
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 text-xs -mt-1"
                                                        onClick={() => toggleEditMode(index, subIndex, true)}
                                                      >
                                                        Edit
                                                      </Button>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Show indicator if notes exist but are collapsed */}
                                          {!isExpanded && bullet.notes && (
                                            <div className="text-xs bg-blue-50 px-3 py-2 rounded mt-2">
                                              <div className="flex items-center gap-2 text-slate-600 mb-1">
                                                <FileTextIcon className="h-3 w-3" />
                                                <span className="font-medium">Requirements/Notes:</span>
                                              </div>
                                              <div 
                                                className="text-slate-700 line-clamp-3 text-xs overflow-hidden"
                                                dangerouslySetInnerHTML={{ __html: renderFormattedText(bullet.notes) }}
                                              />
                                            </div>
                                          )}
                                        </div>
                                        
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteSubStep(index, subIndex)}
                                          className="text-red-500 hover:text-red-700"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddSubStep(index)}
                                  className="mt-2"
                                >
                                  <Plus className="mr-2 h-3 w-3" />
                                  Add Sub-step
                                </Button>
                              </div>
                            </div>

                            {/* Attachments Section */}
                            <div>
                              <Label className="text-sm font-medium text-slate-700 mb-2">
                                Attachments & Screenshots
                              </Label>
                              <div className="space-y-3">
                                {/* Upload Area */}
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-slate-400 transition-colors">
                                  <input
                                    type="file"
                                    id={`file-upload-${index}`}
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(index, Array.from(e.target.files))}
                                  />
                                  <label
                                    htmlFor={`file-upload-${index}`}
                                    className="cursor-pointer"
                                  >
                                    <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                                    <p className="text-sm text-slate-600 font-medium">
                                      Click to upload files or drag and drop
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Images, PDFs, Documents (Max 10MB each)
                                    </p>
                                  </label>
                                </div>

                                {/* Attachment List */}
                                {step.attachments && step.attachments.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-slate-600">
                                      {step.attachments.length} file{step.attachments.length > 1 ? 's' : ''} attached
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {step.attachments.map((attachment, attIndex) => (
                                        <div
                                          key={attIndex}
                                          className="relative group"
                                        >
                                          {attachment.isImage ? (
                                            // Image Preview
                                            <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                              <img
                                                src={attachment.url}
                                                alt={attachment.name}
                                                className="w-full h-full object-cover"
                                              />
                                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="ghost"
                                                  className="text-white hover:text-white"
                                                  onClick={() => handlePreviewAttachment(attachment)}
                                                  title="Preview"
                                                >
                                                  <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="ghost"
                                                  className="text-white hover:text-white"
                                                  onClick={() => handleDownloadAttachment(attachment)}
                                                  title="Download"
                                                >
                                                  <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="ghost"
                                                  className="text-white hover:text-red-400"
                                                  onClick={() => handleDeleteAttachment(index, attIndex)}
                                                  title="Delete"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                                <p className="text-white text-xs truncate">
                                                  {attachment.name}
                                                </p>
                                              </div>
                                            </div>
                                          ) : (
                                            // Document Preview
                                            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 group-hover:border-slate-300">
                                              <Paperclip className="h-4 w-4 text-slate-400" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-slate-700 truncate">
                                                  {attachment.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                  {(attachment.size / 1024).toFixed(1)} KB
                                                </p>
                                              </div>
                                              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => handlePreviewAttachment(attachment)}
                                                  title="Preview"
                                                >
                                                  <Eye className="h-3 w-3 text-slate-500" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => handleDownloadAttachment(attachment)}
                                                  title="Download"
                                                >
                                                  <Download className="h-3 w-3 text-slate-500" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => handleDeleteAttachment(index, attIndex)}
                                                  title="Delete"
                                                >
                                                  <X className="h-3 w-3 text-red-500" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Expanded View (not editing) */}
                        {expandedSteps[index] && editingStepIndex !== index && (
                          <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3">
                            {/* Step Notes */}
                            {step.description && (
                              <div>
                                <p className="text-xs font-medium text-slate-600 mb-1">Notes</p>
                                <div className="text-sm text-slate-700 whitespace-pre-wrap">
                                  {step.description}
                                </div>
                              </div>
                            )}
                            
                            {/* Sub-steps */}
                            {step.bullets && step.bullets.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-slate-600 mb-2">Sub-steps</p>
                                <div className="space-y-2">
                                  {step.bullets.map((bullet, subIndex) => {
                                    const subStepLetter = String.fromCharCode(97 + subIndex);
                                    return (
                                      <div key={subIndex} className="flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-xs font-medium text-slate-600">
                                          {subStepLetter}
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm text-slate-700">{bullet.text}</p>
                                          {bullet.notes && (
                                            <div className="mt-1 p-2 bg-white rounded border border-slate-200">
                                              <div 
                                                className="text-xs text-slate-600"
                                                dangerouslySetInnerHTML={{ __html: renderFormattedText(bullet.notes) }}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Attachments */}
                            {step.attachments && step.attachments.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-slate-600 mb-2">Attachments</p>
                                <div className="space-y-2">
                                  {step.attachments.map((attachment, idx) => {
                                    // Use same properties as in edit mode
                                    const isImage = attachment.isImage || 
                                                   attachment.fileType?.startsWith('image/') || 
                                                   attachment.file_type?.startsWith('image/') ||
                                                   /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name || attachment.fileName || attachment.file_name || '');
                                    
                                    console.log('Expanded view - Attachment:', idx, attachment);
                                    console.log('Expanded view - Is image?', isImage);
                                    console.log('Expanded view - attachment.isImage:', attachment.isImage);
                                    console.log('Expanded view - attachment.url:', attachment.url);
                                    console.log('Expanded view - attachment.name:', attachment.name);
                                    
                                    return (
                                      <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 w-full">
                                        <Paperclip className="h-4 w-4 text-slate-400" />
                                        <span className="text-sm text-slate-700 flex-1">
                                          {attachment.name || attachment.fileName || attachment.file_name || 'File'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          {isImage && (
                                            <button
                                              className="h-7 w-7 p-0 hover:bg-slate-100 rounded flex items-center justify-center"
                                              onClick={(e) => {
                                                console.log('Eye button clicked - plain button!');
                                                console.log('Event:', e);
                                                console.log('Attachment:', attachment);
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handlePreviewAttachment(attachment);
                                              }}
                                              onMouseDown={(e) => {
                                                console.log('Mouse down on eye button!');
                                                e.preventDefault();
                                              }}
                                              title="Preview"
                                              type="button"
                                            >
                                              <Eye className="h-3 w-3" />
                                            </button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0"
                                            onClick={() => handleDownloadAttachment(attachment)}
                                            title="Download"
                                          >
                                            <Download className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleAddStep}
                    variant="outline"
                    className="w-full border-2 border-dashed hover:border-solid transition-all"
                    style={{ borderColor: themeColors.primary }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Step
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 3: Review & Settings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{ color: themeColors.primary }} />
                  Process Summary
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-600">Name:</span>
                    <p className="font-medium">{formData.name || 'Unnamed Process'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Description:</span>
                    <p className="text-sm">{formData.description || 'No description provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Owner:</span>
                    <p className="font-medium">
                      {teamMembers.find(m => m.id === formData.owner_user_id)?.name || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Total Steps:</span>
                    <p className="font-medium">{formData.steps.length}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <ListChecks className="h-5 w-5" style={{ color: themeColors.primary }} />
                  Process Steps Overview
                </h3>
                {formData.steps.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No steps have been added to this process. Go back to add steps.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {formData.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                             style={{
                               background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                             }}>
                          {step.step_number}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{step.title || 'Untitled Step'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {step.bullets?.length > 0 && (
                              <p className="text-xs text-slate-500">
                                {step.bullets.length} sub-step{step.bullets.length > 1 ? 's' : ''}
                                {step.bullets.filter(b => b.notes).length > 0 && (
                                  <span className="ml-1 text-blue-600">
                                    ({step.bullets.filter(b => b.notes).length} with notes)
                                  </span>
                                )}
                              </p>
                            )}
                            {step.attachments?.length > 0 && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />
                                {step.attachments.length} file{step.attachments.length > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" style={{ color: themeColors.primary }} />
                  Review Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2">
                      Review Frequency
                    </Label>
                    <Select
                      value={formData.review_frequency_days.toString()}
                      onValueChange={(value) => setFormData({ ...formData, review_frequency_days: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Every 30 days</SelectItem>
                        <SelectItem value="60">Every 60 days</SelectItem>
                        <SelectItem value="90">Every 90 days (Recommended)</SelectItem>
                        <SelectItem value="180">Every 6 months</SelectItem>
                        <SelectItem value="365">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2">
                      Process Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleExit}
            >
              Save & Exit
            </Button>
            
            {currentStep === workflowSteps.length - 1 ? (
              <Button
                onClick={handleSaveProcess}
                disabled={saving || formData.steps.length === 0}
                className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                style={{ 
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Publish Process
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                style={{ 
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                }}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.show} onOpenChange={(open) => !open && setDeleteConfirm({ show: false, type: null, index: null, subIndex: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              {deleteConfirm.type === 'step' && `Are you sure you want to delete Step ${deleteConfirm.index + 1}? This will remove the step and all its sub-steps, notes, and attachments.`}
              {deleteConfirm.type === 'substep' && `Are you sure you want to delete this sub-step? Any notes associated with it will also be removed.`}
              {deleteConfirm.type === 'attachment' && `Are you sure you want to delete this attachment? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirm({ show: false, type: null, index: null, subIndex: null })}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (deleteConfirm.type === 'step') {
                  confirmDeleteStep(deleteConfirm.index);
                } else if (deleteConfirm.type === 'substep') {
                  confirmDeleteSubStep(deleteConfirm.index, deleteConfirm.subIndex);
                } else if (deleteConfirm.type === 'attachment') {
                  confirmDeleteAttachment(deleteConfirm.index, deleteConfirm.subIndex);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your progress?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to save your progress before exiting?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              Cancel
            </Button>
            <Button variant="ghost" onClick={confirmExit}>
              Exit without saving
            </Button>
            <Button 
              onClick={async () => {
                await handleSaveProcess();
                confirmExit();
              }}
              style={{ 
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
              }}
              className="text-white"
            >
              Save & Exit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcessWorkflowEditor;

// Add custom styles for formatted text
const styles = `
  .formatted-text {
    color: #1e293b;
    font-size: 0.875rem;
    line-height: 1.6;
  }
  .formatted-text strong {
    font-weight: 600;
    color: #0f172a;
  }
  .formatted-text em {
    font-style: italic;
  }
  .formatted-text code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9em;
    color: #0f172a;
  }
  .formatted-text hr {
    margin: 12px 0;
    border: none;
    border-top: 1px solid #e2e8f0;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('process-workflow-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'process-workflow-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}