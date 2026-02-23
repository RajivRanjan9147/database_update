
import React, { useState, useEffect } from 'react';
import { fetchCaptureItems, createCaptureItem, createModule, addOcrGtEntry, addDetectionClassEntry, fetchOcrDetectionModels, fetchOcrRecognitionModels, fetchDetectionModels, fetchModulesByCaptureId, fetchAllClasses, fetchModuleClasses, mapClassToModule, mapModelToClass, addReportTableRow, fetchModuleGT } from '../services/api';
import { Plus, Loader2, Check, X, Settings, Link, FileSpreadsheet } from 'lucide-react';

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
  // Phase 3: Map Class State
  const [mappingClass, setMappingClass] = useState(false);
  const [mapModuleId, setMapModuleId] = useState('');
  const [allClasses, setAllClasses] = useState([]);
  const [existingMappings, setExistingMappings] = useState([]);
  // For detection: found class or new class form
  const [detectionClassName, setDetectionClassName] = useState(''); // class name from GT entry
  const [foundClass, setFoundClass] = useState(null);   // existing class object or null
  const [newClassName, setNewClassName] = useState('');
  const [newClassType, setNewClassType] = useState('text');
  const [mapStatus, setMapStatus] = useState(''); // feedback message
  const [mapLoading, setMapLoading] = useState(false);

  // Phase 4: Excel Row State
  const [addingExcelRow, setAddingExcelRow] = useState(false);
  const [excelRowModuleId, setExcelRowModuleId] = useState('');
  const [excelRowRegulation, setExcelRowRegulation] = useState('');
  const [excelRowDrawing, setExcelRowDrawing] = useState('');
  const [excelRowOrder, setExcelRowOrder] = useState(1);
  const [excelRowIndex, setExcelRowIndex] = useState(1);
  const [excelRowEntryType, setExcelRowEntryType] = useState(1);

  // Phase 2: Inline Class Creation Prompt (Detection)
  const [showTypePrompt, setShowTypePrompt] = useState(false);
  const [moduleGtEntries, setModuleGtEntries] = useState([]); // GT entries for the selected excel-row module
  const [pendingClassName, setPendingClassName] = useState('');
  const [pendingModuleId, setPendingModuleId] = useState('');
  const [pendingClassType, setPendingClassType] = useState('text');

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
    if ((configuringModule || creatingModule || mappingClass || addingExcelRow) && capture.id) {
        fetchModulesByCaptureId(capture.id).then(data => {
            setAvailableModules(Array.isArray(data) ? data : []);
        });
    }
  }, [configuringModule, creatingModule, mappingClass, addingExcelRow, capture.id]);

  // When Phase 3 opens OR Configuring (Phase 2): load all classes for auto-mapping checks
  useEffect(() => {
    if (mappingClass || configuringModule) {
      if (allClasses.length === 0) fetchAllClasses().then(data => setAllClasses(Array.isArray(data) ? data : []));
    }
  }, [mappingClass, configuringModule]);

  // Phase 4: Load modules when opening Excel Row UI
  useEffect(() => {
    if (addingExcelRow && availableModules.length === 0 && capture.id) {
        fetchModulesByCaptureId(capture.id).then(data => setAvailableModules(Array.isArray(data) ? data : []));
    }
  }, [addingExcelRow, capture.id]);

  // When a module is selected for mapping: load existing mappings + resolve class
  useEffect(() => {
    if (!mapModuleId || !mappingClass) return;
    setMapStatus('');
    setFoundClass(null);
    setDetectionClassName('');
    setNewClassName('');
    setNewClassType('text');

    const mod = availableModules.find(m => m.id === mapModuleId);
    if (!mod) return;

    // Load existing mappings for this module
    fetchModuleClasses(mapModuleId).then(data => setExistingMappings(Array.isArray(data) ? data : []));

    if (mod.type === 'OCR') {
      // Auto-find class named 'ocr' (case-insensitive)
      const ocrClass = allClasses.find(c => c.name?.toLowerCase() === 'ocr');
      setFoundClass(ocrClass || null);
      setDetectionClassName('ocr');
    }
    // For Detection: user will type the class name from GT list below
  }, [mapModuleId, mappingClass, allClasses]);

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

  // Phase 3: look up class name in classes table then map
  const handleLookupAndMap = async (classNameToLookup) => {
    const trimmed = classNameToLookup.trim();
    if (!trimmed) return;
    setDetectionClassName(trimmed);
    const match = allClasses.find(c => c.name?.toLowerCase() === trimmed.toLowerCase());
    setFoundClass(match || null);
    setNewClassName(trimmed); // pre-fill the new class name field
  };

  const handleMapClass = async () => {
    if (!mapModuleId) { setMapStatus('Please select a module.'); return; }
    setMapLoading(true);
    setMapStatus('');
    try {
      const mod = availableModules.find(m => m.id === mapModuleId);
      let result;

      const modelId = mod?.detection_model_id || null;

      if (mod?.type === 'OCR') {
        if (foundClass) {
          result = await mapClassToModule(mapModuleId, { class_id: foundClass.id, model_id: modelId });
        } else {
          // Create 'ocr' class of type 'text' then map (backend handles if already exists)
          result = await mapClassToModule(mapModuleId, { name: 'ocr', type: 'text', model_id: modelId });
        }
      } else if (mod?.type === 'Detection') {
        if (foundClass) {
          result = await mapClassToModule(mapModuleId, { class_id: foundClass.id, model_id: modelId });
        } else {
          if (!newClassName.trim()) { setMapStatus('Please enter a class name.'); setMapLoading(false); return; }
          result = await mapClassToModule(mapModuleId, { name: newClassName.trim(), type: newClassType, model_id: modelId });
        }
      }

      // Build a clear status using the class_name returned by the backend
      const resData = result?.data || result || {};
      const mappedName = resData.class_name || foundClass?.name || newClassName || 'class';
      const mappedType = resData.class_type || '';
      const wasExisting = resData.already_existed;
      const resolvedClassId = resData.class_id || foundClass?.id;

      // ✅ Explicitly call model_class_mapper API
      if (modelId && resolvedClassId) {
        try { await mapModelToClass(modelId, resolvedClassId); } catch(e) { console.warn('model_class_mapper insert failed', e); }
      }

      if (wasExisting) {
        setMapStatus(`✅ Already mapped → "${mappedName}" (${mappedType}) — nothing changed.`);
      } else {
        setMapStatus(`✅ Mapped "${mappedName}" (${mappedType}) to this module.`);
      }

      // Refresh mappings list
      fetchModuleClasses(mapModuleId).then(data => setExistingMappings(Array.isArray(data) ? data : []));
    } catch (err) {
      setMapStatus(`❌ Error: ${err.message}`);
    } finally {
      setMapLoading(false);
    }
  };

  // Phase 4: Add Excel Row Logic
  const handleAddExcelRow = async () => {
      // Use props directly for variant/part
      if (!excelRowModuleId || !variantId || !partId) {
          alert("Please select Module (Variant and Part must be set).");
          return;
      }
      try {
          await addReportTableRow({
              variantId: variantId,
              partId: partId,
              moduleId: excelRowModuleId,
              regulation: excelRowRegulation,
              drawing: excelRowDrawing,
              index: excelRowIndex,
              order: excelRowOrder,
              entryType: excelRowEntryType, // Use state
              extractionType: null
          });
          alert("Row added successfully!");
          // Clear inputs but keep selection (module) for faster entry
          setExcelRowRegulation('');
          setExcelRowDrawing('');
          // Increment index/order automatically
          setExcelRowIndex(prev => Number(prev) + 1);
          setExcelRowOrder(prev => Number(prev)); // Keep same order by default
          loadItems(); // Refresh table
      } catch (error) {
          console.error("Failed to add excel row", error);
          alert("Failed to add row: " + error.message);
      }
  };

  // Phase 2: Create Pending Class Logic

  const handleCreatePendingClass = async () => {
      try {
          const pendingModule = availableModules.find(m => m.id === pendingModuleId);
          const pendingModelId = pendingModule?.detection_model_id || null;
          const res = await mapClassToModule(pendingModuleId, { name: pendingClassName, type: pendingClassType, model_id: pendingModelId });
          const newMapping = res?.data || res;
          const newId = newMapping?.class_id || '?';
          // ✅ Explicitly call model_class_mapper API
          if (pendingModelId && newMapping?.class_id) {
            try { await mapModelToClass(pendingModelId, newMapping.class_id); } catch(e) { console.warn('model_class_mapper insert failed', e); }
          }
          alert(`Created & mapped class '${pendingClassName}' (Type: ${pendingClassType}, ID: ${newId.substring(0,8)}...)`);
          setShowTypePrompt(false);
          setPendingClassName('');
          setPendingModuleId('');
          loadItems();
      } catch (error) {
          console.error("Failed to create pending class", error);
          alert("Failed to create class: " + error.message);
      }
  };

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

      // --- AUTOMATED MAPPING LOGIC (Phase 2 Automation) ---
      if (selectedModule.type === 'OCR') {
          // Auto-map class with type 'ocr' (not reliant on name 'ocr')
          try {
              // Try to map existing class of type 'ocr' or let backend handle creation if missing
              let ocrClass = allClasses.find(c => c.type.toLowerCase() === 'ocr');
              const ocrModelId = selectedModule.detection_model_id || null;
              if (ocrClass) {
                  const r = await mapClassToModule(selectedModuleId, { class_id: ocrClass.id, model_id: ocrModelId });
                  if (ocrModelId) { try { await mapModelToClass(ocrModelId, ocrClass.id); } catch(e) { console.warn(e); } }
                  alert(`Entry added & mapped to class '${ocrClass.name}' (ID: ${ocrClass.id.substring(0,8)}...)`);
              } else {
                  // Create & map with type 'ocr'
                  const res = await mapClassToModule(selectedModuleId, { name: 'ocr', type: 'ocr', model_id: ocrModelId }); 
                  const newMapping = res?.data || res;
                  const newId = newMapping?.class_id || '?';
                  if (ocrModelId && newMapping?.class_id) { try { await mapModelToClass(ocrModelId, newMapping.class_id); } catch(e) { console.warn(e); } }
                  alert(`Entry added & mapped to new class 'ocr' (type: ocr, ID: ${newId.substring(0,8)}...)`);
              }
          } catch (e) {
              console.error("Auto-mapping OCR class failed", e);
          }
      } else if (selectedModule.type === 'Detection') {
          // Check if class exists
          const className = (moduleEntry.classValue || '').trim();
          if (className) {
              const existingClass = allClasses.find(c => c.name.toLowerCase() === className.toLowerCase());
              
              if (existingClass) {
                  // Auto-map
                  try {
                      const detModelId = selectedModule.detection_model_id || null;
                      await mapClassToModule(selectedModuleId, { class_id: existingClass.id, model_id: detModelId });
                      if (detModelId) { try { await mapModelToClass(detModelId, existingClass.id); } catch(e) { console.warn(e); } }
                      alert(`Entry added & mapped to class '${existingClass.name}' (ID: ${existingClass.id.substring(0,8)}...)`);
                  } catch (e) {
                      console.error("Auto-mapping Detection class failed", e);
                  }
              } else {
                  // Class not found → auto-create as 'detection' and map directly (no popup)
                  try {
                      const detModelId = selectedModule?.detection_model_id || null;
                      const res = await mapClassToModule(selectedModuleId, { name: className, type: 'detection', model_id: detModelId });
                      const newMapping = res?.data || res;
                      if (detModelId && newMapping?.class_id) {
                          try { await mapModelToClass(detModelId, newMapping.class_id); } catch(e) { console.warn(e); }
                      }
                      alert(`Entry added & auto-created class '${className}' as type 'detection'.`);
                      loadItems();
                  } catch (e) {
                      console.error('Auto-create detection class failed', e);
                      alert('Failed to auto-create class: ' + e.message);
                  }
              }
          }
      }

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
                   setMappingClass(false);
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
                   setMappingClass(false);
                   if (availableModules.length === 0 && capture.id) {
                       fetchModulesByCaptureId(capture.id).then(data => setAvailableModules(Array.isArray(data) ? data : []));
                   }
               }}
               title="Configure Module"
            >
               <Settings size={16} />
               <span className="text-xs font-medium ml-1">Configure</span>
            </button>

            <button 
               className="p-1 hover:bg-gray-200 rounded text-green-600 transition-colors"
               onClick={() => {
                   setAddingExcelRow(true);
                   setCreatingModule(false);
                   setConfiguringModule(false);
                   setMappingClass(false);
               }}
               title="Add Excel Row"
            >
               <FileSpreadsheet size={16} />
               <span className="text-xs font-medium ml-1">Excel Row</span>
            </button>
            
        </div>
      </div>

      {/* Phase 3: Map Class to Module */}
      {mappingClass && (
        <div className="bg-indigo-50 p-3 rounded border border-indigo-200 mb-3 animate-in fade-in zoom-in-95">
          <h5 className="text-xs font-semibold text-indigo-800 mb-2 border-b border-indigo-200 pb-1">Phase 3: Map Class to Module</h5>

          {/* Select Module */}
          <div className="mb-2 p-2 bg-white rounded border border-indigo-100 shadow-sm">
            <label className="text-xs font-medium text-indigo-700 block mb-1">Select Module</label>
            <select
              className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-indigo-500 bg-white"
              value={mapModuleId}
              onChange={e => setMapModuleId(e.target.value)}
            >
              <option value="">-- Choose Module --</option>
              {availableModules.map(m => (
                <option key={m.id} value={m.id}>
                  Order {m.order}: {m.type} {m.detection_model_name ? `(${m.detection_model_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Existing mappings */}
          {mapModuleId && existingMappings.length > 0 && (() => {
            const selectedMod = availableModules.find(m => m.id === mapModuleId);
            const modelLabel = selectedMod?.detection_model_name
              ? selectedMod.detection_model_name
              : selectedMod?.detection_model_id
                ? selectedMod.detection_model_id.substring(0, 8) + '...'
                : null;
            return (
              <div className="mb-2 p-2 bg-white rounded border border-indigo-100 shadow-sm">
                <p className="text-xs font-medium text-indigo-700 mb-1">Already Mapped Classes:</p>
                {modelLabel && (
                  <p className="text-xs text-gray-500 mb-1">
                    Detection Model: <span className="font-mono font-medium text-purple-700">{modelLabel}</span>
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  {existingMappings.map(m => (
                    <div key={m.id} className="text-xs bg-indigo-50 border border-indigo-100 rounded p-1.5 flex items-center justify-between gap-2">
                      <span className="font-medium text-indigo-800">{m.class_name} <span className="text-indigo-400 font-normal">({m.class_type})</span></span>
                      <span className="font-mono text-gray-400 text-xxs">class: {m.class_id ? m.class_id.substring(0,8) : m.id?.substring(0,8)}...</span>
                    </div>
                  ))}
                </div>
                {modelLabel && existingMappings.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 italic">
                    ↳ Mapped to model <span className="font-mono">{selectedMod?.detection_model_id ? selectedMod.detection_model_id.substring(0,8) : ''}...</span>
                  </p>
                )}
              </div>
            );
          })()}

          {/* OCR module: auto-resolve */}
          {mapModuleId && availableModules.find(m => m.id === mapModuleId)?.type === 'OCR' && (
            <div className="p-2 bg-white rounded border border-indigo-100 shadow-sm mb-2">
              <p className="text-xs text-gray-600 mb-1">
                OCR modules map to the <strong>"ocr"</strong> class.
              </p>
              {foundClass ? (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2">
                  <Check size={14}/>
                  Found existing class: <strong>{foundClass.name}</strong> ({foundClass.type}) — ID: {foundClass.id.substring(0,8)}...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded p-2">
                  <Plus size={14}/>
                  Class "ocr" not found — will be created as type <strong>text</strong> and mapped.
                </div>
              )}
            </div>
          )}

          {/* Detection module: look up class name */}
          {mapModuleId && availableModules.find(m => m.id === mapModuleId)?.type === 'Detection' && (
            <div className="p-2 bg-white rounded border border-indigo-100 shadow-sm mb-2 space-y-2">
              <p className="text-xs font-medium text-gray-700">Enter the class name (from Detection GT):</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 p-1.5 text-sm border rounded focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. rinder, Dustbin, NAHARS"
                  value={detectionClassName}
                  onChange={e => setDetectionClassName(e.target.value)}
                />
                <button
                  onClick={() => handleLookupAndMap(detectionClassName)}
                  className="px-3 py-1 text-xs bg-indigo-500 hover:bg-indigo-600 text-white rounded"
                >
                  Look Up
                </button>
              </div>

              {detectionClassName && foundClass && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2">
                  <Check size={14}/>
                  Found: <strong>{foundClass.name}</strong> ({foundClass.type}) — ID: {foundClass.id.substring(0,8)}...
                </div>
              )}

              {detectionClassName && !foundClass && (
                <div className="space-y-2 bg-amber-50 rounded p-2">
                  <p className="text-xs text-amber-700">Class not found. Fill in details to create it:</p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 block mb-1">Name</label>
                      <input
                        type="text"
                        className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-indigo-500"
                        value={newClassName}
                        onChange={e => setNewClassName(e.target.value)}
                        placeholder="Class name"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
                      <select
                        className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                        value={newClassType}
                        onChange={e => setNewClassType(e.target.value)}
                      >
                        <option value="text">text</option>
                        <option value="detection">detection</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status feedback */}
          {mapStatus && (
            <p className={`text-xs rounded px-2 py-1 mb-2 ${mapStatus.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {mapStatus}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => setMappingClass(false)} className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700">Close</button>
            {mapModuleId && (
              <button
                onClick={handleMapClass}
                disabled={mapLoading}
                className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 rounded text-white font-medium flex items-center gap-1 disabled:opacity-50"
              >
                {mapLoading ? <Loader2 size={12} className="animate-spin"/> : <Link size={12}/>}
                Map Class
              </button>
            )}
          </div>
        </div>
      )}

      {/* Phase 4: Add Excel Row Form */}
      {addingExcelRow && (
        <div className="bg-green-50 p-3 rounded border border-green-200 mb-3 animate-in fade-in zoom-in-95">
          <h5 className="text-xs font-semibold text-green-800 mb-2 border-b border-green-200 pb-1 flex items-center gap-2">
            <FileSpreadsheet size={14} /> Add Report Table Row (Excel Style)
          </h5>

          <div className="grid grid-cols-3 gap-2 mb-2">
            {/* Module Selection */}
            <div className="col-span-3">
              <label className="text-xs font-medium text-green-700 block mb-1">Module</label>
              <select
                className="w-full p-1.5 text-xs border rounded focus:ring-1 focus:ring-green-500 bg-white"
                value={excelRowModuleId}
                onChange={async (e) => {
                  const selectedId = e.target.value;
                  setExcelRowModuleId(selectedId);
                  setModuleGtEntries([]);
                  if (selectedId) {
                    const mod = availableModules.find(m => m.id === selectedId);
                    if (mod) {
                      const gt = await fetchModuleGT(mod);
                      setModuleGtEntries(gt);
                    }
                  }
                }}
              >
                <option value="">-- Select Module --</option>
                {availableModules.map(m => (
                    <option key={m.id} value={m.id}>{m.type} (Order {m.order})</option>
                ))}
              </select>

              {/* Ground Truth Reference Panel */}
              {moduleGtEntries.length > 0 && (() => {
                const mod = availableModules.find(m => m.id === excelRowModuleId);
                return (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <p className="font-semibold text-yellow-800 mb-1.5">📋 Ground Truth Reference ({mod?.type})</p>
                    {mod?.type === 'OCR' ? (
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-yellow-100 text-yellow-900">
                            <th className="text-left px-1 py-0.5 border border-yellow-200">Option Key</th>
                            <th className="text-left px-1 py-0.5 border border-yellow-200">Option Label</th>
                            <th className="text-left px-1 py-0.5 border border-yellow-200">Value</th>
                            <th className="text-left px-1 py-0.5 border border-yellow-200">Prefix</th>
                            <th className="text-left px-1 py-0.5 border border-yellow-200">Suffix</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moduleGtEntries.map((gt, i) => (
                            <tr key={i} className="even:bg-yellow-50">
                              <td className="px-1 py-0.5 border border-yellow-200 font-mono">{gt.option_key ?? '—'}</td>
                              <td className="px-1 py-0.5 border border-yellow-200">{gt.option_label ?? '—'}</td>
                              <td className="px-1 py-0.5 border border-yellow-200 font-mono">{gt.value ?? '—'}</td>
                              <td className="px-1 py-0.5 border border-yellow-200">{gt.prefix ?? '—'}</td>
                              <td className="px-1 py-0.5 border border-yellow-200">{gt.suffix ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-yellow-100 text-yellow-900">
                            <th className="text-left px-1 py-0.5 border border-yellow-200">Class</th>
                            <th className="text-left px-1 py-0.5 border border-yellow-200">Option Key</th>
                            <th className="text-left px-1 py-0.5 border border-yellow-200">Option Label</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moduleGtEntries.map((gt, i) => (
                            <tr key={i} className="even:bg-yellow-50">
                              <td className="px-1 py-0.5 border border-yellow-200 font-mono">{gt.class ?? gt.class_name ?? '—'}</td>
                              <td className="px-1 py-0.5 border border-yellow-200 font-mono">{gt.option_key ?? '—'}</td>
                              <td className="px-1 py-0.5 border border-yellow-200">{gt.option_label ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
             {/* Regulation */}
             <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Regulation Req.</label>
                <textarea
                  className="w-full p-1.5 text-xs border rounded focus:ring-1 focus:ring-green-500"
                  rows={2}
                  placeholder="Enter regulation text..."
                  value={excelRowRegulation}
                  onChange={e => setExcelRowRegulation(e.target.value)}
                />
             </div>
             {/* Drawing */}
             <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Drawing Req.</label>
                <textarea
                  className="w-full p-1.5 text-xs border rounded focus:ring-1 focus:ring-green-500"
                  rows={2}
                  placeholder="Enter drawing text..."
                  value={excelRowDrawing}
                  onChange={e => setExcelRowDrawing(e.target.value)}
                />
             </div>
          </div>

          <div className="flex gap-2 mb-2">
             <div className="w-20">
                <label className="text-xs font-medium text-gray-700 block mb-1">Order</label>
                <input
                  type="number"
                  className="w-full p-1.5 text-xs border rounded focus:ring-1 focus:ring-green-500"
                  value={excelRowOrder}
                  onChange={e => setExcelRowOrder(e.target.value)}
                />
             </div>
             <div className="w-20">
                <label className="text-xs font-medium text-gray-700 block mb-1">Index</label>
                <input
                  type="number"
                  className="w-full p-1.5 text-xs border rounded focus:ring-1 focus:ring-green-500"
                  value={excelRowIndex}
                  onChange={e => setExcelRowIndex(e.target.value)}
                />
             </div>
             <div className="w-24">
                <label className="text-xs font-medium text-gray-700 block mb-1">Entry Type</label>
                <input
                  type="number"
                  className="w-full p-1.5 text-xs border rounded focus:ring-1 focus:ring-green-500"
                  value={excelRowEntryType}
                  onChange={e => setExcelRowEntryType(e.target.value)}
                />
             </div>
          </div>

          <div className="flex justify-end gap-2">
             <button onClick={() => setAddingExcelRow(false)} className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700">Close</button>
             <button 
                onClick={handleAddExcelRow}
                className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium flex items-center gap-1"
             >
                <Plus size={12} /> Add Row
             </button>
          </div>
        </div>
      )}

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
