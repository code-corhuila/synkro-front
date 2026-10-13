# Sales upstream outage: review handoff

Base: reviewed develop a1fecc671ada1384dcaeeec5f59dff3c13a35e26. Infrastructure's approved pin must remain here until this correction is reviewed and merged.

The complete infrastructure asset suite failed twice on GET /remotes/sales/assets/remoteEntry.js after stopping Sales. This is a Python HTTP request, before browser federation evaluation or recovery. A focused cold-worker request previously returned 502 in 2.578 seconds after a DNS error; that did not exercise the warm-cache TCP branch.

The real-image regression warms nginx with 80 successful requests, stops Sales, then makes exactly one unavailable request with the unchanged 15-second deadline. Before the fix it times out in 15.031 seconds; /proc/net/tcp confirms SYN_SENT to the stopped Sales address on port 80. Shell and Products remain 200 and restarting Sales restores 200. The defect is an unbounded-for-this-contract nginx connection attempt to a cached address, not a frontend error-boundary reset or a failing test assertion. No claim is made that PR #11 introduced it.

Bound only the Sales location's DNS resolution and TCP connection to 2 seconds. Convert upstream timeout 504 into the established unavailable-remote 502 contract, with no-store on the error response. Keep the existing resolver cache, routing, asset rewrite, API proxy and frontend behavior. Nginx's [default connection timeout is 60 seconds](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_connect_timeout), above the delivery client's 15 seconds. The read/send timeouts are unchanged; this fix addresses the observed handshake failure.

Red: owning deployment contract test fails and actual-image proxy_outage.py returns FAILED with cleanup PASSED. Green: the same warm-cache real-image regression returns 502 in 2.031 seconds, shell/Products 200 and recovered Sales 200; cleanup PASSED. Both runs retain the same client deadline and no failure retries. Exact committed-candidate complete suite evidence is recorded by the infrastructure handoff.

Run the deployment contract in CI: `python tests/test_root_deploy.py`.
Run the actual Docker regression with real compiled images:

```text
python tests/proxy_outage.py --host-image <host-image> --sales-image <sales-image> --products-image <products-image>
```

Build Host with its owning Dockerfile. Images must come from the intended exact revisions; this executable test does not fetch or substitute dependency pins. It creates a unique labeled disposable network and containers and verifies ownership before cleanup; no persistent volumes are mounted. JSON output contains only timing/status/resource classifications. The owning App.remoteIsolation component regression separately verifies the same shell/navigation DOM survives Sales failure, navigation to Products and return to recovered Sales; it uses mocked loaders and is not a real-browser integration claim.

Prepared PR title: `fix(host): bound warm-cache Sales upstream failures`.
Base: develop. Summary: When Sales stops after assets were loaded, nginx can wait for a TCP handshake beyond the client's 15-second deadline. Bound that handshake and resolution in the Sales proxy and retain controlled 502/no-store delivery; add failing-before-fix real-image and automatic deployment regressions. Related to code-corhuila/synkro-docs#239. No closing reference. Team approval/merge and resulting infrastructure pin update remain external steps.
