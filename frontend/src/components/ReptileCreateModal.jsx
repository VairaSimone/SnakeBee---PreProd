import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import api from '../services/api';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/userSlice';
import { PhotoIcon, IdentificationIcon, UsersIcon, DocumentTextIcon, XMarkIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const ReptileCreateModal = ({ show, handleClose, setReptiles, onSuccess }) => {
 const user = useSelector(selectUser);
  const [loading, setLoading] = useState(false);
    const { t } = useTranslation();
  const [formErrors, setFormErrors] = useState({});
  const [toastMsg, setToastMsg] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  
  const initialFormData = {
    name: '',
    species: '',
    morph: '',
    image: [],
    birthDate: '',
    sex: '',
    isBreeder: false,
    notes: '',
    parents: { father: '', mother: '' },
    documents: {
      cites: { number: '', issueDate: '', issuer: '' },
      microchip: { code: '', implantDate: '' },
    },
  };

  const [formData, setFormData] = useState(initialFormData);
  const inputClasses = "w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition";

  const inputSmall = inputClasses + " text-sm";
  
    const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setFormErrors({});
    setImagePreviews([]);
    setToastMsg(null);
  }, []);
  
  
    useEffect(() => {
    if (show) {
      resetForm();
    }
  }, [show, resetForm]);
  
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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
  }

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
  const file = e.target.files[0]; 
  if (file) {
    setFormData({ ...formData, image: [file] });
    const preview = URL.createObjectURL(file);
    setImagePreviews([preview]); 
  }
};
  const removeImage = (index) => {
    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]); 
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
    const newImages = [...formData.image];
    newImages.splice(index, 1);
    setFormData({...formData, image: newImages});
  }

  useEffect(() => {
    if (show) {
      setFormData({
        name: '', species: '', morph: '', image: [],
        birthDate: '', sex: '', isBreeder: false, notes: '', parents: { father: '', mother: '' },
        documents: {
          cites: { number: '', issueDate: '', issuer: '' },
          microchip: { code: '', implantDate: '' }
        }
      });
      setFormErrors({});
      setToastMsg(null);
    }
  }, [show]);


  const validateForm = () => {
    const errors = {};
    const today = new Date();
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 100);
    if (!formData.species.trim()) errors.species = t('ReptileCreateModal.validation.speciesRequired');
    if (!formData.sex) errors.sex = t('ReptileCreateModal.validation.sexRequired');
    if (formData.birthDate) {
      const birth = new Date(formData.birthDate);

      if (birth > today) {
        errors.birthDate = t('ReptileCreateModal.validation.birthFuture');
      } else if (birth < minDate) {
        errors.birthDate = t('ReptileCreateModal.validation.birthTooOld');
      }
    }


    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) return setFormErrors(errors);

    setLoading(true);
    const formDataToSend = new FormData();

    Object.entries(formData).forEach(([key, val]) => {
      if (key === 'image') {
        val.forEach(file => formDataToSend.append('image', file));
      } else if (key === 'parents' || key === 'documents') {
        formDataToSend.append(key, JSON.stringify(val));
      } else {
        formDataToSend.append(key, val);
      }
    });

    formDataToSend.append('user', user._id);

    try {
      const { data } = await api.post('/reptile/', formDataToSend, { headers: { 'Content-Type': 'multipart/form-data' } });
      setToastMsg({ type: 'success', text: t('ReptileCreateModal.messages.success')});
      setReptiles((prev) => [...prev, data]);
      if (onSuccess) onSuccess(data);
      handleClose();
    } catch (err) {
      let msg = t('ReptileCreateModal.messages.error');
      if (err.response) {
        if (err.response.data?.message) {
          msg = err.response.data.message;
        } else if (typeof err.response.data === 'string') {
          msg = err.response.data;
        }
      } else if (err.message) {
        msg = err.message;
      }
      setToastMsg({ type: 'danger', text: msg });
    } finally {
      setLoading(false);
    }
  };
  const labelClasses = "block text-sm font-medium text-gray-600 mb-1";
  const sectionTitleClasses = "text-lg font-semibold text-gray-800 flex items-center gap-2";
  const sectionClasses = "bg-white p-6 rounded-lg shadow-sm border border-gray-200";
  const errorTextClasses = "flex items-center gap-1 mt-1 text-sm text-red-600";

  return (
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
                      {t('ReptileCreateModal.modal.title')}
                    </Dialog.Title>
                    <button onClick={handleClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition">
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="mt-6 space-y-6">

                  <div className={sectionClasses}>
                    <h3 className={sectionTitleClasses}>
                      <IdentificationIcon className="w-6 h-6 text-emerald-600" />
                     {t('ReptileCreateModal.sections.mainData')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mt-4">
                      <div>
                        <label htmlFor="name" className={labelClasses}>{t('ReptileCreateModal.fields.name')}</label>
                        <input id="name" type="text" name="name" value={formData.name} onChange={handleChange} className={inputClasses} placeholder="Es. Spike"/>
                      </div>
                      <div>
                        <label htmlFor="species" className={labelClasses}>{t('ReptileCreateModal.fields.species')}<span className="text-red-500">*</span></label>
                        <input id="species" type="text" name="species" value={formData.species} onChange={handleChange} className={`${inputClasses} ${formErrors.species && 'border-red-500'}`} placeholder={t('ReptileCreateModal.fields.speciesPlaceholder')}/>
                        {formErrors.species && <p className={errorTextClasses}><ExclamationCircleIcon className='w-4 h-4'/>{formErrors.species}</p>}
                      </div>
                      <div>
                        <label htmlFor="morph" className={labelClasses}>{t('ReptileCreateModal.fields.morph')}</label>
                        <input id="morph" type="text" name="morph" value={formData.morph} onChange={handleChange} className={inputClasses} placeholder={t('ReptileCreateModal.fields.morphPlaceholder')}/>
                      </div>
                      <div>
                        <label htmlFor="birthDate" className={labelClasses}>{t('ReptileCreateModal.fields.birthDate')}</label>
                        <input id="birthDate" type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className={inputClasses}/>
                      </div>
                      <div>
                        <label htmlFor="sex" className={labelClasses}>{t('ReptileCreateModal.fields.sex')} <span className="text-red-500">*</span></label>
                        <select id="sex" name="sex" value={formData.sex} onChange={handleChange} className={`${inputClasses} ${formErrors.sex && 'border-red-500'}`}>
                          <option value="M">{t('ReptileCreateModal.fields.sexMale')}</option>
                          <option value="F">{t('ReptileCreateModal.fields.sexFemale')}</option>
                        </select>
                        {formErrors.sex && <p className={errorTextClasses}><ExclamationCircleIcon className='w-4 h-4'/>{formErrors.sex}</p>}
                      </div>
                      <div className="flex items-center justify-start mt-4 md:mt-6">
                        <input id="isBreeder" type="checkbox" name="isBreeder" checked={formData.isBreeder} onChange={handleChange} className="w-4 h-4 accent-emerald-600 rounded focus:ring-emerald-500"/>
                        <label htmlFor="isBreeder" className="ml-2 text-sm text-gray-700">{t('ReptileCreateModal.fields.isBreeder')}</label>
                      </div>
                    </div>
                    <div className="mt-4">
                        <label htmlFor="notes" className={labelClasses}>{t('ReptileCreateModal.fields.notes')}</label>
                        <textarea id="notes" name="notes" rows={3} value={formData.notes} onChange={handleChange} className={inputClasses} placeholder={t('ReptileCreateModal.fields.notesPlaceholder')}/>
                    </div>
                  </div>

                  <div className={sectionClasses}>
                    <h3 className={sectionTitleClasses}>
                      <PhotoIcon className="w-6 h-6 text-emerald-600" />
                      {t('ReptileCreateModal.sections.images')}
                    </h3>
                    <div className="mt-4">
                      <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                          <div className="text-center">
                              <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                              <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-emerald-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2 hover:text-emerald-500">
                                      <span>{t('ReptileCreateModal.fields.fileUpload')}</span>
                                      <input id="file-upload" name="image" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                  </label>
                                  <p className="pl-1">{t('ReptileCreateModal.fields.fileOrDrag')}</p>
                              </div>
                              <p className="text-xs leading-5 text-gray-500">{t('ReptileCreateModal.fields.fileFormats')}</p>
                          </div>
                      </div>
                    </div>
                    {imagePreviews.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {imagePreviews.map((previewUrl, index) => (
                                <div key={index} className="relative group">
                                    <img src={previewUrl} alt={`Anteprima ${index + 1}`} className="h-28 w-28 rounded-md object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>

                  <div className={sectionClasses}>
                    <h3 className={sectionTitleClasses}>
                      <UsersIcon className="w-6 h-6 text-emerald-600" />
                      {t('ReptileCreateModal.sections.parents')}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="father" className={labelClasses}>{t('ReptileCreateModal.fields.father')}</label>
                        <input id="father" type="text" name="father" value={formData.parents.father} onChange={handleParentChange} className={inputClasses} placeholder={t('ReptileCreateModal.fields.fatherPlaceholder')}/>
                      </div>
                      <div>
                        <label htmlFor="mother" className={labelClasses}>{t('ReptileCreateModal.fields.mother')}</label>
                        <input id="mother" type="text" name="mother" value={formData.parents.mother} onChange={handleParentChange} className={inputClasses} placeholder={t('ReptileCreateModal.fields.motherPlaceholder')}/>
                      </div>
                    </div>
                  </div>

                  <div className={sectionClasses}>
                    <h3 className={sectionTitleClasses}>
                      <DocumentTextIcon className="w-6 h-6 text-emerald-600" />
                      {t('ReptileCreateModal.sections.documents')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mt-4">
                       <div>
                          <label className={labelClasses}>{t('ReptileCreateModal.fields.citesNumber')}</label>
                          <input type="text" onChange={(e) => handleNestedChange(e, 'documents', 'cites', 'number')} value={formData.documents.cites.number} className={inputClasses} />
                       </div>
                       <div>
                          <label className={labelClasses}>{t('ReptileCreateModal.fields.citesIssueDate')}</label>
                          <input type="date" onChange={(e) => handleNestedChange(e, 'documents', 'cites', 'issueDate')} value={formData.documents.cites.issueDate} className={inputClasses} />
                       </div>
                       <div>
                          <label className={labelClasses}>{t('ReptileCreateModal.fields.citesIssuer')}</label>
                          <input type="text" onChange={(e) => handleNestedChange(e, 'documents', 'cites', 'issuer')} value={formData.documents.cites.issuer} className={inputClasses} />
                       </div>
                       <div>
                          <label className={labelClasses}>{t('ReptileCreateModal.fields.microchipCode')}</label>
                          <input type="text" onChange={(e) => handleNestedChange(e, 'documents', 'microchip', 'code')} value={formData.documents.microchip.code} className={inputClasses} />
                       </div>
                       <div>
                          <label className={labelClasses}>{t('ReptileCreateModal.fields.microchipDate')}</label>
                          <input type="date" onChange={(e) => handleNestedChange(e, 'documents', 'microchip', 'implantDate')} value={formData.documents.microchip.implantDate} className={inputClasses} />
                       </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end gap-4">
                    <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500 transition">
                      {t('ReptileCreateModal.modal.cancel')}
                    </button>
                    <button type="submit" className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 disabled:bg-emerald-300 transition" disabled={loading}>
                      {loading ? t('ReptileCreateModal.modal.saving') : t('ReptileCreateModal.modal.save')}
                    </button>
                  </div>
                </form>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ReptileCreateModal;
