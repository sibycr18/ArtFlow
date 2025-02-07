import React from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="relative group cursor-pointer" onClick={handleClick}>
      <input 
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute opacity-0 w-8 h-8"
        style={{ colorScheme: 'normal' }}
        onClick={handleClick}
      />
      <div
        className="w-8 h-8 rounded-lg shadow-sm border border-gray-200 transition-transform group-hover:scale-105 group-active:scale-95 pointer-events-none"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

export default ColorPicker;
