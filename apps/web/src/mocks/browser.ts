import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export async function startWorker(opts?: Parameters<typeof worker.start>[0]): Promise<void> {
  await worker.start({
    onUnhandledRequest: 'bypass',
    ...(opts ?? {}),
  });
}
