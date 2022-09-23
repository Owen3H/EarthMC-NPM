const fn = require('../utils/functions'),
      endpoint = require('../utils/endpoint'),
      { FetchError } = require('../utils/Errors'),
      striptags = require("striptags")

class Map {
    name = ''
    inviteRange = 0

    cachedTowns = []

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
            
            return fn.getExisting(towns, townList)
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
                    residents = info[2].slice(9).split(", ")
        
                let currentTown = {
                    name: fn.formatString(town.label, removeAccents),
                    nation: nationName == "" ? "No Nation" : fn.formatString(nationName.trim(), removeAccents),
                    mayor: info[1].slice(7),
                    area: fn.calcArea(town.x, town.z, town.x.length),
                    x: fn.range(...town.x),
                    z: fn.range(...town.z),
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
            let towns = []  
            townsArray.forEach(a => {                   
                // If town doesnt exist, add it.
                if (!this[a.name]) {
                    this[a.name] = a
                    towns.push(this[a.name])
                }
                else this[a.name].area += a.area
            }, {})
            //#endregion
        
            this.cachedTowns = towns
            return towns
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
            let ir = this.inviteRange

            function invitable(town) {
                let sqr = Math.hypot(town.x - nation.capital.x, town.z - nation.capital.z) <= ir && town.nation != nation.name
                return includeBelonging ? sqr : sqr && town.nation == "No Nation"
            }

            return this.cachedTowns.filter(t => invitable(t))
        }
    }

    Nations = {
        raw: {},
        get: async (...nationList) => {
            let nations = await this.Nations.all()
            if (!nations) return new FetchError('Error fetching nations! Please try again.')
        
            return fn.getExisting(nations, nationList)
        },
        all: async towns => {
            if (!towns) {
                towns = await this.Towns.all()
                if (!towns) return null
            }

            const curNation = this.Nations.raw,
                  nations = []

            let i = 0, len = towns.length
            for (; i < len; i++) {
                let town = towns[i],
                    nationName = town.nation

                if (nationName == "No Nation") continue
        
                // Doesn't already exist, create new.
                if (!curNation[nationName]) {          
                    curNation[nationName] = { 
                        name: town.nation,
                        residents: town.residents,
                        towns: [],
                        area: 0
                    }
        
                    nations.push(curNation[nationName])
                }
        
                //#region Add extra stuff
                curNation[nationName].residents = fn.removeDuplicates(curNation[nationName].residents.concat(town.residents))       
                curNation[nationName].area += town.area
        
                // Current town is in existing nation
                if (curNation[nationName].name == nationName) 
                    curNation[nationName].towns?.push(town.name)
        
                if (town.flags.capital) {
                    curNation[nationName].king = town.mayor
                    curNation[nationName].capital = {
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
        joinable: async (...townList) => {
            // TODO

            let town = await getTown(townName)
            if (!town || town == "That town does not exist!") return town
            
            let nations = await getNations()
            if (!nations) return null
        
            function joinable(n) { return Math.hypot(n.capitalX - town.x, n.capitalZ - town.z) <= 3500 && town.nation == "No Nation" }
            return nations.filter(nation => joinable(nation))
        }
    }

    Residents = {
        get: async (...residentList) => {
            let residents = await this.Residents.all()
            if (!residents) return new FetchError('Error fetching residents! Please try again.')
            
            return fn.getExisting(residents, residentList)
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
            
            return fn.getExisting(players, playerList)
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
            return merged
        },
        townless: async () => {
            let mapData = await endpoint.mapData("aurora")
            if (!mapData) return new FetchError('Error fetching townless! Please try again.')
        
            let onlinePlayers = await this.Players.online()
            if (!onlinePlayers) return

            var allResidents = [],
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