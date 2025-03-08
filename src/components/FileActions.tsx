import { useAuth } from "../context/AuthContext";
import { useProjects } from "../contexts/ProjectContext";

const FileActions = () => {
  const { currentProject, createFile } = useProjects();
  const { user } = useAuth();
  
  const handleCreateDrawing = async () => {
    if (!currentProject || !user) return;
    
    const fileName = `Drawing ${currentProject.files.filter(f => f.file_type === "drawing").length + 1}`;
    const newFile = await createFile(currentProject.id, fileName, "drawing");
    
    if (newFile) {
      // Navigate to drawing editor or update UI as needed
      console.log("New drawing created:", newFile);
    }
  };
  
  const handleCreateTextFile = async () => {
    if (!currentProject || !user) return;
    
    const fileName = `Text ${currentProject.files.filter(f => f.file_type === "text").length + 1}`;
    const newFile = await createFile(currentProject.id, fileName, "text");
    
    if (newFile) {
      // Navigate to text editor or update UI as needed
      console.log("New text file created:", newFile);
    }
  };
  
  const handleCreateModel = async () => {
    if (!currentProject || !user) return;
    
    const fileName = `Model ${currentProject.files.filter(f => f.file_type === "model").length + 1}`;
    const newFile = await createFile(currentProject.id, fileName, "model");
    
    if (newFile) {
      // Navigate to model editor or update UI as needed
      console.log("New model created:", newFile);
    }
  };
  
  return (
    <div>
      <button onClick={handleCreateDrawing}>New Drawing</button>
      <button onClick={handleCreateTextFile}>New Text</button>
      <button onClick={handleCreateModel}>New Model</button>
    </div>
  );
}; 