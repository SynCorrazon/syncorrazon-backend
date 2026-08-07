import Joi from 'joi';

export const createRoomSchema = Joi.object({
  videoUrl: Joi.string().uri().required(),
});

export const joinRoomSchema = Joi.object({
  roomCode: Joi.string().length(6).required(),
});

export const roomParamsSchema = Joi.object({
  roomId: Joi.string().required(),
});
