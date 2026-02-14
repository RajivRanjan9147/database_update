

import React, { useState, useEffect } from 'react';
import { fetchCaptureItems, createCaptureItem, createModule, fetchOcrDetectionModels, fetchOcrRecognitionModels, fetchDetectionModels, fetchModulesByCaptureId } from '../services/api';
import { Plus, Loader2, Check, X } from 'lucide-react';

const CaptureCard = ({ capture, variantId, partId }) => {
  const [items, setItems] = useState([]);
  const [ocrDetectionModels, setOcrDetectionModels] = useState([]);
  const [ocrRecognitionModels, setOcrRecognitionModels] = useState([]);
  const [detectionModels, setDetectionModels] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addingModule, setAddingModule] = useState(false);
  const [newItem, setNewItem] = useState({
    index: 0,
    regulation: '',
    drawing: '',
    entryType: ''
  });
  const [newModule, setNewModule] = useState({
    order: 1,
    type: 'OCR',
    detectionModel: '',
    recognitionModel: '',
    matchType: 'exact',
    value: '',
    optionKey: '',
    optionLabel: '',
    isUserSelectable: true,
    prefix: '',
    suffix: '',
    masterKey: '',
    classValue: ''
  });

  useEffect(() => {
    loadItems();
  }, [capture.id]);

  useEffect(() => {
    if (addingModule) {
        if (newModule.type === 'OCR') {
            loadOcrModels();
        } else if (newModule.type === 'Detection') {
            loadDetectionModels();
        }
    }
  }, [addingModule, newModule.type]);

  useEffect(() => {
    if (addingModule && capture.id) {
        fetchModulesByCaptureId(capture.id).then(data => {
            setAvailableModules(Array.isArray(data) ? data : []);
        });
    }
  }, [addingModule, capture.id]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await fetchCaptureItems(capture.id);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch capture items", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOcrModels = async () => {
      // Avoid refetching if already loaded? Or just always fetch to be safe.
      // Simple cache check
      if (ocrDetectionModels.length === 0) {
          const detData = await fetchOcrDetectionModels();
          setOcrDetectionModels(Array.isArray(detData) ? detData : []);
      }
      if (ocrRecognitionModels.length === 0) {
          const recData = await fetchOcrRecognitionModels();
          setOcrRecognitionModels(Array.isArray(recData) ? recData : []);
      }
  };

  const loadDetectionModels = async () => {
      if (detectionModels.length === 0) {
          const detData = await fetchDetectionModels();
          setDetectionModels(Array.isArray(detData) ? detData : []);
      }
  };

  const handleCreateItem = async () => {
    try {
      await createCaptureItem({ ...newItem, variantId, partId });
      loadItems(); 
      setAdding(false);
      setNewItem({ index: 0, regulation: '', drawing: '', entryType: '' });
    } catch (error) {
      console.error("Failed to create item", error);
    }
  };

  const handleCreateModule = async () => {
    try {
       const payload = { 
           captureId: capture.id,
           order: newModule.order,
           type: newModule.type,
           match_type: newModule.matchType,
           prefix: newModule.prefix,
           suffix: newModule.suffix,
           master_key: newModule.masterKey
       };
       
       if (newModule.type === 'OCR') {
           // OCR-specific fields
           payload.value = newModule.value;
           payload.option_key = newModule.optionKey;
           payload.option_label = newModule.optionLabel;
           payload.is_user_selectable = newModule.isUserSelectable;
           
           if (newModule.detectionModel) payload.detection_model_id = newModule.detectionModel;
           if (newModule.recognitionModel) payload.recognition_model_id = newModule.recognitionModel;
       } else if (newModule.type === 'Detection') {
           // Detection-specific fields
           payload.class = newModule.classValue;
           
           if (newModule.detectionModel) payload.detection_model_id = newModule.detectionModel;
       }

       await createModule(payload);
       setAddingModule(false);
       setNewModule({ 
           order: 1, 
           type: 'OCR', 
           detectionModel: '', 
           recognitionModel: '',
           matchType: 'exact',
           value: '',
           optionKey: '',
           optionLabel: '',
           isUserSelectable: true,
           prefix: '',
           suffix: '',
           masterKey: '',
           classValue: ''
       });
       alert("Module added successfully!");
    } catch (error) {
       console.error("Failed to create module", error);
       alert("Failed to create module");
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 mb-3">
      <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
           <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
             #{capture.order}
           </span>
           <span className="text-xs text-gray-500 font-mono">
             ID: {capture.id ? String(capture.id).substring(0, 8) : ''}...
           </span>
        </div>
        <div className="flex gap-2">
            <button 
               className="p-1 hover:bg-gray-200 rounded text-purple-600 transition-colors"
               onClick={() => setAddingModule(true)}
               title="Add Module"
            >
               <Plus size={16} />
            </button>
            <button 
               className="p-1 hover:bg-gray-200 rounded text-blue-600 transition-colors"
               onClick={() => setAdding(true)}
               title="Add Item (Index)"
            >
               Add Index
            </button>
        </div>
      </div>

      {addingModule && (
        <div className="bg-purple-50 p-3 rounded border border-purple-200 mb-3 animate-in fade-in zoom-in-95">
           <h5 className="text-xs font-semibold text-purple-800 mb-2">Add Module</h5>
           <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                 <label className="text-xs font-medium text-gray-600 block mb-1">Order</label>
                 <input 
                   type="number"
                   className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500"
                   value={newModule.order}
                   onChange={e => setNewModule({...newModule, order: parseInt(e.target.value) || 0})}
                 />
              </div>
              <div>
                 <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
                 <select 
                   className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500 bg-white"
                   value={newModule.type}
                   onChange={e => setNewModule({...newModule, type: e.target.value})}
                 >
                    <option value="OCR">OCR</option>
                    <option value="Detection">Detection</option>
                 </select>
              </div>
              
              {newModule.type === 'OCR' && (
                  <>
                    <div className="col-span-1">
                        <label className="text-xs font-medium text-gray-600 block mb-1">Detection Model</label>
                        <select 
                            className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500 bg-white"
                            value={newModule.detectionModel}
                            onChange={e => setNewModule({...newModule, detectionModel: e.target.value})}
                        >
                            <option value="">Select Detection Model</option>
                            {ocrDetectionModels.map(m => (
                                <option key={m.id} value={m.id}>{m.model_name || m.name || m.id}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-span-1">
                        <label className="text-xs font-medium text-gray-600 block mb-1">Recognition Model</label>
                        <select 
                            className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500 bg-white"
                            value={newModule.recognitionModel}
                            onChange={e => setNewModule({...newModule, recognitionModel: e.target.value})}
                        >
                            <option value="">Select Recognition Model</option>
                            {ocrRecognitionModels.map(m => (
                                <option key={m.id} value={m.id}>{m.model_name || m.name || m.id}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-600 block mb-1">Choose Module</label>
                        <select 
                            className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500 bg-white"
                            onChange={(e) => console.log("Selected module:", e.target.value)}
                        >
                            <option value="">Choose Module</option>
                            {availableModules.map(m => (
                                <option key={m.id} value={m.id}>{m.order} - {m.type} - {m.detection_model_name} - {m?.recognition_model_name}</option>
                            ))}
                        </select>
                    </div>
                  </>
              )}

              {newModule.type === 'Detection' && (
                  <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-600 block mb-1">Detection Model</label>
                      <select 
                          className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500 bg-white"
                          value={newModule.detectionModel}
                          onChange={e => setNewModule({...newModule, detectionModel: e.target.value})}
                      >
                          <option value="">Select Detection Model</option>
                          {detectionModels.map(m => (
                              <option key={m.id} value={m.id}>{m.model_name || m.name || m.id}</option>
                          ))}
                      </select>
                  </div>
              )}
              
             {newModule.type === 'Detection' && (
                <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Choose Module</label>
                    <select 
                        className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500 bg-white"
                        onChange={(e) => console.log("Selected module:", e.target.value)}
                    >
                        <option value="">Choose Module</option>
                        {availableModules.map(m => (
                            <option key={m.id} value={m.id}>{m.order} - {m.type}</option>
                        ))}
                    </select>
                </div>
             )}

              {/* OCR-specific fields */}
              {newModule.type === 'OCR' && (
                  <>
                      <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-600 block mb-1">Value</label>
                          <input 
                              type="text"
                              className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500"
                              value={newModule.value}
                              onChange={e => setNewModule({...newModule, value: e.target.value})}
                              placeholder="Enter value"
                          />
                      </div>

                      <div className="col-span-1">
                          <label className="text-xs font-medium text-gray-600 block mb-1">Option Key</label>
                          <input 
                              type="text"
                              className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500"
                              value={newModule.optionKey}
                              onChange={e => setNewModule({...newModule, optionKey: e.target.value})}
                              placeholder="Option key"
                          />
                      </div>

                      <div className="col-span-1">
                          <label className="text-xs font-medium text-gray-600 block mb-1">Option Label</label>
                          <input 
                              type="text"
                              className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500"
                              value={newModule.optionLabel}
                              onChange={e => setNewModule({...newModule, optionLabel: e.target.value})}
                              placeholder="Option label"
                          />
                      </div>
                  </>
              )}

              {/* Detection-specific fields */}
              {newModule.type === 'Detection' && (
                  <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-600 block mb-1">Class</label>
                      <input 
                          type="text"
                          className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500"
                          value={newModule.classValue}
                          onChange={e => setNewModule({...newModule, classValue: e.target.value})}
                          placeholder="Enter class"
                      />
                  </div>
              )}

              {/* OCR-only: Prefix and Suffix */}
              {newModule.type === 'OCR' && (
                  <>
                      <div className="col-span-1">
                          <label className="text-xs font-medium text-gray-600 block mb-1">Prefix</label>
                          <input 
                              type="text"
                              className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500"
                              value={newModule.prefix}
                              onChange={e => setNewModule({...newModule, prefix: e.target.value})}
                              placeholder="Prefix"
                          />
                      </div>

                      <div className="col-span-1">
                          <label className="text-xs font-medium text-gray-600 block mb-1">Suffix</label>
                          <input 
                              type="text"
                              className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500"
                              value={newModule.suffix}
                              onChange={e => setNewModule({...newModule, suffix: e.target.value})}
                              placeholder="Suffix"
                          />
                      </div>
                  </>
              )}

              <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Master Key</label>
                  <input 
                      type="text"
                      className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500"
                      value={newModule.masterKey}
                      onChange={e => setNewModule({...newModule, masterKey: e.target.value})}
                      placeholder="Enter master key"
                  />
              </div>

              {/* OCR-only: Is User Selectable */}
              {newModule.type === 'OCR' && (
                  <div className="col-span-2 flex items-center gap-2">
                      <input 
                          type="checkbox"
                          id="isUserSelectable"
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          checked={newModule.isUserSelectable}
                          onChange={e => setNewModule({...newModule, isUserSelectable: e.target.checked})}
                      />
                      <label htmlFor="isUserSelectable" className="text-xs font-medium text-gray-600">
                          Is User Selectable
                      </label>
                  </div>
              )}

           </div>
           <div className="flex gap-2 justify-end">
             <button onClick={() => setAddingModule(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16}/></button>
             <button onClick={handleCreateModule} className="p-1 text-purple-600 hover:text-purple-800"><Check size={16}/></button>
          </div>
        </div>
      )}

      {adding && (
        <div className="bg-white p-3 rounded border border-blue-200 mb-3 animate-in fade-in zoom-in-95">
          <div className="grid grid-cols-1 gap-2 mb-2">
            <div className="flex items-center gap-2">
               <label className="text-xs font-semibold text-gray-600 w-16">Index:</label>
               <input 
                 type="number"
                 className="p-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 w-20"
                 value={newItem.index}
                 onChange={e => setNewItem({...newItem, index: parseInt(e.target.value) || 0})}
               />
            </div>
            <input 
              placeholder="Regulation Requirements"
              className="p-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500"
              value={newItem.regulation}
              onChange={e => setNewItem({...newItem, regulation: e.target.value})}
            />
             <input 
              placeholder="Drawing Requirements"
              className="p-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500"
              value={newItem.drawing}
              onChange={e => setNewItem({...newItem, drawing: e.target.value})}
            />
             <input 
              placeholder="Entry Type"
              className="p-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500"
              value={newItem.entryType}
              onChange={e => setNewItem({...newItem, entryType: e.target.value})}
            />

          </div>
          <div className="flex gap-2 justify-end">
             <button onClick={() => setAdding(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16}/></button>
             <button onClick={handleCreateItem} className="p-1 text-blue-600 hover:text-blue-800"><Check size={16}/></button>
          </div>
        </div>
      )}

      {loading ? (
         <div className="flex justify-center p-2"><Loader2 className="animate-spin text-gray-400" size={16} /></div>
      ) : (
        <div className="overflow-x-auto">
          {items.length === 0 ? (
            <p className="text-xs text-center text-gray-400 italic py-2">No items</p>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="py-1 px-2 w-12">Index</th>
                  <th className="py-1 px-2">Reg. Req</th>
                  <th className="py-1 px-2">Drawing</th>
                  <th className="py-1 px-2">Jdg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white">
                    <td className="py-1 px-2 text-gray-700 font-mono text-xs">{item.item_index !== undefined ? item.item_index : (item.index !== undefined ? item.index : '-')}</td>
                    <td className="py-1 px-2 text-gray-700">{item.regulation_requirements || item.regulation}</td>
                    <td className="py-1 px-2 text-gray-700">{item.drawing_requirements || item.drawing}</td>

                    <td className="py-1 px-2">
                       <span className="text-green-600 font-bold">OK</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default CaptureCard;
