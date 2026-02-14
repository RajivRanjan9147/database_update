
import React, { useState, useEffect } from 'react';
import { fetchCaptures, createCapture, createCaptureItem } from '../services/api';
import { Plus, Loader2, Check, X } from 'lucide-react';
import CaptureCard from './CaptureCard';

const Capture = ({ partId, variantId }) => {
  const [captures, setCaptures] = useState([]);
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMode, setCreateMode] = useState(null); // 'capture' | 'excel' | null
  
  // State for "Capture" mode
  const [captureData, setCaptureData] = useState({
    order: 1,
    image: '',
    flag: 0,
    captureName: ''
  });

  // State for "Excel Row" mode
  const [excelRowData, setExcelRowData] = useState({
    index: 0,
    regulation: '',
    drawing: '',
    entryType: '',
    extractionType: 'OCR'
  });

  useEffect(() => {
    if (partId && variantId) {
      loadCaptures(variantId, partId);
      setSelectedCapture(null);
    } else {
      setCaptures([]);
      setSelectedCapture(null);
    }
  }, [partId, variantId]);

  const loadCaptures = async (vId, pId) => {
    setLoading(true);
    try {
      const data = await fetchCaptures(vId, pId);
      setCaptures(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch captures", error);
      setCaptures([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e) => {
    const captureId = e.target.value;
    const capture = captures.find(c => String(c.id) === String(captureId));
    setSelectedCapture(capture);
  };



  const initCreation = (mode) => {
      setCreateMode(mode);
      const nextOrder = captures.length + 1;
      setCaptureData(prev => ({ ...prev, order: nextOrder }));
      setExcelRowData(prev => ({ ...prev, order: nextOrder }));
  };

  const handleCreateCapture = async () => {
    if (!partId) return;
    setCreating(true);
    try {
      const newCapture = await createCapture(variantId, partId, captureData);
      const newCaptures = [...captures, newCapture];
      setCaptures(newCaptures);
      setSelectedCapture(newCapture);
      setCreateMode(null);
      // Reset data
      setCaptureData({ order: newCaptures.length + 1, image: '', flag: 0, captureName: '' });
    } catch (error) {
      console.error("Failed to create capture", error);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateExcelRow = async () => {
    if (!partId) return;
    setCreating(true);
    try {
      // 1. Create a parent capture for this row
      // Use defaults for Excel Row parent capture
      // const nextOrder = captures.length + 1;
      // const parentCapture = await createCapture(partId, { 
      //     order: nextOrder, 
      //     captureName: 'Excel Row',
      //     imageFlag: 0
      // });
      
      // 2. Create the item inside it
      await createCaptureItem({ 
        variantId: variantId,
        partId: partId, 
        index: excelRowData.index, 
        regulation: excelRowData.regulation, 
        drawing: excelRowData.drawing, 
        entryType: excelRowData.entryType,
        extractionType: excelRowData.extractionType,
      });

      const newCaptures = [...captures];
      setCaptures(newCaptures);
      setSelectedCapture(null);
      setCreateMode(null);
      setExcelRowData(prev => ({ 
          index: 0, 
          regulation: '', 
          drawing: '', 
          entryType: '',
          extractionType: 'OCR',
          order: newCaptures.length + 1,
          imageFlag: false,
          captureName: ''
      }));

    } catch (error) {
       console.error("Failed to create excel row", error);
    } finally {
       setCreating(false);
    }
  };



  return (
    <div>
      {/* <h3 className="text-lg font-semibold mb-3 text-gray-800">Capture Selection</h3> */}
      
      {!loading && !createMode && (
        <div className="flex gap-2 items-center mb-4">
             <button 
               className="px-3 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors flex items-center gap-1"
               onClick={() => initCreation('excel')} 
             >
               <Plus size={16} /> Excel Row
             </button>
             <button 
               className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors flex items-center gap-1"
               onClick={() => initCreation('capture')} 
             >
               <Plus size={16} /> Capture
             </button>
        </div>
      )}

      <div className="mb-4">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="animate-spin" size={18}/> Loading captures...
          </div>
        ) : captures.length === 0 ? (
           <div className="text-gray-500 italic text-sm">No captures found. Add one?</div>
        ) : (
           <div>
             <select 
               value={selectedCapture ? selectedCapture.id : ''} 
               onChange={handleSelect}
               className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
             >
               <option value="">Select a Capture</option>
               {captures.map((c, index) => (
                 <option key={c.id || `capture-${index}`} value={c.id}>
                    Capture #{c.order} {c.id ? `(${c.id.substring(0,6)}...)` : ''}
                 </option>
               ))}
             </select>
           </div>
        )}
      </div>

      {createMode === 'capture' && (
        <div className="bg-gray-50 p-4 rounded-lg border border-blue-200 mb-4 animate-in fade-in zoom-in-95">
          <h4 className="text-sm font-semibold mb-2 text-gray-700">New Capture</h4>
          <div className="grid gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Order</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded text-sm"
                value={captureData.order}
                onChange={e => setCaptureData({...captureData, order: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Capture Name</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded text-sm"
                value={captureData.captureName}
                onChange={e => setCaptureData({...captureData, captureName: e.target.value})}
                placeholder="Name"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                 <label className="text-xs font-medium text-gray-500 block mb-1">Image (URL/Base64)</label>
                 <input 
                   type="text" 
                   className="w-full p-2 border rounded text-sm"
                   value={captureData.image}
                   onChange={e => setCaptureData({...captureData, image: e.target.value})}
                   placeholder="Paste image data here"
                 />
              </div>
              <div>
                 <label className="text-xs font-medium text-gray-500 block mb-1">Flag (0 or 1)</label>
                 <input 
                   type="number" 
                   min="0"
                   max="5"
                   className="w-full p-2 border rounded text-sm"
                   value={captureData.flag}
                   onChange={e => setCaptureData({...captureData, flag: parseInt(e.target.value) || 0})}
                 />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setCreateMode(null)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateCapture}
              disabled={creating}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-2"
            >
              {creating && <Loader2 className="animate-spin" size={14}/>} Create
            </button>
          </div>
        </div>
      )}

      {createMode === 'excel' && (
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-4 animate-in fade-in zoom-in-95">
          <h4 className="text-sm font-semibold mb-2 text-orange-800">New Excel Row</h4>
          <div className="grid gap-3 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                 <label className="text-xs font-medium text-orange-700 block mb-1">Index</label>
                 <input 
                   type="number" 
                   className="w-full p-2 border border-orange-200 rounded text-sm"
                   value={excelRowData.index}
                   onChange={e => setExcelRowData({...excelRowData, index: parseInt(e.target.value) || 0})}
                 />
              </div>
              <div>
                 <label className="text-xs font-medium text-orange-700 block mb-1">Entry Type</label>
                 <input 
                   type="text" 
                   className="w-full p-2 border border-orange-200 rounded text-sm"
                   value={excelRowData.entryType}
                   onChange={e => setExcelRowData({...excelRowData, entryType: e.target.value})}
                   placeholder="Type"
                 />
              </div>
              <div className="col-span-2">
                 <label className="text-xs font-medium text-orange-700 block mb-1">Extraction Type</label>
                 <select 
                    className="w-full p-2 border border-orange-200 rounded text-sm bg-white"
                    value={excelRowData.extractionType}
                    onChange={e => setExcelRowData({...excelRowData, extractionType: e.target.value})}
                 >
                    <option value="OCR">OCR</option>
                    <option value="Detection">Detection</option>
                 </select>
               </div>
            </div>
            <div>
              <label className="text-xs font-medium text-orange-700 block mb-1">Regulation Req.</label>
              <input 
                type="text" 
                className="w-full p-2 border border-orange-200 rounded text-sm"
                value={excelRowData.regulation}
                onChange={e => setExcelRowData({...excelRowData, regulation: e.target.value})}
                placeholder="Regulation"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-orange-700 block mb-1">Drawing Req.</label>
              <input 
                type="text" 
                className="w-full p-2 border border-orange-200 rounded text-sm"
                value={excelRowData.drawing}
                onChange={e => setExcelRowData({...excelRowData, drawing: e.target.value})}
                placeholder="Drawing"
              />
            </div>

            </div>


          <div className="flex justify-end gap-2">
             <button 
              onClick={() => setCreateMode(null)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateExcelRow}
              disabled={creating}
              className="px-3 py-1.5 text-sm bg-orange-600 text-white hover:bg-orange-700 rounded flex items-center gap-2"
            >
              {creating && <Loader2 className="animate-spin" size={14}/>} Add Row
            </button>
          </div>
        </div>
      )}


      {selectedCapture && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
           <CaptureCard capture={selectedCapture} variantId={variantId} partId={partId} />
        </div>
      )}
    </div>
  );
};

export default Capture;
