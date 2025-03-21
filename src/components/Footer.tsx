import React from 'react';
import packageJson from '../../package.json';

const Footer: React.FC = () => {
  return (
    <div className="w-full py-2 px-4 text-center text-xs text-gray-500 border-t border-gray-200">
      <p>Version {packageJson.version}</p>
    </div>
  );
};

export default Footer; 