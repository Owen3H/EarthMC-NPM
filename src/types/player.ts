import { Location, Resident } from 'types'

export type OnlinePlayer = Location & {
    name: string
    nickname?: string
    underground?: boolean
    world?: string
    online: boolean
}

export type Player = (Resident & OnlinePlayer) | OnlinePlayer