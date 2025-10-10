import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminArticles, deleteArticle } from '../../services/blogApi';
import { FaEdit, FaTrash, FaPlus, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';

const AdminBlogDashboard = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const { data } = await getAdminArticles({ page: 1, limit: 100 }); // Per ora, senza paginazione complessa
            setArticles(data.articles);
        } catch (error) {
            toast.error("Impossibile caricare gli articoli.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Sei sicuro di voler eliminare questo articolo?")) {
            try {
                await deleteArticle(id);
                toast.success("Articolo eliminato con successo!");
                fetchArticles(); // Ricarica la lista
            } catch (error) {
                toast.error("Errore durante l'eliminazione.");
            }
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-4xl" /></div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Gestione Blog</h1>
                <Link to="/admin/blog/new" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded inline-flex items-center">
                    <FaPlus className="mr-2" /> Crea Articolo
                </Link>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Titolo (IT)</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stato</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Data Pubblicazione</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {articles.map(article => (
                            <tr key={article._id}>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p className="text-gray-900 whitespace-no-wrap">{article.title.it}</p>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <span className={`relative inline-block px-3 py-1 font-semibold leading-tight rounded-full ${
                                        article.status === 'published' ? 'text-green-900 bg-green-200' :
                                        article.status === 'draft' ? 'text-yellow-900 bg-yellow-200' :
                                        'text-blue-900 bg-blue-200'
                                    }`}>
                                        {article.status}
                                    </span>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : 'N/A'}
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <Link to={`/admin/blog/edit/${article._id}`} className="text-indigo-600 hover:text-indigo-900 mr-4"><FaEdit /></Link>
                                    <button onClick={() => handleDelete(article._id)} className="text-red-600 hover:text-red-900"><FaTrash /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminBlogDashboard;
