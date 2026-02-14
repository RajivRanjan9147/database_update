
import React, { useState, useEffect } from 'react';
import { fetchVariants, createVariant } from '../services/api';
import { Plus, Check, Loader2, X } from 'lucide-react';

const Variant = ({ onVariantSelect }) => {
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    loadVariants();
  }, []);

  const loadVariants = async () => {
    setLoading(true);
    try {
      const data = await fetchVariants();
      setVariants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch variants", error);
      setVariants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e) => {
    const variantId = e.target.value;
    const variant = variants.find(v => String(v.id) === String(variantId));
    setSelectedVariant(variant);
    if (variant) {
        onVariantSelect(variant);
    } else {
        onVariantSelect(null);
    }
  };

  const handleCreate = async () => {
    if (!inputValue.trim()) return;
    setCreating(true);
    try {
      const newVariant = await createVariant(inputValue);
      const newVariants = [...variants, newVariant];
      setVariants(newVariants);
      setSelectedVariant(newVariant);
      onVariantSelect(newVariant);
      setShowInput(false);
      setInputValue('');
    } catch (error) {
      console.error("Failed to create variant", error);
    } finally {
      setCreating(false);
    }
  };



  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Variant Selection</h2>
      <div className="flex gap-2 items-center">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="animate-spin" size={20}/> Loading variants...
          </div>
        ) : (
          <div className="flex-grow">
            <select 
              value={selectedVariant ? selectedVariant.id : ''} 
              onChange={handleSelect}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
            >
              <option value="">Select a Variant</option>
              {variants.map((v, index) => (
                <option key={`${v.id}-${index}`} value={v.id}>{v.variant_name}</option>
              ))}
            </select>
          </div>
        )}
        
        {!showInput && !loading && (
           <>
              <button 
                className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-500 transition-colors" 
                onClick={() => setShowInput(true)} 
                title="Add new variant"
              >
                <Plus size={20} />
              </button>

           </>
        )}
      </div>

      {showInput && (
        <div className="flex gap-2 mt-4 items-center animate-in fade-in slide-in-from-top-2 duration-200">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="New Variant Name"
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
              setShowInput(false);
              setInputValue('');
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Variant;
