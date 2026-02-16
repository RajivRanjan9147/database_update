
import React, { useState, useEffect } from 'react';
import { fetchCaptureItems, createCaptureItem, createModule, addOcrGtEntry, addDetectionClassEntry, fetchOcrDetectionModels, fetchOcrRecognitionModels, fetchDetectionModels, fetchModulesByCaptureId } from '../services/api';
import { Plus, Loader2, Check, X, Settings } from 'lucide-react';

const CaptureCard = ({ capture, variantId, partId }) => {
  const [items, setItems] = useState([]);
  const [ocrDetectionModels, setOcrDetectionModels] = useState([]);
  const [ocrRecognitionModels, setOcrRecognitionModels] = useState([]);
  const [detectionModels, setDetectionModels] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [addingIndex, setAddingIndex] = useState(false); // Renamed from adding for clarity
  
  // Phase 1: Create Module State
  const [creatingModule, setCreatingModule] = useState(false);
  const [newModuleConfig, setNewModuleConfig] = useState({
    order: 1,
    type: 'OCR',
    detectionModel: '',
    recognitionModel: ''
  });

  // Phase 2: Configure Module State
  const [configuringModule, setConfiguringModule] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [moduleEntry, setModuleEntry] = useState({
    value: '',
    optionKey: '',
    optionLabel: '',
    classValue: '',
    matchType: 'exact',
    prefix: '',
    suffix: '',
    masterKey: '',
    isUserSelectable: true
  });

  const [newItem, setNewItem] = useState({
    index: 0,
    regulation: '',
    drawing: '',
    entryType: ''
  });

  useEffect(() => {
    loadItems();
  }, [capture.id]);

  useEffect(() => {
    if (creatingModule) {
        if (newModuleConfig.type === 'OCR') {
            loadOcrModels();
        } else if (newModuleConfig.type === 'Detection') {
            loadDetectionModels();
        }
    }
  }, [creatingModule, newModuleConfig.type]);

  useEffect(() => {
    // Reload modules when opening Configure or after creating new module
    if ((configuringModule || creatingModule) && capture.id) {
        fetchModulesByCaptureId(capture.id).then(data => {
            setAvailableModules(Array.isArray(data) ? data : []);
        });
    }
  }, [configuringModule, creatingModule, capture.id]);

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
      setAddingIndex(false);
      setNewItem({ index: 0, regulation: '', drawing: '', entryType: '' });
    } catch (error) {
      console.error("Failed to create item", error);
    }
  };

  // Phase 1: Create Module Logic
  const handleCreateModuleConfig = async () => {
      try {
          const payload = {
              captureId: capture.id,
              order: newModuleConfig.order,
              type: newModuleConfig.type,
              // Default/Empty values for entry fields since this is just "Creating Structure"
              match_type: 'exact',
              class: ''
          };

          if (newModuleConfig.type === 'OCR') {
             if (newModuleConfig.detectionModel) payload.detection_model_id = newModuleConfig.detectionModel;
             if (newModuleConfig.recognitionModel) payload.recognition_model_id = newModuleConfig.recognitionModel;
          } else if (newModuleConfig.type === 'Detection') {
             if (newModuleConfig.detectionModel) payload.detection_model_id = newModuleConfig.detectionModel;
          }

          await createModule(payload);
          alert("Module created successfully!");
          setCreatingModule(false);
          // Refresh modules list
          fetchModulesByCaptureId(capture.id).then(data => setAvailableModules(Array.isArray(data) ? data : []));
      } catch (error) {
          console.error("Failed to create module config", error);
          alert("Failed to create module");
      }
  };

  // Phase 2: Add Entry to Module Logic
  const handleAddModuleEntry = async () => {
      if (!selectedModuleId) {
          alert("Please select a module first.");
          return;
      }
      
      const selectedModule = availableModules.find(m => m.id == selectedModuleId);
      if (!selectedModule) return;

      try {
          if (selectedModule.type === 'OCR') {
              const payload = {
                  ocr_config_id: selectedModule.ocr_config_id,
                  value: moduleEntry.value,
                  option_key: moduleEntry.optionKey,
                  option_label: moduleEntry.optionLabel,
                  is_user_selectable: moduleEntry.isUserSelectable,
                  match_type: moduleEntry.matchType,
                  prefix: moduleEntry.prefix,
                  suffix: moduleEntry.suffix,
                  master_key: moduleEntry.masterKey,
              };
              await addOcrGtEntry(payload);
          } else if (selectedModule.type === 'Detection') {

            console.log({selectedModule});
              const payload = {
                  detection_config_id: selectedModule.detection_config_id,
                  class: moduleEntry.classValue,
                  option_key: moduleEntry.optionKey,
                  option_label: moduleEntry.optionLabel,
                  is_user_selectable: moduleEntry.isUserSelectable,
                  master_option_keys: moduleEntry.masterKey,
              };
              await addDetectionClassEntry(payload);
          }
          alert("Entry added to module successfully!");
          
          // Reset entry fields but keep module selected for faster entry addition
          setModuleEntry({
            value: '',
            optionKey: '',
            optionLabel: '',
            classValue: '',
            matchType: 'exact',
            prefix: '',
            suffix: '',
            masterKey: '',
            isUserSelectable: true
          });
      } catch (error) {
          console.error("Failed to add entry", error);
          alert("Failed to add entry");
      }
  };

  const handleModuleSelection = (e) => {
      const id = e.target.value;
      setSelectedModuleId(id);
      
      // Optionally pre-fill some common fields from the selected module if desired
      // But for now we keep them blank or default as per "Add Entry" logic
      const selected = availableModules.find(m => m.id == id);
      if (selected) {
         setModuleEntry(prev => ({
             ...prev,
             matchType: selected.match_type || 'exact',
             prefix: selected.prefix || '',
             suffix: selected.suffix || '',
             masterKey: selected.master_key || ''
         }));
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
               onClick={() => {
                   setCreatingModule(true);
                   setConfiguringModule(false);
               }}
               title="Create Module"
            >
               <Plus size={16} />
               <span className="text-xs font-medium ml-1">Create Module</span>
            </button>
            <button 
               className="p-1 hover:bg-gray-200 rounded text-teal-600 transition-colors"
               onClick={() => {
                   setConfiguringModule(true);
                   setCreatingModule(false);
                   // Load modules if not already loaded
                   if (availableModules.length === 0 && capture.id) {
                       fetchModulesByCaptureId(capture.id).then(data => setAvailableModules(Array.isArray(data) ? data : []));
                   }
               }}
               title="Configure Module"
            >
               <Settings size={16} />
               <span className="text-xs font-medium ml-1">Configure</span>
            </button>
            
        </div>
      </div>

      {/* Phase 1: Create Module Modal/Form */}
      {creatingModule && (
        <div className="bg-purple-50 p-3 rounded border border-purple-200 mb-3 animate-in fade-in zoom-in-95">
           <h5 className="text-xs font-semibold text-purple-800 mb-2 border-b border-purple-200 pb-1">Phase 1: Create Module</h5>
           <div className="grid grid-cols-2 gap-2 mb-2 p-2 bg-white rounded border border-purple-100 shadow-sm">
              <div>
                 <label className="text-xs font-medium text-gray-600 block mb-1">Order</label>
                 <input 
                   type="number"
                   className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500"
                   value={newModuleConfig.order}
                   onChange={e => setNewModuleConfig({...newModuleConfig, order: parseInt(e.target.value) || 0})}
                 />
              </div>
              <div>
                 <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
                 <select 
                   className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500 bg-white"
                   value={newModuleConfig.type}
                   onChange={e => setNewModuleConfig({...newModuleConfig, type: e.target.value})}
                 >
                    <option value="OCR">OCR</option>
                    <option value="Detection">Detection</option>
                 </select>
              </div>
              
              {newModuleConfig.type === 'OCR' && (
                  <>
                    <div className="col-span-1">
                        <label className="text-xs font-medium text-gray-600 block mb-1">Detection Model</label>
                        <select 
                            className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500 bg-white"
                            value={newModuleConfig.detectionModel}
                            onChange={e => setNewModuleConfig({...newModuleConfig, detectionModel: e.target.value})}
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
                            value={newModuleConfig.recognitionModel}
                            onChange={e => setNewModuleConfig({...newModuleConfig, recognitionModel: e.target.value})}
                        >
                            <option value="">Select Recognition Model</option>
                            {ocrRecognitionModels.map(m => (
                                <option key={m.id} value={m.id}>{m.model_name || m.name || m.id}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* <div className="col-span-2">
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
                    </div> */}
                  </>
              )}

              {newModuleConfig.type === 'Detection' && (
                  <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-600 block mb-1">Detection Model</label>
                      <select 
                          className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-purple-500 bg-white"
                          value={newModuleConfig.detectionModel}
                          onChange={e => setNewModuleConfig({...newModuleConfig, detectionModel: e.target.value})}
                      >
                          <option value="">Select Detection Model</option>
                          {detectionModels.map(m => (
                              <option key={m.id} value={m.id}>{m.model_name || m.name || m.id}</option>
                          ))}
                      </select>
                  </div>
              )}
           </div>
           
           <div className="flex gap-2 justify-end">
             <button onClick={() => setCreatingModule(false)} className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700">Cancel</button>
             <button onClick={handleCreateModuleConfig} className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white font-medium flex items-center gap-1">
                <Check size={14}/> Create
             </button>
          </div>
        </div>
      )}

      {/* Phase 2: Configure Module (Add Entries) Form */}
      {configuringModule && (
        <div className="bg-teal-50 p-3 rounded border border-teal-200 mb-3 animate-in fade-in zoom-in-95">
           <h5 className="text-xs font-semibold text-teal-800 mb-2 border-b border-teal-200 pb-1">Phase 2: Configure Module (Add Entries)</h5>
           
           {/* Section 1: Choose Module */}
           <div className="mb-2 p-2 bg-white rounded border border-teal-100 shadow-sm">
               <label className="text-xs font-medium text-teal-700 block mb-1">Select Module to Configure</label>
               <select 
                    className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500 bg-white"
                    value={selectedModuleId}
                    onChange={handleModuleSelection}
               >
                    <option value="">-- Choose Module --</option>
                    {availableModules.map(m => (
                        <option key={m.id} value={m.id}>
                            Order {m.order}: {m.type} {m.detection_model_name ? `(${m.detection_model_name})` : ''} {m.recognition_model_name ? `(${m.recognition_model_name})` : ''}
                        </option>
                    ))}
               </select>
           </div>

           {/* Section 2: Entry Fields (Only if module selected) */}
           {selectedModuleId && (
               <div className="p-2 bg-white rounded border border-teal-100 shadow-sm space-y-2">
                   {/* Detection vs OCR fields based on selected module type */}
                   {availableModules.find(m => m.id == selectedModuleId)?.type === 'OCR' && (
                       <>
                           <div className="grid grid-cols-2 gap-2">
                               <div className="col-span-2">
                                   <label className="text-xs font-medium text-gray-600 block mb-1">Value</label>
                                   <input 
                                       type="text"
                                       className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
                                       value={moduleEntry.value}
                                       onChange={e => setModuleEntry({...moduleEntry, value: e.target.value})}
                                       placeholder="Enter value"
                                   />
                               </div>
                               <div>
                                   <label className="text-xs font-medium text-gray-600 block mb-1">Option Key</label>
                                   <input 
                                       type="text"
                                       className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
                                       value={moduleEntry.optionKey}
                                       onChange={e => setModuleEntry({...moduleEntry, optionKey: e.target.value})}
                                       placeholder="Option key"
                                   />
                               </div>
                               <div>
                                   <label className="text-xs font-medium text-gray-600 block mb-1">Option Label</label>
                                   <input 
                                       type="text"
                                       className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
                                       value={moduleEntry.optionLabel}
                                       onChange={e => setModuleEntry({...moduleEntry, optionLabel: e.target.value})}
                                       placeholder="Option label"
                                   />
                               </div>
                           </div>
                           
                           {/* Common Config (can be overridden per entry) */}
                           <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2 mt-2">
                               <div>
                                   <label className="text-xs font-medium text-gray-500 block mb-1">Prefix</label>
                                   <input 
                                       type="text"
                                       className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
                                       value={moduleEntry.prefix}
                                       onChange={e => setModuleEntry({...moduleEntry, prefix: e.target.value})}
                                       placeholder="Prefix"
                                   />
                               </div>
                               <div>
                                   <label className="text-xs font-medium text-gray-500 block mb-1">Suffix</label>
                                   <input 
                                       type="text"
                                       className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
                                       value={moduleEntry.suffix}
                                       onChange={e => setModuleEntry({...moduleEntry, suffix: e.target.value})}
                                       placeholder="Suffix"
                                   />
                               </div>
                               <div className="col-span-2">
                                   <label className="text-xs font-medium text-gray-500 block mb-1">Master Key</label>
                                   <input 
                                       type="text"
                                       className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
                                       value={moduleEntry.masterKey}
                                       onChange={e => setModuleEntry({...moduleEntry, masterKey: e.target.value})}
                                       placeholder="Enter master key"
                                   />
                               </div>
                               <div className="col-span-2 flex items-center gap-2">
                                   <input 
                                       type="checkbox"
                                       id="entryUserSelectable"
                                       className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                       checked={moduleEntry.isUserSelectable}
                                       onChange={e => setModuleEntry({...moduleEntry, isUserSelectable: e.target.checked})}
                                   />
                                   <label htmlFor="entryUserSelectable" className="text-xs font-medium text-gray-600">
                                       Is User Selectable
                                   </label>
                               </div>
                           </div>
                       </>
                   )}

                   {availableModules.find(m => m.id == selectedModuleId)?.type === 'Detection' && (
                       <>
                       <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-600 block mb-1">Class</label>
                          <input 
                              type="text"
                              className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
                              value={moduleEntry.classValue}
                              onChange={e => setModuleEntry({...moduleEntry, classValue: e.target.value})}
                              placeholder="Enter class"
                          />
                      </div>
                       <div className="grid grid-cols-2 gap-2 mt-2">
                               <div>
                                   <label className="text-xs font-medium text-gray-600 block mb-1">Option Key</label>
                                   <input 
                                       type="text"
                                       className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
                                       value={moduleEntry.optionKey}
                                       onChange={e => setModuleEntry({...moduleEntry, optionKey: e.target.value})}
                                       placeholder="Option key"
                                   />
                               </div>
                               <div>
                                   <label className="text-xs font-medium text-gray-600 block mb-1">Option Label</label>
                                   <input 
                                       type="text"
                                       className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
                                       value={moduleEntry.optionLabel}
                                       onChange={e => setModuleEntry({...moduleEntry, optionLabel: e.target.value})}
                                       placeholder="Option label"
                                   />
                                </div>
                                <div className="col-span-2 mt-2">
                                    <label className="text-xs font-medium text-gray-600 block mb-1">Master Option Key</label>
                                    <input 
                                        type="text"
                                        className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
                                        value={moduleEntry.masterKey}
                                        onChange={e => setModuleEntry({...moduleEntry, masterKey: e.target.value})}
                                        placeholder="Master Option Key"
                                    />
                                </div>
                                <div className="col-span-2 flex items-center gap-2 mt-2">
                                  <input 
                                      type="checkbox"
                                      id="detEntryUserSelectable"
                                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                      checked={moduleEntry.isUserSelectable}
                                      onChange={e => setModuleEntry({...moduleEntry, isUserSelectable: e.target.checked})}
                                  />
                                  <label htmlFor="detEntryUserSelectable" className="text-xs font-medium text-gray-600">
                                      Is User Selectable
                                  </label>
                              </div>
                          </div>
                      </>
                   )}
                   
                   <button onClick={handleAddModuleEntry} className="w-full mt-2 text-xs text-white bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded font-medium flex items-center justify-center gap-1 transition-colors">
                        <Plus size={14}/> Add Entry to Module
                   </button>
               </div>
           )}

           <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-teal-200">
             <button onClick={() => setConfiguringModule(false)} className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700">Close</button>
          </div>
        </div>
      )}

      {addingIndex && (
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
             <button onClick={() => setAddingIndex(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16}/></button>
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
