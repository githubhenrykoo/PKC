/// <reference types="astro/client" />

// Define JSX namespace for components used in .astro files
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
