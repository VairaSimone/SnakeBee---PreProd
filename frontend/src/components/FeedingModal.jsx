import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import api from '../services/api';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';

// Schema di validazione con Yup
const validationSchema = Yup.object().shape({
  date: Yup
    .date()
    .max(new Date(), 'Non puoi selezionare una data futura')
    .required('Data obbligatoria'),

  foodType: Yup
    .string()
    .required('Seleziona un alimento'),

customFoodType: Yup.string().when('foodType', (foodType, schema) =>
  foodType === 'Altro'
    ? schema.required('Inserisci tipo di alimento')
    : schema.notRequired()
),

customWeight: Yup.number()
  .transform((val, orig) => (orig === '' ? undefined : val))
  .when('foodType', {
    is: 'Altro',
    then: (schema) =>
      schema
        .typeError('Inserisci un numero valido')
        .required('Inserisci il peso per unità')
        .positive('Deve essere positivo'),
    otherwise: (schema) => schema.notRequired(),
  }),

customWeightUnit: Yup.string().when('foodType', {
  is: 'Altro',
  then: (schema) =>
    schema
      .required('Seleziona unità di misura')
      .oneOf(['g', 'kg'], 'Unità non valida'),
  otherwise: (schema) => schema.notRequired(),
}),
  quantity: Yup.number()
    .transform((val, orig) => (orig === '' ? undefined : val))
    .typeError('Inserisci un numero valido')
    .positive('Deve essere positivo')
    .required('Quantità obbligatoria'),  // trasformiamo i valori stringa "true"/"false" in Boolean
  wasEaten: Yup
    .boolean()
    .transform((val, orig) => {
      if (orig === 'true') return true;
      if (orig === 'false') return false;
      return val;
    })
    .required(),

  retryAfterDays: Yup
    .number()
    .transform((val, orig) => orig === '' ? undefined : val)
    .when('wasEaten', (wasEaten, schema) =>
      wasEaten === false
        ? schema
            .typeError('Inserisci un numero valido')
            .required('Giorni obbligatori')
            .positive('Deve essere positivo')
        : schema.notRequired()
    ),

  notes: Yup
    .string()
    .max(300, 'Massimo 300 caratteri'),
});
const FeedingModal = ({ show, handleClose, reptileId, onFeedingAdded, onSuccess }) => {
  const [feedings, setFeedings] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [inventory, setInventory] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  // React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      date: '',
      foodType: '',
      customFoodType: '',
      customWeight: '',
      customWeightUnit: 'g',
      quantity: '',
      wasEaten: true,
      retryAfterDays: '',
      notes: '',
    },
    resolver: yupResolver(validationSchema)
  });

  const notesValue = watch('notes') || '';
  const foodTypeValue = watch('foodType');
  const customWeightUnit = watch('customWeightUnit');
  const dateValue = watch('date');

  const todayString = new Date().toISOString().split('T')[0];
// Cancella un feeding e ricarica la lista
const handleDelete = async (feedingId) => {
  setIsSubmitting(true);
  try {
    // endpoint DELETE: /feedings/:feedingId
    await api.delete(`/feedings/${feedingId}`);
    // ricarica cronologia e inventario
    await fetchFeedings(page);
    await fetchInventory();
  } catch (err) {
    console.error('Errore durante l\'eliminazione:', err);
  } finally {
    setIsSubmitting(false);
  }
};

  const fetchInventory = async () => {
    try {
      const { data } = await api.get('/inventory');
      setInventory(data);
    } catch (err) {
      console.error('Errore caricamento inventario:', err);
    }
  };

  const fetchFeedings = async (pageToFetch) => {
    try {
      const { data } = await api.get(`/feedings/${reptileId}?page=${pageToFetch}`);
      setFeedings(data.dati);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Errore nel caricare i pasti:', err);
    }
  };

  // Quando apro il modal o cambio page
  useEffect(() => {
    if (show && reptileId) {
      fetchFeedings(page);
      fetchInventory();
    }
  }, [show, reptileId, page]);

  const onSubmit = async (formData) => {
     if (!formData.foodType) {
    setSubmissionError("Seleziona un alimento prima di procedere");
    return;
  }

    // Determino peso/unità
    const isCustom = formData.foodType === 'Altro';
    let weightPerUnit;
    let foodType;
    if (isCustom) {
          if (!formData.customFoodType) {
      setSubmissionError("Inserisci tipo di alimento personalizzato");
      return;
    }
      foodType = formData.customFoodType;
      const w = parseFloat(formData.customWeight);
      weightPerUnit = formData.customWeightUnit === 'kg' ? w * 1000 : w;
    } else {
    const item = inventory.find(i => i._id === formData.foodType);
    if (!item) {
      setSubmissionError("Alimento selezionato non valido");
      return;
    }
        setIsSubmitting(true);
    setSubmissionError('');

    foodType = item.foodType;
    weightPerUnit = item.weightPerUnit;    }

    const payload = {
      date: formData.date,
      foodType,
      quantity: parseInt(formData.quantity, 10),
      wasEaten: formData.wasEaten,
      retryAfterDays: formData.wasEaten ? undefined : parseInt(formData.retryAfterDays, 10),
      weightPerUnit,
      notes: formData.notes || undefined,
    };

    try {
      await api.post(`/feedings/${reptileId}`, payload);
      await fetchFeedings(page);
      await fetchInventory();
      reset(); // reset form
      onSuccess?.();
      onFeedingAdded?.();
    } catch (err) {
      console.error("Errore nell'invio:", err);
      setSubmissionError('Errore nell\'aggiungere il pasto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition show={show} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        {/* overlay */}
        <Transition.Child /* ... */>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        {/* panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child /* ... */>
              <Dialog.Panel className="w-full max-w-4xl bg-white p-6 rounded-2xl shadow-xl">
                <Dialog.Title className="text-lg font-semibold">Gestione Pasti</Dialog.Title>
                <button onClick={handleClose} className="absolute top-4 right-4 text-xl">&times;</button>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Date */}
                    <div>
                      <input
                        type="date"
                        {...register('date')}
                        max={todayString}
                        disabled={isSubmitting}
                        className={inputClasses}
                      />
                      {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
                    </div>

                    {/* Food type */}
                    <div>
                      <select
                        {...register('foodType')}
                        disabled={isSubmitting}
                        className={inputClasses}
                      >
                        <option value="">-- Seleziona alimento --</option>
                        {inventory.map(item => (
                          <option key={item._id} value={item._id}>
                            {item.foodType} ({item.quantity}× – {item.weightPerUnit}g)
                          </option>
                        ))}
                        <option value="Altro">Non scegliere inventario</option>
                      </select>
                      {errors.foodType && <p className="text-red-500 text-sm">{errors.foodType.message}</p>}
                    </div>

                    {/* Campo custom */}
                    {foodTypeValue === 'Altro' && (
                      <>
                        <div>
                          <input
                            type="text"
                            {...register('customFoodType')}
                            disabled={isSubmitting}
                            className={inputClasses}
                            placeholder="Scrivi tipo di alimento"
                          />
                          {errors.customFoodType && <p className="text-red-500 text-sm">{errors.customFoodType.message}</p>}
                        </div>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            {...register('customWeight')}
                            disabled={isSubmitting}
                            className={inputClasses}
                            placeholder="Peso per unità"
                          />
                          <select
                            {...register('customWeightUnit')}
                            disabled={isSubmitting}
                            className={inputClasses}
                          >
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                          </select>
                        </div>
                        {errors.customWeight && <p className="text-red-500 text-sm">{errors.customWeight.message}</p>}
                      </>
                    )}

                    {/* Quantità */}
                    <div>
                      <input
                        type="number"
                        {...register('quantity')}
                        disabled={isSubmitting}
                        className={inputClasses}
                        placeholder="Quantità"
                      />
                      {errors.quantity && <p className="text-red-500 text-sm">{errors.quantity.message}</p>}
                    </div>

                    {/* Radio wasEaten */}
                    <div className="md:col-span-2">
                      <label className="block mb-1">L'animale ha mangiato?</label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="true"
                            {...register('wasEaten')}
                            disabled={isSubmitting}
                          />
                          <span className="ml-2">Sì</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="false"
                            {...register('wasEaten')}
                            disabled={isSubmitting}
                          />
                          <span className="ml-2">No</span>
                        </label>
                      </div>
                    </div>

                    {/* retryAfterDays */}
                    {!watch('wasEaten') && (
                      <div>
                        <input
                          type="number"
                          {...register('retryAfterDays')}
                          disabled={isSubmitting}
                          className={inputClasses}
                          placeholder="Riprova tra (giorni)"
                        />
                        {errors.retryAfterDays && <p className="text-red-500 text-sm">{errors.retryAfterDays.message}</p>}
                      </div>
                    )}

                    {/* Note con counter */}
                    <div className="md:col-span-2">
                      <textarea
                        rows={3}
                        {...register('notes')}
                        disabled={isSubmitting}
                        className={inputClasses}
                        placeholder="Note (max 300 caratteri)"
                      />
                      <div className="text-right text-sm text-gray-500">
                        {notesValue.length}/300
                      </div>
                      {errors.notes && <p className="text-red-500 text-sm">{errors.notes.message}</p>}
                    </div>
                  </div>

                  {/* Pulsante con spinner e disable */}
                  <div className="text-right">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#228B22] text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Caricamento...' : 'Aggiungi Pasto'}
                    </button>
                  </div>
                  {submissionError && <p className="text-red-500 text-center mt-2">{submissionError}</p>}
                </form>

                {/* Cronologia e paginazione (stessi markup) */}
                {/* ——— CRONOLOGIA PASTI ——— */}
<h3 className="text-xl font-semibold mt-10 mb-4 text-gray-800">Cronologia Pasti</h3>
<div className="overflow-auto text-sm max-h-64 md:max-h-80 border rounded-md">
  <table className="w-full border text-gray-800">
    <thead className="bg-gray-100">
      <tr>
        <th className="p-2">Data</th>
        <th className="p-2">Cibo</th>
        <th className="p-2">Quantità</th>
        <th className="p-2">Prossimo Pasto</th>
        <th className="p-2">Note</th>
        <th className="p-2">Esito</th>
        <th className="p-2">Azioni</th>
      </tr>
    </thead>
    <tbody>
      {feedings.length === 0 ? (
        <tr>
          <td colSpan="7" className="p-4 text-center text-gray-500">
            Nessun pasto trovato
          </td>
        </tr>
      ) : (
        feedings.map(f => (
          <tr key={f._id} className="odd:bg-white even:bg-gray-50">
            <td className="p-2 whitespace-nowrap">
              {new Date(f.date).toLocaleDateString()}
            </td>
            <td className="p-2 whitespace-nowrap">{f.foodType}</td>
            <td className="p-2">
              {f.quantity
                ? `${f.quantity} × ${
                    f.weightPerUnit >= 1000
                      ? `${(f.weightPerUnit / 1000).toFixed(2)} kg`
                      : `${f.weightPerUnit} g`
                  }`
                : '—'}
            </td>
            <td className="p-2 whitespace-nowrap">
              {new Date(f.nextFeedingDate).toLocaleDateString()}
            </td>
            <td className="p-2 max-w-xs truncate" title={f.notes || ''}>
              {f.notes || '—'}
            </td>
            <td className="p-2">
              {f.wasEaten ? (
                <span className="text-green-600 font-semibold">✅ Mang.</span>
              ) : (
                <span className="text-red-500 font-semibold">❌ Fallito</span>
              )}
            </td>
            <td className="p-2">
              <button
                onClick={() => handleDelete(f._id)}
                className="text-red-500 hover:text-red-700 font-semibold"
                disabled={isSubmitting}
              >
                Elimina
              </button>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

{/* ——— PAGINAZIONE ——— */}
<div className="flex justify-center mt-6 space-x-2 flex-wrap">
  {Array.from({ length: totalPages }, (_, i) => (
    <button
      key={i}
      onClick={() => setPage(i + 1)}
      className={`px-3 py-1 rounded ${
        page === i + 1
          ? 'bg-yellow-400 font-bold text-gray-800'
          : 'bg-gray-200 hover:bg-gray-300'
      }`}
      disabled={isSubmitting}
    >
      {i + 1}
    </button>
  ))}
</div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default FeedingModal;

// Nota: definisci `inputClasses` come prima
const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#228B22] focus:border-[#228B22] bg-white text-gray-800 text-sm";
