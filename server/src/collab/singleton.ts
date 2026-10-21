// Hocuspocus sunucusuna döngüsel import olmadan erişim için modül düzeyi singleton.
// `buildCollabServer` oluşturulduğunda set eder; `versions.ts` restore için kullanır.

import type { Hocuspocus } from '@hocuspocus/server';

let serverRef: Hocuspocus | null = null;

export function setCollabServer(s: Hocuspocus | null): void {
  serverRef = s;
}

export function getCollabServer(): Hocuspocus | null {
  return serverRef;
}