// Stand-in for a federated remote module under Vitest. The real
// `authPortal/App`-style specifiers only resolve through the federation
// plugin at build/dev time; tests that need a portal inject their own
// load function instead of importing one.
export default function RemoteStub() {
  return null
}
