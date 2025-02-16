import React, { useRef, useEffect, useState } from 'react';
import { useCanvas } from '../contexts/CanvasContext';
import { useAuth } from '../context/AuthContext';

interface SimpleCanvasProps {
    width?: number;
    height?: number;
}

const SimpleCanvas: React.FC<SimpleCanvasProps> = ({ width = 800, height = 600 }) => {
    const { isConnected, connectionError } = useCanvas();
    const { user } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    return (
        <div className="relative bg-white p-4 rounded-lg shadow-sm">
            {/* User info and connection status */}
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                    {user?.picture ? (
                        <img
                            src={user.picture}
                            alt={user.name}
                            className="w-6 h-6 rounded-full"
                            referrerPolicy="no-referrer"
                        />
                    ) : null}
                    <span className="text-sm font-medium text-gray-700">
                        {user?.name}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                        connectionError 
                            ? 'bg-red-500' 
                            : isConnected 
                                ? 'bg-green-500' 
                                : 'bg-yellow-500'
                    }`} />
                    <span className={`text-sm ${
                        connectionError 
                            ? 'text-red-600' 
                            : isConnected 
                                ? 'text-green-600' 
                                : 'text-yellow-600'
                    }`}>
                        {connectionError
                            ? `Error: ${connectionError}`
                            : isConnected
                                ? "Connected"
                                : "Connecting..."}
                    </span>
                </div>
            </div>

            {/* Canvas element */}
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="border border-gray-300 rounded-lg shadow-sm mt-12"
            />
        </div>
    );
};

export default SimpleCanvas; 