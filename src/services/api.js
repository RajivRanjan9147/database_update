
const API_URL = import.meta.env.VITE_API_URL;

// ─── Auth token helpers ──────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem('authToken');

export const clearToken = () => localStorage.removeItem('authToken');

/**
 * Central fetch wrapper – automatically attaches Authorization header.
 * On 401, clears the stored token so the app re-shows the login screen.
 */
const apiFetch = async (url, options = {}) => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { ...options, headers });
    // 401 = session expired, 403 = mfa_pending preAuthToken used as real token
    if (response.status === 401 || response.status === 403) {
        clearToken();
        window.dispatchEvent(new Event('auth:logout'));
    }
    return response;
};

// Helper to extract data from response
const extractData = (json) => {
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.data)) return json.data;
    return [];
};

export const fetchVariants = async () => {
    try {
        const response = await apiFetch(`${API_URL}/variants`);
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
        const response = await apiFetch(`${API_URL}/variants`, {
            method: 'POST',
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
    const response = await apiFetch(`${API_URL}/variants/${variantId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete variant');
    return true;
};

export const fetchParts = async (variantId) => {
    try {
        const response = await apiFetch(`${API_URL}/parts/variant/${variantId}`);
        if (!response.ok) return [];
        const json = await response.json();
        return extractData(json);
    } catch (e) {
        console.warn("Fetch parts failed", e);
        return [];
    }
};

export const createPart = async (variantId, partName) => {
    const response = await apiFetch(`${API_URL}/parts`, {
        method: 'POST',
        body: JSON.stringify({ variant_id: variantId, part_name: partName }),
    });
    if (!response.ok) throw new Error('Failed to create part');
    return response.json();
};

export const deletePart = async (partId) => {
    const response = await apiFetch(`${API_URL}/parts/${partId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete part');
    return true;
};

export const fetchCaptures = async (variant_id, part_id) => {
    try {
        const response = await apiFetch(`${API_URL}/captures/variant/${variant_id}/part/${part_id}`);
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
        if (data.image !== undefined) body.image = data.image;
        if (data.flag !== undefined) body.image_flag = data.flag;
        if (data.imageFlag !== undefined && data.flag === undefined) {
            body.image_flag = data.imageFlag ? 1 : 0;
        }
        if (data.captureName !== undefined) body.capture_name = data.captureName;
    }

    const response = await apiFetch(`${API_URL}/captures/create-by-variant-part-id`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Failed to create capture');
    return response.json();
};

export const deleteCapture = async (captureId) => {
    const response = await apiFetch(`${API_URL}/captures/${captureId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete capture');
    return true;
};

export const fetchCaptureItems = async (captureId) => {
    try {
        const response = await apiFetch(`${API_URL}/captures/${captureId}/items`);
        if (!response.ok) return [];
        const json = await response.json();
        return extractData(json);
    } catch (e) {
        console.warn("Fetch capture items failed", e);
        return [];
    }
};

export const createCaptureItem = async (data) => {
    const response = await apiFetch(`${API_URL}/captures/add-entry-to-report-table`, {
        method: 'POST',
        body: JSON.stringify({
            variant_id: data.variantId,
            part_id: data.partId,
            module_id: data.moduleId || null,
            regulation_requirement: data.regulation,
            drawing_requirement: data.drawing,
            item_index: data.index,
            index: data.index,
            order: data.order || null,
            entry_type: Number(data.entryType) || 0,
            extraction_type: data.extractionType || null,
        }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.data?.message || 'Failed to create capture item');
    }
    return response.json();
};

// Alias for Phase 4 — same endpoint, explicit name
export const addReportTableRow = createCaptureItem;

export const createModule = async (data) => {
    const payload = {
        capture_id: data.captureId,
        order: data.order,
        type: data.type,
        option_key: data.option_key,
        option_label: data.option_label,
        is_user_selectable: data.is_user_selectable,
        master_key: data.master_key,
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

    const response = await apiFetch(`${API_URL}/modules`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create module');
    return response.json();
};

export const addOcrGtEntry = async (data) => {
    const payload = {
        ocr_config_id: data.ocr_config_id,
        value: data.value,
        option_key: data.option_key,
        option_label: data.option_label,
        is_user_selectable: data.is_user_selectable,
        match_type: data.match_type,
        prefix: data.prefix,
        suffix: data.suffix,
        master_key: data.master_key,
    };

    const response = await apiFetch(`${API_URL}/ocr-configs/ocr-gt`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to add OCR GT entry');
    return response.json();
};

export const addDetectionClassEntry = async (data) => {
    const payload = {
        detection_config_id: data.detection_config_id,
        class: data.class,
        option_key: data.option_key,
        option_label: data.option_label,
        is_user_selectable: data.is_user_selectable,
        master_option_keys: data.master_option_keys,
    };

    const response = await apiFetch(`${API_URL}/detection-configs/detection-class`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to add detection class entry');
    return response.json();
};

export const fetchModels = async () => {
    try {
        const response = await apiFetch(`${API_URL}/models`);
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
        const response = await apiFetch(`${API_URL}/models/ocr-detection`);
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
        const response = await apiFetch(`${API_URL}/models/ocr-recognition`);
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
        const response = await apiFetch(`${API_URL}/models/detection`);
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
        const response = await apiFetch(`${API_URL}/modules/capture-id/${captureId}`);
        if (!response.ok) return [];
        const json = await response.json();
        return extractData(json);
    } catch (e) {
        console.warn("Fetch modules by capture id failed", e);
        return [];
    }
};

export const fetchAllClasses = async () => {
    try {
        const response = await apiFetch(`${API_URL}/classes`);
        if (!response.ok) return [];
        const json = await response.json();
        return extractData(json);
    } catch (e) {
        console.warn('Fetch classes failed', e);
        return [];
    }
};

export const fetchModuleClasses = async (moduleId) => {
    try {
        const response = await apiFetch(`${API_URL}/modules/${moduleId}/classes`);
        if (!response.ok) return [];
        const json = await response.json();
        return extractData(json);
    } catch (e) {
        console.warn('Fetch module classes failed', e);
        return [];
    }
};

export const mapClassToModule = async (moduleId, payload) => {
    // payload: { class_id } OR { name, type } — plus optional model_id
    const response = await apiFetch(`${API_URL}/modules/${moduleId}/classes`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.data?.message || err?.message || 'Failed to map class to module');
    }
    return response.json();
};

/**
 * Fetch Ground Truth entries for a module.
 * Pass the module object (which has type, ocr_config_id, detection_config_id).
 * Returns an array of GT rows.
 */
export const fetchModuleGT = async (module) => {
    if (!module) return [];
    try {
        if (module.type === 'OCR' && module.ocr_config_id) {
            const response = await apiFetch(`${API_URL}/ocr-configs/${module.ocr_config_id}/ground-truth`);
            if (!response.ok) return [];
            const json = await response.json();
            // Response: { data: { id, ground_truths: [...] } }
            if (Array.isArray(json?.data?.ground_truths)) return json.data.ground_truths;
            if (Array.isArray(json?.data)) return json.data;
            if (Array.isArray(json)) return json;
            return [];
        } else if (module.type === 'Detection' && module.detection_config_id) {
            const response = await apiFetch(`${API_URL}/detection-configs/${module.detection_config_id}/ground-truth`);
            if (!response.ok) return [];
            const json = await response.json();
            // Response: { data: { id, ground_truths: [...] } }
            if (Array.isArray(json?.data?.ground_truths)) return json.data.ground_truths;
            if (Array.isArray(json?.data)) return json.data;
            if (Array.isArray(json)) return json;
            return [];
        }
    } catch (e) {
        console.warn('fetchModuleGT failed', e);
    }
    return [];
};

/**
 * Directly maps a model to a class in the model_class_mapper table.
 * Call this after mapClassToModule whenever detection_model_id is known.
 */
export const mapModelToClass = async (modelId, classId) => {
    if (!modelId || !classId) return null;
    const response = await apiFetch(`${API_URL}/model-class-mapper`, {
        method: 'POST',
        body: JSON.stringify({ model_id: modelId, class_id: classId }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.data?.message || err?.message || 'Failed to map model to class');
    }
    return response.json();
};

/**
 * Fetch everything for one part:
 *   captures → modules per capture → GT entries per module
 *
 * Returns:
 * {
 *   partId, partName,
 *   captures: [
 *     {
 *       capture,
 *       modules: [
 *         { module, gtEntries: [...] }
 *       ]
 *     }
 *   ]
 * }
 */
export const fetchAllForPart = async (variantId, part) => {
    const captures = await fetchCaptures(variantId, part.id);

    const captureResults = await Promise.all(
        (captures || []).map(async (capture) => {
            const modules = await fetchModulesByCaptureId(capture.id);

            const moduleResults = await Promise.all(
                (modules || []).map(async (module) => {
                    const gtEntries = await fetchModuleGT(module);
                    return { module, gtEntries: gtEntries || [] };
                })
            );

            return { capture, modules: moduleResults };
        })
    );

    return {
        partId: part.id,
        partName: part.part_name,
        captures: captureResults,
    };
};

/**
 * Fetch everything for all parts of a variant concurrently.
 * Returns an array of fetchAllForPart results.
 */
export const fetchAllForVariant = async (variantId, parts) => {
    return Promise.all((parts || []).map((part) => fetchAllForPart(variantId, part)));
};
