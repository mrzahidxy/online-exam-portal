import { Response } from 'express';

export type SuccessResponse<T> = {
  status: 'success';
  message: string;
  data?: T;
};

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
) => {
  const payload: SuccessResponse<T> = {
    status: 'success',
    message,
  };

  if (data !== undefined) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};
