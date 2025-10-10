import React from 'react';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaEye } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const ArticleCard = ({ article }) => {
    const { i18n } = useTranslation();
    const currentLang = i18n.language;

    const title = article.title?.[currentLang] || article.title?.it;
    // Rimossa la pulizia del tag HTML per un estratto più pulito
    const plainTextContent = article.content?.[currentLang]?.replace(/<[^>]*>?/gm, '') || article.content?.it?.replace(/<[^>]*>?/gm, '');
    const excerpt = plainTextContent?.substring(0, 120) + '...' || '';

    const getAuthorAvatar = () => {
        if (!article.author?.avatar) return 'https://static.thenounproject.com/png/363639-200.png';
        if (article.author.avatar.startsWith('http')) return article.author.avatar;
        return `${process.env.REACT_APP_BACKEND_URL_IMAGE}${article.author.avatar}`;
    };

    return (
        // Aggiunto 'group' per effetti hover sui figli e transizioni più fluide
        <article className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col group">
            <div className="overflow-hidden rounded-t-xl">
                <Link to={`/blog/${article.slug}`}>
                    <img 
                        src={article.ogImage || 'https://via.placeholder.com/600x400'} // Immagine di fallback
                        alt={title} 
                        // Effetto zoom sull'immagine all'hover sulla card
                        className="w-full h-56 object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out" 
                    />
                </Link>
            </div>
            <div className="p-6 flex flex-col flex-grow">
                <div className="mb-3">
                    {article.categories?.slice(0, 2).map(category => ( // Mostra max 2 categorie
                        <span key={category} className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold mr-2 px-3 py-1 rounded-full">
                            {category}
                        </span>
                    ))}
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex-grow">
                    <Link to={`/blog/${article.slug}`} className="hover:text-emerald-600 transition-colors duration-300">
                        {title}
                    </Link>
                </h2>
                <p className="text-gray-600 text-sm mb-6">{excerpt}</p>
                {/* Footer della card con metadati migliorati */}
                <div className="mt-auto border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center">
                            <img src={getAuthorAvatar()} alt={article.author?.name} className="w-8 h-8 rounded-full mr-2 object-cover border-2 border-white shadow" />
                            <span className="font-semibold">{article.author?.name || 'SnakeBee Team'}</span>
                        </div>
                        <div className='flex items-center space-x-3'>
                             <span className="flex items-center"><FaCalendarAlt className="mr-1.5" />{new Date(article.publishedAt).toLocaleDateString('it-IT')}</span>
                             <span className="flex items-center"><FaEye className="mr-1.5" />{article.views || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default ArticleCard;