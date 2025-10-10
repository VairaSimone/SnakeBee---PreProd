import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getArticleBySlug } from '../services/blogApi';
import { FaSpinner, FaUserCircle, FaCalendarAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { selectUser } from '../features/userSlice';
import ArticleReactions from '../components/ArticleReactions';

const ArticlePage = () => {
    const { slug } = useParams();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const user = useSelector(selectUser);
    const { i18n } = useTranslation();
    const currentLang = i18n.language;

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                setLoading(true);
                const { data } = await getArticleBySlug(slug);
                setArticle(data);
            } catch (err) {
                setError('Articolo non trovato o non hai i permessi per vederlo.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }, [slug]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><FaSpinner className="animate-spin text-emerald-500 text-4xl" /></div>;
    }

    if (error || !article) {
        return <div className="text-center py-20 text-red-500 font-semibold text-lg">{error}</div>;
    }

    const title = article.title?.[currentLang] || article.title?.it;
    const content = article.content?.[currentLang] || article.content?.it;
    const sanitizedContent = DOMPurify.sanitize(content);

    return (
        <div className="bg-white py-12 sm:py-16">
            {/* Contenitore principale con larghezza massima per migliorare la leggibilità */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <article>
                    <header className="mb-10 text-center">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">{title}</h1>
                        <div className="flex justify-center items-center text-gray-500 text-base mt-6 space-x-6">
                            <div className="flex items-center">
                                <FaUserCircle className="mr-2 text-emerald-500" />
                                <span>{article.author.name}</span>
                            </div>
                            <div className="flex items-center">
                                <FaCalendarAlt className="mr-2 text-emerald-500" />
                                <span>{new Date(article.publishedAt).toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </header>

                    {article.ogImage && (
                        <figure className="mb-10">
                            <img src={article.ogImage} alt={title} className="w-full h-auto rounded-2xl shadow-xl" />
                        </figure>
                    )}
                    
                    {/* Stile del contenuto testuale migliorato con il plugin 'prose' di Tailwind */}
                    <div
                        className="prose lg:prose-xl max-w-full prose-emerald prose-a:text-emerald-600 hover:prose-a:text-emerald-700 prose-blockquote:border-emerald-500"
                        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    />
                    
                    {/* Separatore visivo prima delle reazioni */}
                    <hr className="my-12 border-gray-200" />

                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Ti è piaciuto l'articolo?</h3>
                        <ArticleReactions
                            articleId={article._id}
                            initialCounts={article.reactionCounts}
                            initialUserReaction={article.currentUserReaction}
                        />
                    </div>
                </article>
            </div>
        </div>
    );
};

export default ArticlePage;