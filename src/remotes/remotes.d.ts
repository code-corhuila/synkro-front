// Module Federation remotes: resolved by the federation plugin at build/dev
// time, not by TypeScript. Each exposes a React component as its default.
declare module 'authPortal/App' {
  import type { ComponentType } from 'react'
  const App: ComponentType
  export default App
}
declare module 'productsPortal/App' {
  import type { ComponentType } from 'react'
  const App: ComponentType
  export default App
}
declare module 'salesPortal/App' {
  import type { ComponentType } from 'react'
  const App: ComponentType
  export default App
}
