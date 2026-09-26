/* Backend City — the world layout, as plain data (game.js reads window.CITY_MAP).
 *
 * Units are tiles (16 px); x grows east, y grows south. The world is 64 x 48:
 * the gate in the south, the plaza in the middle, the Backend district to the
 * west, the DevOps harbour on the sea to the east and the Network hill up north.
 *
 * Buildings reference the Django payload by key: `lot: ['backend', 0]` is the
 * first project of the Backend district, `skill: 'redis'` a skill building,
 * NPC `key`s match apps/city/content.py.
 */
window.CITY_MAP = {
    W: 64,
    H: 48,
    tile: 16,
    seed: 20260926,
    seaX: 53,               // x >= seaX is sea; column seaX - 1 is the shore

    // Dirt roads and the plaza, autotiled together.
    roads: [
        [30, 31, 4, 11],    // gate road
        [31, 42, 2, 6],     // under the gate arch and out of town
        [25, 19, 14, 12],   // central plaza
        [3, 24, 22, 2],     // west road
        [39, 24, 13, 2],    // east road
        [31, 10, 2, 9],     // north road
        [17, 8, 32, 2],     // hill lane
        [31, 7, 2, 1],      // relay station doorstep
        [12, 16, 2, 16],    // backend street
        [3, 16, 20, 2],     // backend north lane
        [3, 30, 20, 2],     // backend south lane
        [39, 30, 13, 2],    // harbour south lane
    ],
    // One-tile cobble paths between the harbour warehouses.
    stones: [[44, 26, 1, 4], [48, 26, 1, 4]],
    // Wooden docks: [x, y, length] — two planks deep, walkable over the water.
    docks: [[52, 24, 7]],
    // Horizontal fence runs: [x, y, length].
    fences: [[16, 11, 15], [33, 11, 15]],

    // Tree-filled areas: [x, y, w, h, density]. The outer ring is always forest.
    forests: [
        [2, 2, 14, 10, 0.55],   // north-west woods
        [49, 2, 3, 7, 0.5],     // north-east corner
        [2, 33, 27, 13, 0.5],   // south-west woods
        [35, 35, 17, 11, 0.5],  // south-east woods
        [16, 12, 22, 3, 0.2],   // hill slope
        [2, 18, 1, 12, 0.35],   // west edge
    ],

    /* Buildings. `style` picks roof + walls from Tiny Town: red (red roof,
       stone), grey (grey roof, wood), redwood, greystone. `door` is the door
       column (default: middle). `sprite` buildings are drawn props instead. */
    buildings: [
        // Backend district
        { skill: 'postgres', style: 'red', x: 3, y: 13, w: 5 },
        { skill: 'redis', sprite: 'stall', x: 9, y: 14, w: 3, h: 2 },
        { skill: 'django', style: 'greystone', x: 15, y: 13, w: 5 },
        { lot: ['backend', 0], style: 'red', x: 4, y: 21, w: 3 },
        { lot: ['backend', 1], style: 'grey', x: 8, y: 21, w: 3 },
        { lot: ['backend', 2], style: 'redwood', x: 15, y: 21, w: 3 },
        { lot: ['backend', 3], style: 'grey', x: 4, y: 27, w: 3 },
        { lot: ['backend', 4], style: 'red', x: 8, y: 27, w: 3 },
        { lot: ['backend', 5], style: 'greystone', x: 15, y: 27, w: 3 },
        { skill: 'rest', style: 'redwood', x: 19, y: 27, w: 4, door: 1 },
        { board: 'backend', x: 19, y: 22 },

        // DevOps harbour
        { lot: ['devops', 0], style: 'greystone', x: 41, y: 21, w: 3 },
        { lot: ['devops', 1], style: 'greystone', x: 45, y: 21, w: 3 },
        { lot: ['devops', 2], style: 'greystone', x: 49, y: 21, w: 3 },
        { lot: ['devops', 3], style: 'greystone', x: 41, y: 27, w: 3 },
        { lot: ['devops', 4], style: 'greystone', x: 45, y: 27, w: 3 },
        { lot: ['devops', 5], style: 'greystone', x: 49, y: 27, w: 3 },
        { board: 'devops', x: 38, y: 21 },

        // Network hill: antennas are the project lots
        { skill: 'relay', style: 'greystone', x: 30, y: 4, w: 4, door: 1 },
        { lot: ['network', 0], sprite: 'antenna', x: 19, y: 5, w: 1, h: 3 },
        { lot: ['network', 1], sprite: 'antenna', x: 23, y: 5, w: 1, h: 3 },
        { lot: ['network', 2], sprite: 'antenna', x: 27, y: 5, w: 1, h: 3 },
        { lot: ['network', 3], sprite: 'antenna', x: 36, y: 5, w: 1, h: 3 },
        { lot: ['network', 4], sprite: 'antenna', x: 40, y: 5, w: 1, h: 3 },
        { lot: ['network', 5], sprite: 'antenna', x: 44, y: 5, w: 1, h: 3 },
        { board: 'network', x: 47, y: 6 },

        // Plaza and gate
        { skill: 'github', label: 'GITHUB', style: 'red', x: 26, y: 16, w: 4, door: 2, logo: 'logoGithub' },
        { skill: 'linkedin', label: 'LINKEDIN', style: 'grey', x: 34, y: 16, w: 4, door: 1, logo: 'logoLinkedin' },
        { skill: 'mailbox', label: 'MAILBOX', sprite: 'mailbox', x: 36, y: 21, w: 1, h: 1 },
        { skill: 'nginx', gate: true, x: 29, y: 42, w: 6, h: 4, noLabel: true },
    ],

    // Decoration and animated props. `solid` marks the footprint as blocked.
    props: [
        { sprite: 'fountain', x: 31, y: 23, w: 2, h: 2, fps: 3, solid: true },
        { sprite: 'crane', x: 49, y: 12, w: 3, h: 3, solid: true },
        { sprite: 'crane', x: 49, y: 16, w: 3, h: 3, solid: true },
        { sprite: 'ship', x: 53.25, y: 20.5, bob: true },
        { sprite: 'rack', x: 20, y: 15, fps: 2, solid: true },
        { sprite: 'rack', x: 21, y: 15, fps: 2, solid: true },
        { sprite: 'chimney', x: 18, y: 12.5, smoke: true },
        { sprite: 'dish', x: 34, y: 5, solid: true },
        { sprite: 'well', tile: 104, x: 26, y: 28, solid: true },
    ],
    // Shipping containers: [x, y, colour 0-3, stack height]; two tiles wide.
    containers: [
        [39, 14, 0, 2], [41, 14, 1, 1], [43, 14, 2, 3], [45, 14, 3, 2], [47, 14, 0, 1],
        [39, 18, 3, 1], [41, 18, 2, 2], [43, 18, 0, 1], [46, 18, 1, 2],
        [50, 33, 1, 1],
    ],
    // The CI/CD conveyor: [x, y, length], animated.
    conveyor: { x: 40, y: 33, length: 10, skill: 'cicd' },
    // Where the ship can be inspected from (it floats on the sea).
    ship: { skill: 'docker', hotspot: [56.5, 24.3] },
    // Cables from the antennas into the relay station: chains of [x, y] points.
    cables: [
        [[19.5, 5.9], [23.5, 5.9], [27.5, 5.9], [30, 5.6]],
        [[44.5, 5.9], [40.5, 5.9], [36.5, 5.9], [34.4, 5.7]],
    ],

    // Townsfolk: chars.png frame, position (the tile they stand on).
    npcs: [
        { key: 'guide', frame: 1, x: 28, y: 40 },
        { key: 'recruiter', frame: 2, x: 29, y: 27 },
        { key: 'librarian', frame: 3, x: 8, y: 17 },
        { key: 'docker', frame: 4, x: 40, y: 27 },
        { key: 'wizard', frame: 5, x: 25, y: 9 },
    ],

    // First match wins; `list` is where the HUD's "List view" goes from here.
    zones: [
        { key: 'network', label: 'NETWORK HILL', rect: [14, 0, 38, 12], list: 'network' },
        { key: 'backend', label: 'BACKEND DISTRICT', rect: [0, 0, 24, 48], list: 'backend' },
        { key: 'devops', label: 'DEVOPS HARBOUR', rect: [39, 0, 25, 48], list: 'devops' },
        { key: 'gate', label: 'CITY GATE', rect: [24, 31, 15, 17], list: 'backend' },
        { key: 'plaza', label: 'CENTRAL PLAZA', rect: [0, 0, 64, 48], list: 'backend' },
    ],

    // Player start (feet position, in tiles) for ?spawn=...
    spawns: {
        gate: [32, 41.7],
        backend: [13, 25.5],
        devops: [45, 25.5],
        network: [32, 9.6],
    },
};
