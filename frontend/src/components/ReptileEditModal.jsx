import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import api from '../services/api';

const ReptileEditModal = ({ show, handleClose, reptile, setReptiles, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '', species: '', morph: '', image: '',
    birthDate: '', sex: '', isBreeder: false, notes: '', parents: { father: '', mother: '' },
    documents: {
      cites: { number: '', issueDate: '', issuer: '' },
      microchip: { code: '', implantDate: '' }
    }
  });
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [images, setImages] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [label, setLabel] = useState({ text: '', color: '#228B22' });
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    if (!reptile) return;
    const { parents = {}, documents = {} } = reptile;
    const { father, mother } = parents;
    const { cites = {}, microchip = {} } = documents;


    setFormData({
      name: reptile.name || '',
      species: reptile.species || '',
      morph: reptile.morph || '',
      birthDate: reptile.birthDate?.split('T')[0] || '',
      sex: reptile.sex || '',
      isBreeder: !!reptile.isBreeder,
      notes: reptile.notes || '',
      parents: {
        father:
          father != null && typeof father === 'object'
            ? father._id || ''
            : father || '',
        mother:
          mother != null && typeof mother === 'object'
            ? mother._id || ''
            : mother || '',
      },
      documents: {
        cites: {
          number: cites.number || '',
          issueDate: cites.issueDate ? cites.issueDate.split('T')[0] : '',
          issuer: cites.issuer || '',
        },
        microchip: {
          code: microchip.code || '',
          implantDate: microchip.implantDate
            ? microchip.implantDate.split('T')[0]
            : '',
        },
      }

    });
    setLabel(reptile.label || { text: '', color: '#228B22' });
    setExistingImages(reptile.image || []);
  }, [reptile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        setErrorMessage('Formato immagine non valido');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("L'immagine supera i 5MB");
        return false;
      }
      return true;
    });
    if (validFiles.length > 0) {
      setImages(validFiles);
      setErrorMessage('');
    }
  };


  const validateBirthDate = () => {
    const today = new Date();
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 100);

    const birth = new Date(formData.birthDate);
    if (birth > today) {
      setErrorMessage('La data di nascita non può essere nel futuro');
      return false;
    } else if (birth < minDate) {
      setErrorMessage('La data di nascita è troppo antica (max 100 anni fa)');
      return false;
    }

    return true;
  };
  const handleDeleteImage = async (index) => {
    const confirmDelete = window.confirm('Sei sicuro di voler eliminare questa immagine?');
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { data } = await api.delete(`/reptile/${reptile._id}/image/${index}`);
      setToastMsg({ type: 'success', text: 'Immagine eliminata con successo!' });
      setExistingImages(data.remainingImages);

      const updatedReptile = {
        ...reptile,
        image: data.remainingImages,
      };

      setReptiles((prev) => prev.map((r) => (r._id === updatedReptile._id ? updatedReptile : r)));
      onSuccess?.();
    } catch (err) {
      let msg = 'Errore durante l\'eliminazione dell\'immagine';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      setToastMsg({ type: 'danger', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToastMsg(null);
    setErrorMessage('');
    if (!validateBirthDate()) {
      setLoading(false);
      return;
    }
    try {
      const formDataToSubmit = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (['parents', 'documents'].includes(key)) return;
        formDataToSubmit.append(key, val);
      });
      formDataToSubmit.append('parents', JSON.stringify(formData.parents));
      formDataToSubmit.append('documents', JSON.stringify(formData.documents));

      formDataToSubmit.append('label', JSON.stringify(label));
      images.forEach(img => {
        formDataToSubmit.append('image', img);
      });
      const { data } = await api.put(`/reptile/${reptile._id}`, formDataToSubmit);
      setToastMsg({ type: 'success', text: 'Rettile aggiornato!' });
      setReptiles((prev) => prev.map((r) => (r._id === data._id ? data : r)));
      onSuccess?.();
      handleClose();
    } catch (err) {
      let msg = 'Errore durante la creazione del rettile';
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

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#228B22] focus:border-[#228B22] bg-white text-gray-800";
  const labelClasses = "block font-medium text-sm mb-1 text-gray-800";

  return (
    <Transition show={show} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment}
              enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title className="text-lg font-semibold text-gray-800">Modifica Rettile</Dialog.Title>

                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 text-gray-500 hover:text-red-600 text-xl"
                >
                  &times;
                </button>

                {errorMessage && <p className="text-red-600 mb-2 text-sm">{errorMessage}</p>}

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Nome</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Specie *</label>
                      <input type="text" name="species" value={formData.species} onChange={handleChange} className={inputClasses} required />
                    </div>
                    <div>
                      <label className={labelClasses}>Morph *</label>
                      <input type="text" name="morph" value={formData.morph} onChange={handleChange} className={inputClasses} required />
                    </div>
                    <div>
                      <label className={labelClasses}>Data di nascita *</label>
                      <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className={`${inputClasses} text-sm`} max={new Date().toISOString().split('T')[0]}
                        min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]} />
                    </div>
                    <div>
                      <label className={labelClasses}>Sesso *</label>
                      <select name="sex" value={formData.sex} onChange={handleChange} className={`${inputClasses} max-h-[48px] text-sm`}>
                        <option value="">Seleziona</option>
                        <option value="M">Maschio</option>
                        <option value="F">Femmina</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        name="isBreeder"
                        checked={formData.isBreeder}
                        onChange={handleChange}
                        className="w-4 h-4 accent-[#228B22] rounded focus:ring-[#228B22]"
                      />
                      <label className="text-sm text-gray-800">È un riproduttore</label>
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>Note</label>
                    <textarea name="notes" rows={2} value={formData.notes} onChange={handleChange} className={inputClasses} />
                  </div>

                  <div>
                    <label className={labelClasses}>Immagine</label>
                    <input type="file" accept="image/*" multiple onChange={handleFileChange} className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded file:bg-[#228B22] file:text-white file:rounded file:px-4 file:py-1" />

                  </div>
                  {existingImages && existingImages.length > 0 && (
                    <div className="mt-4">
                      <label className={labelClasses}>Immagini esistenti</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        {existingImages.map((imgPath, index) => {
                          const fullImageUrl = `${process.env.REACT_APP_BACKEND_URL_IMAGE}${imgPath}`;
                          return (
                            <div key={index} className="relative group">
                              <img
                                src={fullImageUrl}
                                alt={`image-${index}`}
                                className="rounded w-full h-32 object-cover border"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "/placeholder.jpg";
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteImage(index)}
                                className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-80 hover:opacity-100"
                              >
                                Elimina
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}


                  <hr className="my-4" />
                  <h3 className="text-md font-semibold text-gray-700">Genitori</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Morph Padre</label>
                      <input
                        type="text"
                        name="father"
                        value={formData.parents.father}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            parents: { ...formData.parents, father: e.target.value }
                          })
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Morph Madre</label>
                      <input
                        type="text"
                        name="mother"
                        value={formData.parents.mother}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            parents: { ...formData.parents, mother: e.target.value }
                          })
                        }
                        className={inputClasses}
                      />
                    </div>
                  </div>
                  <hr className="my-4" />
                  <h3 className="text-md font-semibold text-gray-700">Documenti</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Codice CITES</label>
                      <input
                        type="text"
                        name="citesNumber"
                        value={formData.documents.cites.number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            documents: {
                              ...formData.documents,
                              cites: { ...formData.documents.cites, number: e.target.value }
                            }
                          })
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Data rilascio CITES</label>
                      <input
                        type="date"
                        name="citesIssueDate"
                        value={formData.documents.cites.issueDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            documents: {
                              ...formData.documents,
                              cites: { ...formData.documents.cites, issueDate: e.target.value }
                            }
                          })
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Ente rilasciante</label>
                      <input
                        type="text"
                        name="citesIssuer"
                        value={formData.documents.cites.issuer}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            documents: {
                              ...formData.documents,
                              cites: { ...formData.documents.cites, issuer: e.target.value }
                            }
                          })
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Codice Microchip</label>
                      <input
                        type="text"
                        name="microchipCode"
                        value={formData.documents.microchip.code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            documents: {
                              ...formData.documents,
                              microchip: { ...formData.documents.microchip, code: e.target.value }
                            }
                          })
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Data impianto Microchip</label>
                      <input
                        type="date"
                        name="microchipDate"
                        value={formData.documents.microchip.implantDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            documents: {
                              ...formData.documents,
                              microchip: { ...formData.documents.microchip, implantDate: e.target.value }
                            }
                          })
                        }
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Etichetta (facoltativa)</label>
                      <input
                        type="text"
                        maxLength={15}
                        value={label.text}
                        onChange={(e) => setLabel({ ...label, text: e.target.value })}
                        placeholder="Es: Schivo.. Non ha mangiato.. dati"
                        className={inputClasses}
                      />
                      <p className="text-xs text-gray-500 mt-1">Max 15 caratteri</p>
                    </div>
                    {label.text && (
                      <button
                        type="button"
                        onClick={() => setLabel({ text: '', color: '#228B22' })}
                        className="text-red-500 text-sm mt-2 underline hover:text-red-700"
                      >
                        Rimuovi etichetta
                      </button>
                    )}

                    <div>
                      <label className={labelClasses}>Colore Etichetta</label>
                      <input
                        type="color"
                        value={label.color}
                        onChange={(e) => setLabel({ ...label, color: e.target.value })}
                        className="h-10 w-20 border-none p-0 bg-transparent"
                      />
                    </div>
                  </div>

                  <hr className="my-4" />

                  <div className="mt-6 text-right">
                    <button type="submit" className="bg-[#228B22] text-white px-4 py-2 rounded hover:bg-green-700" disabled={loading}>
                      {loading ? 'Salvataggio...' : 'Salva Rettile'}
                    </button>
                  </div>
                </form>

                {toastMsg && (
                  <p className={`mt-4 text-center text-sm ${toastMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{toastMsg.text}</p>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ReptileEditModal;
