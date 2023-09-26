import { Location } from '../types.js'

type NestedOmit<T, K extends PropertyKey> = {
    [P in keyof T as P extends K ? never : P]:
    NestedOmit<T[P], K extends `${Exclude<P, symbol>}.${infer R}` ? R : never>
} extends infer O ? { [P in keyof O]: O[P] } : never;

//#region Raw, unparsed types
export type RawEntity = {
    status: RawEntityStatus
    stats: RawEntityStats
    ranks?: { [key: string]: string[] }
    spawn?: Location
}

export type RawEntityStatus = {
    isPublic: boolean
    isOpen: boolean
    isNeutral: boolean
    isCapital?: boolean
    isOverClaimed?: boolean
    isRuined?: boolean
    isOnline?: boolean 
}

export type RawEntityStats = {
    maxTownBlocks?: number
    numTownBlocks?: number
    numResidents?: number
    numTowns?: number
    balance: number
}

export type RawResidentPerms = {
    friend: boolean
    town: boolean
    ally: boolean
    outsider: boolean
}

export type RawTownPerms = {
    resident: boolean
    nation: boolean
    ally: boolean
    outsider: boolean
}

export type RawFlagPerms = {
    pvp: boolean
    explosion: boolean
    fire: boolean
    mobs: boolean
}

export type RawEntityPerms<PermsType> = {
    flagPerms: RawFlagPerms
    rnaoPerms: {
        buildPerms: PermsType
        destroyPerms: PermsType
        switchPerms: PermsType
        itemUsePerms: PermsType
    }
}

export type RawTown = RawEntity & {
    strings: {
        town: string
        board: string
        mayor: string
        founder: string
        mapColorHexCode: string
    }
    affiliation?: {
        nation?: string
    }
    timestamps?: {
        registered?: number
        joinedNationAt?: number
    }
    home: Location
    residents: string[]
    perms: RawEntityPerms<RawTownPerms>
}

export type RawNation = RawEntity & {
    strings: {
        nation: string
        board: string
        king: string
        capital: string
        mapColorHexCode: string
    }
    timestamps?: {
        registered?: number
    }
    towns: string[]
    residents: string[]
    allies: string[]
    enemies: string[]
}

export type RawResident = RawEntity & {
    strings: {
        title: string
        username: string
        surname: string
    }
    affiliation?: Partial<{
        town: string
        nation: string
    }>
    timestamps?: {
        joinedTownAt?: number
        registered: number
        lastOnline: number
    }
    perms: RawEntityPerms<RawResidentPerms>
    friends: string[]
}

export type RawServerInfo = {
    world: {
        hasStorm: boolean
        isThundering: boolean
        time: number
        fullTime: number
    }
    players: {
        maxPlayers: number
        numOnlineTownless: number
        numOnlinePlayers: number
    }
    stats: {
        numResidents: number
        numTownless: number
        numTowns: number
        numNations: number
        numTownBlocks: number
    }
}
//#endregion

//#region Parsed
export type OAPITown = NestedOmit<RawTown, 
    "strings.town" | 
    "strings.founder" |
    "timestamps.registered" |
    "timestamps.joinedNationAt"
> & {
    name: string
    founder: string
    created: number
    joinedNation: number
}

export type OAPINation = Partial<RawEntity> & {
    s
}

export type OAPIResident = Partial<RawEntity> & {
    s
}
//#endregion