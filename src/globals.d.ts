// Erlaubt den Import von .scss Dateien in TypeScript
declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}