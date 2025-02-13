from typing import Dict, Any, List

class ImageHandler:
    def __init__(self):
        # Store image states for each file
        self.image_states: Dict[str, Dict[str, Any]] = {}
    
    def initialize_image(self, project_id: str, file_id: str):
        """Initialize a new image state"""
        if project_id not in self.image_states:
            self.image_states[project_id] = {}
        if file_id not in self.image_states[project_id]:
            self.image_states[project_id][file_id] = {
                "annotations": [],
                "cursors": {},
                "current_users": set()
            }
    
    def handle_update(self, project_id: str, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle image updates"""
        if data["update_type"] == "annotation_add":
            return self._handle_annotation_add(project_id, file_id, data)
        elif data["update_type"] == "annotation_delete":
            return self._handle_annotation_delete(project_id, file_id, data)
        elif data["update_type"] == "annotation_update":
            return self._handle_annotation_update(project_id, file_id, data)
        elif data["update_type"] == "cursor_move":
            return self._handle_cursor_move(project_id, file_id, data)
        return data

    def _handle_annotation_add(self, project_id: str, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle adding new annotations"""
        if project_id not in self.image_states or file_id not in self.image_states[project_id]:
            self.initialize_image(project_id, file_id)
        
        annotation_data = data["data"]
        annotation_data["id"] = len(self.image_states[project_id][file_id]["annotations"])
        self.image_states[project_id][file_id]["annotations"].append(annotation_data)
        
        return {
            "type": "annotation_add",
            "data": annotation_data
        }

    def _handle_annotation_delete(self, project_id: str, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle deleting annotations"""
        if project_id in self.image_states and file_id in self.image_states[project_id]:
            annotation_id = data["data"]["id"]
            self.image_states[project_id][file_id]["annotations"] = [
                ann for ann in self.image_states[project_id][file_id]["annotations"]
                if ann["id"] != annotation_id
            ]
        
        return {
            "type": "annotation_delete",
            "data": data["data"]
        }

    def _handle_annotation_update(self, project_id: str, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle updating existing annotations"""
        if project_id in self.image_states and file_id in self.image_states[project_id]:
            annotation_data = data["data"]
            for i, ann in enumerate(self.image_states[project_id][file_id]["annotations"]):
                if ann["id"] == annotation_data["id"]:
                    self.image_states[project_id][file_id]["annotations"][i] = annotation_data
                    break
        
        return {
            "type": "annotation_update",
            "data": data["data"]
        }

    def _handle_cursor_move(self, project_id: str, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle cursor movement updates"""
        if project_id not in self.image_states or file_id not in self.image_states[project_id]:
            self.initialize_image(project_id, file_id)
        
        user_id = data["user_id"]
        cursor_data = data["data"]
        self.image_states[project_id][file_id]["cursors"][user_id] = cursor_data
        
        return {
            "type": "cursor_move",
            "data": {
                "x": cursor_data["x"],
                "y": cursor_data["y"],
                "user_id": user_id
            }
        } 