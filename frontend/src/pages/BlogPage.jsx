import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getArticles } from '../services/blogApi';
import ArticleCard from '../components/ArticleCard';
import { FaSpinner, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const BlogPage = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const fetchArticles = async () => {
            setLoading(true);
            try {
                const params = {
                    page,
                    limit: 9,
                    category: searchParams.get('category'),
                    tag: searchParams.get('tag')
                };
                const { data } = await getArticles(params);
                setArticles(data.articles);
                setTotalPages(data.totalPages);
            } catch (err) {
                setError('Impossibile caricare gli articoli. Riprova più tardi.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchArticles();
    }, [page, searchParams]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50">
                <FaSpinner className="animate-spin text-emerald-500 text-5xl" />
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-20 text-red-500 font-semibold">{error}</div>;
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Header migliorato con gradiente e tipografia più d'impatto */}
                <header className="text-center mb-16 p-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight">SnakeBee Blog</h1>
                    <p className="text-lg text-emerald-100 mt-4 max-w-2xl mx-auto">
                        Guide, approfondimenti e curiosità dal mondo dei rettili.
                    </p>
                </header>
                
                {articles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {articles.map(article => (
                            <ArticleCard key={article._id} article={article} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 text-xl py-20">Nessun articolo trovato.</p>
                )}

                {/* Paginazione ridisegnata */}
                {totalPages > 1 && (
                    <div className="flex justify-center mt-16">
                        <nav className="flex items-center gap-4">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))} 
                                disabled={page === 1} 
                                className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                aria-label="Pagina precedente"
                            >
                                <FaChevronLeft className="h-4 w-4 text-gray-600" />
                            </button>
                            <span className="text-sm font-medium text-gray-700">
                                Pagina <span className="font-bold text-emerald-600">{page}</span> di {totalPages}
                            </span>
                            <button 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                                disabled={page === totalPages} 
                                className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                aria-label="Pagina successiva"
                            >
                                <FaChevronRight className="h-4 w-4 text-gray-600" />
                            </button>
                        </nav>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlogPage;