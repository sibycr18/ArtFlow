import React, { useState, useEffect, useCallback } from 'react';
import Document from './Document';
import DocumentProvider, { useDocument, TextOperation } from '../contexts/DocumentContext';

interface CollaborativeDocumentProps {
  fileName: string;
  projectId: string;
  fileId: string;
  userId: string;
  onClose?: () => void;
}

const DocumentWithContext: React.FC<{
  fileName: string;
  projectId: string;
  fileId: string;
  userId: string;
  onClose?: () => void;
}> = ({ fileName, projectId, fileId, userId, onClose }) => {
  const {
    setOnRemoteTextOperation,
    setOnRemoteCursorUpdate
  } = useDocument();
  
  return (
    <Document 
      fileName={fileName} 
      projectId={projectId} 
      fileId={fileId} 
      userId={userId} 
      onClose={onClose || (() => {})}
      setOnRemoteTextOperation={setOnRemoteTextOperation}
      setOnRemoteCursorUpdate={setOnRemoteCursorUpdate}
    />
  );
};

const CollaborativeDocument: React.FC<CollaborativeDocumentProps> = ({
  fileName,
  projectId,
  fileId,
  userId,
  onClose
}) => {
  console.log('🔄 Rendering CollaborativeDocument', { fileName, projectId, fileId, userId });
  
  return (
    <DocumentProvider projectId={projectId} fileId={fileId} userId={userId}>
      <DocumentWithContext 
        fileName={fileName} 
        projectId={projectId} 
        fileId={fileId} 
        userId={userId} 
        onClose={onClose}
      />
    </DocumentProvider>
  );
};

export default CollaborativeDocument; 