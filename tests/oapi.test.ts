import { 
    describe, it, expect, 
    assertType 
} from 'vitest'

import { OfficialAPI } from '../src/main'
import { 
    OAPINation, OAPIResident, OAPITown, 
    RawServerInfoV2, RawServerInfoV3 
} from '../src/types'

describe('[v3] OfficialAPI', async () => {
    it('can get valid towny/server info', async () => {
        const info = await OfficialAPI.V3.serverInfo()
        
        expect(info).toBeDefined()
        assertType<RawServerInfoV3>(info)

        expect(info.status).toBeDefined()
        expect(info.timestamps).toBeDefined()
        expect(info.stats).toBeDefined()

        expect(info.stats.maxPlayers).toBeGreaterThan(0)
        expect(info.stats.numTowns).toBeGreaterThanOrEqual(1000)
        expect(info.stats.numNations).toBeGreaterThanOrEqual(100)
    }, 10000)
})

describe('[v2] OfficialAPI', async () => {
    it('can get valid towny/server info', async () => {
        const info = await OfficialAPI.V2.serverInfo()
        
        expect(info).toBeDefined()
        assertType<RawServerInfoV2>(info)

        expect(info.world).toBeDefined()
        expect(info.players).toBeDefined()
        expect(info.stats).toBeDefined()

        expect(info.players.maxPlayers).toBeGreaterThan(0)
        expect(info.stats.numTowns).toBeGreaterThanOrEqual(1000)
        expect(info.stats.numNations).toBeGreaterThanOrEqual(100)
    })

    it('can get valid resident', async () => {
        const res = await OfficialAPI.V2.resident('fruitloopins')

        expect(res).toBeDefined()
        assertType<OAPIResident>(res)

        expect(res.name).toBe("Fruitloopins")
        //console.log(res)
    })

    it('can get valid nation', async () => {
        const nation = await OfficialAPI.V2.nation('venice')

        expect(nation).toBeDefined()
        assertType<OAPINation>(nation)

        expect(nation.name).toBe("Venice")
        //console.log(nation)
    })

    it('can get valid town', async () => {
        const town = await OfficialAPI.V2.town('venice')

        expect(town).toBeDefined()
        assertType<OAPITown>(town)

        expect(town.name).toBe("Venice")
        //console.log(town)
    })
})