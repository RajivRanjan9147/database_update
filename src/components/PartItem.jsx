
import React, { useState } from 'react';
import Capture from './Capture';
import { Plus, Loader2 } from 'lucide-react';
import { createCapture } from '../services/api';

const PartItem = ({ part }) => {
  const [addingCapture, setAddingCapture] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateCapture = async () => {
    setAddingCapture(true);
    try {
      await createCapture(part.id);
      setRefreshTrigger(prev => prev + 1); // Trigger refresh in Capture component
    } catch (error) {
      console.error("Failed to create capture", error);
    } finally {
      setAddingCapture(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{part.part_name}</h3>
          <p className="text-xs text-gray-400 font-mono">ID: {part.id}</p>
        </div>
        <button 
          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
          onClick={handleCreateCapture}
          disabled={addingCapture}
          title="Add Capture"
        >
          {addingCapture ? <Loader2 className="animate-spin" size={20}/> : <Plus size={20}/>}
        </button>
      </div>
      
      <div className="border-t border-gray-100 pt-3">
        <Capture partId={part.id} refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

export default PartItem;
