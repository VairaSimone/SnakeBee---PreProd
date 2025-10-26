import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import api from '../services/api';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/userSlice';
import { Link } from 'react-router-dom';
import {
  PhotoIcon,
  IdentificationIcon,
  UsersIcon,
  DocumentTextIcon,
  XMarkIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  TagIcon,
  ArchiveBoxIcon,
  EyeIcon, // NUOVO
  EyeSlashIcon // NUOVO
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
const getPlanLimits = (user) => {
  const plan = user?.subscription?.plan || 'NEOPHYTE';
  const status = user?.subscription?.status;
  const isActive = status === 'active' || status === 'pending_cancellation';

  if (!isActive) return { plan: 'NEOPHYTE', publicReptiles: 0 };
  
  switch(plan) {
    case 'APPRENTICE': return { plan, publicReptiles: 3 };
    case 'PRACTITIONER': return { plan, publicReptiles: 10 };
    case 'BREEDER': return { plan, publicReptiles: Infinity };
    default: return { plan: 'NEOPHYTE', publicReptiles: 0 };
  }
};
// ... (Il componente ConfirmationModal rimane invariato)
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child as={Fragment} {...{ enter: "ease-out duration-300", enterFrom: "opacity-0", enterTo: "opacity-100", leave: "ease-in duration-200", leaveFrom: "opacity-100", leaveTo: "opacity-0" }}>
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} {...{ enter: "ease-out duration-300", enterFrom: "opacity-0 scale-95", enterTo: "opacity-100 scale-100", leave: "ease-in duration-200", leaveFrom: "opacity-100 scale-100", leaveTo: "opacity-0 scale-95" }}>
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  {title}
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{children}</p>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none" onClick={onClose}>
                    {t('reptileEditModal.common.cancel')}
                  </button>
                  <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none" onClick={onConfirm}>
                    {t('reptileEditModal.common.confirmDeletion')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};


const ReptileEditModal = ({ show, handleClose, reptile, setReptiles, onSuccess }) => {
  // MODIFICA: Aggiunti 'status', 'cededTo', 'deceasedDetails' allo stato iniziale
  const initialFormData = {
    name: '', species: '', morph: '', birthDate: '', sex: '', isBreeder: false, notes: '',
    previousOwner: '',parents: { father: '', mother: '' },
    documents: {
      cites: { number: '', issueDate: '', issuer: '', load: '', unload: '' },
      microchip: { code: '', implantDate: '' }
    },
    isPublic: false,
    price: { amount: '', currency: 'EUR' },
    foodType: '',
    weightPerUnit: '',
    nextMealDay: '',
    status: 'active', // NUOVO
    cededTo: { name: '', surname: '', notes: '', date: '' }, // NUOVO
    deceasedDetails: { notes: '', date: '' } // NUOVO
  };

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [newImages, setNewImages] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [label, setLabel] = useState({ text: '', color: '#228B22' });
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const { t } = useTranslation();
  const [errors, setErrors] = useState({});
  const user = useSelector(selectUser);
  const userLimits = getPlanLimits(user);
  const FOOD_TYPES = [
    { value: 'Topo', labelKey: 'reptileEditModal.reptile.food.topo' },
    { value: 'Ratto', labelKey: 'reptileEditModal.reptile.food.ratto' },
    { value: 'Coniglio', labelKey: 'reptileEditModal.reptile.food.coniglio' },
    { value: 'Pulcino', labelKey: 'reptileEditModal.reptile.food.pulcino' },
    { value: 'Altro', labelKey: 'reptileEditModal.reptile.food.altro' },
  ];

  useEffect(() => {

    if (reptile) {
      // MODIFICA: De-strutturati i nuovi campi
      const { parents = {}, documents = {}, label: reptileLabel, cededTo = {}, deceasedDetails = {} } = reptile;
      setFormData({
        name: reptile.name || '',
        species: reptile.species || '',
        morph: reptile.morph || '',
        birthDate: reptile.birthDate?.split('T')[0] || '',
        sex: reptile.sex || '',
        isBreeder: !!reptile.isBreeder,
        notes: reptile.notes || '',
        isPublic: !!reptile.isPublic,
        previousOwner: reptile.previousOwner || '',
        parents: {
          father: parents.father || '',
          mother: parents.mother || '',
        },
        documents: {
          cites: {
            number: documents.cites?.number || '',
            issueDate: documents.cites?.issueDate?.split('T')[0] || '',
            issuer: documents.cites?.issuer || '',
            load: documents.cites?.load || '', // MODIFICA: Aggiunto
            unload: documents.cites?.unload || '',
          },
          microchip: {
            code: documents.microchip?.code || '',
            implantDate: documents.microchip?.implantDate?.split('T')[0] || '',
          },
        },
        price: {
          amount: reptile.price?.amount || '',
          currency: reptile.price?.currency || 'EUR'
        },
        foodType: reptile.foodType || '',
        weightPerUnit: reptile.weightPerUnit || '',
        nextMealDay: reptile.nextMealDay || '',
        // NUOVO: Popolamento campi archivio
        status: reptile.status || 'active',
        cededTo: {
          name: cededTo.name || '',
          surname: cededTo.surname || '',
          notes: cededTo.notes || '',
          date: cededTo.date?.split('T')[0] || '',
        },
        deceasedDetails: {
          notes: deceasedDetails.notes || '',
          date: deceasedDetails.date?.split('T')[0] || '',
        }
      });
      setLabel(reptileLabel || { text: '', color: '#228B22' });
      setExistingImages(reptile.image.map(name => `${process.env.REACT_APP_BACKEND_URL_IMAGE}${name}`));
    }

    return () => {
      setNewImages([]);
      setNewImagePreviews(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
      if (!show) {
        setFormData(initialFormData);
        setExistingImages([]);
        setToastMsg(null);
      }
    };

  }, [reptile, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
   if (toastMsg && toastMsg.type === 'danger') {
      setToastMsg(null);
    }
    if (Object.keys(errors).length > 0) {
      setErrors({});
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePriceChange = (e, field) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      price: {
        ...prev.price,
        [field]: field === 'amount' ? value.replace(/[^0-9.]/g, '') : value
      }
    }));
  };

  const handleNestedChange = (e, section, subsection, field) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  // NUOVO: Handler per oggetti di primo livello (cededTo, deceasedDetails)
  const handleSubObjectChange = (e, section, field) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const errors = {};
    const today = new Date();
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 100);

    // ... (validazioni esistenti da 'name' a 'microchipDate')
    if (!formData.species.trim()) errors.species = t('reptileEditModal.validation.speciesRequired');
    if (!formData.morph.trim()) errors.morph = t('reptileEditModal.validation.morphRequired');
    if (!formData.sex) errors.sex = t('reptileEditModal.validation.sexRequired');
    if (!formData.birthDate) {
      errors.birthDate = t('reptileEditModal.validation.birthRequired');
    } else {
      const birth = new Date(formData.birthDate);
      if (birth > today) errors.birthDate = t('reptileEditModal.validation.birthFuture');
      else if (birth < minDate) errors.birthDate = t('reptileEditModal.validation.birthTooOld');
    }
    if (formData.notes.length > 500) errors.notes = t('reptileEditModal.validation.notesTooLong');
    const namePattern = /^[a-zA-Zàèéìòù' -]+$/;
    if (formData.parents.father && !namePattern.test(formData.parents.father)) {
      errors.father = t('reptileEditModal.validation.fatherInvalid');
    }
    if (formData.parents.mother && !namePattern.test(formData.parents.mother)) {
      errors.mother = t('reptileEditModal.validation.motherInvalid');
    }
    if (formData.weightPerUnit && formData.weightPerUnit <= 0) {
      errors.weightPerUnit = t('reptileEditModal.validation.weightInvalid');
    }
    if (formData.nextMealDay && (formData.nextMealDay < 0 || formData.nextMealDay > 31)) {
      errors.nextMealDay = t('reptileEditModal.validation.nextMealInvalid');
    }
    if (newImages.length > 0) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      newImages.forEach((file, idx) => {
        if (!allowedTypes.includes(file.type)) {
          errors[`image_${idx}`] = t('reptileEditModal.validation.imageType');
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB
          errors[`image_${idx}`] = t('reptileEditModal.validation.imageSize');
        }
      });
    }
    const { cites, microchip } = formData.documents;
    if (cites.number && cites.number.length > 50) errors.citesNumber = t('reptileEditModal.validation.citesNumberTooLong');
    if (cites.issueDate) {
      const issueDate = new Date(cites.issueDate);
      if (issueDate > today) errors.citesIssueDate = t('reptileEditModal.validation.citesIssueFuture');
    }
    if (cites.issuer && cites.issuer.length > 100) errors.citesIssuer = t('reptileEditModal.validation.citesIssuerTooLong');
    if (microchip.code && microchip.code.length > 50) errors.microchipCode = t('reptileEditModal.validation.microchipCodeTooLong');
    if (microchip.implantDate) {
      const implantDate = new Date(microchip.implantDate);
      if (implantDate > today) errors.microchipDate = t('reptileEditModal.validation.microchipDateFuture');
    }
    // --- FINE VALIDAZIONI ESISTENTI ---
if (formData.previousOwner && formData.previousOwner.length > 100) errors.previousOwner = t('reptileEditModal.validation.previousOwnerTooLong');
    if (cites.load && cites.load.length > 50) errors.citesLoad = t('reptileEditModal.validation.citesLoadTooLong');
    if (cites.unload && cites.unload.length > 50) errors.citesUnload = t('reptileEditModal.validation.citesUnloadTooLong');

    // NUOVO: Validazioni per campi Archivio
    if (formData.status === 'ceded') {
      if (!formData.cededTo.date) {
        errors.cededDate = t('reptileEditModal.validation.cededDateRequired');
      } else {
        const cededDate = new Date(formData.cededTo.date);
        if (cededDate > today) errors.cededDate = t('reptileEditModal.validation.cededDateFuture');
      }
    }

    if (formData.status === 'deceased') {
      if (!formData.deceasedDetails.date) {
        errors.deceasedDate = t('reptileEditModal.validation.deceasedDateRequired');
      } else {
        const deceasedDate = new Date(formData.deceasedDetails.date);
        if (deceasedDate > today) errors.deceasedDate = t('reptileEditModal.validation.deceasedDateFuture');
      }
    }

    return errors;
  };

  const handleParentChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      parents: {
        ...prev.parents,
        [name]: value
      }
    }));
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      setNewImages(prev => [...prev, ...files]);
      const previews = files.map(file => URL.createObjectURL(file));
      setNewImagePreviews(prev => [...prev, ...previews]);
    }
  };

  const removeNewImage = (index) => {
    URL.revokeObjectURL(newImagePreviews[index]);
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };


  const openDeleteConfirmation = (index) => {
    setImageToDelete(index);
    setConfirmModalOpen(true);
  };

  const confirmDeleteImage = async () => {
    if (imageToDelete === null) return;

    setLoading(true);
    try {
      const { data } = await api.delete(`/reptile/${reptile._id}/image/${imageToDelete}`);
      setToastMsg({ type: 'success', text: t('reptileEditModal.reptile.imageDelete') });
      setExistingImages(data.remainingImages);

      const updatedReptile = { ...reptile, image: data.remainingImages };
      if (typeof setReptiles === 'function') {
        setReptiles((prev) => prev.map((r) => (r._id === updatedReptile._id ? updatedReptile : r)));
      }
      onSuccess?.();
    } catch (err) {
      setToastMsg({ type: 'danger', text: t('reptileEditModal.reptile.imageError') });
    } finally {
      setLoading(false);
      setConfirmModalOpen(false);
      setImageToDelete(null);
    }
  };




    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToastMsg(null);

    try {
      // 1. Validazione
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setToastMsg({ type: 'danger', text: t('reptileEditModal.validation.fixErrors') });
        // Lancia un errore per passare al blocco catch e poi al finally
        // Questo interrompe l'esecuzione qui.
        throw new Error("Validation failed");
      }
      
      // 2. Se la validazione passa, pulisce gli errori
      setErrors({});

      // 3. Preparazione FormData
      const formDataToSubmit = new FormData();
      // MODIFICA: Aggiunti 'cededTo' e 'deceasedDetails' alla lista da saltare
      Object.entries(formData).forEach(([key, val]) => {
        if (key === 'parents' || key === 'documents' || key === 'price' || key === 'cededTo' || key === 'deceasedDetails') {
          // skip: will append them in controlled way below
          return;
        }
        formDataToSubmit.append(key, val === undefined || val === null ? '' : String(val));
      });

      // parents / documents as JSON
      formDataToSubmit.append('parents', JSON.stringify(formData.parents || {}));
      formDataToSubmit.append('documents', JSON.stringify(formData.documents || {}));

      // NUOVO: Aggiunta logica per 'cededTo' e 'deceasedDetails'
      formDataToSubmit.append('cededTo', JSON.stringify(formData.cededTo || {}));
      formDataToSubmit.append('deceasedDetails', JSON.stringify(formData.deceasedDetails || {}));


      // price
      const rawAmount = formData.price?.amount;
      const priceToSubmit = (rawAmount === '' || rawAmount === null || rawAmount === undefined)
        ? null
        : { amount: parseFloat(String(rawAmount)) || 0, currency: formData.price?.currency || 'EUR' };

      formDataToSubmit.append('price', JSON.stringify(priceToSubmit));

      // label
      formDataToSubmit.append('label', JSON.stringify(label || {}));

      // images
      newImages.forEach(img => {
        formDataToSubmit.append('image', img);
      });

      // 4. Chiamata API
      const { data } = await api.put(`/reptile/${reptile._id}`, formDataToSubmit);
      
      // 5. Successo
      setToastMsg({ type: 'success', text: t('reptileEditModal.reptile.reptileUpdate') });
      if (typeof setReptiles === 'function') {
        setReptiles((prev) => prev.map((r) => (r._id === data._id ? data : r)));
      }
      onSuccess?.(); // Questo triggera il refresh della dashboard
      handleClose();

    } catch (err) {
      // Gestisce sia l'errore di validazione che gli errori API
      if (err.message !== "Validation failed") {
        // Errore API o di runtime
        console.error("Submit error:", err); // Logga l'errore per debugging
        let msg = t('reptileEditModal.reptile.reptileError');
        if (err.response?.data?.message) msg = err.response.data.message;
        setToastMsg({ type: 'danger', text: msg });
      }
      // Se è "Validation failed", il toast è già stato impostato nella sezione di validazione,
      // quindi non c'è bisogno di impostarne un altro qui.
    } finally {
      // 6. Questo blocco viene ESEGUITO SEMPRE,
      // sia dopo il successo del try, sia dopo l'esecuzione del catch (per validazione o API error).
      setLoading(false);
    }
  };

  const inputClasses = "w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition";
  const labelClasses = "block text-sm font-medium text-gray-600 mb-1";
  const sectionTitleClasses = "text-lg font-semibold text-gray-800 flex items-center gap-2";
  const sectionClasses = "bg-white p-6 rounded-lg shadow-sm border border-gray-200";

return (
    <>
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmDeleteImage}
        title={t('reptileEditModal.reptile.confirmDeleteTitle')}
      >
        {t('reptileEditModal.reptile.confirmDeleteText')}
      </ConfirmationModal>

      <Transition show={show} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleClose}>
          <Transition.Child as={Fragment} {...{ enter: "ease-out duration-300", enterFrom: "opacity-0", enterTo: "opacity-100", leave: "ease-in duration-200", leaveFrom: "opacity-100", leaveTo: "opacity-0" }}>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} {...{ enter: "ease-out duration-300", enterFrom: "opacity-0 scale-95", enterTo: "opacity-100 scale-100", leave: "ease-in duration-200", leaveFrom: "opacity-100 scale-100", leaveTo: "opacity-0 scale-95" }}>
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-slate-50 p-6 shadow-xl transition-all">

                  <div className="flex items-start justify-between">
                    <Dialog.Title className="text-xl font-bold text-gray-900">
                      {t('reptileEditModal.reptile.editTitle', { name: formData.name || t('reptileEditModal.reptile.defaultName') })}
                    </Dialog.Title>
                    <button onClick={handleClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition">
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-6">

                     {/* SEZIONE DATI PRINCIPALI */}
                    <div className={sectionClasses}>
                      <h3 className={sectionTitleClasses}><IdentificationIcon className="w-6 h-6 text-emerald-600" /> {t('reptileEditModal.reptile.personalData')}</h3>
                       {/* Riga 1: Nome, Specie, Morph */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4 mt-4">
                        <div>
                          <label className={labelClasses}>{t('reptileEditModal.reptile.name')}</label>
                          <input
                            type="text" name="name" value={formData.name} onChange={handleChange}
                            className={`${inputClasses} ${errors.name ? "border-red-500" : ""}`}
                          />
                          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                        </div>
                        <div>
                          <label className={labelClasses}>{t('reptileEditModal.reptile.species')}</label>
                          <input
                             type="text" name="species" value={formData.species} onChange={handleChange}
                             className={`${inputClasses} ${errors.species ? "border-red-500" : ""}`}
                          />
                          {errors.species && <p className="mt-1 text-xs text-red-600">{errors.species}</p>}
                        </div>
                        <div>
                           <label className={labelClasses}>{t('reptileEditModal.reptile.morph')}</label>
                           <input
                            type="text" name="morph" value={formData.morph} onChange={handleChange}
                            className={`${inputClasses} ${errors.morph ? "border-red-500" : ""}`}
                           />
                          {errors.morph && <p className="mt-1 text-xs text-red-600">{errors.morph}</p>}
                        </div>
                      </div>
                       {/* Riga 2: Data Nascita, Sesso, Allevatore */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4 mt-4">
                        <div>
                          <label className={labelClasses}>{t('reptileEditModal.reptile.birthDate')}</label>
                          <input
                            type="date" name="birthDate" value={formData.birthDate} onChange={handleChange}
                             className={`${inputClasses} ${errors.birthDate ? "border-red-500" : ""}`}
                          />
                          {errors.birthDate && <p className="mt-1 text-xs text-red-600">{errors.birthDate}</p>}
                        </div>
                        <div>
                          <label className={labelClasses}>{t('reptileEditModal.reptile.sex')}</label>
                          <select
                             name="sex" value={formData.sex} onChange={handleChange}
                             className={`${inputClasses} ${errors.sex ? "border-red-500" : ""}`}
                          >
                            <option value="">{t('reptileEditModal.reptile.selectSex')}</option>
                            <option value="Unknown">{t('reptileEditModal.reptile.unknownSex')}</option>
                            <option value="M">{t('reptileEditModal.reptile.male')}</option>
                            <option value="F">{t('reptileEditModal.reptile.female')}</option>
                          </select>
                          {errors.sex && <p className="mt-1 text-xs text-red-600">{errors.sex}</p>}
                        </div>
                         <div>
                           <label className={labelClasses}>{t('reptileEditModal.reptile.previousOwner')}</label>
                           <input
                             type="text" name="previousOwner" value={formData.previousOwner} onChange={handleChange}
                              className={`${inputClasses} ${errors.previousOwner ? "border-red-500" : ""}`}
                           />
                           {errors.previousOwner && <p className="mt-1 text-xs text-red-600">{errors.previousOwner}</p>}
                         </div>
                      </div>
                      {/* Riga 3: Checkbox Riproduttore */}
<div className="mt-4 flex flex-wrap gap-x-6 gap-y-4">
                        <div className="flex items-center">
                          <input id="isBreeder" type="checkbox" name="isBreeder" checked={formData.isBreeder} onChange={handleChange} className="w-4 h-4 accent-emerald-600 rounded focus:ring-emerald-500" />
                          <label htmlFor="isBreeder" className="ml-2 text-sm text-gray-700">{t('reptileEditModal.reptile.isBreeder')}</label>
                        </div>
                        
                        {/* NUOVO: Toggle Pubblico */}
                        <div className="flex items-center">
                          <input
                            id="isPublic"
                            type="checkbox"
                            name="isPublic"
                            checked={formData.isPublic}
                            onChange={handleChange}
                            disabled={userLimits.publicReptiles === 0}
                            className="w-4 h-4 accent-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                          <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                            {t('reptileEditModal.fields.isPublic', 'Pubblica nello Shop')}
                            {formData.isPublic 
                              ? <EyeIcon className="inline w-4 h-4 ml-1 text-blue-600"/> 
                              : <EyeSlashIcon className="inline w-4 h-4 ml-1 text-gray-500"/>}
                          </label>
                        </div>
                      </div>
                      
                      {/* NUOVO: Messaggio di avviso per i limiti */}
                      { userLimits.publicReptiles === 0 && (
                         <p className="mt-2 text-xs text-red-600">
                           {t('reptileEditModal.publicDisabled', 'Per pubblicare rettili nello shop, è necessario un piano ')}
                           <Link to="/pricing" className="underline font-semibold">{t('reptileEditModal.subscription', 'abbonamento')}</Link>.
                         </p>
                      )}
                      { userLimits.publicReptiles > 0 && userLimits.publicReptiles !== Infinity && (
                         <p className="mt-2 text-xs text-blue-600">
                           {t('reptileEditModal.publicLimit', 'Puoi pubblicare fino a {{count}} rettili con il tuo piano {{plan}}.', { count: userLimits.publicReptiles, plan: userLimits.plan })}
                         </p>
                      )}

                    </div>

                    {/* SEZIONE PREZZO */}
                     <div className={sectionClasses}>
                        <h3 className={sectionTitleClasses}>
                          <TagIcon className="w-6 h-6 text-emerald-600" /> {t('reptileEditModal.reptile.price')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4"> {/* Usato md:grid-cols-3 per allineare con altre sezioni */}
                          <div>
                            <label className={labelClasses}>{t('reptileEditModal.reptile.priceAmount')}</label>
                            <input
                              type="number" min="0" step="0.01" value={formData.price.amount}
                              onChange={(e) => handlePriceChange(e, 'amount')} className={inputClasses}
                            />
                          </div>
                          <div>
                            <label className={labelClasses}>{t('reptileEditModal.reptile.priceCurrency')}</label>
                            <select
                              value={formData.price.currency} onChange={(e) => handlePriceChange(e, 'currency')}
                              className={inputClasses}
                            >
                              <option value="EUR">EUR</option>
                              <option value="USD">USD</option>
                              <option value="GBP">GBP</option>
                              <option value="JPY">JPY</option>
                              <option value="CHF">CHF</option>
                            </select>
                          </div>
                          {/* Colonna vuota per mantenere layout a 3 */}
                          <div></div>
                        </div>
                      </div>

                    {/* SEZIONE ALIMENTAZIONE */}
                    <div className={sectionClasses}>
                      <h3 className={sectionTitleClasses}>
                        🍽️ {t('reptileEditModal.reptile.feeding')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        <div>
                          <label className={labelClasses}>{t('reptileEditModal.reptile.foodType')}</label>
                          <select
                            name="foodType" value={formData.foodType} onChange={handleChange}
                             className={`${inputClasses} ${errors.foodType ? "border-red-500" : ""}`}
                          >
                            <option value="">{t('reptileEditModal.reptile.selectFood')}</option>
                            {FOOD_TYPES.map(ft => (
                              <option key={ft.value} value={ft.value}>{t(ft.labelKey)}</option>
                            ))}
                          </select>
                          {errors.foodType && <p className="mt-1 text-xs text-red-600">{errors.foodType}</p>}
                        </div>
                        <div>
                          <label className={labelClasses}>{t('reptileEditModal.reptile.weightPerUnit')}</label>
                          <input
                             type="number" name="weightPerUnit" value={formData.weightPerUnit} onChange={handleChange}
                             className={`${inputClasses} ${errors.weightPerUnit ? "border-red-500" : ""}`}
                          />
                          {errors.weightPerUnit && <p className="mt-1 text-xs text-red-600">{errors.weightPerUnit}</p>}
                        </div>
                        <div>
                          <label className={labelClasses}>{t('reptileEditModal.reptile.nextMealDay')}</label>
                          <input
                            type="number" name="nextMealDay" value={formData.nextMealDay} onChange={handleChange}
                             className={`${inputClasses} ${errors.nextMealDay ? "border-red-500" : ""}`}
                          />
                          {errors.nextMealDay && <p className="mt-1 text-xs text-red-600">{errors.nextMealDay}</p>}
                        </div>
                      </div>
                    </div>

                    {/* SEZIONE IMMAGINI */}
                    <div className={sectionClasses}>
                      <h3 className={sectionTitleClasses}><PhotoIcon className="w-6 h-6 text-emerald-600" />{t('reptileEditModal.reptile.gallery')}</h3>
                      {existingImages.length > 0 && (
                        <div className="mt-4">
                          <label className={labelClasses}>{t('reptileEditModal.reptile.image')}</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-2">
                            {existingImages.map((imgPath, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={imgPath || 'https://res.cloudinary.com/dg2wcqflh/image/upload/v1757791253/Logo_duqbig.png'}
                                  alt={`Immagine ${index + 1}`}
                                  className="h-28 w-28 rounded-md object-cover border border-gray-200"
                                  onError={(e) => e.currentTarget.src = 'https://res.cloudinary.com/dg2wcqflh/image/upload/v1757791253/Logo_duqbig.png'}
                                />
                                <button type="button" onClick={() => openDeleteConfirmation(index)} className="absolute top-0 right-0 p-1.5 bg-red-600 text-white rounded-full transform -translate-y-1/2 translate-x-1/2 hover:bg-red-700 focus:outline-none">
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-6">
                        <label className={labelClasses}>{t('reptileEditModal.reptile.addImage')}</label>
                        <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                          <div className="text-center">
                            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-emerald-600 hover:text-emerald-500"><input id="file-upload" name="image" type="file" className="sr-only" multiple accept="image/*" onChange={handleFileChange} /><span>{t('reptileEditModal.reptile.file')}</span></label>
                            <p className="pl-1 inline">{t('reptileEditModal.reptile.drag')}</p>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF</p>
                          </div>
                        </div>
                      </div>
                      {newImagePreviews.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {newImagePreviews.map((previewUrl, index) => (
                            <div key={index} className="relative group">
                              <img src={previewUrl} alt={`Anteprima ${index + 1}`} className="h-28 w-28 rounded-md object-cover" />
                              <button type="button" onClick={() => removeNewImage(index)} className="absolute top-0 right-0 p-1.5 bg-gray-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform -translate-y-1/2 translate-x-1/2 hover:bg-black focus:outline-none">
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SEZIONE PARENTI */}
                    <div className={sectionClasses}>
                      <h3 className={sectionTitleClasses}><UsersIcon className="w-6 h-6 text-emerald-600" /> {t('reptileEditModal.reptile.parent')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div>
                           <label className={labelClasses}>{t('reptileEditModal.reptile.father')}</label>
                           <input
                            type="text" name="father" value={formData.parents.father} onChange={handleParentChange}
                             className={`${inputClasses} ${errors.father ? "border-red-500" : ""}`}
                           />
                          {errors.father && <p className="mt-1 text-xs text-red-600">{errors.father}</p>}
                        </div>
                        <div>
                           <label className={labelClasses}>{t('reptileEditModal.reptile.mother')}</label>
                           <input
                            type="text" name="mother" value={formData.parents.mother} onChange={handleParentChange}
                             className={`${inputClasses} ${errors.mother ? "border-red-500" : ""}`}
                           />
                          {errors.mother && <p className="mt-1 text-xs text-red-600">{errors.mother}</p>}
                        </div>
                      </div>
                    </div>

                    {/* SEZIONE DOCUMENTI */}
                    <div className={sectionClasses}>
                      <h3 className={sectionTitleClasses}><DocumentTextIcon className="w-6 h-6 text-emerald-600" /> {t('reptileEditModal.reptile.documents')}</h3>
                      {/* Riga 1 Docs: CITES Info */}
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4 mt-4">
                        <div>
                           <label className={labelClasses}>{t('reptileEditModal.reptile.numberCites')}</label>
                           <input
                            type="text" onChange={(e) => handleNestedChange(e, 'documents', 'cites', 'number')}
                            value={formData.documents.cites.number} className={`${inputClasses} ${errors.citesNumber ? "border-red-500" : ""}`}
                           />
                          {errors.citesNumber && <p className="mt-1 text-xs text-red-600">{errors.citesNumber}</p>}
                        </div>
                        <div>
                           <label className={labelClasses}>{t('reptileEditModal.reptile.dateCites')}</label>
                           <input
                            type="date" onChange={(e) => handleNestedChange(e, 'documents', 'cites', 'issueDate')}
                             value={formData.documents.cites.issueDate} className={`${inputClasses} ${errors.citesIssueDate ? "border-red-500" : ""}`}
                           />
                          {errors.citesIssueDate && <p className="mt-1 text-xs text-red-600">{errors.citesIssueDate}</p>}
                        </div>
                        <div>
                           <label className={labelClasses}>{t('reptileEditModal.reptile.issuing')}</label>
                           <input
                            type="text" onChange={(e) => handleNestedChange(e, 'documents', 'cites', 'issuer')}
                             value={formData.documents.cites.issuer} className={`${inputClasses} ${errors.citesIssuer ? "border-red-500" : ""}`}
                           />
                          {errors.citesIssuer && <p className="mt-1 text-xs text-red-600">{errors.citesIssuer}</p>}
                        </div>
                       </div>
                       {/* Riga 2 Docs: CITES Load/Unload */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
                        <div>
                           <label className={labelClasses}>{t('reptileEditModal.reptile.loadCites')}</label>
                           <input
                            type="text" onChange={(e) => handleNestedChange(e, 'documents', 'cites', 'load')}
                            value={formData.documents.cites.load} className={`${inputClasses} ${errors.citesLoad ? "border-red-500" : ""}`}
                           />
                          {errors.citesLoad && <p className="mt-1 text-xs text-red-600">{errors.citesLoad}</p>}
                        </div>
                        <div>
                           <label className={labelClasses}>{t('reptileEditModal.reptile.unloadCites')}</label>
                           <input
                            type="text" onChange={(e) => handleNestedChange(e, 'documents', 'cites', 'unload')}
                             value={formData.documents.cites.unload} className={`${inputClasses} ${errors.citesUnload ? "border-red-500" : ""}`}
                           />
                          {errors.citesUnload && <p className="mt-1 text-xs text-red-600">{errors.citesUnload}</p>}
                        </div>
                       </div>
                       {/* Riga 3 Docs: Microchip */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4 pt-4 border-t border-gray-200">
                        <div>
                           <label className={labelClasses}>{t('reptileEditModal.reptile.microchip')}</label>
                           <input
                            type="text" onChange={(e) => handleNestedChange(e, 'documents', 'microchip', 'code')}
                             value={formData.documents.microchip.code} className={`${inputClasses} ${errors.microchipCode ? "border-red-500" : ""}`}
                           />
                          {errors.microchipCode && <p className="mt-1 text-xs text-red-600">{errors.microchipCode}</p>}
                        </div>
                        <div>
                           <label className={labelClasses}>{t('reptileEditModal.reptile.dateMicrochip')}</label>
                           <input
                             type="date" onChange={(e) => handleNestedChange(e, 'documents', 'microchip', 'implantDate')}
                             value={formData.documents.microchip.implantDate} className={`${inputClasses} ${errors.microchipDate ? "border-red-500" : ""}`}
                           />
                          {errors.microchipDate && <p className="mt-1 text-xs text-red-600">{errors.microchipDate}</p>}
                        </div>
                       </div>
                    </div>

                    {/* SEZIONE ETICHETTA */}
                    <div className={sectionClasses}>
                      <h3 className={sectionTitleClasses}><TagIcon className="w-6 h-6 text-emerald-600" />{t('reptileEditModal.reptile.label')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 items-center">
                        <div className="md:col-span-2">
                          <label className={labelClasses}>{t('reptileEditModal.reptile.labelText')}</label>
                          <input type="text" maxLength={15} value={label.text} onChange={(e) => setLabel({ ...label, text: e.target.value })} placeholder={t('reptileEditModal.reptile.labelEs')} className={inputClasses} />
                        </div>
                        <div>
                          <label className={labelClasses}>{t('reptileEditModal.reptile.colorLabel')}</label>
                          <input type="color" value={label.color} onChange={(e) => setLabel({ ...label, color: e.target.value })} className="w-full h-10 p-1 bg-white border border-gray-300 rounded-md cursor-pointer" />
                        </div>
                      </div>
                    </div>

                     {/* SEZIONE NOTE */}
                     <div className={sectionClasses}>
                       <h3 className={sectionTitleClasses}>📝 {t('reptileEditModal.reptile.note')}</h3> {/* Icona + Titolo */}
                       <div className="mt-4">
                         <textarea
                           name="notes" rows={4} value={formData.notes} onChange={handleChange}
                            className={`${inputClasses} ${errors.notes ? "border-red-500" : ""}`}
                         />
                         {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
                       </div>
                     </div>

                    {/* SEZIONE ARCHIVIO / STATO */}
                    <div className={`${sectionClasses} border-amber-300 bg-amber-50/50`}>
                      <h3 className={`${sectionTitleClasses} text-amber-800`}><ArchiveBoxIcon className="w-6 h-6 text-amber-600" /> {t('reptileEditModal.archive.title')}</h3>
                      <div className="mt-4">
                        <label className={labelClasses}>{t('reptileEditModal.archive.status')}</label>
                        <select name="status" value={formData.status} onChange={handleChange} className={inputClasses}>
                          <option value="active">{t('reptileEditModal.archive.statusActive')}</option>
                          <option value="ceded">{t('reptileEditModal.archive.statusCeded')}</option>
                          <option value="deceased">{t('reptileEditModal.archive.statusDeceased')}</option>
                          <option value="other">{t('reptileEditModal.archive.statusOther')}</option>
                        </select>
                      </div>

                      {/* Campi Condizionali per CEDUTO */}
                      {formData.status === 'ceded' && (
                        <div className="mt-4 pt-4 border-t border-amber-200 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          <div>
                            <label className={labelClasses}>{t('reptileEditModal.archive.cededName')}</label>
                            <input type="text" value={formData.cededTo.name} onChange={(e) => handleSubObjectChange(e, 'cededTo', 'name')} className={inputClasses} />
                          </div>
                          <div>
                            <label className={labelClasses}>{t('reptileEditModal.archive.cededSurname')}</label>
                            <input type="text" value={formData.cededTo.surname} onChange={(e) => handleSubObjectChange(e, 'cededTo', 'surname')} className={inputClasses} />
                          </div>
                          <div className="md:col-span-2">
                            <label className={labelClasses}>{t('reptileEditModal.archive.cededNotes')}</label>
                            <textarea rows={2} value={formData.cededTo.notes} onChange={(e) => handleSubObjectChange(e, 'cededTo', 'notes')} className={inputClasses} />
                          </div>
                          <div>
                            <label className={labelClasses}>{t('reptileEditModal.archive.cededDate')}</label>
                            <input type="date" value={formData.cededTo.date} onChange={(e) => handleSubObjectChange(e, 'cededTo', 'date')} className={`${inputClasses} ${errors.cededDate ? "border-red-500" : ""}`} />
                            {errors.cededDate && <p className="mt-1 text-xs text-red-600">{errors.cededDate}</p>}
                          </div>
                        </div>
                      )}

                      {/* Campi Condizionali per DECEDUTO */}
                      {formData.status === 'deceased' && (
                        <div className="mt-4 pt-4 border-t border-amber-200 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          <div className="md:col-span-2">
                            <label className={labelClasses}>{t('reptileEditModal.archive.deceasedNotes')}</label>
                            <textarea rows={2} value={formData.deceasedDetails.notes} onChange={(e) => handleSubObjectChange(e, 'deceasedDetails', 'notes')} className={inputClasses} />
                          </div>
                          <div>
                            <label className={labelClasses}>{t('reptileEditModal.archive.deceasedDate')}</label>
                            <input type="date" value={formData.deceasedDetails.date} onChange={(e) => handleSubObjectChange(e, 'deceasedDetails', 'date')} className={`${inputClasses} ${errors.deceasedDate ? "border-red-500" : ""}`} />
                            {errors.deceasedDate && <p className="mt-1 text-xs text-red-600">{errors.deceasedDate}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                   {/* Toast Message */}
                  {/* Toast Message */}
  {toastMsg && (
    <div
      className={`w-full px-4 py-3 rounded-md text-sm font-medium shadow-lg mb-4 ${
        toastMsg.type === 'danger'
          ? 'bg-red-100 text-red-700 border border-red-300'
          : 'bg-green-100 text-green-700 border border-green-300'
      }`}
    >
      {toastMsg.text}
    </div>
  )}

                    {/* Area Pulsanti Azione */}
                    <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end gap-4">
                      <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none transition">Annulla</button>
                      <button type="submit" className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none disabled:bg-emerald-300 transition" disabled={loading}>
                        {loading ? t('reptileEditModal.common.saving') : t('reptileEditModal.common.saveChanges')}
                      </button>
                    </div>
                  </form>


                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};


export default ReptileEditModal;