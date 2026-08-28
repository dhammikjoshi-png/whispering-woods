# Adding the post-story online world later

You explicitly said not to build the MMO now — this documents why the
current architecture won't need a rewrite when you do.

## Why this slice is already multiplayer-shaped

The game loop separates three things that are usually tangled together
in quick prototypes:

1. **State** — `Game.flags`, `Player` position/hp/stage, entity
   positions. Plain data, no rendering logic mixed in.
2. **Simulation** — `update(dt, ...)` methods that advance that state.
3. **Rendering** — `draw(ctx)` methods that only ever *read* state, never
   change it.

That separation is the actual prerequisite for multiplayer. A
networked game needs to be able to take the same "state" and either (a)
simulate it locally, or (b) receive it from a server and just render it
— without the rendering code caring which happened. Right now every
entity already draws purely from its own state, so it already meets
that bar.

## The incremental path (roughly in order)

1. **Give every entity a stable ID** (Kai already has `id: "kai"`, the
   wolf has `id: "forestWolf"` — this pattern already exists, just keep
   using it for anything that needs to sync).
2. **Split "single player scenes" from "shared world scenes."** The
   childhood story scenes (Greenvale, Forest Path, etc.) can stay fully
   local/offline forever — they don't need to be multiplayer. Only the
   post-story kingdom needs a shared state.
3. **Add a thin networking layer, not a rewrite.** A `NetworkSync`
   module can take `Game.entities` for the shared-world scenes and
   diff/broadcast position + state changes over WebSockets, the same
   way `Storage` already abstracts local vs. artifact storage. The
   `update()`/`draw()` split means entities don't need to know or care
   whether their state came from local input or a network message.
4. **Server-authoritative combat only where it matters.** World bosses
   and PvP-adjacent features (trading, parties) need a real backend
   (Node + WebSocket server, or a service like Colyseus/PlayFab) to
   prevent cheating. Solo exploration and co-op wandering can stay
   more client-trusting since the stakes are lower.
5. **Reuse the dialogue/quest flag system for guild/event state.** It's
   already just a plain object — a shared-world version of it just
   needs to live on a server instead of `localStorage`.

## What NOT to do

Don't try to make the childhood story scenes multiplayer — they're
narrative-critical, single-player-paced, and built to be revisited
solo later. Keep the split explicit: *story mode* (local) vs. *kingdom
mode* (shared), unlocked after the final boss, exactly as you
described.
