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

type AppCheckHandler<T, Return, Stream> = (
  request: CallableRequest<T>,
  response?: CallableResponse<Stream>,
) => Return;

export function onAppCheck<T = unknown, Return = unknown, Stream = unknown>(
  handler: AppCheckHandler<T, Return, Stream>,
): CallableFunction<
  T,
  Return extends Promise<unknown> ? Return : Promise<Return>,
  Stream
>;
export function onAppCheck<T = unknown, Return = unknown, Stream = unknown>(
  options: CallableOptions,
  handler: AppCheckHandler<T, Return, Stream>,
): CallableFunction<
  T,
  Return extends Promise<unknown> ? Return : Promise<Return>,
  Stream
>;
export function onAppCheck<T = unknown, Return = unknown, Stream = unknown>(
  optionsOrHandler: CallableOptions | AppCheckHandler<T, Return, Stream>,
  maybeHandler?: AppCheckHandler<T, Return, Stream>,
): CallableFunction<
  T,
  Return extends Promise<unknown> ? Return : Promise<Return>,
  Stream
> {
  const hasOptions = typeof optionsOrHandler !== 'function';
  const options = hasOptions ? optionsOrHandler : {};
  const handler = hasOptions
    ? (maybeHandler as AppCheckHandler<T, Return, Stream>)
    : optionsOrHandler;

  return onCall<T, Return, Stream>(
    { ...getAppCheckCallableOptions(), ...options },
    handler,
  );
}
