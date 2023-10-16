import * as fn from '../utils/functions.js'

import { FetchError } from "../utils/errors.js"
import { Base, Nation, Town } from '../types.js'
import { Map } from "../Map.js"

import OfficialAPI from './OAPI.js'

class Nations implements Base {
    private map: Map

    constructor(map: Map) {
        this.map = map
    }

    /** @internal */
    private mergeIfAurora = async (nation: any) => {
        if (this.map.name === 'aurora') {
            return { ...nation, ...await OfficialAPI.nation(nation.name) }
        }
 
        return nation
    }

    readonly get = async (...nationList: string[]): Promise<Nation[] | Nation> => {
        const nations = await this.all()
        if (!nations) throw new FetchError('Error fetching nations! Please try again.')
    
        const existing = fn.getExisting(nations, nationList, 'name')
        return existing instanceof Array
            ? Promise.all(existing.map(async n => await this.mergeIfAurora(n)))
            : Promise.resolve(await this.mergeIfAurora(existing))
    }

    readonly all = async (towns?: Town[]) => {
        if (!towns) {
            towns = await this.map.Towns.all()
            if (!towns) throw new Error() // TODO: Implement appropriate error.
        }

        const raw: Record<string, Nation> = {}, 
              nations: Nation[] = [],
              len = towns.length

        for (let i = 0; i < len; i++) {
            const town = towns[i],
                  nationName = town.nation

            if (nationName == "No Nation") {
                continue
            }
    
            // Doesn't already exist, create new.
            if (!raw[nationName]) {          
                raw[nationName] = { 
                    name: nationName,
                    residents: town.residents,
                    towns: [],
                    area: 0,
                    king: undefined,
                    capital: undefined,
                    stats: undefined
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
                if (town.wiki) raw[nationName].wiki = town.wiki

                raw[nationName].king = town.mayor
                raw[nationName].capital = {
                    name: town.name,
                    x: town.x,
                    z: town.z
                }
            }
            //#endregion
        }

        return nations as Nation[]
    }

    readonly nearby = async (
        xInput: number, zInput: number, 
        xRadius: number, zRadius: number, 
        nations?: Nation[]
    ) => {
        if (!nations) {
            nations = await this.all()
            if (!nations) return null
        }
    
        return nations.filter(n => 
            fn.hypot(n.capital.x, [xInput, xRadius]) && 
            fn.hypot(n.capital.z, [zInput, zRadius]))
    }

    readonly joinable = async (townName: string, nationless = true): Promise<Nation[] | FetchError> => {
        let town = null
        try {
            town = await this.map.Towns.get(townName)
        } catch (ignore) {
            return new FetchError(`Specified town '${townName}' does not exist!`)
        }

        const nations = await this.all(this.map.getFromCache('towns'))
        if (!nations) return new FetchError('Error fetching nations! Please try again.')

        return nations.filter(n => {
            const joinable = fn.sqr(n.capital, town, this.map.inviteRange)
            return nationless ? joinable && town.nation == "No Nation" : joinable
        }) as Nation[]
    }
}

export {
    Nations,
    Nations as default
}