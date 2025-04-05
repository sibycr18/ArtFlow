import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Type, ArrowLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Download, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useDocument, TextOperation } from '../contexts/DocumentContext';
import { useParams } from 'react-router-dom';
import './Document.css';

/**
 * Text Formatting Features:
 * 
 * The Document component supports rich text editing with collaborative features:
 * - Basic formatting: Bold, Italic, Underline
 * - Text alignment: Left, Center, Right, Justify
 * - Font size adjustment
 * 
 * All formatting operations are synchronized in real-time across all users
 * editing the same document.
 */

// Debug utility to log entire document content
const logDocumentContent = (editorRef: React.RefObject<HTMLDivElement>, operation: string) => {
  if (!editorRef.current) return;
  
  const fullText = editorRef.current.innerText || '';
  const fullHtml = editorRef.current.innerHTML || '';
  
  console.log(`📄 DOCUMENT CONTENT AFTER ${operation} OPERATION:`);
  console.log(`📝 TEXT (${fullText.length} chars): "${fullText.substring(0, 150)}${fullText.length > 150 ? '...' : ''}"`);
  console.log(`🔍 HTML (${fullHtml.length} chars): "${fullHtml.substring(0, 150)}${fullHtml.length > 150 ? '...' : ''}"`);
  console.log('🔬 FULL HTML:', fullHtml);
};

interface DocumentProps {
  fileName: string;
  onClose: () => void;
  projectId: string;
  fileId: string;
  userId: string;
  initialContent?: string;
  documentId?: string;
  onRemoteTextOperation?: (callback: (operation: TextOperation) => void) => void;
  onRemoteCursorUpdate?: (callback: (userId: string, position: number) => void) => void;
  setOnRemoteTextOperation?: (callback: (operation: TextOperation) => void) => void;
  setOnRemoteCursorUpdate?: (callback: (userId: string, position: number) => void) => void;
}

const Document: React.FC<DocumentProps> = ({ 
  fileName, 
  onClose, 
  projectId, 
  fileId, 
  userId: propUserId,
  initialContent = '',
  documentId: propDocumentId,
  onRemoteTextOperation,
  onRemoteCursorUpdate,
  setOnRemoteTextOperation,
  setOnRemoteCursorUpdate
}) => {
  const { id: paramDocumentId } = useParams<{ id: string }>();
  const documentId = propDocumentId || paramDocumentId || 'default';
  const { 
    isConnected, 
    connectionError, 
    sendTextOperation,
    connect,
    saveDocumentToDatabase,
    loadDocumentContent,
    isSaving,
    isLoading
  } = useDocument();
  
  // Editor state
  const [content, setContent] = useState<string>(initialContent);
  const [fontSize, setFontSize] = useState(14);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState('left');
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>(initialContent);
  const isProcessingRef = useRef<boolean>(false);
  const selectionStateRef = useRef<{ start: number, end: number, node: Node | null }>({
    start: 0,
    end: 0,
    node: null
  });
  const updateTimeoutRef = useRef<number | null>(null);
  const lastOperationTimestampRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);
  
  // Load document content on mount
  useEffect(() => {
    if (isConnected && fileId && editorRef.current) {
      loadDocumentContent(fileId).then(htmlContent => {
        if (htmlContent) {
          // Set content to editor
          editorRef.current.innerHTML = htmlContent;
          setContent(htmlContent);
          lastHtmlRef.current = htmlContent;
          logDocumentContent(editorRef, 'INITIAL-LOAD');
          console.log('Content loaded from database');
        }
      });
    }
  }, [isConnected, fileId, loadDocumentContent]);
  
  // Set up connection status display
  useEffect(() => {
    if (connectionError) {
      setConnectionStatus(`Error: ${connectionError}`);
    } else if (isConnected) {
      setConnectionStatus('Connected');
    } else {
      setConnectionStatus('Connecting...');
    }
  }, [isConnected, connectionError]);
  
  // Save current selection state
  const saveSelection = useCallback(() => {
    if (!window.getSelection) return;
    
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    selectionStateRef.current = {
      start: range.startOffset,
      end: range.endOffset,
      node: range.startContainer
    };
  }, []);
  
  // Restore selection state if possible
  const restoreSelection = useCallback(() => {
    if (!window.getSelection || !selectionStateRef.current.node) return;
    
    try {
      const selection = window.getSelection();
      if (!selection) return;
      
      const range = document.createRange();
      range.setStart(selectionStateRef.current.node, selectionStateRef.current.start);
      range.setEnd(selectionStateRef.current.node, selectionStateRef.current.end);
      
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      console.log('Could not restore selection', e);
    }
  }, []);
  
  // Function to send content updates
  const syncContent = useCallback((newHtml: string, forceSync: boolean = false) => {
    // Clear any pending updates
    if (updateTimeoutRef.current !== null) {
      window.clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    
    // Only sync if content actually changed - use normalized comparison
    const normalizedNewHtml = newHtml.trim();
    const normalizedLastHtml = lastHtmlRef.current.trim();
    
    if (normalizedNewHtml !== normalizedLastHtml || forceSync) {
      console.log('📤 Syncing content with innerHTML', normalizedNewHtml.substring(0, 50));
      
      // Debug: detect potential loops - if we're syncing too frequently
      const now = Date.now();
      const timeSinceLastOperation = now - lastOperationTimestampRef.current;
      if (timeSinceLastOperation < 200 && !forceSync) {
        console.warn('⚠️ POTENTIAL LOOP DETECTED: Multiple operations within 200ms');
        console.warn(`Last operation: ${lastOperationTimestampRef.current}, Current: ${now}, Diff: ${timeSinceLastOperation}ms`);
      }
      
      // Update timestamp for loop detection
      lastOperationTimestampRef.current = now;
      
      // Update the reference before sending to prevent echo loops
      lastHtmlRef.current = normalizedNewHtml;
      
      // Send the HTML content as a single operation
      const operation = {
        type: 'insert' as const,
        data: {
          userId: propUserId,
          timestamp: now,
          position: 0,
          text: normalizedNewHtml,
          isHtml: true
        }
      };
      
      // Set processing flag to prevent input handler from reacting to our own update
      isProcessingRef.current = true;
      
      // Send the operation
      sendTextOperation(operation);
      logDocumentContent(editorRef, 'SYNC');
      
      // Reset processing flag after a longer delay to ensure the update completes
      setTimeout(() => {
        isProcessingRef.current = false;
        console.log('🔓 Processing flag cleared after sync');
      }, 100);
    } else {
      console.log('⏭️ Skipping sync - content unchanged');
    }
  }, [propUserId, sendTextOperation]);
  
  // Handle input changes
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (!editorRef.current || isProcessingRef.current) {
      console.log('⚠️ Skipping input handler (processing or no ref)');
      return;
    }
    
    const newHtml = editorRef.current.innerHTML;
    
    // Update content immediately for local changes
    setContent(newHtml);
    
    // Debounce content updates to remote users
    if (updateTimeoutRef.current !== null) {
      window.clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = window.setTimeout(() => {
      // Double-check we're not in a processing state before syncing
      if (!isProcessingRef.current) {
        syncContent(newHtml);
      }
      updateTimeoutRef.current = null;
    }, 500); // Increased debounce to 500ms for more stability
  }, [syncContent]);
  
  // Handle remote operations
  useEffect(() => {
    const setRemoteHandler = setOnRemoteTextOperation || (() => {});
    
    const handleRemoteOperation = (operation: TextOperation) => {
      console.log('📝 RECEIVED OPERATION:', operation.type);
      console.log('🔍 INCOMING OPERATION DATA STRUCTURE:', JSON.stringify(operation, null, 2));
      
      if (!editorRef.current) {
        console.error('⚠️ No editor reference available');
        return;
      }
      
      // Skip our own operations to avoid feedback loops
      if (operation.data.userId === propUserId) {
        console.log('🔄 Skipping own operation');
        return;
      }
      
      // Check if this is an older operation we've already processed
      if (operation.data.timestamp && operation.data.timestamp <= lastOperationTimestampRef.current) {
        console.log(`🕒 Skipping older operation (${operation.data.timestamp} <= ${lastOperationTimestampRef.current})`);
        return;
      }
      
      // Update timestamp reference for future checks
      if (operation.data.timestamp) {
        lastOperationTimestampRef.current = operation.data.timestamp;
      }
      
      // Save selection before making changes
      saveSelection();
      
      // Track old HTML to detect if content actually changed
      const oldHtml = editorRef.current.innerHTML;
      
      // Set processing flag to prevent input handler from triggering
      isProcessingRef.current = true;
      
      try {
        if (operation.type === 'insert' && operation.data.isHtml === true && operation.data.text) {
          console.log('📥 Receiving HTML content update');
          
          // Only update if the content is actually different
          const normalizedNewHtml = operation.data.text.trim();
          const normalizedOldHtml = oldHtml.trim();
          
          if (normalizedNewHtml !== normalizedOldHtml) {
            editorRef.current.innerHTML = operation.data.text;
            lastHtmlRef.current = editorRef.current.innerHTML;
            setContent(lastHtmlRef.current);
            logDocumentContent(editorRef, 'REMOTE-UPDATE');
            console.log('✅ Applied remote HTML update');
          } else {
            console.log('⏭️ Skipping identical content update');
          }
        }
      } catch (error) {
        console.error('❌ Error applying remote operation:', error);
      } finally {
        // Clear processing flag after a longer delay to ensure all DOM updates complete
        setTimeout(() => {
          isProcessingRef.current = false;
          
          // Try to restore selection, but allow a moment for DOM to settle
          setTimeout(() => {
            restoreSelection();
          }, 10);
          
          console.log('🔓 Processing flag cleared after remote operation');
        }, 150);
      }
    };
    
    // Register remote operation handler
    if (onRemoteTextOperation) {
      onRemoteTextOperation(handleRemoteOperation);
    } else {
      setRemoteHandler(handleRemoteOperation);
    }
    
    return () => {
      if (!onRemoteTextOperation) {
        setRemoteHandler(() => {});
      }
    };
  }, [onRemoteTextOperation, setOnRemoteTextOperation, propUserId, saveSelection, restoreSelection]);
  
  // Initialize editor - separate the initial setup from content dependency
  useEffect(() => {
    if (!isInitializedRef.current && editorRef.current) {
      console.log('🖋️ First-time initialization of editor');
      isInitializedRef.current = true;
      
      // Set initial content once
      editorRef.current.innerHTML = initialContent;
      lastHtmlRef.current = initialContent;
      setContent(initialContent);
      
      // Add a listener to detect potential loops from external changes
      const observer = new MutationObserver((mutations) => {
        console.log(`🔍 Mutation detected: ${mutations.length} changes`);
        if (isProcessingRef.current) {
          console.log('⚠️ Mutation occurred while processing - potential loop');
        }
      });
      
      observer.observe(editorRef.current, { 
        childList: true, 
        subtree: true, 
        characterData: true,
        attributes: true
      });
      
      return () => observer.disconnect();
    }
  }, [initialContent]);
  
  // Schedule initial content sync separately
  useEffect(() => {
    if (isInitializedRef.current && initialContent && isConnected) {
      console.log('🔄 Scheduling initial content sync');
      const timer = setTimeout(() => {
        if (!isProcessingRef.current) {
          console.log('📤 Performing initial content sync');
          syncContent(initialContent, true);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isInitializedRef.current, initialContent, isConnected, syncContent]);
  
  // Formatting functions
  const applyFormatting = (command: string, value?: string) => {
    // Save current selection state
    saveSelection();
    
    // Apply the formatting command
    document.execCommand(command, false, value);
    
    // Update formatting states immediately
    if (command === 'bold') setIsBold(document.queryCommandState('bold'));
    if (command === 'italic') setIsItalic(document.queryCommandState('italic'));
    if (command === 'underline') setIsUnderline(document.queryCommandState('underline'));
    
    if (editorRef.current) {
      const newHtml = editorRef.current.innerHTML;
      setContent(newHtml);
      
      // Sync the HTML immediately after formatting
      syncContent(newHtml);
    }
    
    // Focus the editor
    editorRef.current?.focus();
    logDocumentContent(editorRef, 'FORMAT');
  };
  
  // Format command helpers
  const handleBoldClick = () => {
    applyFormatting('bold');
    // Toggle state properly based on document state
    setTimeout(() => {
      if (editorRef.current) {
        setIsBold(document.queryCommandState('bold'));
      }
    }, 0);
  };

  const handleItalicClick = () => {
    applyFormatting('italic');
    // Toggle state properly based on document state
    setTimeout(() => {
      if (editorRef.current) {
        setIsItalic(document.queryCommandState('italic'));
      }
    }, 0);
  };

  const handleUnderlineClick = () => {
    applyFormatting('underline');
    // Toggle state properly based on document state
    setTimeout(() => {
      if (editorRef.current) {
        setIsUnderline(document.queryCommandState('underline'));
      }
    }, 0);
  };

  const handleAlignClick = (align: string) => {
    applyFormatting('justify' + align.charAt(0).toUpperCase() + align.slice(1));
    setTextAlign(align);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    applyFormatting('fontSize', size.toString());
  };
  
  // Download handler
  const handleDownload = () => {
    // Get plain text content instead of HTML
    const textContent = editorRef.current?.innerText || '';
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '') || 'document'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Set font size
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.fontSize = `${fontSize}px`;
    }
  }, [fontSize]);
  
  // Update formatting states based on selection
  useEffect(() => {
    const updateFormattingStates = () => {
      if (editorRef.current && document.activeElement === editorRef.current) {
        // Update button states based on current formatting
        setIsBold(document.queryCommandState('bold'));
        setIsItalic(document.queryCommandState('italic'));
        setIsUnderline(document.queryCommandState('underline'));
      }
    };

    // Add event listeners for selection changes
    document.addEventListener('selectionchange', updateFormattingStates);
    
    if (editorRef.current) {
      editorRef.current.addEventListener('focus', updateFormattingStates);
      editorRef.current.addEventListener('click', updateFormattingStates);
    }
    
    return () => {
      document.removeEventListener('selectionchange', updateFormattingStates);
      if (editorRef.current) {
        editorRef.current.removeEventListener('focus', updateFormattingStates);
        editorRef.current.removeEventListener('click', updateFormattingStates);
      }
    };
  }, []);
  
  // Implement save document function
  const saveDocument = () => {
    if (!editorRef.current || !isConnected) return;
    
    const htmlContent = editorRef.current.innerHTML;
    
    saveDocumentToDatabase(htmlContent)
      .then((success) => {
        if (success) {
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } else {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      })
      .catch((error) => {
        console.error('Error saving document:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      });
  };
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-blue-50 overflow-hidden">
      <div className="h-screen w-full max-w-[1920px] mx-auto flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-purple-100 p-4">
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 hover:text-purple-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {fileName}
                </h1>
                <p className="text-sm text-gray-600">
                  Document Editor <span className="mx-1">•</span>
                  <span className={isConnected ? "text-green-500" : connectionError ? "text-red-500" : "text-yellow-500"}>
                    {connectionStatus}
                  </span>
                </p>
              </div>
            </div>
            
            {/* Add Save Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={saveDocument}
                className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 transition-colors ${
                  saveStatus === 'success' 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : saveStatus === 'error'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-green-600 hover:bg-green-700'
                }`}
                disabled={!isConnected || isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <div className="w-4 h-4 text-white">✓</div>
                    Saved!
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <div className="w-4 h-4 text-white">✗</div>
                    Failed to save
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Toolbar */}
          <div className={`${isToolbarCollapsed ? 'w-[50px]' : 'w-[280px]'} bg-white/80 backdrop-blur-sm border-r border-purple-100 flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
            {/* Collapse/Expand Button */}
            <button
              onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
              className="self-end m-2 p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
              aria-label={isToolbarCollapsed ? "Expand toolbar" : "Collapse toolbar"}
            >
              {isToolbarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            {!isToolbarCollapsed && (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* Text Formatting */}
                <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Text Formatting</h3>
                  <div className="space-y-3">
                    {/* Font Size */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Font Size</span>
                        <span className="text-xs font-medium text-gray-600">{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="48"
                        value={fontSize}
                        onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    {/* Font Style */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Font Style</div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={handleBoldClick}
                          className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                            isBold ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                          }`}
                        >
                          <Bold className="w-5 h-5" />
                          <span className="text-xs">Bold</span>
                        </button>
                        <button
                          onClick={handleItalicClick}
                          className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                            isItalic ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                          }`}
                        >
                          <Italic className="w-5 h-5" />
                          <span className="text-xs">Italic</span>
                        </button>
                        <button
                          onClick={handleUnderlineClick}
                          className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                            isUnderline ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                          }`}
                        >
                          <Underline className="w-5 h-5" />
                          <span className="text-xs">Underline</span>
                        </button>
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Text Alignment</div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { icon: AlignLeft, value: 'left', label: 'Left' },
                          { icon: AlignCenter, value: 'center', label: 'Center' },
                          { icon: AlignRight, value: 'right', label: 'Right' },
                          { icon: AlignJustify, value: 'justify', label: 'Justify' }
                        ].map(({ icon: Icon, value, label }) => (
                          <button
                            key={value}
                            onClick={() => handleAlignClick(value)}
                            className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                              textAlign === value ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleDownload}
                      className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Minimized Toolbar - Quick Access Buttons */}
            {isToolbarCollapsed && (
              <div className="flex flex-col items-center pt-4 space-y-6">
                <button
                  onClick={handleBoldClick}
                  className={`p-2 rounded-lg transition-colors ${
                    isBold ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                  }`}
                  title="Bold"
                >
                  <Bold className="w-5 h-5" />
                </button>
                <button
                  onClick={handleItalicClick}
                  className={`p-2 rounded-lg transition-colors ${
                    isItalic ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                  }`}
                  title="Italic"
                >
                  <Italic className="w-5 h-5" />
                </button>
                <button
                  onClick={handleUnderlineClick}
                  className={`p-2 rounded-lg transition-colors ${
                    isUnderline ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                  }`}
                  title="Underline"
                >
                  <Underline className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-lg hover:bg-purple-50 text-gray-700"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Document Area */}
          <div className="flex-1 bg-gray-50 overflow-auto flex items-center justify-center p-8">
            <div className={`w-full max-w-4xl bg-white shadow-lg rounded-lg p-8 relative transition-all duration-300 ${isToolbarCollapsed ? 'max-w-5xl' : 'max-w-4xl'}`}>
              <div
                ref={editorRef}
                contentEditable
                className="w-full h-full min-h-[500px] focus:outline-none"
                style={{ fontSize: `${fontSize}px` }}
                onInput={handleInput}
                suppressContentEditableWarning={true}
              ></div>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="text-gray-600">Loading document...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Document;
