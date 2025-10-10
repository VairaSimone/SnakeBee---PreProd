import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createArticle, updateArticle, getArticleBySlug, updateImage, getArticleById} from '../../services/blogApi';
import { useForm, Controller } from 'react-hook-form';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Importa lo stile
import { toast } from 'react-toastify';
import { FaSpinner } from 'react-icons/fa';
import ImageDropAndPaste from 'quill-image-drop-and-paste';
Quill.register('modules/imageDropAndPaste', ImageDropAndPaste);

const ArticleEditor = () => {
  const { id: articleId } = useParams();
  const isEditing = !!articleId;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(isEditing);
  const [imgUploading, setImgUploading] = useState(false);

    const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            title: { it: '', en: '' },
            content: { it: '', en: '' },
            status: 'draft',
            publishedAt: '',
            categories: '',
            tags: '',
              ogImage: ''

        }
    });
    
useEffect(() => {
    if (isEditing) {
        const fetchArticle = async () => {
            try {
                const { data } = await getArticleById(articleId); // nuovo servizio
                reset({
                    ...data,
                    categories: data.categories?.join(', ') || '',
                    tags: data.tags?.join(', ') || '',
                    ogImage: data.ogImage || ''
                });
            } catch (e) {
                toast.error("Articolo non trovato");
                navigate('/admin/blog');
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }
}, [isEditing, articleId, reset, navigate]);


const onSubmit = async (data) => {
    try {
const payload = {
  ...data,
  categories: data.categories.split(',').map(c => c.trim()).filter(Boolean),
  tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
  meta: {
    title: data.title,
    description: {
      it: data.content.it.replace(/<[^>]+>/g, '').slice(0, 160),
      en: data.content.en.replace(/<[^>]+>/g, '').slice(0, 160)
    }
  },
  ogImage: data.ogImage,
};

// Trasforma la stringa in Date solo se c'è
if (data.publishedAt) {
  payload.publishedAt = new Date(data.publishedAt);
}
        if (!payload.publishedAt) delete payload.publishedAt;

        if (isEditing) {
            await updateArticle(articleId, payload);
            toast.success("Articolo aggiornato con successo!");
        } else {
            await createArticle(payload);
            toast.success("Articolo creato con successo!");
        }
        navigate('/admin/blog');
    } catch (error) {
        const errorMsg = error.response?.data?.messages?.[0] || "Si è verificato un errore.";
        toast.error(errorMsg);
    }
}; 
    const modules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean']
  ],

  imageDropAndPaste: true // solo abilitare, niente fetch async qui

};
const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImgUploading(true);
    const fd = new FormData();
    fd.append('image', file); // se il backend aspetta "file" cambia qui

    try {
      const response = await updateImage(fd); // axios response
      const data = response?.data ?? response;
      // support vari nomi di ritorno: imageUrl, url, path
      const imageUrl = data?.imageUrl || data?.url || data?.path || (data?.data && (data.data.imageUrl || data.data.url));
      if (!imageUrl) {
        console.error('Upload response senza imageUrl:', data);
        throw new Error('Il server non ha restituito l\'URL dell\'immagine');
      }

      // se server restituisce path relativo, prefissa la base
      const finalUrl = imageUrl.startsWith('http') ? imageUrl : `${process.env.REACT_APP_BACKEND_URL_IMAGE?.replace(/\/$/, '') || ''}${imageUrl}`;

      setValue('ogImage', finalUrl);
      toast.success('Immagine caricata!');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Errore durante il caricamento';
      toast.error(msg);
    } finally {
      setImgUploading(false);
    }
  };

  const ogImage = watch('ogImage');
    if(loading) return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-4xl" /></div>;

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">{isEditing ? 'Modifica Articolo' : 'Nuovo Articolo'}</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
                
                {/* Titoli */}
                <div>
                    <label className="font-bold">Titolo (IT)</label>
                    <input {...register('title.it', { required: true })} className="w-full p-2 border rounded mt-1" />
                    {errors.title?.it && <span className="text-red-500">Campo obbligatorio</span>}
                </div>
                 <div>
                    <label className="font-bold">Titolo (EN)</label>
                    <input {...register('title.en', { required: true })} className="w-full p-2 border rounded mt-1" />
                    {errors.title?.en && <span className="text-red-500">Campo obbligatorio</span>}
                </div>

                {/* Contenuti */}
                <div>
                    <label className="font-bold">Contenuto (IT)</label>
                    <Controller name="content.it" control={control} rules={{ required: true }} render={({ field }) => <ReactQuill theme="snow" {...field}  modules={modules}/>} />
                     {errors.content?.it && <span className="text-red-500">Campo obbligatorio</span>}
                </div>
                 <div>
                    <label className="font-bold">Contenuto (EN)</label>
                    <Controller name="content.en" control={control} rules={{ required: true }} render={({ field }) => <ReactQuill theme="snow" {...field}  modules={modules}/>} />
                    {errors.content?.en && <span className="text-red-500">Campo obbligatorio</span>}
                </div>

                {/* Metadati */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="font-bold">Stato</label>
                        <select {...register('status')} className="w-full p-2 border rounded mt-1">
                            <option value="draft">Bozza</option>
                            <option value="published">Pubblicato</option>
                            <option value="scheduled">Programmato</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-bold">Data Pubblicazione (se programmato)</label>
                        <input type="datetime-local" {...register('publishedAt')} className="w-full p-2 border rounded mt-1" />
                    </div>
                     <div>
                        <label className="font-bold">Categorie (separate da virgola)</label>
                        <input {...register('categories')} className="w-full p-2 border rounded mt-1" />
                    </div>
                     <div>
                        <label className="font-bold">Tag (separati da virgola)</label>
                        <input {...register('tags')} className="w-full p-2 border rounded mt-1" />
                    </div>
                </div>
                 <div>
          <label className="font-bold">Immagine di copertina</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={imgUploading}
            className="block mt-2"
          />
          {imgUploading && <div className="mt-2 flex items-center"><FaSpinner className="animate-spin mr-2" /> Caricamento immagine...</div>}
          {ogImage && (
            <img
              src={ogImage}
              alt="Anteprima copertina"
              className="mt-2 w-64 rounded shadow"
            />
          )}
        </div>

                <button type="submit" disabled={isSubmitting} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded disabled:bg-gray-400">
                    {isSubmitting ? 'Salvataggio...' : (isEditing ? 'Aggiorna Articolo' : 'Crea Articolo')}
                </button>
            </form>
        </div>
    );
};

export default ArticleEditor;
