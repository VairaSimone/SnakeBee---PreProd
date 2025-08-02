import express from 'express';
import { authenticateJWT } from '../middlewares/Auth.js';
import {
  createBreedingPair,
  addBreedingEvent,
  getBreedingByYear,
  updateBreedingOutcome, deleteBreedingEvent, updateBreedingEvent
} from '../controllers/BreedingController.js';

const breedingRouter = express.Router();

breedingRouter.use(authenticateJWT);
breedingRouter.post('/', createBreedingPair);
breedingRouter.post('/:breedingId/event', addBreedingEvent);
breedingRouter.get('/', getBreedingByYear);
breedingRouter.patch('/:breedingId/outcome', updateBreedingOutcome);
breedingRouter.delete('/breeding/:breedingId/event/:eventId', deleteBreedingEvent);
breedingRouter.patch('/breeding/:breedingId/event/:eventId', updateBreedingEvent);

export default breedingRouter;
