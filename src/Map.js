const fn = require('../utils/functions'),
      endpoint = require('../utils/endpoint'),
      { FetchError } = require('../utils/Errors'),
      striptags = require("striptags")

class Map {
    name = ''
    inviteRange = 0
    cachedTowns = null

    constructor(map='aurora') {
        this.name = map
        this.inviteRange = map == 'nova' ? 3000 : 3500
    }

    mapData = () => endpoint.mapData(this.name)
    playerData = () => endpoint.playerData(this.name)
    configData = () => endpoint.configData(this.name)

    #onlinePlayerData = async () => {
        let pData = await this.playerData()
        return pData?.players ? fn.editPlayerProps(pData.players) : null
    }

    Towns = {
        get: async (...townList) => {
            let towns = await this.Towns.all()
            if (!towns) return new FetchError('Error fetching towns! Please try again.')
            
            return fn.getExisting(towns, townList, 'name')
        },
        all: async (removeAccents=false) => {
            let mapData = await this.mapData(),
                markerset = mapData?.sets["townyPlugin.markerset"]

            if (!markerset) return null

            let townsArray = [], 
                townData = Object.keys(markerset.areas).map(key => markerset.areas[key]),
                i = 0, len = townData.length

            for (; i < len; i++) {      
                let town = townData[i],
                    rawinfo = town.desc.split("<br />"),
                    info = rawinfo.map(i => striptags(i))

                if (info[0].includes("(Shop)")) continue
               
                let mayor = info[1].slice(7)
                if (mayor == "") continue

                let split = info[0].split(" ("),
                    nationName = (split[2] ?? split[1]).slice(0, -1),
                    residents = info[2].slice(9).split(", "),
                    home = nationName != "" ? markerset.markers[`${town.label}__home`] : null
        
                let currentTown = {
                    name: fn.formatString(town.label, removeAccents),
                    nation: nationName == "" ? "No Nation" : fn.formatString(nationName.trim(), removeAccents),
                    mayor: mayor,
                    area: fn.calcArea(town.x, town.z, town.x.length),
                    x: home?.x ?? fn.range(town.x), 
                    z: home?.z ?? fn.range(town.z),
                    residents: residents,
                    flags: {
                        pvp: fn.asBool(info[4]?.slice(5)),
                        mobs: fn.asBool(info[5]?.slice(6)),
                        public: fn.asBool(info[6]?.slice(8)),
                        explosion: fn.asBool(info[7]?.slice(11)),
                        fire: fn.asBool(info[8]?.slice(6)),
                        capital: fn.asBool(info[9]?.slice(9))
                    },
                    colourCodes: { 
                        fill: town.fillcolor, 
                        outline: town.color 
                    }
                }

                townsArray.push(currentTown)
            }

            //#region Remove duplicates & add to area
            this.cachedTowns = []
            townsArray.forEach(a => {                   
                // If town doesnt exist, add it.
                if (!this[a.name]) {
                    this[a.name] = a
                    this.cachedTowns.push(this[a.name])
                }
                else this[a.name].area += a.area
            }, {})
            //#endregion

            return this.cachedTowns
        },
        nearby: async (xInput, zInput, xRadius, zRadius, towns=null) => {
            if (!towns) {
                towns = await this.Towns.all()
                if (!towns) return null
            }
        
            return towns.filter(t => 
                fn.hypot(t.x, [xInput, xRadius]) && 
                fn.hypot(t.z, [zInput, zRadius]))
        },
        invitable: async (nationName, includeBelonging=false) => {
            let nation = await this.Nations.get(nationName)
            if (!nation || nation instanceof Error) return nation

            if (!this.cachedTowns) return new FetchError('Error fetching towns! Please try again.')

            const invitable = town => {
                let sqr = fn.sqr(town, nation.capital, this.inviteRange) && town.nation != nation.name
                return includeBelonging ? sqr : sqr && town.nation == "No Nation"
            }

            return this.cachedTowns.filter(t => invitable(t))
        }
    }

    Nations = {
        get: async (...nationList) => {
            let nations = await this.Nations.all()
            if (!nations) return new FetchError('Error fetching nations! Please try again.')
        
            return fn.getExisting(nations, nationList, 'name')
        },
        all: async towns => {
            if (!towns) {
                towns = await this.Towns.all()
                if (!towns) return null
            }

            let raw = {}, nations = [],
                i = 0, len = towns.length

            for (; i < len; i++) {
                let town = towns[i],
                    nationName = town.nation

                if (nationName == "No Nation") continue
        
                // Doesn't already exist, create new.
                if (!raw[nationName]) {          
                    raw[nationName] = { 
                        name: town.nation,
                        residents: town.residents,
                        towns: [],
                        area: 0
                    }
        
                    nations.push(raw[nationName])
                }
        
                //#region Add extra stuff
                raw[nationName].residents = fn.removeDuplicates(raw[nationName].residents.concat(town.residents))       
                raw[nationName].area += town.area
        
                // Current town is in existing nation
                if (raw[nationName].name == nationName) 
                raw[nationName].towns?.push(town.name)
        
                if (town.flags.capital) {
                    raw[nationName].king = town.mayor
                    raw[nationName].capital = {
                        name: town.name,
                        x: town.x,
                        z: town.z
                    }
                }
                //#endregion
            }

            return nations
        },
        nearby: async (xInput, zInput, xRadius, zRadius, nations=null) => {
            if (!nations) {
                nations = await this.Nations.all()
                if (!nations) return null
            }
        
            return nations.filter(n => 
                fn.hypot(n.capital.x, [xInput, xRadius]) && 
                fn.hypot(n.capital.z, [zInput, zRadius]))
        },
        joinable: async townName => {
            let town = await this.Towns.get(townName)
            if (!town || town == "That town does not exist!") return town

            let nations = await this.Nations.all(this.cachedTowns)
            if (!nations) return null

            const joinable = n => fn.sqr(n.capital, town, this.inviteRange) && town.nation == "No Nation"
            return nations.filter(nation => joinable(nation))
        }
    }

    Residents = {
        get: async (...residentList) => {
            let residents = await this.Residents.all()
            if (!residents) return new FetchError('Error fetching residents! Please try again.')
            
            return fn.getExisting(residents, residentList, 'name')
        },
        all: async towns => {
            if (!towns) {
                towns = await this.Towns.all()
                if (!towns) return null
            }
        
            let residentsArray = [],
                i = 0, len = towns.length
        
            for (; i < len; i++) {
                var currentTown = towns[i],
                    j = 0, resLength = currentTown.residents.length
        
                for (; j < resLength; j++) {
                    var currentResident = currentTown.residents[j],
                        rank = "Resident"
        
                    if (currentTown.capital && currentTown.mayor == currentResident) rank = "Nation Leader"
                    else if (currentTown.mayor == currentResident) rank = "Mayor"
        
                    let resident = {
                        name: currentResident,
                        town: currentTown.name,
                        nation: currentTown.nation,
                        rank: rank
                    }
        
                    residentsArray.push(resident)
                }
            }
        
            return residentsArray
        }
    }

    Players = {
        get: async (...playerList) => {
            let players = await this.Players.all()
            if (!players) return new FetchError('Error fetching players! Please try again.')
            
            return fn.getExisting(players, playerList, 'name')
        },
        all: async () => {
            let onlinePlayers = await this.#onlinePlayerData()
            if (!onlinePlayers) return null

            let residents = await this.Residents.all()
            if (!residents) return null
        
            let i = 0, len = residents.length,
                ops = index => onlinePlayers.find(op => op.name === residents[index].name),
                merged = []
            
            for (; i < len; i++) merged.push({ ...residents[i], ...ops(i) })

            //this.cachedPlayers = merged
            return merged
        },
        townless: async () => {
            let mapData = await endpoint.mapData("aurora")
            if (!mapData) return new FetchError('Error fetching townless! Please try again.')
        
            let onlinePlayers = await this.Players.online()
            if (!onlinePlayers) return

            let allResidents = [],
                markerset = mapData.sets["townyPlugin.markerset"],
                townData = Object.keys(markerset.areas).map(key => markerset.areas[key])
            
            let i = 0, len = townData.length
            for (; i < len; i++) {
                let town = townData[i],
                    rawinfo = town.desc.split("<br />"),
                    info = rawinfo.map(x => striptags(x))

                if (info[0].endsWith("(Shop)")) continue

                let mayor = info[1].slice(7)
                if (mayor == "") continue
                
                let residents = info[2].slice(9).split(", ")
                allResidents.push(...residents)
            }

            // Filter out residents & sort alphabetically
            return onlinePlayers.filter(op => !allResidents.find(resident => resident == op.name)).sort((a, b) => {
                if (b.name.toLowerCase() < a.name.toLowerCase()) return 1
                if (b.name.toLowerCase() > a.name.toLowerCase()) return -1
            })
        },
        online: async (includeResidentInfo=false) => {
            let onlinePlayers = await this.#onlinePlayerData()
            if (!onlinePlayers) return null
            if (!includeResidentInfo) return onlinePlayers

            let residents = await this.Residents.all(),
                merged = [], i = 0, len = onlinePlayers.length
            
            for (; i < len; i++) {
                merged.push({ 
                    ...onlinePlayers[i], 
                    ...(residents.find((itmInner) => itmInner.name === onlinePlayers[i].name)) 
                })
            }
        
            return merged
        },
        nearby: async (xInput, zInput, xRadius, zRadius, players=null) => {
            if (!players) {
                players = await this.Players.all()
                if (!players) return null
            }

            return players.filter(p => {            
                if (p.x == 0 && p.z == 0) return
                return fn.hypot(p.x, [xInput, xRadius]) && fn.hypot(p.z, [zInput, zRadius])
            })
        }
    }
}

module.exports = Map