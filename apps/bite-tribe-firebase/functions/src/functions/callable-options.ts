import {
  onCall,
  type CallableOptions,
  type CallableRequest,
  type CallableResponse,
  CallableFunction,
} from 'firebase-functions/https';

const FUNCTIONS_EMULATOR_ENV = 'FUNCTIONS_EMULATOR';

export const getAppCheckCallableOptions = (): CallableOptions => ({
  enforceAppCheck: process.env[FUNCTIONS_EMULATOR_ENV] !== 'true',
});

export const onAppCheck = <T = unknown, Return = unknown, Stream = unknown>(
  handler: (
    request: CallableRequest<T>,
    response?: CallableResponse<Stream>,
  ) => Return,
): CallableFunction<
  T,
  Return extends Promise<unknown> ? Return : Promise<Return>,
  Stream
> => onCall<T, Return, Stream>(getAppCheckCallableOptions(), handler);
