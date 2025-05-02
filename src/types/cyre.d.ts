declare module "cyre" {
  interface Action {
    id: string;
    interval?: number;
    repeat?: "infinite" | number;
    detectChanges?: boolean;
    payload?: any | ((state: any) => any);
  }

  interface State {
    timers: any[];
    alarms: any[];
    lastTick: number;
  }

  export const cyre: {
    action: (action: Action | Action[]) => void;
    on: (id: string, callback: () => void) => void;
    getState: (id: string) => State;
  };
}
