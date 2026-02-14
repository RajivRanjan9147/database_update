
const API_URL = import.meta.env.VITE_API_URL;

// Helper to extract data from response
const extractData = (json) => {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  return [];
};

export const fetchVariants = async () => {
  try {
    const response = await fetch(`${API_URL}/variants`);
    if (!response.ok) {
        console.warn(`Fetch variants failed with status: ${response.status}`);
        return []; 
    }
    const json = await response.json();
    return extractData(json);
  } catch (error) {
    console.warn("Fetch variants failed, returning empty list", error);
    return [];
  }
};

export const createVariant = async (variantName) => {
  try {
    const response = await fetch(`${API_URL}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_name: variantName }),
    });
    if (!response.ok) throw new Error('Failed to create variant');
    return response.json();
  } catch (e) {
      console.error(e);
      throw e;
  }
};

export const deleteVariant = async (variantId) => {
    const response = await fetch(`${API_URL}/variants/${variantId}`, {
        method: 'DELETE',
    });
    // Some APIs return 204 No Content, some return JSON
    if (!response.ok) throw new Error('Failed to delete variant');
    return true;
};

export const fetchParts = async (variantId) => {
  try {
      const response = await fetch(`${API_URL}/parts/variant/${variantId}`);
      if (!response.ok) return [];
      const json = await response.json();
      return extractData(json);
  } catch (e) {
      console.warn("Fetch parts failed", e);
      return [];
  }
};

export const createPart = async (variantId, partName) => {
  const response = await fetch(`${API_URL}/parts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant_id: variantId, part_name: partName }),
  });
  if (!response.ok) throw new Error('Failed to create part');
  return response.json();
};

export const deletePart = async (partId) => {
    const response = await fetch(`${API_URL}/parts/${partId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete part');
    return true;
};

export const fetchCaptures = async (variant_id, part_id) => {
  try {
      const response = await fetch(`${API_URL}/captures/variant/${variant_id}/part/${part_id}`);
      if (!response.ok) return [];
      const json = await response.json();
      return extractData(json);
  } catch (e) {
      console.warn("Fetch captures failed", e);
      return [];
  }
};

export const createCapture = async (variantId, partId, data) => {
  let order = 1;
  // If order is not provided in data, try to calculate it
  if (!data || !data.order) {
    try {
       const existing = await fetchCaptures(variantId, partId);
       if (existing && existing.length > 0) {
          order = existing.length + 1;
       }
    } catch (e) { /* ignore */ }
  } else {
    order = data.order;
  }

  const body = {
      variant_id: variantId, 
      part_id: partId,
      order: order,
      capture_name: data.captureName,
  };

  if (data) {
      // Map user inputs to API payload
      if (data.image !== undefined) body.image = data.image;
      if (data.flag !== undefined) body.image_flag = data.flag;
      
      // Fallback for old boolean flag if needed (or just remove it if we are sure)
      if (data.imageFlag !== undefined && data.flag === undefined) {
          body.image_flag = data.imageFlag ? 1 : 0;
      }

      if (data.captureName !== undefined) body.capture_name = data.captureName;
  }

  const response = await fetch(`${API_URL}/captures/create-by-variant-part-id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Failed to create capture');
  return response.json();
};

export const deleteCapture = async (captureId) => {
    const response = await fetch(`${API_URL}/captures/${captureId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete capture');
    return true;
};

export const fetchCaptureItems = async (captureId) => {
    try {
        const response = await fetch(`${API_URL}/captures/${captureId}/items`);
        if (!response.ok) return []; 
        const json = await response.json();
        return extractData(json);
    } catch (e) {
        console.warn("Fetch capture items failed", e);
        return [];
    }
};

export const createCaptureItem = async (data) => {
    const response = await fetch(`${API_URL}/captures/add-entry-to-report-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            variant_id: data.variantId,
            part_id: data.partId,
            regulation_requirement: data.regulation,
            drawing_requirement: data.drawing,
            item_index: data.index,
            entry_type: Number(data.entryType),
            extraction_type: data.extractionType,
            
        }),
    });
    if (!response.ok) throw new Error('Failed to create capture item');
    return response.json();
};

export const createModule = async (data) => {
    
    const payload = {
        capture_id: data.captureId,
        order: data.order,
        type: data.type,
        // match_type: data.match_type,
        // value: data.value,
        option_key: data.option_key,
        option_label: data.option_label,
        is_user_selectable: data.is_user_selectable,
        // prefix: data.prefix,
        // suffix: data.suffix,
        master_key: data.master_key
    };

    if (data.type === 'OCR') {
        payload.match_type = data.match_type;
        payload.value = data.value;
        payload.prefix = data.prefix;
        payload.suffix = data.suffix;
        if (data.detection_model_id) payload.detection_model_id = data.detection_model_id;
        if (data.recognition_model_id) payload.recognition_model_id = data.recognition_model_id;
    } else if (data.type === 'Detection') {
        payload.class = data.class;
        if (data.detection_model_id) payload.detection_model_id = data.detection_model_id;
    }

    const response = await fetch(`${API_URL}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create module');
    return response.json();
};

export const fetchModels = async () => {
    try {
        const response = await fetch(`${API_URL}/models`);
        if (!response.ok) return [];
        const json = await response.json();
        return extractData(json);
    } catch (e) {
        console.warn("Fetch models failed", e);
        return [];
    }
};

export const fetchOcrDetectionModels = async () => {
    try {
        const response = await fetch(`${API_URL}/models/ocr-detection`);
        if (!response.ok) return [];
        const json = await response.json();
        return extractData(json);
    } catch (e) {
        console.warn("Fetch ocr detection models failed", e);
        return [];
    }
};

export const fetchOcrRecognitionModels = async () => {
    try {
        const response = await fetch(`${API_URL}/models/ocr-recognition`);
        if (!response.ok) return [];
        const json = await response.json();
        return extractData(json);
    } catch (e) {
        console.warn("Fetch ocr recognition models failed", e);
        return [];
    }
};

export const fetchDetectionModels = async () => {
    try {
        const response = await fetch(`${API_URL}/models/detection`);
        if (!response.ok) return [];
        const json = await response.json();
        return extractData(json);
    } catch (e) {
        console.warn("Fetch detection models failed", e);
        return [];
    }
};
export const fetchModulesByCaptureId = async (captureId) => {
    try {
        const response = await fetch(`${API_URL}/modules/capture-id/${captureId}`);
        if (!response.ok) return [];
        const json = await response.json();
        return extractData(json);
    } catch (e) {
        console.warn("Fetch modules by capture id failed", e);
        return [];
    }
};
