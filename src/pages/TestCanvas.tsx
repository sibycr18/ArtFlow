import React from 'react';
import { CanvasProvider } from '../contexts/CanvasContext';
import SimpleCanvas from '../components/SimpleCanvas';
import { useAuth } from '../context/AuthContext';

const TestCanvas: React.FC = () => {
    const { user } = useAuth();

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Not Authenticated</h2>
                    <p className="text-gray-600">Please sign in to access the canvas.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Canvas Test Page</h1>
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <CanvasProvider
                        projectId="test-project"
                        fileId="test-file"
                        userId={user.sub}
                    >
                        <SimpleCanvas width={800} height={600} />
                    </CanvasProvider>
                </div>
            </div>
        </div>
    );
};

export default TestCanvas; 