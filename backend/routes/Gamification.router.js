import * as GamificationController from '../controllers/GamificationRoute_controller.js';

const gamificationRouter = express.Router();

gamificationRouter.get('/leaderboards', GamificationController.getLeaderboards);

