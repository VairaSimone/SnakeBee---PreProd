import React from 'react';
import { FaTimes, FaInfoCircle, FaFileExcel, FaUpload } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const ImportInfoModal = ({ show, onClose, onImport }) => {
    const { t } = useTranslation();

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative">
                
                {/* Header */}
                <div className="p-6 bg-forest text-white flex justify-between items-center">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FaFileExcel /> Importazione Massiva
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <FaTimes size={24} />
                    </button>
                </div>

                {/* Body (Scrollabile) */}
                <div className="p-6 overflow-y-auto text-charcoal space-y-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <p className="flex items-start gap-2 text-sm text-blue-800">
                            <FaInfoCircle className="mt-0.5 shrink-0" />
                            Prepara un file Excel (.xlsx) o CSV. La prima riga deve contenere le intestazioni delle colonne. Il sistema riconosce automaticamente molti nomi, ma ecco una guida per non sbagliare.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-lg mb-2 text-olive">1. Campi Principali</h3>
                        <ul className="list-disc pl-5 text-sm space-y-1 text-charcoal/80">
                            <li><strong>specie</strong> <span className="text-red-500">*Obbligatorio</span></li>
                            <li><strong>nome</strong></li>
                            <li><strong>sesso</strong> (usa M, F, o Unknown)</li>
                            <li><strong>morph</strong></li>
                            <li><strong>nascita</strong> (formato data, es. DD/MM/YYYY)</li>
                            <li><strong>peso cibo</strong> (numero) e <strong>tipo cibo</strong></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-lg mb-2 text-olive">2. Campi Specifici (Annidati)</h3>
                        <p className="text-sm mb-2 text-charcoal/80">Per i dati più complessi, usa esattamente queste intestazioni:</p>
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-sand text-charcoal">
                                    <th className="p-2 border border-white">Intestazione Excel</th>
                                    <th className="p-2 border border-white">Cosa inserisce</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-2 border border-sand font-mono bg-gray-50">prezzo acquisto</td>
                                    <td className="p-2 border border-sand">Costo d'acquisto iniziale</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-sand font-mono bg-gray-50">prezzo</td>
                                    <td className="p-2 border border-sand">Prezzo di vendita dell'animale</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-sand font-mono bg-gray-50">padre / madre</td>
                                    <td className="p-2 border border-sand">ID o nome dei genitori</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-sand font-mono bg-gray-50">numero cites</td>
                                    <td className="p-2 border border-sand">Codice CITES</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-sand font-mono bg-gray-50">microchip</td>
                                    <td className="p-2 border border-sand">Numero del microchip</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h3 className="font-bold text-lg mb-2 text-red-600">3. Campi Ignorati</h3>
                        <p className="text-sm text-charcoal/80">
                            Alcuni campi vengono generati automaticamente dal sistema e <strong>verranno ignorati</strong> se presenti nel file, come: <span className="font-mono bg-gray-100 px-1 rounded">isPublic</span>, <span className="font-mono bg-gray-100 px-1 rounded">qrCodeUrl</span>, <span className="font-mono bg-gray-100 px-1 rounded">lastFeedingDate</span>, <span className="font-mono bg-gray-100 px-1 rounded">nextFeedingDate</span>.
                        </p>
                    </div>
                </div>

                {/* Footer (Azione di caricamento) */}
                <div className="p-6 border-t border-sand bg-gray-50 flex justify-end items-center">
                    <label className="flex items-center gap-2 bg-forest text-white px-6 py-3 rounded-xl font-bold cursor-pointer hover:bg-olive transition-colors shadow-lg hover:-translate-y-0.5">
                        <FaUpload /> Scegli File e Importa
                        <input 
                            type="file" 
                            className="hidden" 
                            accept=".csv, .xlsx, .xls"
                            onChange={onImport} 
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default ImportInfoModal;