import Joi from "joi";

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const messageSchema = Joi.object({
  receiverId: Joi.string().required(),
  content: Joi.string().required(),
});
const getMessagesSchema = Joi.object({
  userId: Joi.string().required(),
});
const sendMessageSchema = Joi.object({
  senderId: Joi.string().required(),
  receiverId: Joi.string().required(),
  content: Joi.string().required(),
});
const deleteMessageSchema = Joi.object({
  messageId: Joi.string().required(),
});
const updateMessageSchema = Joi.object({
  messageId: Joi.string().required(),
  content: Joi.string().required(),
});

export { registerSchema, loginSchema, messageSchema, getMessagesSchema, sendMessageSchema, deleteMessageSchema, updateMessageSchema };