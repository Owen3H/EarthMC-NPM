const mitt = require('mitt')

class GPS extends mitt {
    map = null

    static Route = {
        SAFEST: {
            avoidPvp: true,
            avoidPublic: true
        },
        FASTEST: {
            avoidPvp: false,
            avoidPublic: false
        },
        AVOID_PUBLIC: {
            avoidPvp: false,
            avoidPublic: true
        },
        AVOID_PVP: {
            avoidPvp: true,
            avoidPublic: false
        }
    }

    constructor(map) {
        super()
        this.map = map
    }

    emittedUnderground = false
    lastLoc = null

    track = async function(playerName, interval = 3000, route = GPS.Route.FASTEST) {
        setInterval(async () => {
            const player = await this.map.Players.get(playerName)
            if (!player.world) {
                this.emit('error', { err: "INVALID_PLAYER", msg: "Player is offline or does not exist!" })
                return
            }

            const underground = 
                player.x == 0 && player.z == 0 && 
                player.world != "some-other-bogus-world"

            if (underground) {
                if (!this.emittedUnderground) {
                    this.emittedUnderground = true

                    if (!this.lastLoc) {
                        this.emit("underground", "No last location. Waiting for this player to show.")
                        return
                    }
                    
                    const routeInfo = await this.findRoute(this.lastLoc, route)
                    this.emit('underground', { 
                        lastLocation: this.lastLoc, 
                        routeInfo: routeInfo
                    })
                }
            }
            else {
                this.lastLoc = { x: player.x, z: player.z }

                const routeInfo = await this.findRoute({
                    x: player.x,
                    z: player.z,
                }, route)
    
                this.emit('locationUpdate', routeInfo)
            }
        }, interval)

        return this
    }

    safestRoute = async function(loc) {
        return await this.findRoute(loc, { 
            avoidPvp: true,
            avoidPublic: true
        })
    }

    fastestRoute = async function(loc) {
        return await this.findRoute(loc, { 
            avoidPvp: false, 
            avoidPublic: false 
        })
    }

    findRoute = async function(loc, options = GPS.Route.FASTEST) {
        // Cannot use `!` as it considers 0 to be falsy.
        const xValid = loc.x === undefined || loc.z === null
        const zValid = loc.z === undefined || loc.z === null

        if (xValid || zValid) {
            const obj = JSON.stringify(loc)
            throw new Error(`Cannot calculate route! One or more inputs are invalid:\n${obj}`)
        }

        // Scan all nations for closest match.
        // Computationally more expensive to include PVP disabled nations.
        const [nations, towns] = await Promise.all([this.map.Nations.all(), this.map.Towns.all()])
        const filtered = []
        
        const len = nations.length
        for (let i = 0; i < len; i++) {
            const nation = nations[i]
            const capital = towns.find(t => t.name == nation.capital.name)
        
            // Filter out nations where either capital is not public 
            // or both avoidPvp and flags.pvp are true
            const flags = capital.flags

            const PVP = options.avoidPvp && flags.pvp
            const PUBLIC = options.avoidPublic && !flags.public

            if (PVP || PUBLIC) continue
            filtered.push(nation)
        }

        // Use reduce to find the minimum distance and corresponding nation
        const { distance, nation } = filtered.reduce((acc, nation) => {
            const dist = fn.manhattan(nation.capital.x, nation.capital.z, loc.x, loc.z)

            // Update acc if this nation is closer
            const closer = !acc.distance || dist < acc.distance
            return !closer ? acc : { 
                distance: Math.round(dist), 
                nation: {
                    name: nation.name,
                    capital: nation.capital
                }
            }
        }, { distance: null, nation: null })

        const direction = GPS.cardinalDirection(nation.capital, loc)
        return { nation, distance, direction }
    }

    static cardinalDirection(loc1, loc2) {
        // Calculate the differences in x and z coordinates
        const deltaX = loc2.x - loc1.x
        const deltaZ = loc2.z - loc1.z

        const angleRad = Math.atan2(deltaZ, deltaX) // Calculate the angle in radians
        const angleDeg = (angleRad * 180) / Math.PI // Convert the angle from radians to degrees

        // Determine the cardinal direction
        if (angleDeg >= -45 && angleDeg < 45) 
            return "east"
        
        if (angleDeg >= 45 && angleDeg < 135) 
            return "north"
        
        if (angleDeg >= 135 || angleDeg < -135) 
            return "west"
        
        return "south"
    }
}

module.exports = GPS