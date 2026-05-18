// ═══════════════════════════════════════════════════════════
// HotelFlux — Phoenix JS Type Declarations
// Tipos mínimos para Phoenix Socket/Channel
// ═══════════════════════════════════════════════════════════

declare module 'phoenix' {
  export class Socket {
    constructor(endPoint: string, opts?: Record<string, any>);
    connect(): void;
    disconnect(): void;
    channel(topic: string, params?: Record<string, any>): Channel;
    isConnected(): boolean;
  }

  export interface Push {
    receive(status: string, callback: (response: any) => void): Push;
  }

  export class Channel {
    join(timeout?: number): Push;
    leave(timeout?: number): Push;
    on(event: string, callback: (payload: any) => void): number;
    off(event: string, ref?: number): void;
    push(event: string, payload: Record<string, any>, timeout?: number): Push;
  }
}
