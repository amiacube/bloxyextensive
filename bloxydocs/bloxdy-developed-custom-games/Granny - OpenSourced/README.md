# granny open sourced

![granny](./granny.png)

make sure to join https://bloxdhub.com

this doc is the breakdown for how the game works.

same idea as the doors doc basically. this is me dumping the real runtime logic and the tricks we used so if some part looks oddly specific or fake in the code, there is prob a reason for it.

so the main layout is:

- `Granny/World Code.js`
- `Granny/1 Systems/`
- `Granny/2 Modules/`

## what this doc is about

this doc is mostly about the current public granny flow and the main runtime parts players actually run into.

the main things in here are:

- how `world code.js` runs the whole thing
- how the lobby hub and queue works
- how matchmaking sends players into a unique run lobby
- how granny routes around the house
- how the stairs and floor handoffs work
- how patrol, alerts, and vision work
- how crouching acc makes u less visible
- how closets and hiding work
- how the puzzle items and modules connect together
- how catch, days, win logic, and atmosphere work

u will still see some old refs or helper leftovers in the codebase tho. some of that is from earlier cleanup passes, some of it is just because systems grew over time.

## how the world code runs the game

[Granny/World Code.js](./Granny/World%20Code.js) is p much the main runtime brain.

without the systems and modules it does nothing useful, but without `world code.js` none of the other files really have a proper loop to live on either.

the main big jobs it handles are:

1. loading stored codeblocks from the world
2. starting the shared tick scheduler
3. processing queued api work in small slices
4. rebuilding cached player snapshots
5. exposing helpers for position, facing, target info, and player ids
6. calling hooks for join, chat, tick, and other runtime events

the important thing here is that granny is not a bunch of files acting fully on their own. it is one runtime loop with a lot of attached systems hanging off it.

the task scheduler matters a lot too. the minified scheduler chunk near the top is the shared timer system we use for retries, waits, patrol delays, intro fades, route steps, and anim loops. credit for that one goes to delfineon for making the task schedular.

the queue matters a lot as well.

`world code.js` spreads api work out instead of letting every system hammer the api at once. that helps a lot when several systems all want to update prompts, rotate granny, move a route, or apply client options in the same tick.

the player snapshot/cache part matters too.

instead of every system calling fresh position and facing reads over and over, the runtime rebuilds cached player info each tick and later systems read that. that saves calls and also keeps behavior more consistent inside one tick.

## how the lobby hub and queue works

the start of the granny flow is mostly split between:

- [Granny/1 Systems/System 11 - Lobby Hub Displays.js](./Granny/1%20Systems/System%2011%20-%20Lobby%20Hub%20Displays.js)
- [Granny/1 Systems/System 12 - Lobby Matchmaking.js](./Granny/1%20Systems/System%2012%20-%20Lobby%20Matchmaking.js)

`System 11` is the visual and state side of the lobby.

it spawns the floating display items, helper mobs, queue blocks, mode stands, and runtime prompt loop for players standing in the hub.

it also tracks who is standing in which mode area and how long they have been standing there.

`System 12` is the actual queue and matchmaker brain.

that one stores:

- chosen queue mode
- target lobby name
- queue issued time
- active run player state
- reserved run lobby names

the queue ticket is not just some loose flag. it is a real little db record, and later the runtime checks whether that ticket is still valid for the lobby the player is trying to enter.

the unique run lobby name part is also real and not random in a lazy way.

`gc1LobbyHubPickRunLobbyName()` builds a seed out of:

- the player db id
- the current lobby name
- the current time
- an incrementing serial

then `gc1LobbyHubHashTextToDigits(...)` hashes that into digits, mixes it with `Date.now()`, and clamps it into the configured lobby range. so the run lobby names are basically time + hashed identity + serial. why you may ask? its important bcuz if we just randomly choose a number, two players might be directed to the same lobby (which would cause some issues)

so in short, it is useful because it helps avoid collisions while also making run lobbies easy to reserve and release.

the run intro is also handled there.

when a player gets moved into the run flow, `System 12` handles the intro fade, waits for boot readiness, does the atmosphere, and only then finishes the handoff.

## how granny routes around the house

the main route system is [Granny/1 Systems/System 4 - Main Floor Mesh Chase.js](./Granny/1%20Systems/System%204%20-%20Main%20Floor%20Mesh%20Chase.js).

that file turns chase targets and alert targets into actual route paths on the main floor graph.

the graph is a grid where:

- `1` = blocked tile or wall
- `0` = normal walkable floor
- `4` = waypoint tile
- `2` = stairs
- `3` = room doorway tile
- `8` = hide tile granny should ignore

the route search is chunked A*.

that matters a lot because bigger routes would feel awful if the whole search tried to finish in one tick. instead it expands a few nodes per tick, stores progress, then resumes next slice.

the route system also does not just handle one flat floor forever.

when a target belongs to another level, the main floor chase hands off into:

- [Granny/1 Systems/System 5 - Basement Handoff.js](./Granny/1%20Systems/System%205%20-%20Basement%20Handoff.js)
- [Granny/1 Systems/System 6 - Floor 1 Handoff.js](./Granny/1%20Systems/System%206%20-%20Floor%201%20Handoff.js)

those systems build stair prefixes, entry cells, stair point chains, and floor-specific tail routes so granny can move across levels without snapping or teleporting.

so the rough path is:

1. main floor graph picks a route
2. if target is upstairs or basement, handoff starts
3. stair points get walked in order
4. target floor graph takes over
5. granny continues the route there

## how patrol and alert search works

[Granny/1 Systems/System 7 - Patrol Runtime.js](./Granny/1%20Systems/System%207%20-%20Patrol%20Runtime.js) is granny's idle brain.

it builds patrol targets from waypoint cells on the main floor, floor 1, and basement, then sends those into the mesh route system when nothing more important is going on.

it also has diff search modes for diff alerts.

the normal patrol search is small and simple:

1. wait
2. look left
3. look right
4. face forward and continue patrol

the alert search is more paranoid.

when granny hears something or loses a target, `gc1RunGrannyAlertSearch(...)` rotates her through a bigger list of yaws for a few seconds before she gives up and goes back to roaming.

so yea, patrol search and alert search are not the same thing.

## how granny sees players

[Granny/1 Systems/System 8 - Vision Runtime.js](./Granny/1%20Systems/System%208%20-%20Vision%20Runtime.js) is the sight system.

it does not just ask "is player close yes/no".

it checks:

- distance
- facing cone
- eye ray
- body ray
- short memory after losing sight
- repath delay so she does not spam alerts every second

crouching acc makes u less visible here too.

`gc1VisionRangeSqForPlayer(...)` multiplies the base sight range by `GC1_VISION_CROUCH_RANGE_MULT`, which is `0.58`, when the player is crouching.

so crouching does not make u invisible, but it does cut the allowed sight range down a lot.

the memory part matters too.

granny does not instantly forget a player the second they step behind a wall. `gc1VisionOnMiss()` keeps a short last-seen memory, updates the remembered spot if the player can still be found, and only fully clears the target after the miss counter gets high enough or the memory window runs out.

that makes the chase feel more real because she still "knows" where u were for a bit instead of just snapping back to idle the moment sight breaks.

the raycast part also ignores some blocks on purpose.

`gc1VisionIgnoredBlock(...)` skips things like:

- `Air`
- `Invisible Solid`
- `Dangling Rope`
- `Engraved Diorite Slab`
- carpets and some invisible helper blocks

that is important because otherwise granny would "lose sight" for dumb reasons like tiny helper blocks or carpet trim.

after sight is confirmed, vision does not directly move granny by itself.

instead it signals an alert into the route system, and patrol / mesh chase takes over from there.

## how closets and hiding work

[Granny/1 Systems/System 9 - Closet Hide Runtime.js](./Granny/1%20Systems/System%209%20-%20Closet%20Hide%20Runtime.js) uses the graph value `8` as the hide marker.

it scans both the main floor graph and the floor 1 graph for those closet spots, caches them, and builds nearby approach tiles granny can path to.

granny does not always route to the exact hidden tile. the system often picks an approach point beside the closet instead, which feels fairer and keeps pathing cleaner

it also ties into the active chase state, so a player hiding in a closet can clear or redirect the current vision lock depending on timing.

## how the puzzle item runtime works

the item side is split between:

- [Granny/1 Systems/System 3 - Puzzle Items.js](./Granny/1%20Systems/System%203%20-%20Puzzle%20Items.js)
- [Granny/1 Systems/System 10 - Puzzle Item Runtime.js](./Granny/1%20Systems/System%2010%20-%20Puzzle%20Item%20Runtime.js)

`System 3` defines the puzzle item records, spawn data, labels, and shared helpers.

`System 10` is the live runtime loop that checks held items, shows prompts, and enforces the slot 0 inventory lock for important puzzle items.

the runtime keeps slot 0 valid, clears extra slots when needed, and re-prompts based on what the player is actually looking at.

## how the main puzzle modules fit together

the main house puzzle logic lives in the `2 Modules` folder:

- [Granny/2 Modules/Module 1 - Wire System.js](./Granny/2%20Modules/Module%201%20-%20Wire%20System.js)
- [Granny/2 Modules/Module 2 - Rod System.js](./Granny/2%20Modules/Module%202%20-%20Rod%20System.js)
- [Granny/2 Modules/Module 3 - Wire Cover System.js](./Granny/2%20Modules/Module%203%20-%20Wire%20Cover%20System.js)
- [Granny/2 Modules/Module 4 - Boards and Chest System.js](./Granny/2%20Modules/Module%204%20-%20Boards%20and%20Chest%20System.js)
- [Granny/2 Modules/Module 6 - Tripwire System.js](./Granny/2%20Modules/Module%206%20-%20Tripwire%20System.js)
- [Granny/2 Modules/Module 7 - Win System.js](./Granny/2%20Modules/Module%207%20-%20Win%20System.js)

the wire cover matters first because it can literally block the wires puzzle.

until the bolts are removed and the cover falls away, the wire system can refuse interaction through `gc1WireCoverBlocksWires()`.

after that, the wires system handles the actual cut logic.

there is a right cut and a wrong cut path. the wrong one can trigger a catch flow, while the right one marks the puzzle as solved.

the boards module handles the breakable rows and the special iron chest reward flow.

the chest ties back into puzzle item spawning, custom labels, and item defs.

the rod module is the other room side puzzle piece and handles its own prompts, props, and blocker setup.

the tripwire module is separate from all that but still important. it watches whether a player crossed a segment in the run and sends an alert to granny when that happens.

## how catch, days, and win work

[Granny/2 Modules/Module 5 - Catch and Days.js](./Granny/2%20Modules/Module%205%20-%20Catch%20and%20Days.js) is the custom death flow.

that file handles:

- the jumpscarescare camera
- fade to black
- jitter steps
- day text
- respawn to run
- or return to hub if days are over

the win logic is in [Granny/2 Modules/Module 7 - Win System.js](./Granny/2%20Modules/Module%207%20-%20Win%20System.js).

the main win check is `gc1WinPuzzlesComplete()`, and right now that checks:

- wires were cut correctly
- wire cover is open
- all board rows are gone

then the player still has to stand on the finish pad block before the win countdown and hub return path runs.

## how run atmosphere works

[Granny/1 Systems/System 13 - Run Atmosphere.js](./Granny/1%20Systems/System%2013%20-%20Run%20Atmosphere.js) handles the dark sky, fog, rain, thunder, and outage look.

it applies different client option bundles depending on whether the player is in a run, whether power outage mode is active, and whether the runtime needs to clear back to normal.

it also keeps ambient rain and thunder on scheduled tick intervals so the house does not feel dead while the run is active.

## if u are trying to read the code in a good order

this is prob the nicest order lol:

1. [Granny/World Code.js](./Granny/World%20Code.js)
2. [Granny/1 Systems/System 11 - Lobby Hub Displays.js](./Granny/1%20Systems/System%2011%20-%20Lobby%20Hub%20Displays.js)
3. [Granny/1 Systems/System 12 - Lobby Matchmaking.js](./Granny/1%20Systems/System%2012%20-%20Lobby%20Matchmaking.js)
4. [Granny/1 Systems/System 4 - Main Floor Mesh Chase.js](./Granny/1%20Systems/System%204%20-%20Main%20Floor%20Mesh%20Chase.js)
5. [Granny/1 Systems/System 5 - Basement Handoff.js](./Granny/1%20Systems/System%205%20-%20Basement%20Handoff.js)
6. [Granny/1 Systems/System 6 - Floor 1 Handoff.js](./Granny/1%20Systems/System%206%20-%20Floor%201%20Handoff.js)
7. [Granny/1 Systems/System 7 - Patrol Runtime.js](./Granny/1%20Systems/System%207%20-%20Patrol%20Runtime.js)
8. [Granny/1 Systems/System 8 - Vision Runtime.js](./Granny/1%20Systems/System%208%20-%20Vision%20Runtime.js)
9. [Granny/1 Systems/System 9 - Closet Hide Runtime.js](./Granny/1%20Systems/System%209%20-%20Closet%20Hide%20Runtime.js)
10. [Granny/1 Systems/System 3 - Puzzle Items.js](./Granny/1%20Systems/System%203%20-%20Puzzle%20Items.js)
11. [Granny/1 Systems/System 10 - Puzzle Item Runtime.js](./Granny/1%20Systems/System%2010%20-%20Puzzle%20Item%20Runtime.js)
12. [Granny/2 Modules/Module 3 - Wire Cover System.js](./Granny/2%20Modules/Module%203%20-%20Wire%20Cover%20System.js)
13. [Granny/2 Modules/Module 1 - Wire System.js](./Granny/2%20Modules/Module%201%20-%20Wire%20System.js)
14. [Granny/2 Modules/Module 4 - Boards and Chest System.js](./Granny/2%20Modules/Module%204%20-%20Boards%20and%20Chest%20System.js)
15. [Granny/2 Modules/Module 5 - Catch and Days.js](./Granny/2%20Modules/Module%205%20-%20Catch%20and%20Days.js)
16. [Granny/2 Modules/Module 6 - Tripwire System.js](./Granny/2%20Modules/Module%206%20-%20Tripwire%20System.js)
17. [Granny/2 Modules/Module 7 - Win System.js](./Granny/2%20Modules/Module%207%20-%20Win%20System.js)
18. [Granny/1 Systems/System 13 - Run Atmosphere.js](./Granny/1%20Systems/System%2013%20-%20Run%20Atmosphere.js)

## the short file map

if u just want the important files first:

- [Granny/World Code.js](./Granny/World%20Code.js)
- [Granny/1 Systems/System 4 - Main Floor Mesh Chase.js](./Granny/1%20Systems/System%204%20-%20Main%20Floor%20Mesh%20Chase.js)
- [Granny/1 Systems/System 7 - Patrol Runtime.js](./Granny/1%20Systems/System%207%20-%20Patrol%20Runtime.js)
- [Granny/1 Systems/System 8 - Vision Runtime.js](./Granny/1%20Systems/System%208%20-%20Vision%20Runtime.js)
- [Granny/1 Systems/System 11 - Lobby Hub Displays.js](./Granny/1%20Systems/System%2011%20-%20Lobby%20Hub%20Displays.js)
- [Granny/1 Systems/System 12 - Lobby Matchmaking.js](./Granny/1%20Systems/System%2012%20-%20Lobby%20Matchmaking.js)
- [Granny/2 Modules/Module 1 - Wire System.js](./Granny/2%20Modules/Module%201%20-%20Wire%20System.js)
- [Granny/2 Modules/Module 3 - Wire Cover System.js](./Granny/2%20Modules/Module%203%20-%20Wire%20Cover%20System.js)
- [Granny/2 Modules/Module 4 - Boards and Chest System.js](./Granny/2%20Modules/Module%204%20-%20Boards%20and%20Chest%20System.js)
- [Granny/2 Modules/Module 5 - Catch and Days.js](./Granny/2%20Modules/Module%205%20-%20Catch%20and%20Days.js)
- [Granny/2 Modules/Module 7 - Win System.js](./Granny/2%20Modules/Module%207%20-%20Win%20System.js)

## active systems list

- [Granny/1 Systems/System 1 - Granny Spawner.js](./Granny/1%20Systems/System%201%20-%20Granny%20Spawner.js)
- [Granny/1 Systems/System 2 - Commands.js](./Granny/1%20Systems/System%202%20-%20Commands.js)
- [Granny/1 Systems/System 3 - Puzzle Items.js](./Granny/1%20Systems/System%203%20-%20Puzzle%20Items.js)
- [Granny/1 Systems/System 4 - Main Floor Mesh Chase.js](./Granny/1%20Systems/System%204%20-%20Main%20Floor%20Mesh%20Chase.js)
- [Granny/1 Systems/System 5 - Basement Handoff.js](./Granny/1%20Systems/System%205%20-%20Basement%20Handoff.js)
- [Granny/1 Systems/System 6 - Floor 1 Handoff.js](./Granny/1%20Systems/System%206%20-%20Floor%201%20Handoff.js)
- [Granny/1 Systems/System 7 - Patrol Runtime.js](./Granny/1%20Systems/System%207%20-%20Patrol%20Runtime.js)
- [Granny/1 Systems/System 8 - Vision Runtime.js](./Granny/1%20Systems/System%208%20-%20Vision%20Runtime.js)
- [Granny/1 Systems/System 9 - Closet Hide Runtime.js](./Granny/1%20Systems/System%209%20-%20Closet%20Hide%20Runtime.js)
- [Granny/1 Systems/System 10 - Puzzle Item Runtime.js](./Granny/1%20Systems/System%2010%20-%20Puzzle%20Item%20Runtime.js)
- [Granny/1 Systems/System 11 - Lobby Hub Displays.js](./Granny/1%20Systems/System%2011%20-%20Lobby%20Hub%20Displays.js)
- [Granny/1 Systems/System 12 - Lobby Matchmaking.js](./Granny/1%20Systems/System%2012%20-%20Lobby%20Matchmaking.js)
- [Granny/1 Systems/System 13 - Run Atmosphere.js](./Granny/1%20Systems/System%2013%20-%20Run%20Atmosphere.js)

## active modules list

- [Granny/2 Modules/Module 1 - Wire System.js](./Granny/2%20Modules/Module%201%20-%20Wire%20System.js)
- [Granny/2 Modules/Module 2 - Rod System.js](./Granny/2%20Modules/Module%202%20-%20Rod%20System.js)
- [Granny/2 Modules/Module 3 - Wire Cover System.js](./Granny/2%20Modules/Module%203%20-%20Wire%20Cover%20System.js)
- [Granny/2 Modules/Module 4 - Boards and Chest System.js](./Granny/2%20Modules/Module%204%20-%20Boards%20and%20Chest%20System.js)
- [Granny/2 Modules/Module 5 - Catch and Days.js](./Granny/2%20Modules/Module%205%20-%20Catch%20and%20Days.js)
- [Granny/2 Modules/Module 6 - Tripwire System.js](./Granny/2%20Modules/Module%206%20-%20Tripwire%20System.js)
- [Granny/2 Modules/Module 7 - Win System.js](./Granny/2%20Modules/Module%207%20-%20Win%20System.js)
- [Granny/2 Modules/Module 8 - Credits Shop.js](./Granny/2%20Modules/Module%208%20-%20Credits%20Shop.js)

there is prob still stuff i didnt fully dump in this doc yet, but the actual important current public flow is all in the open sourced code now. if u read the files above in order, u should be able to follow how the run starts, how granny thinks, how the stairs hand off, how the puzzles gate progress, and how the whole thing ends.
