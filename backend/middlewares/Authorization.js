export const isAdmin = (req, res, next) => {
    if (req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: 'Accesso negato. Solo amministratori.' });
};
export const blockIfBanned = (req, res, next) => {
    if (req.user?.role === 'banned') {
        return res.status(403).json({ message: 'Account bannato. Contatta il supporto.' });
    }
    next();
};

export const isOwnerOrAdmin = (model, idField = 'userId') => async (req, res, next) => {
    try {
        const resourceId = req.params[idField] || req.params.id;

        if (!resourceId) {
            if (req.user && req.user.role === 'admin') {
                return next();
            } else {
                return res.status(403).json({ message: 'Accesso negato. Nessun ID risorsa fornito.' });
            }
        }
        const resource = model.modelName === 'User'
            ? await model.findById(resourceId)
            : await model.findById(resourceId).populate('user');

        if (!resource) {
            return res.status(404).json({ message: 'Risorsa non trovata' });
        }

        if (!req.user) {
            return res.status(401).json({ message: 'Non autorizzato. Nessuna informazione utente.' });
        }

        if (model.modelName === 'User' || resource.user._id.toString() === req.user.userid || req.user.role === 'admin') {
            return next();
        } else {
            return res.status(403).json({ message: "Accesso negato. Non sei il proprietario o l'amministratore." });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Errore del server' });
    }
};
