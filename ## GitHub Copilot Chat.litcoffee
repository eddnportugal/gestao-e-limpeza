## GitHub Copilot Chat

- Extension: 0.39.2 (prod)
- VS Code: 1.111.0 (ce099c1ed25d9eb3076c11e4a280f3eb52b4fbeb)
- OS: win32 10.0.26200 x64
- GitHub Account: niggl1

## Network

User Settings:
```json
  "http.systemCertificatesNode": true,
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 140.82.121.5 (4 ms)
- DNS ipv6 Lookup: Error (5 ms): getaddrinfo ENOTFOUND api.github.com
- Proxy URL: None (2 ms)
- Electron fetch (configured): HTTP 200 (59 ms)
- Node.js https: HTTP 200 (207 ms)
- Node.js fetch: HTTP 200 (60 ms)

Connecting to https://api.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.113.21 (8 ms)
- DNS ipv6 Lookup: Error (3 ms): getaddrinfo ENOTFOUND api.githubcopilot.com
- Proxy URL: None (27 ms)
- Electron fetch (configured): HTTP 200 (492 ms)
- Node.js https: HTTP 200 (435 ms)
- Node.js fetch: HTTP 200 (516 ms)

Connecting to https://copilot-proxy.githubusercontent.com/_ping:
- DNS ipv4 Lookup: 20.250.119.64 (7 ms)
- DNS ipv6 Lookup: Error (8 ms): getaddrinfo ENOTFOUND copilot-proxy.githubusercontent.com
- Proxy URL: None (12 ms)
- Electron fetch (configured): HTTP 200 (251 ms)
- Node.js https: HTTP 200 (205 ms)
- Node.js fetch: HTTP 200 (207 ms)

Connecting to https://mobile.events.data.microsoft.com: HTTP 404 (274 ms)
Connecting to https://dc.services.visualstudio.com: HTTP 404 (331 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (379 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (411 ms)
Connecting to https://default.exp-tas.com: HTTP 400 (217 ms)

Number of system certificates: 103

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).