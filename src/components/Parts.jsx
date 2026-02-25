
import React, { useState, useEffect } from 'react';
import { fetchParts, createPart } from '../services/api';
import { Plus, Loader2, Check, X } from 'lucide-react';
import Capture from './Capture';
import FetchAllPanel from './FetchAllPanel';

const Parts = ({ selectedVariant }) => {
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newPartName, setNewPartName] = useState('');

  useEffect(() => {
    if (selectedVariant) {
      loadParts(selectedVariant.id);
      setSelectedPart(null); // Reset selection on variant change
    } else {
      setParts([]);
      setSelectedPart(null);
    }
  }, [selectedVariant]);

  const loadParts = async (variantId) => {
    setLoading(true);
    try {
      const data = await fetchParts(variantId);
      setParts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch parts", error);
      setParts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e) => {
    const partId = e.target.value;
    const part = parts.find(p => String(p.id) === String(partId));
    setSelectedPart(part);
  };

  const handleCreate = async () => {
    if (!newPartName.trim() || !selectedVariant) return;
    setCreating(true);
    try {
      const newPart = await createPart(selectedVariant.id, newPartName);
      const newParts = [...parts, newPart];
      setParts(newParts);
      setSelectedPart(newPart); // Auto-select new part
      setIsAdding(false);
      setNewPartName('');
    } catch (error) {
      console.error("Failed to create part", error);
    } finally {
      setCreating(false);
    }
  };



  if (!selectedVariant) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6 animate-in fade-in slide-in-from-top-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Part Selection</h2>
      
      <div className="flex gap-2 items-center mb-4">
        {loading ? (
           <div className="flex items-center gap-2 text-gray-500 text-sm">
             <Loader2 className="animate-spin" size={20}/> Loading parts...
           </div>
        ) : parts.length === 0 && !isAdding ? (
           <div className="flex-grow text-gray-500 italic text-sm">No parts found. Add one?</div>
        ) : (
           <div className="flex-grow">
             <select 
               value={selectedPart ? selectedPart.id : ''} 
               onChange={handleSelect}
               className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
               disabled={isAdding}
             >
               <option value="">Select a Part</option>
               {parts.map((p, index) => (
                 <option key={p.id || `part-${index}`} value={p.id}>{p.part_name}</option>
               ))}
             </select>
           </div>
        )}

        {!isAdding && !loading && (
           <>
              <button 
                className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-500 transition-colors" 
                onClick={() => setIsAdding(true)} 
                title="Add new part"
              >
                <Plus size={20} />
              </button>

           </>
        )}
      </div>

      {isAdding && (
         <div className="flex gap-2 mb-4 items-center animate-in fade-in slide-in-from-top-2">
           <input 
             type="text" 
             value={newPartName}
             onChange={(e) => setNewPartName(e.target.value)}
             placeholder="New Part Name"
             className="flex-grow p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
             autoFocus
           />
           <button 
             className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70" 
             onClick={handleCreate} 
             disabled={creating}
           >
             {creating ? <Loader2 className="animate-spin" size={20}/> : <Check size={20}/>}
           </button>
           <button 
             className="p-2 bg-white border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
             onClick={() => {
               setIsAdding(false);
               setNewPartName('');
             }}
           >
             <X size={20} />
           </button>
         </div>
      )}

      {selectedPart && (
        <div className="mt-6 border-t border-gray-100 pt-6">
           <Capture partId={selectedPart.id} variantId={selectedVariant.id} />
        </div>
      )}

      {/* Fetch All panel – always visible once parts are loaded */}
      {parts.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-6">
          <FetchAllPanel variantId={selectedVariant.id} parts={parts} />
        </div>
      )}
    </div>
  );
};

export default Parts;
