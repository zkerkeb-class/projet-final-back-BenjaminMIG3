import Joi from "joi";

const registerUserSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerMultipleUsersSchema = Joi.array().items(
  Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  })
).min(1).required();

const loginUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const deleteUserSchema = Joi.object({
  userId: Joi.string().required(),
});

const getUserSchema = Joi.object({
  userId: Joi.string().required(),
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

export { registerUserSchema, registerMultipleUsersSchema, loginUserSchema, messageSchema, getMessagesSchema, sendMessageSchema, deleteMessageSchema, updateMessageSchema, deleteUserSchema, getUserSchema };