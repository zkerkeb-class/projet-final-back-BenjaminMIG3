import { Router } from 'express';
import FriendshipController from '../controllers/friendshipController';

import { authenticateToken } from '../middlewares/sessionMiddleware';

const friendshipRouter = Router();
const friendshipController = FriendshipController;
friendshipRouter.post('/send-request', authenticateToken, friendshipController.sendFriendRequest);
friendshipRouter.post('/accept-request', authenticateToken, friendshipController.acceptFriendRequest);
friendshipRouter.post('/reject-request', authenticateToken, friendshipController.rejectFriendRequest);
friendshipRouter.delete('/friendship/:friendshipId', authenticateToken, friendshipController.removeFriendship);
friendshipRouter.get('/get-friendship/:senderId/:receiverId', authenticateToken, friendshipController.getFriendship);
friendshipRouter.get('/get-friend-requests/:userId', authenticateToken, friendshipController.getFriendRequests);
friendshipRouter.get('/get-friendship-status', authenticateToken, friendshipController.getFriendshipStatus);
friendshipRouter.get('/get-friends/:userId', authenticateToken, friendshipController.getFriends);

export default friendshipRouter;