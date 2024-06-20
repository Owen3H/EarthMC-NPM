import { describe, it, expect, expectTypeOf, assertType } from 'vitest'

import { Nation } from '../../src/types'

describe('[Dynmap/Nova] Nations', () => {
    it('can get all nations', async () => {
        const nations = await globalThis.Nova.Nations.all()
        assertType<Nation[]>(nations)
    })

    it('can get single nation', async () => {
        const nation = await globalThis.Nova.Nations.get('sudan')

        expect(nation).toBeDefined()
        expectTypeOf(nation).not.toEqualTypeOf<Error>()
        assertType<Nation | Nation[]>(nation)

        expect(nation.name).toBe('Sudan')
        //console.log(nation)
    })
})