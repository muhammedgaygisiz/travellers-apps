import {
  onCall,
  type CallableOptions,
  type CallableRequest,
  type CallableResponse,
  CallableFunction,
} from 'firebase-functions/https';

const appCheckCallableOptions: CallableOptions = {
  enforceAppCheck: true,
};

export const onAppCheck = <T = unknown, Return = unknown, Stream = unknown>(
  handler: (
    request: CallableRequest<T>,
    response?: CallableResponse<Stream>,
  ) => Return,
): CallableFunction<
  T,
  Return extends Promise<unknown> ? Return : Promise<Return>,
  Stream
> => onCall<T, Return, Stream>(appCheckCallableOptions, handler);
