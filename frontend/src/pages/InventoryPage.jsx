import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/userSlice';
import { useTranslation } from "react-i18next";
import { 
  FaPlus, FaPencilAlt, FaTrash, FaBoxOpen, FaLightbulb, 
  FaUtensils, FaChartLine, FaShoppingCart, FaTimes, 
  FaExclamationTriangle, FaSort, FaSortUp, FaSortDown
} from 'react-icons/fa';
import FeedingSuggestions from '../components/FeedingSuggestions';

const translateFoodType = (foodType, t) => {
  return t(`inventoryPage.${foodType}`, { defaultValue: foodType });
};

const InventoryPage = () => {
  const { t } = useTranslation();
  
  const [inventory, setInventory] = useState([]);
  const [formData, setFormData] = useState({ foodType: '', quantity: '', weightPerUnit: '', weightUnit: 'g' });
  const [editingId, setEditingId] = useState(null);
  const user = useSelector(selectUser);
  const [deleteId, setDeleteId] = useState(null); 
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [forecast, setForecast] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [analyticsError, setAnalyticsError] = useState('');
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);

  // NUOVO: Stato per l'ordinamento
  const [sortConfig, setSortConfig] = useState({ key: 'weightPerUnit', direction: 'desc' });

  const resetForm = () => {
    setFormData({ foodType: '', quantity: '', weightPerUnit: '', weightUnit: 'g' });
    setEditingId(null);
  };

  const fetchInventory = async () => {
    try {
      const { data } = await api.get('/inventory', { headers: { 'Cache-Control': 'no-cache' } });
      setInventory(data);
    } catch (err) {
      setErrorMessage(err.response?.status === 403 ? t('inventoryPage.accessDenied') : t('inventoryPage.fetchFailed'));
      setInventory([]);
    }
  };

  const fetchAnalytics = async () => {
    setIsAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const [forecastRes, recRes] = await Promise.all([
        api.get('/inventory/forecast'),
        api.get('/inventory/recommendations')
      ]);
      setForecast(forecastRes.data);
      setRecommendations(recRes.data);
    } catch (err) {
      setAnalyticsError(t('inventoryPage.analyticsFailed'));
    }
    setIsAnalyticsLoading(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchInventory();
      setIsLoading(false);
    };
    
    loadData();
    fetchAnalytics();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!user || !user._id) return;

    const weightInGrams = formData.weightUnit === 'kg' ? formData.weightPerUnit * 1000 : formData.weightPerUnit;
    const payload = { ...formData, weightPerUnit: weightInGrams };

    try {
      if (editingId) {
        await api.put(`/inventory/${editingId}`, payload);
      } else {
        await api.post('/inventory', payload);
      }
      resetForm();
      fetchInventory(); 
      fetchAnalytics();
    } catch (err) {
      setErrorMessage(err.response?.status === 403 ? t('inventoryPage.submitDenied') : t('inventoryPage.submitFailed', { message: err.message }));
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    const isKg = item.weightPerUnit >= 1000;
    setFormData({
      foodType: item.foodType,
      quantity: item.quantity,
      weightPerUnit: isKg ? (item.weightPerUnit / 1000) : item.weightPerUnit,
      weightUnit: isKg ? 'kg' : 'g',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/inventory/${deleteId}`);
      fetchInventory();
      fetchAnalytics();
    } catch (err) {
      setErrorMessage(t('inventoryPage.deleteFailed'));
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setDeleteId(null);
  };

  const formatWeight = (grams) => {
    if (!grams || isNaN(grams)) return '—';
    return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams} g`;
  };

  // NUOVO: Gestione dell'ordinamento
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedInventory = useMemo(() => {
    let sortableItems = [...inventory];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'foodType') {
          aValue = translateFoodType(aValue, t);
          bValue = translateFoodType(bValue, t);
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [inventory, sortConfig, t]);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="inline ml-1 text-slate-400" />;
    return sortConfig.direction === 'asc' ? <FaSortUp className="inline ml-1 text-emerald-600" /> : <FaSortDown className="inline ml-1 text-emerald-600" />;
  };

  // NUOVO: Logica per definire lo status delle scorte
  const getStockStatus = (item) => {
    const forecastItem = forecast.find(f => f.foodType === item.foodType && f.weightPerUnit === item.weightPerUnit);
    if (item.quantity === 0) return 'empty';
    if (item.quantity <= 5) return 'critical';
    if (forecastItem && forecastItem.daysLeft <= 14) return 'warning';
    return 'ok';
  };

  const lowStockAlerts = useMemo(() => {
    return inventory.filter(item => {
      const status = getStockStatus(item);
      return status === 'critical' || status === 'warning';
    });
  }, [inventory, forecast]);

  const inputClass = "w-full px-3 py-2 bg-slate-50 border text-black border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition duration-200 ease-in-out";
  const buttonPrimaryClass = "w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-2 px-4 rounded-md shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-300 transform hover:scale-105";
  const buttonSecondaryClass = "w-full bg-slate-500 text-white font-semibold py-2 px-4 rounded-md shadow-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-all duration-300 transform hover:scale-105";
  const cardClass = "bg-white p-6 rounded-xl shadow-lg border border-slate-200 transition-shadow duration-300 hover:shadow-xl";
  const cardTitleClass = "text-2xl font-extrabold text-slate-800 mb-5 flex items-center gap-3 border-b pb-3 border-slate-200";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center text-xl font-semibold text-slate-600">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-emerald-500 mb-4"></div>
          {t('general.loading')}...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="text-center lg:text-left">
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t('inventoryPage.title')}
          </h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0">
            {t('inventoryPage.subtitle')}
          </p>
        </header>

        {/* NUOVO: Banner Avvisi Scorte */}
        {lowStockAlerts.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-orange-500 text-2xl mr-3" />
              <div>
                <h3 className="text-orange-800 font-bold text-lg">Scorte in esaurimento</h3>
                <p className="text-orange-700 text-sm mt-1">
                  Hai {lowStockAlerts.length} tipolog{lowStockAlerts.length === 1 ? 'ia' : 'ie'} di cibo in esaurimento.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- INSERISCI QUI I SUGGERIMENTI --- */}
        <div className="w-full">
          <FeedingSuggestions />
        </div>

        {/* --- FORM CARD --- */}
        <div className={cardClass}>
          <h2 className={cardTitleClass}>
            <FaUtensils className="text-emerald-500 text-3xl" />
            {editingId ? t('inventoryPage.editItem') : t('inventoryPage.addItem')}
          </h2>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg text-sm font-medium flex items-center gap-3">
              <FaTimes className="text-red-500 text-lg" /> {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Food Type */}
            <div className="flex flex-col lg:col-span-1">
              <label htmlFor="foodType" className="mb-2 text-sm font-medium text-slate-700">{t('inventoryPage.foodType')}</label>
              <select id="foodType" name="foodType" value={formData.foodType} onChange={(e) => setFormData({ ...formData, foodType: e.target.value })} required className={inputClass}>
                <option value="">{t('inventoryPage.selectType')}</option>
                <option value="Topo">{t('inventoryPage.Topo')}</option>
                <option value="Ratto">{t('inventoryPage.Ratto')}</option>
                <option value="Coniglio">{t('inventoryPage.Coniglio')}</option>
                <option value="Pulcino">{t('inventoryPage.Pulcino')}</option>
                <option value="Altro">{t('inventoryPage.Altro')}</option>
              </select>
            </div>
            {/* Quantity */}
            <div className="flex flex-col lg:col-span-1">
              <label htmlFor="quantity" className="mb-2 text-sm font-medium text-slate-700">{t('inventoryPage.quantity')}</label>
              <input id="quantity" type="number" name="quantity" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required placeholder={t('inventoryPage.quantityPlaceholder')} className={inputClass} />
            </div>
            {/* Weight */}
            <div className="flex flex-col sm:col-span-2 lg:col-span-1">
              <label htmlFor="weightPerUnit" className="mb-2 text-sm font-medium text-slate-700">{t('inventoryPage.weightPerUnit')}</label>
              <div className="flex shadow-sm rounded-md border border-slate-300 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition">
                <input id="weightPerUnit" type="number" name="weightPerUnit" min="0" step="0.01" value={formData.weightPerUnit} onChange={(e) => setFormData({ ...formData, weightPerUnit: e.target.value })} placeholder={t('inventoryPage.weightPlaceholder')} className={`${inputClass} !border-none !ring-0 !shadow-none rounded-r-none`} />
                <select value={formData.weightUnit} onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value })} className="px-3 border-l border-slate-300 rounded-r-md bg-slate-100 text-slate-700 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition">
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            {/* Submit Button */}
            <div className="flex items-end sm:col-span-2 lg:col-span-2 space-x-4 mt-2 lg:mt-0">
              <button type="submit" className={buttonPrimaryClass}>
                {editingId ? <FaPencilAlt /> : <FaPlus />}
                {editingId ? t('inventoryPage.update') : t('inventoryPage.add')}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className={buttonSecondaryClass}>
                  {t('inventoryPage.cancel')}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* --- INVENTORY LIST CARD --- */}
        <div className={cardClass}>
          <h2 className={cardTitleClass}>
            <FaBoxOpen className="text-emerald-500 text-3xl" />
            {t('inventoryPage.currentInventory')}
          </h2>
          <div className="overflow-x-auto overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700 uppercase tracking-wider text-xs sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold rounded-tl-lg cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('foodType')}>
                    {t('inventoryPage.type')} {getSortIcon('foodType')}
                  </th>
                  <th className="p-4 font-bold text-right cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('quantity')}>
                    {t('inventoryPage.quantity')} {getSortIcon('quantity')}
                  </th>
                  <th className="p-4 font-bold text-right cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('weightPerUnit')}>
                    {t('inventoryPage.weightPerUnit')} {getSortIcon('weightPerUnit')}
                  </th>
                  <th className="p-4 font-bold text-right">{t('inventoryPage.totalWeight')}</th>
                  <th className="p-4 font-bold text-center rounded-tr-lg">{t('inventoryPage.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedInventory.length > 0 ? (
                  sortedInventory.map(item => {
                    const status = getStockStatus(item);
                    // NUOVO: Stile dinamico della riga basato sullo stato delle scorte
                    const rowClass = status === 'critical' 
                      ? "bg-red-50 hover:bg-red-100 transition-colors duration-150" 
                      : status === 'warning'
                      ? "bg-orange-50 hover:bg-orange-100 transition-colors duration-150"
                      : "hover:bg-slate-50 transition-colors duration-150";

                    return (
                    <tr key={item._id} className={rowClass}>
                      <td className="p-4 whitespace-nowrap text-slate-800 font-medium">
                        {translateFoodType(item.foodType, t)}
                        {status !== 'ok' && (
                          <FaExclamationTriangle className={`inline ml-2 text-xs ${status === 'critical' ? 'text-red-500' : 'text-orange-500'}`} title="Scorta in esaurimento"/>
                        )}
                      </td>
                      <td className={`p-4 text-right font-mono font-bold ${status !== 'ok' ? 'text-red-600' : 'text-slate-700'}`}>
                        {item.quantity}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-700">{formatWeight(item.weightPerUnit)}</td>
                      <td className="p-4 text-right font-mono text-slate-900 font-extrabold">{formatWeight(item.weightPerUnit * item.quantity)}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center space-x-3">
                          <button onClick={() => handleEdit(item)} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all duration-200 ease-in-out">
                            <FaPencilAlt className="text-lg" />
                          </button>
                          <button onClick={() => handleDelete(item._id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-all duration-200 ease-in-out">
                            <FaTrash className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center p-6 text-slate-500 italic">{t('inventoryPage.noItems')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* --- MODALE DELETE --- (Invariata) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl p-8 w-11/12 max-w-lg shadow-2xl border border-slate-200 transform scale-95 animate-scale-in">
            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
              <FaTrash className="text-red-500" /> {t('inventoryPage.deleteConfirmTitle')}
            </h3>
            <p className="text-slate-600 mb-8 leading-relaxed">{t('inventoryPage.deleteConfirmText')}</p>
            <div className="flex justify-end gap-4">
              <button onClick={cancelDelete} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all duration-200 font-medium">
                {t('inventoryPage.cancel')}
              </button>
              <button onClick={confirmDelete} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-md">
                {t('inventoryPage.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;