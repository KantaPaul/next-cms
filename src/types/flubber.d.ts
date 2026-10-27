declare module 'flubber' {
  export interface FlubberCurve {
    [key: string]: unknown;
  }

  export interface InterpolateOptions {
    curve?: string;
  }

  export interface Tween<T> {
    (progress: number): T;
  }

  export function interpolate<T>(from: T, to: T, options?: InterpolateOptions): Tween<T>;
}
