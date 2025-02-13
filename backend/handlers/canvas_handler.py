from typing import Dict, Any

class CanvasHandler:
    def __init__(self):
        # Store canvas states for each file
        self.canvas_states: Dict[str, Dict[str, Any]] = {}
    
    def initialize_canvas(self, project_id: str, file_id: str):
        """Initialize a new canvas state"""
        if project_id not in self.canvas_states:
            self.canvas_states[project_id] = {}
        if file_id not in self.canvas_states[project_id]:
            self.canvas_states[project_id][file_id] = {
                "strokes": [],
                "current_users": set()
            }
    
    def handle_update(self, project_id: str, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle canvas updates"""
        if data["update_type"] == "draw":
            return self._handle_draw(project_id, file_id, data)
        elif data["update_type"] == "clear":
            return self._handle_clear(project_id, file_id)
        elif data["update_type"] == "cursor_move":
            return self._handle_cursor_move(data)
        return data

    def _handle_draw(self, project_id: str, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle drawing updates"""
        if project_id not in self.canvas_states or file_id not in self.canvas_states[project_id]:
            self.initialize_canvas(project_id, file_id)
        
        stroke_data = data["data"]
        self.canvas_states[project_id][file_id]["strokes"].append(stroke_data)
        
        return {
            "type": "draw",
            "data": stroke_data
        }

    def _handle_clear(self, project_id: str, file_id: str) -> Dict[str, Any]:
        """Handle canvas clear"""
        if project_id in self.canvas_states and file_id in self.canvas_states[project_id]:
            self.canvas_states[project_id][file_id]["strokes"] = []
        
        return {
            "type": "clear",
            "data": {}
        }

    def _handle_cursor_move(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle cursor movement updates"""
        return {
            "type": "cursor_move",
            "data": {
                "x": data["data"]["x"],
                "y": data["data"]["y"],
                "user_id": data["user_id"]
            }
        } 