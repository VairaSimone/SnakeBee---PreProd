import jwt from 'jsonwebtoken';
import RevokedToken from '../models/RevokedToken.js';
import User from '../models/User.js';

//Route Authentication
export const authenticateJWT = async (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: req.t('refresh_token')  });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Check if the token has been revoked
        const isRevoked = await RevokedToken.findOne({ token });
        if (isRevoked) {
            return res.status(403).json({ message: req.t('tokenRevoked') });
        }

        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

        const user = await User.findById(decoded.userid).select('role');
        if (!user) {
            return res.status(401).json({ message: req.t('user_notFound')  });
        }

        if (user.role === 'banned') {
            return res.status(403).json({ message:  req.t('account_ban')  });
        }

        req.user = decoded;
        req.user.role = user.role;
        next();
    } catch (error) {
        const status = error.name === 'TokenExpiredError' ? 401 : 403;
        return res.status(status).json({ message: error.message });
    }
};
