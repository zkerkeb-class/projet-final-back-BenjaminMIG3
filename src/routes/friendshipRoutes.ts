import { Router } from 'express';
import FriendshipController from '../controllers/friendshipController';

import { authenticateToken } from '../middlewares/sessionMiddleware';

const friendshipRouter = Router();
const friendshipController = FriendshipController;
friendshipRouter.post('/send-request', authenticateToken, friendshipController.sendFriendRequest);
friendshipRouter.post('/accept-request', authenticateToken, friendshipController.acceptFriendRequest);
friendshipRouter.post('/reject-request', authenticateToken, friendshipController.rejectFriendRequest);
friendshipRouter.delete('/friends/:friendId', authenticateToken, friendshipController.removeFriend);
friendshipRouter.get('/get-friends', authenticateToken, friendshipController.getFriends);
friendshipRouter.get('/get-friend-requests', authenticateToken, friendshipController.getFriendRequests);
friendshipRouter.get('/get-friendship-status', authenticateToken, friendshipController.getFriendshipStatus);

export default friendshipRouter;