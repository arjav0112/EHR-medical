import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'ehr-copilot',
  // eventKey is only needed server-side; omit from client bundles
});
