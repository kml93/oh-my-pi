# Info commands render in transient panels, not transcript blocks

Slash commands that display reference or status information (`/context`, `/hotkeys`, `/tools`, `/memory view|stats`, `/jobs`, `/ssh list|help`) open a transient info panel above the editor instead of appending transcript command blocks, which stacked on every invocation and buried the conversation. Each panel exposes exactly one unbound key action (`defaultKeys: []`) so shortcuts stay opt-in. Fullscreen overlays remain reserved for interactive hubs and dashboards (`/usage`, `/settings`, `/agents`), and ACP text output is unchanged.

## Considered options

- Transcript command blocks: keeps output in scrollback, but stacks per invocation and buries the chat — rejected for repeatedly-invoked info commands.
- Fullscreen overlays (the `/usage show` idiom): clean but heavyweight for glanceable, medium-sized output.
