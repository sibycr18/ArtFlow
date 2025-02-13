from typing import Dict, Any, List

class DocumentHandler:
    def __init__(self):
        # Store document states for each file
        self.document_states: Dict[str, Dict[str, Any]] = {}
        
    def initialize_document(self, project_id: str, file_id: str):
        """Initialize a new document state"""
        if project_id not in self.document_states:
            self.document_states[project_id] = {}
        if file_id not in self.document_states[project_id]:
            self.document_states[project_id][file_id] = {
                "content": "",
                "cursors": {},
                "selections": {}
            }
    
    def handle_update(self, project_id: str, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle document updates"""
        if data["update_type"] == "text_change":
            return self._handle_text_change(project_id, file_id, data)
        elif data["update_type"] == "cursor_change":
            return self._handle_cursor_change(project_id, file_id, data)
        elif data["update_type"] == "selection_change":
            return self._handle_selection_change(project_id, file_id, data)
        return data

    def _handle_text_change(self, project_id: str, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle text content changes"""
        if project_id not in self.document_states or file_id not in self.document_states[project_id]:
            self.initialize_document(project_id, file_id)
        
        change_data = data["data"]
        # Update the document content based on the change
        # This is a simplified version - in reality, you'd want to use operational transformation
        # or a CRDT algorithm for proper conflict resolution
        self.document_states[project_id][file_id]["content"] = change_data["content"]
        
        return {
            "type": "text_change",
            "data": change_data
        }

    def _handle_cursor_change(self, project_id: str, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle cursor position changes"""
        if project_id not in self.document_states or file_id not in self.document_states[project_id]:
            self.initialize_document(project_id, file_id)
        
        user_id = data["user_id"]
        cursor_data = data["data"]
        self.document_states[project_id][file_id]["cursors"][user_id] = cursor_data
        
        return {
            "type": "cursor_change",
            "data": {
                "position": cursor_data["position"],
                "user_id": user_id
            }
        }

    def _handle_selection_change(self, project_id: str, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle text selection changes"""
        if project_id not in self.document_states or file_id not in self.document_states[project_id]:
            self.initialize_document(project_id, file_id)
        
        user_id = data["user_id"]
        selection_data = data["data"]
        self.document_states[project_id][file_id]["selections"][user_id] = selection_data
        
        return {
            "type": "selection_change",
            "data": {
                "range": selection_data["range"],
                "user_id": user_id
            }
        } 