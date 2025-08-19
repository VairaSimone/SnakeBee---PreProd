import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="text-center mt-10">
      <h1 className="text-3xl font-bold text-red-600">{t('notFound.404')}</h1>
      <p className="mt-2 text-gray-700">{t('notFound.link')}</p>
      <Link to="/home" className="text-green-700 hover:underline mt-4 block">
        {t('notFound.home')}
      </Link>
    </div>
  );
};

export default NotFound;
